# Homeward Paws website

A static, mobile-first, low-data website for Homeward Paws. Plain HTML and CSS with a few small self-hosted scripts (Animals near you, the beta form, the email-confirmation fallback and the dashboard). No frameworks, no analytics, no cookies and no third-party requests; fonts and supabase-js are self-hosted.

Since 31 October 2026 there are two live sites, each with an archive folder here that matches it byte for byte:

| Folder | Live at | Contents |
|---|---|---|
| `site-org/` | https://homewardpaws.org.za/ | The public site: home, Animals near you, help and safety, privacy policy, terms, child safety, delete account, `app-ads.txt`, `robots.txt`, `sitemap.xml`, the root `.htaccess` and `404.html`, and the email-confirmation fallback (`auth/confirm.html`). |
| `site/` | https://www.digitack.co.za/paws/ | The beta: `beta.html`, `beta-thanks.html`, `beta-signup.php`, `beta-config.php`, `beta-download.php`, `downloads/`; the dashboard; the older email-confirmation fallback. Its `.htaccess` sends the old public pages to homewardpaws.org.za with a 301 redirect (query strings kept). The old public pages in this folder are no longer reachable. |

The beta stays on digitack.co.za because the sign-up list is stored on that server. Deploys run from Andre's machine with `hp-deploy` (plan, approval, deploy, hash and link checks). The live site is the source of truth: Andre deploys first, and the patch for this archive follows. This README is not part of either site.

## Pages and the Play Console fields they satisfy

All URLs are on `https://homewardpaws.org.za`.

| Page | URL | Play Console field |
|---|---|---|
| Home | `/` | Store listing › Website |
| Privacy policy | `/privacy-policy.html` | App content › Privacy policy |
| Delete account | `/delete-account.html` | App content › Data safety › Delete account URL |
| Child safety standards | `/child-safety.html` | App content › Child safety standards (required only if the app is in the Social or Dating category) |
| Terms of use | `/terms.html` | Linked from the app's signup and Profile screens |
| Help and safety | `/safety.html` | Store listing support info; in-app Help |
| `app-ads.txt` | `/app-ads.txt` | Required by AdMob; must sit at the root of the website entered in the Play listing |

`404.html`, `robots.txt`, `sitemap.xml` and `.htaccess` are included. `site-org/.htaccess` sends http, www and the host's temporary name to `https://homewardpaws.org.za` and sets the security headers (CSP with `script-src 'self'`, so no inline scripts). `site/.htaccess` sets the same headers for `/paws/` and holds the redirects; `site/404.html` keeps its `/paws/`-prefixed links.

`dashboard/` is the password-protected project dashboard (live at `/paws/dashboard/`). Its `data.json` and `.htpasswd` exist only on the server and must never be committed (the repo is public). The one deliberate difference between archive and live: the archive's `dashboard/.htaccess` says `AuthUserFile /path/to/.htpasswd`, while the live file uses the real server path.

## Fill these in before going live

Search the HTML files for `[` to find every placeholder.

