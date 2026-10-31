<?php
// Homeward Paws beta sign-up: validates the form, saves the sign-up,
// emails the tester the download link and notifies info@digitack.co.za.
declare(strict_types=1);

$cfg = require __DIR__ . '/beta-config.php';
$wantsJson = stripos($_SERVER['HTTP_ACCEPT'] ?? '', 'application/json') !== false;

function respond(bool $ok, string $error = ''): void {
    global $wantsJson;
    if ($wantsJson) {
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store');
        if (!$ok) http_response_code(400);
        echo json_encode($ok ? ['ok' => true] : ['ok' => false, 'error' => $error]);
        exit;
    }
    if ($ok) { header('Location: beta-thanks.html', true, 303); exit; }
    http_response_code(400);
    header('Content-Type: text/html; charset=utf-8');
    $e = htmlspecialchars($error, ENT_QUOTES, 'UTF-8');
    echo '<!doctype html><html lang="en-ZA"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
       . '<title>Sign-up problem · Homeward Paws</title><link rel="stylesheet" href="assets/css/site.css"></head>'
       . '<body><main class="wrap doc-hero" style="padding-bottom:80px"><span class="eyebrow">Beta testing</span>'
       . '<h1>We couldn\'t sign you up</h1><p class="meta">' . $e . '</p>'
       . '<p style="margin-top:24px"><a class="btn btn-primary" href="beta.html">Back to the form</a></p></main></body></html>';
    exit;
}

function clean(string $key, int $max): string {
    $v = trim((string)($_POST[$key] ?? ''));
    $v = preg_replace('/[\x00-\x1F\x7F]+/u', ' ', $v) ?? '';   // no line breaks or control characters
    return mb_substr($v, 0, $max);
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') { header('Location: beta.html', true, 303); exit; }

// ---- Only accept the form from our own site: Origin, or Referer when Origin is missing ----
function request_origin(): string {
    $origin = trim((string)($_SERVER['HTTP_ORIGIN'] ?? ''));
    if ($origin === '' || $origin === 'null') {
        $p = parse_url((string)($_SERVER['HTTP_REFERER'] ?? ''));
        $origin = isset($p['scheme'], $p['host'])
            ? $p['scheme'] . '://' . $p['host'] . (isset($p['port']) ? ':' . $p['port'] : '')
            : '';
    }
    return strtolower(rtrim($origin, '/'));
}
if (!in_array(request_origin(), ['https://www.digitack.co.za', 'https://digitack.co.za'], true)) {
    respond(false, 'Please sign up using the form on our website.');
}

// ---- Bot checks (silently "succeed" so bots learn nothing) ----
if (clean('website', 200) !== '') respond(true);
$started = (int)($_POST['started'] ?? 0);
if ($started > 0 && (microtime(true) * 1000 - $started) < 3000) respond(true);

// ---- Validate ----
$first = clean('first_name', 60);
$email = strtolower(clean('email', 120));
$phone = clean('phone_model', 80);
$town  = clean('town', 80);
$provinces = ['Eastern Cape','Free State','Gauteng','KwaZulu-Natal','Limpopo','Mpumalanga','North West','Northern Cape','Western Cape'];
$province = in_array($_POST['province'] ?? '', $provinces, true) ? $_POST['province'] : '';

if ($first === '') respond(false, 'Please enter your first name.');
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) respond(false, 'Please enter a valid email address.');
if (empty($_POST['adult'])) respond(false, 'Beta testers must be 18 or older and use an Android phone.');
if (empty($_POST['agree'])) respond(false, 'Please accept the terms and privacy policy.');

// ---- Storage (outside public_html where possible) ----
function data_dir(array $cfg): string {
    $candidates = [];
    if (!empty($cfg['data_dir'])) $candidates[] = rtrim($cfg['data_dir'], '/');
    if (!empty($_SERVER['DOCUMENT_ROOT'])) $candidates[] = dirname(rtrim($_SERVER['DOCUMENT_ROOT'], '/')) . '/paws-private';
    $candidates[] = __DIR__ . '/beta-data';   // last resort, locked with .htaccess
    foreach ($candidates as $dir) {
        if ((is_dir($dir) || @mkdir($dir, 0750, true)) && is_writable($dir)) {
            if (str_starts_with($dir, __DIR__) && !is_file($dir . '/.htaccess')) {
                @file_put_contents($dir . '/.htaccess', "Require all denied\nDeny from all\n");
            }
            return $dir;
        }
    }
    return '';
}
$dir = data_dir($cfg);
if ($dir === '') respond(false, 'Sign-ups are temporarily unavailable. Please email info@digitack.co.za.');

