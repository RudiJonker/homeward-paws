param([switch]$NoPost)

$ErrorActionPreference = 'Stop'
$stateDir = Join-Path $env:USERPROFILE '.hp-board'
$inboxDir = Join-Path $stateDir 'inbox'
$cursorPath = Join-Path $stateDir 'last-seen'
$logPath = Join-Path $stateDir 'run-log.txt'
$utf8 = [System.Text.UTF8Encoding]::new($false)
$namePattern = '^\d{8}-\d{6}-(?:claude|codex)-[a-z0-9-]+\.md$'
$initialCursor = '20261028-131802-codex-board-test.md'

function Write-RunLog([string]$status) {
  [System.IO.File]::AppendAllText($logPath, "$(Get-Date -Format o) $status`n", $utf8)
}

New-Item -ItemType Directory -Path $inboxDir -Force | Out-Null
$mutex = [System.Threading.Mutex]::new($false, 'Local\HomewardPawsBoardCheck')
$locked = $false
try {
  try { $locked = $mutex.WaitOne(0) }
  catch [System.Threading.AbandonedMutexException] { $locked = $true }
  if (-not $locked) { Write-RunLog 'Skipped: another board check is running'; return }

  if (-not (Test-Path -LiteralPath $cursorPath)) {
    [System.IO.File]::WriteAllText($cursorPath, "$initialCursor`n", $utf8)
  }
  $cursor = [System.IO.File]::ReadAllText($cursorPath).Trim()
  if ($cursor -notmatch $namePattern) { throw 'Invalid board cursor' }

  $names = @(& ssh -o BatchMode=yes -o ConnectTimeout=15 hp-board since $cursor 2>&1)
  if ($LASTEXITCODE -ne 0) { throw "Board list failed: $($names -join ' ')" }
  $names = @($names | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
  foreach ($name in $names) {
    if ($name -notmatch $namePattern) { throw "Unexpected board message name: $name" }
  }

  foreach ($name in $names) {
    $contents = @(& ssh -o BatchMode=yes -o ConnectTimeout=15 hp-board read $name 2>&1)
    if ($LASTEXITCODE -ne 0) { throw "Board read failed for $name" }
    [System.IO.File]::WriteAllText((Join-Path $inboxDir $name), ($contents -join "`n") + "`n", $utf8)
    $subject = @($contents | Where-Object { $_ -match '^Subject: ' } | Select-Object -First 1)
    $indexLine = "$(Get-Date -Format o) $name $($subject -join '')`n"
    [System.IO.File]::AppendAllText((Join-Path $stateDir 'inbox-index.txt'), $indexLine, $utf8)
  }
  if ($names.Count -gt 0) {
    [System.IO.File]::WriteAllText($cursorPath, "$($names[-1])`n", $utf8)
  }

  if ($NoPost) { Write-RunLog "Check passed without posting; read $($names.Count) message(s)"; return }

  $utc = [DateTime]::UtcNow
  $slug = 'checkin-' + $utc.ToString('yyyyMMdd-HHmm')
  $minutePath = Join-Path $stateDir 'last-post-minute'
  if ((Test-Path -LiteralPath $minutePath) -and
      [System.IO.File]::ReadAllText($minutePath).Trim() -eq $slug) {
    Write-RunLog "Skipped duplicate post for $slug"
    return
  }
  $claudeNames = @($names | Where-Object { $_ -match '-claude-' })
  $replyTo = if ($claudeNames.Count -gt 0) { $claudeNames[-1] } else { 'checkin' }
  $readNames = if ($claudeNames.Count -gt 0) { $claudeNames -join ', ' } else { 'none' }
  $waiting = if ($claudeNames.Count -gt 0) {
    "New messages saved to Rudi's local inbox for review; no requests acted on."
  } else { 'nothing from new board messages' }
  $sast = [TimeZoneInfo]::ConvertTimeBySystemTimeZoneId($utc, 'South Africa Standard Time')
  $nextSast = $sast.AddHours(2)
  $body = "To: claude`nRe: $replyTo`nSubject: Codex check-in $($sast.ToString('dd MMM HH:mm')) SAST`n`n" +
    "New messages read: $readNames`nWaiting on Rudi: $waiting`n" +
    "Next check: by $($nextSast.ToString('dd MMM HH:mm')) SAST while signed in.`n"
  $fileName = "$slug.md"
  [System.IO.File]::WriteAllText((Join-Path $stateDir $fileName), $body, $utf8)
  Push-Location $stateDir
  try {
    $posted = @(& cmd.exe /d /c "ssh hp-board post $slug < $fileName" 2>&1)
    if ($LASTEXITCODE -ne 0) { throw "Board post failed: $($posted -join ' ')" }
  } finally { Pop-Location }
  [System.IO.File]::WriteAllText($minutePath, "$slug`n", $utf8)
  Write-RunLog "Passed; read $($names.Count) message(s); posted $($posted -join ' ')"
} catch {
  Write-RunLog "Failed: $($_.Exception.Message)"
  throw
} finally {
  if ($locked) { $mutex.ReleaseMutex() }
  $mutex.Dispose()
}
