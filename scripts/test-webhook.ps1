$body = @{
    status = "success"
    verification_key = "A832430AA39DF8845E0C398FC9C798B987A74A8C"
    data = @{
        user_id = 22375
        user_name = "Marcelo"
        date = "2026-04-02"
        time = "09:00"
        source = "MOBILE"
        datetime = "2026-04-02T09:00:00.000Z"
    }
} | ConvertTo-Json -Depth 3

$response = Invoke-RestMethod -Uri "https://outweaponed-completively-kecia.ngrok-free.dev/pontosimples/webhook" -Method POST -ContentType "application/json" -Body $body
$response | ConvertTo-Json -Depth 5