// ---- Rate limit per IP (stores only a hash, kept one hour) ----
$ipHash = hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . '|hp-beta');
$rlFile = $dir . '/rate-limit.json';
$now = time();
$fh = fopen($rlFile, 'c+');
if ($fh && flock($fh, LOCK_EX)) {
    $rl = json_decode(stream_get_contents($fh) ?: '{}', true) ?: [];
    foreach ($rl as $k => $times) { $rl[$k] = array_values(array_filter($times, fn($t) => $t > $now - 3600)); if (!$rl[$k]) unset($rl[$k]); }
    if (count($rl[$ipHash] ?? []) >= (int)$cfg['max_per_ip_per_hour']) {
        flock($fh, LOCK_UN); fclose($fh);
        respond(false, 'Too many sign-ups from this connection. Please try again in an hour.');
    }
    $rl[$ipHash][] = $now;
    ftruncate($fh, 0); rewind($fh); fwrite($fh, json_encode($rl));
    flock($fh, LOCK_UN); fclose($fh);
}

// ---- Save the sign-up (one row per email; repeat sign-ups update the row) ----
$csv = $dir . '/beta-signups.csv';
$header = ['first_signed_up', 'last_signed_up', 'times', 'first_name', 'email', 'phone_model', 'province', 'town'];
$rows = [];
$isNew = true;
$fh = fopen($csv, 'c+');
if (!$fh || !flock($fh, LOCK_EX)) respond(false, 'Sign-ups are temporarily unavailable. Please email info@digitack.co.za.');
while (($r = fgetcsv($fh, 0, ',', '"', '\\')) !== false) { if ($r !== $header && count($r) === count($header)) $rows[] = $r; }
$stamp = date('Y-m-d H:i');
foreach ($rows as &$r) {
    if (strtolower($r[4]) === $email) {
        $isNew = false;
        $r[1] = $stamp; $r[2] = (string)((int)$r[2] + 1);
        $r[3] = $first; if ($phone !== '') $r[5] = $phone; if ($province !== '') $r[6] = $province; if ($town !== '') $r[7] = $town;
    }
}
unset($r);
if ($isNew) $rows[] = [$stamp, $stamp, '1', $first, $email, $phone, $province, $town];
// Guard against spreadsheet formula injection when the CSV is opened in Excel.
$safe = fn($v) => preg_match('/^[=+\-@\t]/', (string)$v) ? "'" . $v : $v;
ftruncate($fh, 0); rewind($fh);
fputcsv($fh, $header, ',', '"', '\\');
foreach ($rows as $r) fputcsv($fh, array_map($safe, $r), ',', '"', '\\');
flock($fh, LOCK_UN); fclose($fh);

// ---- Email the tester ----
$site = rtrim($cfg['site_url'], '/');
$download = $site . '/beta-download.php';
$h = fn($s) => htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8');

function send_mail(array $cfg, string $to, string $subject, string $text, ?string $html = null): bool {
    $from = $cfg['from_email'];
    $headers = [
        'From: ' . mb_encode_mimeheader($cfg['from_name'], 'UTF-8') . " <{$from}>",
        'Reply-To: ' . $cfg['reply_to'],
        'MIME-Version: 1.0',
        'X-Auto-Response-Suppress: All',
    ];
    if ($html === null) {
        $headers[] = 'Content-Type: text/plain; charset=UTF-8';
        $headers[] = 'Content-Transfer-Encoding: 8bit';
        $body = $text;
    } else {
        $b = 'hp-' . bin2hex(random_bytes(12));
        $headers[] = "Content-Type: multipart/alternative; boundary=\"{$b}\"";
        $body = "--{$b}\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n"
              . chunk_split(base64_encode($text))
              . "--{$b}\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n"
              . chunk_split(base64_encode($html))
              . "--{$b}--\r\n";
    }
    return mail($to, mb_encode_mimeheader($subject, 'UTF-8'), $body, implode("\r\n", $headers), '-f' . $from);
}

