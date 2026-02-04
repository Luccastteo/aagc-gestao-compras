$ErrorActionPreference = "Stop"

$base = "http://localhost:3001"

Write-Host "Logging in..."
$loginBody = @{ email = "manager@demo.com"; password = "demo123" } | ConvertTo-Json
$login = Invoke-RestMethod -Method Post -Uri "$base/auth/login" -ContentType "application/json" -Body $loginBody

$token = $login.accessToken
if (-not $token) { throw "No accessToken from login" }

$headers = @{ Authorization = "Bearer $token" }

Write-Host "Calling /items/import..."
$payload = @{
  items = @(
    @{
      SKU = "TEST-IMPORT-PS1-001"
      Descricao = "Item importado via script"
      Estoque_Atual = 2
      Estoque_Minimo = 0
      Estoque_Maximo = 10
      Custo_Unitario = 3.5
      Lead_Time_Dias = 7
      Localizacao = "TEST"
    }
  )
} | ConvertTo-Json -Depth 6

$res = Invoke-RestMethod -Method Post -Uri "$base/items/import" -Headers $headers -ContentType "application/json" -Body $payload
$res | ConvertTo-Json -Depth 10

