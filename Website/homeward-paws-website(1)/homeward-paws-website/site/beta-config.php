<?php
// Homeward Paws beta settings. Edit this file when a new test APK is released.
// Requesting this file in a browser shows nothing; it is only read by
// beta-signup.php and beta-download.php.

return [
    // ---- The current test build (update for every new APK) ----
    // Put the APK in /paws/downloads/ and enter its file name here.
    // Every download link already emailed points at beta-download.php,
    // so testers always get the file named here.
    'apk_file'      => 'homeward-paws-beta.apk',
    // Optional: an external URL (for example an EAS artifact link) to use
    // instead of a file in /paws/downloads/. Leave empty to use apk_file.
    'apk_url'       => '',
    'version_label' => 'Beta 1',            // shown in the email
    'released'      => '27 October 2026',   // shown in the email

    // ---- Email ----
    'site_url'      => 'https://digitack.co.za/paws',
    'from_email'    => 'noreply@digitack.co.za',
    'from_name'     => 'Homeward Paws',
    'reply_to'      => 'info@homewardpaws.org.za',
    'notify_email'  => 'info@digitack.co.za',   // gets a note for each sign-up

    // ---- Storage and abuse limits ----
    // Sign-ups are saved as CSV OUTSIDE public_html where possible
    // (public_html/../paws-private/). Leave empty for that default.
    'data_dir'      => '/usr/home/digitqseyn/paws-private',
    'max_per_ip_per_hour' => 5,
];