$version = $cfg['version_label'] . ' · ' . $cfg['released'];
$subject = 'Your Homeward Paws beta download';
$text = "Hi {$first},\n\n"
      . "Thank you for helping us test Homeward Paws.\n\n"
      . "Download the test app (open this on your Android phone):\n{$download}\n\n"
      . "Current version: {$version}\n\n"
      . "How to install:\n"
      . "1. Open the link above on your Android phone.\n"
      . "2. When your phone asks, allow your browser to install apps from this source.\n"
      . "3. Open Homeward Paws, sign up with this email address and enter the 6-digit code we email you.\n\n"
      . "When we release an update, we'll email you. Install it over the app you have; your account and animals are kept.\n\n"
      . "Found a bug or have an idea? Just reply to this email.\n\n"
      . "Thank you,\nThe Homeward Paws team\n\n"
      . "Homeward Paws is a product of Digitack (Pty) Ltd, South Africa. You received this because you signed up as a beta tester at {$site}/beta.html. "
      . "To stop beta emails, reply with \"Remove me\".\n";

$html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' . $h($subject) . '</title></head>'
  . '<body style="margin:0;padding:0;background:#FBF7F2;font-family:Nunito,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1F2D3D">'
  . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FBF7F2"><tr><td align="center" style="padding:24px 12px">'
  . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">'
  . '<tr><td style="padding:8px 8px 20px"><img src="' . $h($site) . '/assets/img/email-logo.png" width="220" height="64" alt="Homeward Paws" style="display:block;border:0"></td></tr>'
  . '<tr><td style="background:#FFFFFF;border:1px solid #ECE4DA;border-radius:20px;padding:28px">'
  . '<p style="margin:0 0 6px;font-size:13px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#227A71">Beta testing · Android</p>'
  . '<h1 style="margin:0 0 14px;font-size:26px;line-height:1.2;font-weight:900">Hi ' . $h($first) . ', here\'s your download</h1>'
  . '<p style="margin:0 0 20px;font-size:16px;line-height:1.55;color:#5E6B78">Thank you for helping us test Homeward Paws. Open this email on your <strong style="color:#1F2D3D">Android phone</strong> and tap the button.</p>'
  . '<table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr><td align="center" style="border-radius:14px;background:#227A71">'
  . '<a href="' . $h($download) . '" style="display:block;padding:16px 20px;font-size:17px;font-weight:800;color:#FFFFFF;text-decoration:none">Download Homeward Paws (Android)</a></td></tr></table>'
  . '<p style="margin:10px 0 22px;font-size:13px;color:#5E6B78;text-align:center">Current version: ' . $h($version) . '</p>'
  . '<p style="margin:0 0 8px;font-size:16px;font-weight:800">How to install</p>'
  . '<ol style="margin:0 0 18px;padding-left:22px;font-size:15px;line-height:1.6;color:#1F2D3D">'
  . '<li>Tap the button above on your Android phone.</li>'
  . '<li>When your phone asks, allow your browser to install apps from this source.</li>'
  . '<li>Open Homeward Paws, sign up with this email address and enter the 6-digit code we email you.</li></ol>'
  . '<p style="margin:0 0 18px;font-size:14px;line-height:1.55;color:#5E6B78;background:#FBF3DC;border-radius:12px;padding:12px 14px">When we release an update, we\'ll email you. Install it over the app you have; your account and animals are kept.</p>'
  . '<p style="margin:0;font-size:15px;line-height:1.55">Found a bug or have an idea? <strong>Just reply to this email.</strong></p>'
  . '</td></tr>'
  . '<tr><td style="padding:18px 8px;font-size:12px;line-height:1.6;color:#5E6B78">Homeward Paws is a product of Digitack (Pty) Ltd, South Africa · <a href="mailto:info@homewardpaws.org.za" style="color:#227A71">info@homewardpaws.org.za</a><br>'
  . 'You received this because you signed up as a beta tester at <a href="' . $h($site) . '/beta.html" style="color:#227A71">' . $h(preg_replace('#^https?://#', '', $site)) . '/beta.html</a>. To stop beta emails, reply with "Remove me". '
  . '<a href="' . $h($site) . '/privacy-policy.html" style="color:#227A71">Privacy policy</a></td></tr>'
  . '</table></td></tr></table></body></html>';

$sent = send_mail($cfg, $email, $subject, $text, $html);

// ---- Notify the team ----
$note = ($isNew ? 'New' : 'Repeat') . " Homeward Paws beta sign-up\n\n"
      . "Name: {$first}\nEmail: {$email}\nPhone: " . ($phone ?: '-') . "\nArea: " . trim("{$town}, {$province}", ', ') . "\n"
      . 'Download email sent: ' . ($sent ? 'yes' : 'NO - mail() failed, send the link manually: ' . $download) . "\n";
send_mail($cfg, $cfg['notify_email'], ($isNew ? 'Beta sign-up: ' : 'Beta sign-up again: ') . $first, $note);

if (!$sent) respond(false, 'You are signed up, but we could not send the email just now. We will email you the link shortly.');
respond(true);
