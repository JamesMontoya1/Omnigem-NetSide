## Inicia o Cloudflare Tunnel e mostra a URL publica do webhook
$cfExe = "$env:LOCALAPPDATA\Microsoft\WinGet\Links\cloudflared.exe"

if (-not (Test-Path $cfExe)) {
    Write-Host "`n  cloudflared nao encontrado. Instalando..." -ForegroundColor Yellow
    winget install --id Cloudflare.cloudflared --accept-package-agreements --accept-source-agreements
    if (-not (Test-Path $cfExe)) {
        Write-Host "  ERRO: Instalacao falhou." -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "  ========================================" -ForegroundColor Cyan
Write-Host "    Cloudflare Tunnel - Omnigem NetSide" -ForegroundColor Cyan
Write-Host "  ========================================" -ForegroundColor Cyan
Write-Host "  Iniciando tunnel para http://localhost:3002..." -ForegroundColor Gray
Write-Host ""

$tempLog = [System.IO.Path]::GetTempFileName()
$proc = Start-Process -FilePath $cfExe -ArgumentList "tunnel","--url","http://localhost:3002" -NoNewWindow -PassThru -RedirectStandardError $tempLog

# Aguardar a URL aparecer nos logs (max 30s)
$found = $false
for ($i = 0; $i -lt 60; $i++) {
    Start-Sleep -Milliseconds 500
    if (Test-Path $tempLog) {
        $content = Get-Content $tempLog -Raw -ErrorAction SilentlyContinue
        if ($content -match "https://[a-z0-9\-]+\.trycloudflare\.com") {
            $tunnelUrl = $Matches[0]
            $found = $true
            break
        }
    }
}

if (-not $found) {
    Write-Host "  ERRO: Nao foi possivel obter a URL do tunnel." -ForegroundColor Red
    Write-Host "  Verifique os logs em: $tempLog" -ForegroundColor Gray
    exit 1
}

$webhookUrl = "$tunnelUrl/pontosimples/webhook"

Write-Host "  -----------------------------------------" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  URL publica:  " -NoNewline; Write-Host $tunnelUrl -ForegroundColor Green
Write-Host "  Webhook URL:  " -NoNewline; Write-Host $webhookUrl -ForegroundColor Yellow
Write-Host ""
Write-Host "  -----------------------------------------" -ForegroundColor DarkGray
Write-Host "  Copie a Webhook URL acima e configure" -ForegroundColor Gray
Write-Host "  no painel do PontoSimples." -ForegroundColor Gray
Write-Host ""
Write-Host "  Pressione Ctrl+C para encerrar o tunnel." -ForegroundColor DarkGray
Write-Host "  -----------------------------------------" -ForegroundColor DarkGray
Write-Host ""

# Copiar para clipboard
try {
    $webhookUrl | Set-Clipboard
    Write-Host "  (Webhook URL copiada para o clipboard)" -ForegroundColor DarkCyan
    Write-Host ""
} catch {}

# Manter o script rodando até Ctrl+C
try {
    $proc.WaitForExit()
} finally {
    if (-not $proc.HasExited) { $proc.Kill() }
    Remove-Item $tempLog -ErrorAction SilentlyContinue
}
