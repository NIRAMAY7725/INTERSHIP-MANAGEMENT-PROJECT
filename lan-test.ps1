# ═══════════════════════════════════════════════════════════
#  InternManage — LAN Testing Setup (Run as Administrator)
# ═══════════════════════════════════════════════════════════
#
#  Usage:   Right-click this file → "Run with PowerShell"
#           (or run as Admin in terminal: .\lan-test.ps1)
#
#  What it does:
#   1. Finds your local IPv4 address
#   2. Creates a Windows Firewall rule for port 5000
#   3. Prints the URL to type on your phone
# ═══════════════════════════════════════════════════════════

$Port = 5000
$RuleName = "InternManage-Dev-Server"

Write-Host ""
Write-Host "══════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  InternManage — LAN Testing Setup" -ForegroundColor Cyan
Write-Host "══════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# ── Step 1: Find IPv4 address ────────────────────────────
Write-Host "[Step 1] Finding your local IPv4 address..." -ForegroundColor Yellow

$IPv4 = (Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object {
        $_.InterfaceAlias -notmatch "Loopback" -and
        $_.IPAddress -notlike "127.*" -and
        $_.IPAddress -notlike "169.*"
    } |
    Select-Object -First 1).IPAddress

if (-not $IPv4) {
    Write-Host "  ERROR: Could not find a local IPv4 address." -ForegroundColor Red
    Write-Host "  Make sure you are connected to Wi-Fi or Ethernet." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "  Your IPv4 address: $IPv4" -ForegroundColor Green
Write-Host ""

# ── Step 2: Configure Firewall ───────────────────────────
Write-Host "[Step 2] Configuring Windows Firewall..." -ForegroundColor Yellow

# Check if rule already exists
$existingRule = Get-NetFirewallRule -DisplayName $RuleName -ErrorAction SilentlyContinue

if ($existingRule) {
    Write-Host "  Firewall rule '$RuleName' already exists. Updating..." -ForegroundColor DarkYellow
    Remove-NetFirewallRule -DisplayName $RuleName -ErrorAction SilentlyContinue
}

try {
    New-NetFirewallRule `
        -DisplayName $RuleName `
        -Direction Inbound `
        -Protocol TCP `
        -LocalPort $Port `
        -Action Allow `
        -Profile Private `
        -Description "Allow incoming connections to InternManage dev server on port $Port" `
        -ErrorAction Stop | Out-Null

    Write-Host "  Firewall rule created successfully!" -ForegroundColor Green
} catch {
    Write-Host "  ERROR: Could not create firewall rule." -ForegroundColor Red
    Write-Host "  Make sure you are running this script as Administrator." -ForegroundColor Red
    Write-Host "  Error: $_" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""

# ── Step 3: Print the URL ────────────────────────────────
Write-Host "[Step 3] You're all set!" -ForegroundColor Yellow
Write-Host ""
Write-Host "══════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "  On your PC, start the server:" -ForegroundColor White
Write-Host "    node server.js" -ForegroundColor Gray
Write-Host ""
Write-Host "  On your PHONE, open this URL in the browser:" -ForegroundColor White
Write-Host ""
Write-Host "    http://${IPv4}:${Port}" -ForegroundColor Green -BackgroundColor DarkGreen
Write-Host ""
Write-Host "  (Make sure your phone is on the same Wi-Fi network)" -ForegroundColor DarkGray
Write-Host ""
Write-Host "══════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# ── Cleanup instructions ─────────────────────────────────
Write-Host "  To REMOVE the firewall rule later, run:" -ForegroundColor DarkGray
Write-Host "    Remove-NetFirewallRule -DisplayName '$RuleName'" -ForegroundColor DarkGray
Write-Host ""

Read-Host "Press Enter to exit"
