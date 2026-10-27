param(
  [switch]$Offline
)

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$envFile = Join-Path $projectRoot '.env'
$gradleFile = Join-Path $projectRoot 'android\gradlew.bat'
$apkFile = Join-Path $projectRoot 'android\app\build\outputs\apk\release\app-release.apk'

if (-not (Test-Path -LiteralPath $envFile)) {
  throw 'The local .env file is missing. The app needs its public Supabase configuration.'
}
if (-not (Test-Path -LiteralPath $gradleFile)) {
  throw 'The local Android project is missing. Generate it before building an APK.'
}

$envNames = Get-Content -LiteralPath $envFile |
  Where-Object { $_ -match '^\s*[A-Za-z_][A-Za-z0-9_]*\s*=' } |
  ForEach-Object { ($_ -split '=', 2)[0].Trim() }
foreach ($requiredName in @('EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_ANON_KEY')) {
  if ($envNames -notcontains $requiredName) {
    throw "The local .env file is missing $requiredName."
  }
}

# Expo reads .env while bundling JavaScript. These settings match the EAS
# checkpoint3-test profile without changing the normal preview build.
$env:APP_VARIANT = 'development'
$env:EXPO_PUBLIC_CHECKPOINT3_TEST = 'true'

Push-Location (Join-Path $projectRoot 'android')
try {
  $gradleArgs = @('assembleRelease')
  if ($Offline) { $gradleArgs += '--offline' }
  & $gradleFile @gradleArgs
  if ($LASTEXITCODE -ne 0) {
    throw "Gradle failed with exit code $LASTEXITCODE."
  }
} finally {
  Pop-Location
}

if (-not (Test-Path -LiteralPath $apkFile)) {
  throw 'Gradle completed but the release APK was not found.'
}
$apk = Get-Item -LiteralPath $apkFile
Write-Host "Local Checkpoint 3 test APK: $($apk.FullName)"
Write-Host "Built: $($apk.LastWriteTime)"
Write-Host "Size: $([math]::Round($apk.Length / 1MB, 1)) MB"