| Placeholder | Where |
|---|---|
| `[EFFECTIVE DATE]` | Privacy policy, terms, child safety |
| `[INFORMATION OFFICER NAME]` | Privacy policy §1 (POPIA Information Officer; register them with the Information Regulator) |
| `[CHILD SAFETY CONTACT NAME]`, `[ROLE]` | Child safety §6 (the named contact you also enter in Play Console) |
| `[HOSTING REGION]` | Privacy policy §9 (the Supabase project region) |
| `[MAP AND GEOCODING PROVIDER]` | Privacy policy §6 (still to be chosen in the blueprint) |
| `[EMAIL DELIVERY PROVIDER]` | Privacy policy §6 (Supabase's built-in mailer or your SMTP provider) |
| AdMob publisher line | `app-ads.txt` (copy the exact line from AdMob) |

## Assumptions to confirm

- **Domain:** `homewardpaws.org.za` (decided 31 Oct 2026; canonical tags, Open Graph tags, sitemap and robots use it). The beta pages' canonical links point to `https://www.digitack.co.za/paws/`.
- **Email:** the main address is `info@homewardpaws.org.za`: general questions, privacy and POPIA, deletion, child safety, terms, content concerns, beta feedback and removal, and the reply address of the tester emails. `info@digitack.co.za` is the technical support address: footers ("Technical support"), Help and safety section 7, and technical error or help messages. The note for each beta sign-up goes to `info@digitack.co.za`. Privacy, deletion and child safety requests are told to use a subject line ("Privacy", "Delete my Homeward Paws account", "Child safety"), so set up mail filters for those. Google's reviewers may email the main address.
- **Minimum age 18.** Set the Play Console target audience to 18+ to match, which keeps the app out of the Families policy.
- **Retention periods** in the privacy policy and delete-account page (evidence 90 days after a claim closes, moderation records 24 months, logs 90 days, backups 30 days, deletion within 30 days). They are reasonable defaults; change them if your setup differs and keep both pages consistent.
- **Have the privacy policy and terms reviewed** by someone qualified in POPIA and the Consumer Protection Act before launch.

## What the app must match

Google checks that the website and the app agree. These need building into the app (Checkpoints 1 and 5):

- Profile › **Delete account**, with the active-report closing step described on the delete page.
- Every report, photo and profile has **Report**, with a **Child safety** reason.
- **Block user**.
- Links to the privacy policy and terms inside the app, and terms/privacy acceptance at signup.
- A permission explanation screen before the location, camera, photos and notification prompts.
- **No broad photo permission.** Attach photos through Android's photo picker (`expo-image-picker` uses it on Android 13+) and make sure `READ_MEDIA_IMAGES`, `READ_MEDIA_VIDEO` and `READ_EXTERNAL_STORAGE` are not in the built manifest, for example with `android.blockedPermissions` in `app.config.js`. Google only allows broad media access for gallery-type apps, and the privacy policy says the app uses the picker.
- Declare the **advertising ID** (`com.google.android.gms.permission.AD_ID`) in Play Console's Advertising ID form, since AdMob uses it.
- The Data safety form answers match privacy policy §3 and §6: location (precise, optional), personal info (name, email, phone), photos, user content, app activity, device IDs (push token, advertising ID), and data shared with Google AdMob.

## Google Play compliance checklist (website side)

- [x] Privacy policy on a public, non-PDF web page, titled as a privacy policy, naming the app and developer, with contact details, every data type collected, who it is shared with, security, retention and deletion.
- [x] Deletion section highlighted in the privacy policy with its own anchor (`privacy-policy.html#deletion`).
- [x] Account deletion page naming the app and developer, with a prominent way to request deletion without the app, and what is deleted and kept.
- [x] Child safety standards page naming the app and developer, covering CSAE, in-app reporting and a named contact (fill in the name).
- [x] Terms of use covering user-generated content, prohibited content, reporting and blocking.
- [x] Support contact shown on every page.
- [x] No Google Play badge until the listing is live; trademark attribution in the footer.
- [x] `app-ads.txt` at the site root (add your AdMob line).
- [ ] Placeholders filled in, and `info@homewardpaws.org.za` monitored for deletion and child safety requests.
- [ ] Host serves the site worldwide (some hosting firewalls block foreign IPs; Google's reviewers are outside South Africa).

## After launch

Replace both "Coming soon to Google Play" blocks on the home page with the official Google Play badge linked to the store listing, and change the eyebrow to "Now on Android".

## Source

The legal and help pages were assembled from `source/src/` by `source/build.py` (shared header and footer). **Don't run `build.py` until it is reconciled:** its output no longer matches the live `/paws/` pages (it adds a footer link to six pages and drops the `/paws/` prefixes in `404.html`), and it knows nothing of `site-org/`. Until then, edit `site-org/` directly for the public pages, and `site/` together with `source/src/` for the beta pages.

## Photos

The photos in `site-org/assets/img/photos/` (also in `site/`) are cropped from the original Homeward Paws flyer and upscaled. They look fine at their current sizes but are soft on large, high-density screens. Replace them with higher-resolution versions using the same file names before launch; no code changes are needed.

| File | Used for | Minimum size | Subject |
|---|---|---|---|
| `hero-sunset-dog.jpg` | Home hero panel and phone photo band | 1400 × 2000, portrait | A golden, scruffy medium-sized dog sitting on a hilltop, seen from behind, looking out over a South African town at golden-hour sunset; warm backlight, soft focus background |
| `golden-retriever.jpg` | Phone hero card, mission photo | 1000 × 1250 | Happy golden retriever sitting outdoors, facing the camera, mouth open, warm natural light, trees softly blurred |
| `dog-luna.jpg` | "Missing" examples | 600 × 600 | Tan and white mixed-breed dog, head and shoulders, plain light background |
| `dog-buddy.jpg` | "Found" examples | 600 × 600 | Black and white border collie, head and shoulders, plain light background |
| `cat-simba.jpg` | "Seen" examples | 600 × 600 | Ginger tabby cat, head and shoulders, plain light background |

Use your own photos or ones you have rights to. If you generate them with an AI image tool, keep the same warm, natural-light style and avoid people whose faces can be identified. Save as JPEG at about 80% quality.
