<?php
// Stable download link for the current Homeward Paws beta APK.
// Emails always link here; beta-config.php decides which file it serves.
$cfg = require __DIR__ . '/beta-config.php';
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex');

if (!empty($cfg['apk_url'])) {
    header('Location: ' . $cfg['apk_url'], true, 302);
    exit;
}

$file = basename((string)($cfg['apk_file'] ?? ''));
if ($file !== '' && is_file(__DIR__ . '/downloads/' . $file)) {
    header('Location: downloads/' . rawurlencode($file), true, 302);
    exit;
}

http_response_code(503);
header('Content-Type: text/html; charset=utf-8');
?><!doctype html>
<html lang="en-ZA"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Download unavailable · Homeward Paws</title><link rel="stylesheet" href="assets/css/site.css"></head>
<body><main class="wrap doc-hero" style="padding-bottom:80px">
<span class="eyebrow">Beta testing</span><h1>The download isn't available right now</h1>
<p class="meta">We're preparing a new test version. Please try again later, or email <a href="mailto:info@digitack.co.za?subject=Homeward%20Paws%20beta">info@digitack.co.za</a>.</p>
<p style="margin-top:24px"><a class="btn btn-outline" href="index.html">Back to Homeward Paws</a></p>
</main></body></html>
