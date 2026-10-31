<?php
// Private project dashboard: beta sign-ups for the "Testers and accounts" card.
// Login required (dashboard/.htaccess), and refused here too unless Apache
// authenticated the request. Returns first name, email and sign-up dates only,
// never the phone model or area. Reads the list live; stores nothing.
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function reply(int $status, array $body): void {
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

$user = (string)($_SERVER['REMOTE_USER'] ?? $_SERVER['REDIRECT_REMOTE_USER'] ?? '');
if (PHP_SAPI !== 'cli' && $user === '') reply(403, ['ok' => false, 'error' => 'login required']);

// Same places beta-signup.php saves to, in the same order.
$cfg = require dirname(__DIR__) . '/beta-config.php';
$dirs = [];
if (!empty($cfg['data_dir'])) $dirs[] = rtrim($cfg['data_dir'], '/');
if (!empty($_SERVER['DOCUMENT_ROOT'])) $dirs[] = dirname(rtrim($_SERVER['DOCUMENT_ROOT'], '/')) . '/paws-private';
$dirs[] = dirname(__DIR__) . '/beta-data';
$csv = '';
foreach ($dirs as $dir) {
    if (is_file($dir . '/beta-signups.csv')) { $csv = $dir . '/beta-signups.csv'; break; }
}
if ($csv === '') reply(200, ['ok' => true, 'signups' => []]);

$fh = fopen($csv, 'r');
if (!$fh || !flock($fh, LOCK_SH)) reply(500, ['ok' => false, 'error' => 'could not read the sign-ups']);
$header = ['first_signed_up', 'last_signed_up', 'times', 'first_name', 'email', 'phone_model', 'province', 'town'];
$zone = new DateTimeZone(date_default_timezone_get());   // the zone beta-signup.php wrote the dates in
$when = function (string $v) use ($zone): ?string {
    $d = DateTimeImmutable::createFromFormat('!Y-m-d H:i', $v, $zone);
    return $d ? $d->format(DATE_ATOM) : null;
};
// beta-signup.php puts an apostrophe before values starting with = + - @ or a tab (spreadsheet safety).
$unguard = fn(string $v): string => preg_match("/^'[=+\\-@\\t]/", $v) ? substr($v, 1) : $v;
$signups = [];
while (($r = fgetcsv($fh, 0, ',', '"', '\\')) !== false) {
    if ($r === $header || count($r) !== count($header)) continue;
    $signups[] = [
        'first_name' => $unguard($r[3]),
        'email' => strtolower($unguard($r[4])),
        'first_signed_up' => $when($r[0]),
        'last_signed_up' => $when($r[1]),
        'times' => (int)$r[2],
    ];
}
flock($fh, LOCK_UN);
fclose($fh);
reply(200, ['ok' => true, 'signups' => $signups]);
