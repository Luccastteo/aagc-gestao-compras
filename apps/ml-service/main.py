from fastapi import FastAPI, HTTPException, Depends, Header
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import pandas as pd
import numpy as np
from prophet import Prophet
from sqlalchemy import create_engine, text
import os

app = FastAPI(title="AAGC ML Service", version="1.0.0")

# Config
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://aagc:aagc_dev_password@localhost:5432/aagc_db")
engine = create_engine(DATABASE_URL)

# Internal API key for service-to-service auth
ML_API_KEY = os.getenv("ML_API_KEY", "")

async def verify_api_key(x_api_key: str = Header(None, alias="X-API-Key")):
    """Verify the internal API key for service-to-service communication."""
    if ML_API_KEY and x_api_key != ML_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid or missing API key")
    if not ML_API_KEY and os.getenv("NODE_ENV") == "production":
        raise HTTPException(status_code=500, detail="ML_API_KEY must be configured in production")

# ============================================
# SCHEMAS
# ============================================

class DemandForecastRequest(BaseModel):
    organization_id: str
    item_id: str
    horizon_days: int = 30

class DemandForecastResponse(BaseModel):
    item_id: str
    predictions: List[Dict[str, Any]]
    model: str
    accuracy_metrics: Dict[str, float]

class UrgencyScoreRequest(BaseModel):
    organization_id: str
    item_id: str
    current_stock: float
    min_stock: float
    avg_daily_consumption: float
    lead_time_days: int

class UrgencyScoreResponse(BaseModel):
    urgency_score: float
    classification: str
    days_until_stockout: float
    recommended_action: str

class SupplierRankingRequest(BaseModel):
    organization_id: str
    supplier_ids: List[str]
    item_id: Optional[str] = None

class SupplierRankingResponse(BaseModel):
    rankings: List[Dict[str, Any]]

# ============================================
# ML FUNCTIONS
# ============================================

def fetch_consumption_history(org_id: str, item_id: str, days: int = 180) -> pd.DataFrame:
    """Busca histórico de consumo do banco"""
    query = text("""
        SELECT
            date,
            quantity,
            day_of_week as "dayOfWeek",
            month,
            quarter,
            is_holiday as "isHoliday"
        FROM consumption_history
        WHERE organization_id = :org_id
          AND item_id = :item_id
          AND date >= CURRENT_DATE - make_interval(days => :days)
        ORDER BY date ASC
    """)

    with engine.connect() as conn:
        df = pd.read_sql(query, conn, params={'org_id': org_id, 'item_id': item_id, 'days': days})
    
    if df.empty:
        raise HTTPException(status_code=404, detail="Sem histórico suficiente para previsão")
    
    df['date'] = pd.to_datetime(df['date'])
    return df

def train_demand_forecast_model(df: pd.DataFrame) -> tuple:
    """Treina modelo Prophet para previsão de demanda"""
    
    # Preparar dados para Prophet
    prophet_df = df[['date', 'quantity']].rename(columns={'date': 'ds', 'quantity': 'y'})
    
    # Adicionar regressores
    prophet_df['day_of_week'] = df['dayOfWeek']
    prophet_df['month'] = df['month']
    prophet_df['is_holiday'] = df['isHoliday'].astype(int)
    
    # Treinar modelo
    model = Prophet(
        daily_seasonality=True,
        weekly_seasonality=True,
        yearly_seasonality=True,
        changepoint_prior_scale=0.05,
        interval_width=0.95
    )
    
    model.add_regressor('day_of_week')
    model.add_regressor('month')
    model.add_regressor('is_holiday')
    
    model.fit(prophet_df)
    
    # Calcular métricas (simplified cross-validation)
    train_size = int(len(prophet_df) * 0.8)
    train_df = prophet_df[:train_size]
    test_df = prophet_df[train_size:]
    
    model_test = Prophet(daily_seasonality=True, weekly_seasonality=True)
    model_test.fit(train_df)
    
    forecast_test = model_test.predict(test_df)
    mae = np.mean(np.abs(forecast_test['yhat'] - test_df['y']))
    rmse = np.sqrt(np.mean((forecast_test['yhat'] - test_df['y'])**2))
    mape = np.mean(np.abs((test_df['y'] - forecast_test['yhat']) / test_df['y'])) * 100
    
    return model, {'mae': float(mae), 'rmse': float(rmse), 'mape': float(mape)}

def predict_demand(model: Prophet, horizon_days: int, last_date: datetime) -> pd.DataFrame:
    """Gera previsões futuras"""
    future = model.make_future_dataframe(periods=horizon_days, freq='D')
    
    # Adicionar regressores futuros
    future['day_of_week'] = future['ds'].dt.dayofweek
    future['month'] = future['ds'].dt.month
    future['is_holiday'] = 0
    
    forecast = model.predict(future)
    forecast = forecast[forecast['ds'] > last_date]
    
    return forecast[['ds', 'yhat', 'yhat_lower', 'yhat_upper']]

