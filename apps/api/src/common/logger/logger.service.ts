import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
}

interface LogContext {
  service?: string;
  method?: string;
  userId?: string;
  organizationId?: string;
  requestId?: string;
  duration?: number;
  [key: string]: any;
}

@Injectable()
export class LoggerService implements NestLoggerService {
  private readonly isDevelopment: boolean;

  constructor(private readonly configService: ConfigService) {
    this.isDevelopment = this.configService.get('NODE_ENV') === 'development';
  }

  private formatLog(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const logObject = {
      timestamp,
      level,
      message,
      ...context,
    };

    if (this.isDevelopment) {
      // Desenvolvimento: formato legível
      return `[${timestamp}] [${level.toUpperCase()}] ${message} ${context ? JSON.stringify(context, null, 2) : ''}`;
    } else {
      // Produção: JSON estruturado
      return JSON.stringify(logObject);
    }
  }

  log(message: string, context?: LogContext): void {
    console.log(this.formatLog(LogLevel.INFO, message, context));
  }

  error(message: string, trace?: string, context?: LogContext): void {
    const errorContext = { ...context, trace };
    console.error(this.formatLog(LogLevel.ERROR, message, errorContext));
  }

  warn(message: string, context?: LogContext): void {
    console.warn(this.formatLog(LogLevel.WARN, message, context));
  }

  debug(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.debug(this.formatLog(LogLevel.DEBUG, message, context));
    }
  }

  verbose(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.log(this.formatLog(LogLevel.DEBUG, message, context));
    }
  }

  // Métodos específicos do domínio
  logAIDecision(decision: any, context?: LogContext): void {
    this.log('AI Decision Made', {
      ...context,
      decision: decision.decision,
      confidence: decision.confidence,
      urgencyScore: decision.urgencyScore,
    });
  }

  logMLPrediction(prediction: any, context?: LogContext): void {
    this.log('ML Prediction', {
      ...context,
      predictionType: prediction.type,
      confidence: prediction.confidence,
    });
  }

  logCacheOperation(operation: 'HIT' | 'MISS' | 'SET' | 'INVALIDATE', key: string, context?: LogContext): void {
    this.debug(`Cache ${operation}`, {
      ...context,
      cacheKey: key,
    });
  }
}
