param([Parameter(ValueFromRemainingArguments = $true)][string[]]$CliArgs)

$ErrorActionPreference = 'Stop'
$projectRef = 'krpihktxtivossbfuziq'
$projectRoot = Split-Path -Parent $PSScriptRoot
$linkedRefPath = Join-Path $projectRoot 'supabase/.temp/project-ref'
$tokenPath = Join-Path (Join-Path $env:LOCALAPPDATA 'HomewardPaws') 'supabase-cli-token.dpapi'

if (-not $CliArgs -or $CliArgs.Count -eq 0) {
  throw 'Provide a Supabase command, for example: projects list'
}
if (-not (Test-Path -LiteralPath $linkedRefPath) -or
    (Get-Content -LiteralPath $linkedRefPath -Raw).Trim() -ne $projectRef) {
  throw 'The local Supabase project link is not Homeward Paws. No command was run.'
}
if (-not (Test-Path -LiteralPath $tokenPath)) {
  throw 'Homeward Paws CLI token is not configured. Run scripts/set-homeward-paws-cli-token.ps1 first.'
}
for ($i = 0; $i -lt $CliArgs.Count; $i++) {
  if ($CliArgs[$i] -eq '--project-ref' -and
      ($i + 1 -ge $CliArgs.Count -or $CliArgs[$i + 1] -ne $projectRef)) {
    throw 'A different project ref was supplied. No command was run.'
  }
  if ($CliArgs[$i] -match '^--project-ref=(.+)$' -and $Matches[1] -ne $projectRef) {
    throw 'A different project ref was supplied. No command was run.'
  }
  if ($CliArgs[$i] -match '^--(db-url|workdir|profile|token)(=|$)') {
    throw "The $($CliArgs[$i]) override is not allowed by this project-specific command."
  }
}

$previousToken = [Environment]::GetEnvironmentVariable('SUPABASE_ACCESS_TOKEN', 'Process')
$ptr = [IntPtr]::Zero
$exitCode = 1
try {
  $secureToken = Get-Content -LiteralPath $tokenPath -Raw | ConvertTo-SecureString
  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureToken)
  $env:SUPABASE_ACCESS_TOKEN = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)

  Push-Location $projectRoot
  try {
    $savedPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
      $json = & npx supabase projects list --output-format json 2>$null | Out-String
      $probeExitCode = $LASTEXITCODE
    } finally { $ErrorActionPreference = $savedPreference }
    if ($probeExitCode -ne 0) { throw 'The Homeward Paws token was rejected or has expired. No requested command was run.' }
    $projects = @((ConvertFrom-Json $json).projects)
    if ($projects.Count -ne 1 -or $projects[0].ref -ne $projectRef) {
      throw 'The token does not resolve exclusively to Homeward Paws. No requested command was run.'
    }
    $ErrorActionPreference = 'Continue'
    try {
      & npx supabase @CliArgs
      $exitCode = $LASTEXITCODE
    } finally { $ErrorActionPreference = $savedPreference }
  } finally { Pop-Location }
} finally {
  [Environment]::SetEnvironmentVariable('SUPABASE_ACCESS_TOKEN', $previousToken, 'Process')
  if ($ptr -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
}
exit $exitCode
