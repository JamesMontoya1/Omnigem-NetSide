try {
    $r = Invoke-RestMethod -Uri "https://noble-cfr-ethernet-browsers.trycloudflare.com/pontosimples/webhook" -Method GET
    Write-Output "GET OK:"
    $r | ConvertTo-Json -Depth 3
} catch {
    Write-Output "GET ERRO: $($_.Exception.Message)"
}

Write-Output ""
Write-Output "--- Testando POST webhook ---"

$body = @{
    status = "success"
    verification_key = "A832430AA39DF8845E0C398FC9C798B987A74A8C"
    data = @{
        user_id = 88888
        user_name = "Teste Cloudflare"
        date = "2026-04-02"
        time = "14:50"
        source = "MOBILE"
        datetime = "2026-04-02T14:50:00.000Z"
    }
} | ConvertTo-Json -Depth 3

try {
    $r = Invoke-RestMethod -Uri "https://noble-cfr-ethernet-browsers.trycloudflare.com/pontosimples/webhook" -Method POST -ContentType "application/json" -Body $body
    Write-Output "POST OK:"
    $r | ConvertTo-Json -Depth 3
} catch {
    Write-Output "POST ERRO: $($_.Exception.Message)"
}