def calculate_urgency_score(
    current_stock: float,
    min_stock: float,
    avg_daily_consumption: float,
    lead_time_days: int
) -> Dict[str, Any]:
    """Calcula score de urgência usando múltiplos fatores"""
    
    # Fator 1: Dias até stockout
    if avg_daily_consumption > 0:
        days_until_stockout = current_stock / avg_daily_consumption
    else:
        days_until_stockout = 999
    
    # Fator 2: Relação com mínimo
    stock_ratio = current_stock / max(min_stock, 1)
    
    # Fator 3: Risco considerando lead time
    safety_days = lead_time_days * 1.5
    risk_score = max(0, 1 - (days_until_stockout / safety_days))
    
    # Score final (0-100)
    urgency_score = (
        0.4 * (1 - min(stock_ratio, 1)) * 100 +
        0.6 * risk_score * 100
    )
    
    urgency_score = min(100, max(0, urgency_score))
    
    # Classificação
    if urgency_score >= 80:
        classification = 'CRITICAL'
        action = 'Compra emergencial imediata'
    elif urgency_score >= 60:
        classification = 'HIGH'
        action = 'Iniciar processo de compra urgente'
    elif urgency_score >= 30:
        classification = 'MEDIUM'
        action = 'Monitorar e planejar compra'
    else:
        classification = 'LOW'
        action = 'Estoque adequado'
    
    return {
        'urgency_score': round(urgency_score, 2),
        'classification': classification,
        'days_until_stockout': round(days_until_stockout, 1),
        'recommended_action': action,
        'factors': {
            'stock_ratio': round(stock_ratio, 2),
            'risk_score': round(risk_score, 2),
            'safety_days': safety_days
        }
    }

def fetch_supplier_performance(org_id: str, supplier_ids: List[str]) -> pd.DataFrame:
    """Busca performance de fornecedores"""
    query = text("""
        SELECT 
            supplier_id as "supplierId",
            avg_lead_time_days as "avgLeadTime",
            on_time_delivery_rate as "onTimeRate",
            quality_score as "qualityScore",
            price_competitiveness as "priceScore",
            communication_score as "commScore",
            total_orders as "totalOrders"
        FROM supplier_performance
        WHERE organization_id = :org_id
          AND supplier_id = ANY(:supplier_ids)
    """)
    
    with engine.connect() as conn:
        df = pd.read_sql(query, conn, params={'org_id': org_id, 'supplier_ids': supplier_ids})
    
    return df

def rank_suppliers(df: pd.DataFrame) -> List[Dict]:
    """Ranqueia fornecedores por score composto"""
    
    if df.empty:
        return []
    
    # Normalizar métricas
    df['leadTimeScore'] = 100 - (df['avgLeadTime'] / df['avgLeadTime'].max() * 100)
    df['onTimeScore'] = df['onTimeRate'] * 100
    
    # Score composto (pesos configuráveis)
    weights = {
        'onTimeScore': 0.30,
        'qualityScore': 0.25,
        'priceScore': 0.25,
        'commScore': 0.10,
        'leadTimeScore': 0.10
    }
    
    df['finalScore'] = sum(df[col] * weight for col, weight in weights.items())
    df = df.sort_values('finalScore', ascending=False)
    
    rankings = []
    for _, row in df.iterrows():
        rankings.append({
            'supplierId': row['supplierId'],
            'score': round(row['finalScore'], 2),
            'rank': len(rankings) + 1,
            'factors': {
                'onTimeDelivery': round(row['onTimeScore'], 1),
                'quality': round(row['qualityScore'], 1),
                'pricing': round(row['priceScore'], 1),
                'communication': round(row['commScore'], 1),
                'leadTime': round(row['leadTimeScore'], 1)
            },
            'totalOrders': int(row['totalOrders'])
        })
    
    return rankings

# ============================================
# ENDPOINTS
# ============================================

@app.post("/api/ml/forecast/demand", response_model=DemandForecastResponse)
async def forecast_demand(request: DemandForecastRequest, _=Depends(verify_api_key)):
    """Previsão de demanda usando Prophet"""
    
    try:
        df = fetch_consumption_history(request.organization_id, request.item_id, days=180)
        model, metrics = train_demand_forecast_model(df)
        last_date = df['date'].max()
        forecast = predict_demand(model, request.horizon_days, last_date)
        
        predictions = []
        for _, row in forecast.iterrows():
            predictions.append({
                'date': row['ds'].isoformat(),
                'predicted_qty': max(0, round(row['yhat'], 2)),
                'lower_bound': max(0, round(row['yhat_lower'], 2)),
                'upper_bound': max(0, round(row['yhat_upper'], 2)),
                'confidence': 0.95
            })
        
        return DemandForecastResponse(
            item_id=request.item_id,
            predictions=predictions,
            model='Prophet',
            accuracy_metrics=metrics
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro na previsão: {str(e)}")

@app.post("/api/ml/urgency/score", response_model=UrgencyScoreResponse)
async def score_urgency(request: UrgencyScoreRequest, _=Depends(verify_api_key)):
    """Calcula score de urgência de compra"""
    
    result = calculate_urgency_score(
        request.current_stock,
        request.min_stock,
        request.avg_daily_consumption,
        request.lead_time_days
    )
    
    return UrgencyScoreResponse(**result)

@app.post("/api/ml/suppliers/rank", response_model=SupplierRankingResponse)
async def rank_suppliers_endpoint(request: SupplierRankingRequest, _=Depends(verify_api_key)):
    """Ranqueia fornecedores por performance"""
    
    df = fetch_supplier_performance(request.organization_id, request.supplier_ids)
    rankings = rank_suppliers(df)
    
    return SupplierRankingResponse(rankings=rankings)

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "ml-service", "version": "1.0.0"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
