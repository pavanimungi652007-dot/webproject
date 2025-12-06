Write-Host "=== E2E Test Script ==="
$base = 'http://localhost:3000'
function TryInvoke([scriptblock]$b) {
  try { & $b } catch { Write-Host "ERROR:" $_.Exception.Message; exit 1 }
}

# Signup (if already exists, continue to login)
$email = 'e2e_user@example.com'
$pwd = 'e2ePass123'
$name = 'E2E User'

Write-Host "Signing up user $email..."
$body = @{ name=$name; email=$email; password=$pwd } | ConvertTo-Json
try {
  $signup = Invoke-RestMethod -Uri "$base/api/signup" -Method Post -ContentType 'application/json' -Body $body -UseBasicParsing
  Write-Host "Signup OK: User ID: $($signup.user.id)"
} catch {
  Write-Host "Signup failed (maybe exists): $($_.Exception.Message)"
}

# Login
Write-Host "Logging in..."
$loginBody = @{ email=$email; password=$pwd } | ConvertTo-Json
$login = Invoke-RestMethod -Uri "$base/api/login" -Method Post -ContentType 'application/json' -Body $loginBody -UseBasicParsing
$token = $login.token
Write-Host "Login OK. Token length: $($token.Length)"

# Get services
Write-Host "Fetching services..."
$services = Invoke-RestMethod -Uri "$base/api/services" -UseBasicParsing
if ($services.Count -eq 0) { Write-Host 'No services found'; exit 1 }
$serviceId = $services[0].id
Write-Host "Using service id: $serviceId ($($services[0].name))"

# Create booking
Write-Host "Creating booking..."
$bookingBody = @{ service_id=$serviceId; vehicle_make='TestMake'; vehicle_model='TestModel'; vehicle_year='2021'; phone='555-2222'; date='2025-12-30'; time='09:00' } | ConvertTo-Json
$booking = Invoke-RestMethod -Uri "$base/api/bookings" -Method Post -Headers @{ Authorization = "Bearer $token" } -ContentType 'application/json' -Body $bookingBody -UseBasicParsing
Write-Host "Booking created ID: $($booking.id)"

# Admin login
Write-Host "Admin login..."
$adminLogin = @{ username='admin'; password='admin123' } | ConvertTo-Json
$adminRes = Invoke-RestMethod -Uri "$base/api/admin/login" -Method Post -ContentType 'application/json' -Body $adminLogin -UseBasicParsing
$adminToken = $adminRes.token
Write-Host "Admin token obtained"

# Admin accept booking
Write-Host "Admin accepting booking $($booking.id)..."
$decision = @{ decision='accepted' } | ConvertTo-Json
Invoke-RestMethod -Uri "$base/api/admin/bookings/$($booking.id)/decision" -Method Post -Headers @{ Authorization = "Bearer $adminToken" } -ContentType 'application/json' -Body $decision -UseBasicParsing
Write-Host "Decision applied"

# Fetch customer bookings
Write-Host "Fetching customer bookings to verify status..."
$updated = Invoke-RestMethod -Uri "$base/api/bookings" -Headers @{ Authorization = "Bearer $token" } -UseBasicParsing
Write-Host ($updated | ConvertTo-Json -Depth 5)

Write-Host "=== E2E Test Completed ==="