$ErrorActionPreference = 'Stop'

$projectRef = 'krpihktxtivossbfuziq'
$projectRoot = Split-Path -Parent $PSScriptRoot
$linkedRefPath = Join-Path $projectRoot 'supabase/.temp/project-ref'
$stateDir = Join-Path $env:LOCALAPPDATA 'HomewardPaws'
$tokenPath = Join-Path $stateDir 'supabase-cli-token.dpapi'

if (-not (Test-Path -LiteralPath $linkedRefPath) -or
    (Get-Content -LiteralPath $linkedRefPath -Raw).Trim() -ne $projectRef) {
  throw 'This workspace is not linked to the Homeward Paws project.'
}

Write-Host 'Paste a Supabase personal access token scoped to Homeward Paws only.'
Write-Host 'The token will not appear on screen or in command history.'
$secureToken = Read-Host 'Token' -AsSecureString
$ptr = [IntPtr]::Zero
$previousToken = [Environment]::GetEnvironmentVariable('SUPABASE_ACCESS_TOKEN', 'Process')
try {
  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureToken)
  $token = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
  if ($token -notmatch '^sbp_[A-Za-z0-9_-]+$') {
    throw 'The value does not look like a Supabase personal access token.'
  }

  $env:SUPABASE_ACCESS_TOKEN = $token
  Push-Location $projectRoot
  try {
    $savedPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
      $json = & npx supabase projects list --output-format json 2>$null | Out-String
      $probeExitCode = $LASTEXITCODE
    } finally { $ErrorActionPreference = $savedPreference }
    if ($probeExitCode -ne 0) { throw 'Supabase rejected the token.' }
    $projects = @((ConvertFrom-Json $json).projects)
    if ($projects.Count -ne 1 -or $projects[0].ref -ne $projectRef) {
      throw 'This token must access only the Homeward Paws project. Check its project scope and Projects Read permission.'
    }
  } finally { Pop-Location }

  New-Item -ItemType Directory -Path $stateDir -Force | Out-Null
  $encrypted = ConvertFrom-SecureString $secureToken
  [System.IO.File]::WriteAllText($tokenPath, $encrypted, [System.Text.UTF8Encoding]::new($false))
  Write-Host 'Homeward Paws CLI token saved with Windows user encryption.'
  Write-Host 'Use: powershell -NoProfile -File scripts/supabase-hp.ps1 projects list'
} finally {
  [Environment]::SetEnvironmentVariable('SUPABASE_ACCESS_TOKEN', $previousToken, 'Process')
  if ($ptr -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
  Remove-Variable token -ErrorAction SilentlyContinue
}
