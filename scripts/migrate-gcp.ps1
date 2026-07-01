# Apply pending Prisma migrations to the Cloud SQL MySQL instance.
#
# Two usage modes:
#
# 1) Direct connection (DATABASE_URL already points at Cloud SQL, e.g.
#    you're tunneling via Cloud SQL Auth Proxy on localhost:3306):
#
#      $env:DATABASE_URL = "mysql://USER:PASS@127.0.0.1:3306/DBNAME"
#      pwsh scripts/migrate-gcp.ps1
#
# 2) Auto-tunnel via Cloud SQL Auth Proxy (recommended for one-off runs):
#
#      $env:CLOUD_SQL_INSTANCE = "robogeex-wiki:europe-west1:robogeex-wiki-db"
#      $env:DB_USER            = "wiki_app"
#      $env:DB_PASSWORD        = "..."        # or pull from Secret Manager beforehand
#      $env:DB_NAME            = "robogeex_wiki"
#      pwsh scripts/migrate-gcp.ps1 -UseProxy
#
# Requires:
#   - gcloud (authenticated: `gcloud auth login` + `gcloud config set project ...`)
#   - cloud-sql-proxy v2 on PATH when using -UseProxy
#       https://cloud.google.com/sql/docs/mysql/sql-proxy
#   - Node + the project's installed `prisma` CLI (npx prisma).

[CmdletBinding()]
param(
  [switch]$UseProxy,
  [int]$ProxyPort = 3306
)

$ErrorActionPreference = 'Stop'

Push-Location (Join-Path $PSScriptRoot '..')
try {
  if ($UseProxy) {
    foreach ($v in 'CLOUD_SQL_INSTANCE','DB_USER','DB_PASSWORD','DB_NAME') {
      if (-not (Get-Item "env:$v" -ErrorAction SilentlyContinue)) {
        throw "Missing required env var: $v"
      }
    }

    Write-Host "Starting cloud-sql-proxy for $env:CLOUD_SQL_INSTANCE on 127.0.0.1:$ProxyPort..."
    $proxy = Start-Process -FilePath 'cloud-sql-proxy' `
      -ArgumentList @($env:CLOUD_SQL_INSTANCE, "--port=$ProxyPort") `
      -PassThru -NoNewWindow

    # Wait for the proxy to start listening.
    $deadline = (Get-Date).AddSeconds(20)
    while ((Get-Date) -lt $deadline) {
      try {
        $c = New-Object System.Net.Sockets.TcpClient('127.0.0.1', $ProxyPort)
        $c.Close()
        break
      } catch {
        Start-Sleep -Milliseconds 500
      }
    }

    $escUser = [System.Uri]::EscapeDataString($env:DB_USER)
    $escPass = [System.Uri]::EscapeDataString($env:DB_PASSWORD)
    $env:DATABASE_URL = "mysql://${escUser}:${escPass}@127.0.0.1:$ProxyPort/$($env:DB_NAME)"
    Write-Host "DATABASE_URL set (host=127.0.0.1:$ProxyPort, db=$env:DB_NAME)"
  } else {
    if (-not $env:DATABASE_URL) { throw "DATABASE_URL is not set and -UseProxy was not passed." }
  }

  Write-Host "Running prisma migrate deploy..."
  npx --no-install prisma migrate deploy
  if ($LASTEXITCODE -ne 0) { throw "prisma migrate deploy failed with exit code $LASTEXITCODE" }
  Write-Host "Migrations applied."
}
finally {
  if ($UseProxy -and $proxy -and -not $proxy.HasExited) {
    Write-Host "Stopping cloud-sql-proxy (pid $($proxy.Id))..."
    Stop-Process -Id $proxy.Id -Force
  }
  Pop-Location
}
