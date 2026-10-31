(function () {
  'use strict';

  // Labels mirror the app (src/config/constants.js, animals.js, utils/missing*.js).
  var PROVINCES = ['Eastern Cape', 'Free State', 'Gauteng', 'KwaZulu-Natal', 'Limpopo',
    'Mpumalanga', 'Northern Cape', 'North West', 'Western Cape'];
  var CATEGORIES = { dog: 'Dog', cat: 'Cat', bird: 'Bird', horse: 'Horse', donkey: 'Donkey',
    rabbit: 'Rabbit', reptile: 'Reptile', small_mammal: 'Small mammal', farm_animal: 'Farm animal',
    other: 'Other', unsure: 'Unsure' };
  var CIRCUMSTANCES = { escaped_home: 'Escaped from home', escaped_walk: 'Escaped during a walk',
    escaped_vehicle: 'Escaped from a vehicle', noise_weather: 'Frightened by noise or weather',
    wandered: 'Wandered off', suspected_stolen: 'Suspected stolen',
    another_property: 'Last seen at another property', transport_incident: 'Transport incident',
    other: 'Other', unknown: 'Not sure' };
  var APPROACH = { unknown: 'Not sure', safe: 'Safe to approach', slowly: 'Approach slowly',
    do_not_chase: 'Do not chase', do_not_catch: 'Do not try to catch' };
  var URGENCY = { medication: 'Needs medication', injury: 'Injured or unwell', age: 'Very young or old',
    pregnancy: 'Pregnant or nursing', sensory: 'Vision or hearing difficulty',
    mobility: 'Mobility difficulty', weather: 'At risk from the weather' };
  var ICONS = { dog: 'animal-dog.svg', cat: 'animal-cat.svg', bird: 'animal-bird.svg', horse: 'animal-horse.svg', donkey: 'animal-horse.svg' };

  // Reference towns used only to guess the province from browser coordinates.
  // Nearest town wins; the visitor can always change the province.
  var TOWNS = [
    ['Western Cape', -33.92, 18.42], ['Western Cape', -33.96, 22.46], ['Western Cape', -33.65, 19.45],
    ['Western Cape', -32.35, 22.58], ['Western Cape', -32.91, 17.99], ['Western Cape', -32.18, 18.89],
    ['Western Cape', -33.59, 22.20], ['Western Cape', -34.18, 22.13], ['Western Cape', -34.02, 20.44],
    ['Western Cape', -33.20, 20.86],
    ['Eastern Cape', -33.96, 25.60], ['Eastern Cape', -33.02, 27.91], ['Eastern Cape', -31.59, 28.78],
    ['Eastern Cape', -33.31, 26.53], ['Eastern Cape', -32.25, 24.53], ['Eastern Cape', -31.90, 26.88],
    ['Eastern Cape', -30.69, 26.71], ['Eastern Cape', -34.05, 24.92], ['Eastern Cape', -30.34, 28.81],
    ['Northern Cape', -28.74, 24.77], ['Northern Cape', -28.45, 21.26], ['Northern Cape', -29.66, 17.89],
    ['Northern Cape', -30.65, 24.01], ['Northern Cape', -27.45, 23.43], ['Northern Cape', -31.47, 19.78],
    ['Northern Cape', -30.97, 22.13], ['Northern Cape', -29.66, 22.75],
    ['Free State', -29.12, 26.21], ['Free State', -27.98, 26.73], ['Free State', -28.23, 28.31],
    ['Free State', -27.65, 27.23], ['Free State', -26.81, 27.82], ['Free State', -28.27, 29.13],
    ['Free State', -30.30, 27.08], ['Free State', -29.77, 25.42],
    ['Gauteng', -26.20, 28.05], ['Gauteng', -25.75, 28.19], ['Gauteng', -26.67, 27.93],
    ['Gauteng', -26.25, 28.44], ['Gauteng', -26.10, 27.77], ['Gauteng', -25.81, 28.74],
    ['KwaZulu-Natal', -29.86, 31.03], ['KwaZulu-Natal', -29.60, 30.38], ['KwaZulu-Natal', -27.76, 29.93],
    ['KwaZulu-Natal', -28.78, 32.04], ['KwaZulu-Natal', -30.74, 30.45], ['KwaZulu-Natal', -28.56, 29.78],
    ['KwaZulu-Natal', -27.77, 30.79], ['KwaZulu-Natal', -30.55, 29.42], ['KwaZulu-Natal', -27.43, 32.06],
    ['KwaZulu-Natal', -29.79, 29.50],
    ['Limpopo', -23.90, 29.45], ['Limpopo', -22.95, 30.48], ['Limpopo', -23.83, 30.16],
    ['Limpopo', -24.19, 29.01], ['Limpopo', -23.68, 27.70], ['Limpopo', -22.35, 30.04],
    ['Limpopo', -24.88, 28.29], ['Limpopo', -23.94, 31.14],
    ['Mpumalanga', -25.47, 30.97], ['Mpumalanga', -25.87, 29.23], ['Mpumalanga', -26.55, 29.17],
    ['Mpumalanga', -26.53, 29.98], ['Mpumalanga', -25.77, 29.46], ['Mpumalanga', -27.01, 30.81],
    ['Mpumalanga', -25.43, 31.95], ['Mpumalanga', -25.10, 30.45], ['Mpumalanga', -27.37, 29.88],
    ['Mpumalanga', -25.05, 31.13],
    ['North West', -25.86, 25.64], ['North West', -25.67, 27.24], ['North West', -26.85, 26.67],
    ['North West', -26.71, 27.10], ['North West', -26.96, 24.73], ['North West', -25.63, 27.78],
    ['North West', -26.15, 26.16], ['North West', -25.54, 26.08], ['North West', -27.92, 25.17],
    ['North West', -26.59, 24.17]
  ];

  // Until the Play listing exists, send visitors to the beta sign-up page.
  // At launch: 'https://play.google.com/store/apps/details?id=za.co.homewardpaws.app'
  var PLAY_URL = 'beta.html';
  var OWNER_FIELDS = ['reporter_name', 'phone', 'whatsapp', 'contact_in_app'];
  var PAGE = 12;
  var $ = function (id) { return document.getElementById(id); };
  var grid = $('grid'), statusLine = $('status'), moreBtn = $('more'), note = $('area-note');
  var client = null, offset = 0, activeType = 'missing', busy = false, lastQuery = null;

  // ---------- helpers ----------
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'text') node.textContent = attrs[k];
      else if (k === 'class') node.className = attrs[k];
      else node.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c) node.appendChild(c); });
    return node;
  }
  function clean(v) { return typeof v === 'string' && v.trim() ? v.trim() : ''; }
  function formatDate(iso, withTime) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d)) return '';
    var opts = { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Johannesburg' };
    if (withTime) { opts.hour = '2-digit'; opts.minute = '2-digit'; opts.hour12 = false; }
    return d.toLocaleString('en-ZA', opts);
  }
  function ago(iso) {
    var mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (!isFinite(mins) || mins < 0) return '';
    if (mins < 60) return mins <= 1 ? 'just now' : mins + ' min ago';
    var h = Math.round(mins / 60);
    if (h < 24) return h + ' h ago';
    var days = Math.round(h / 24);
    return days === 1 ? 'yesterday' : days + ' days ago';
  }
  function setStatus(text) { statusLine.textContent = text; }
  // The website RPC never returns owner name or phone numbers; drop them on
  // arrival anyway so nothing on this page could display them.
  function stripOwner(rows) {
    return (rows || []).map(function (r) {
      var copy = {};
      Object.keys(r).forEach(function (k) { if (OWNER_FIELDS.indexOf(k) === -1) copy[k] = r[k]; });
      return copy;
    });
  }

  // ---------- location → province (browser only) ----------
  function nearestProvince(lat, lon) {
    if (lat > -21.5 || lat < -35.5 || lon < 16 || lon > 33.5) return null;
    var best = null, bestD = Infinity, cosLat = Math.cos(lat * Math.PI / 180);
    TOWNS.forEach(function (t) {
      var dy = t[1] - lat, dx = (t[2] - lon) * cosLat, d = dx * dx + dy * dy;
      if (d < bestD) { bestD = d; best = t[0]; }
    });
    return best;
  }
  function locate() {
    if (!navigator.geolocation) { note.textContent = 'Your browser cannot share a location. Choose your province instead.'; return; }
    note.textContent = 'Finding your province…';
    navigator.geolocation.getCurrentPosition(function (pos) {
      var p = nearestProvince(pos.coords.latitude, pos.coords.longitude);
      if (!p) { note.textContent = 'Your location looks outside South Africa. Choose a province to browse.'; return; }
      $('province').value = p;
      note.textContent = '';
      note.appendChild(document.createTextNode('Showing '));
      note.appendChild(el('strong', { text: p }));
      note.appendChild(document.createTextNode('. Wrong province? Change it above. Your location stayed in your browser.'));
      search();
    }, function () {
      note.textContent = 'Location was not shared. Choose your province instead.';
    }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 });
  }

  // ---------- data ----------
  function getClient() {
    if (client) return client;
    var cfg = window.HP_AUTH_CONFIG || {};
    if (!window.supabase || !cfg.supabaseUrl || !cfg.supabasePublishableKey) return null;
    client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabasePublishableKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
    });
    return client;
  }
  // Each photo gets a full-size URL and, where Supabase image transformation is
  // available on the plan, a 640×480 cover crop. The card falls back to the
  // full-size file if the small one fails to load.
  var THUMB = { width: 640, height: 480, resize: 'cover', quality: 70 };
  function signPhotos(rows) {
    var paths = rows.map(function (r) { return (r.photo_paths || [])[0]; }).filter(Boolean);
    if (!paths.length) return Promise.resolve({});
    var bucket = client.storage.from('report-photos');
    var full = bucket.createSignedUrls(paths, 3600).then(function (res) {
      var map = {};
      (res.data || []).forEach(function (s) { if (s && s.signedUrl && !s.error) map[s.path] = s.signedUrl; });
      return map;
    }, function () { return {}; });
    var small = Promise.all(paths.map(function (p) {
      return bucket.createSignedUrl(p, 3600, { transform: THUMB }).then(function (res) {
        return res.data && res.data.signedUrl ? [p, res.data.signedUrl] : null;
      }, function () { return null; });
    }));
    return Promise.all([full, small]).then(function (out) {
      var map = {};
      Object.keys(out[0]).forEach(function (p) { map[p] = { full: out[0][p], small: null }; });
      out[1].forEach(function (pair) { if (pair && map[pair[0]]) map[pair[0]].small = pair[1]; });
      return map;
    });
  }
  function placeholder(category) {
    return el('img', { class: 'placeholder', src: 'assets/img/' + (ICONS[category] || 'animal-dog.svg'), alt: '' });
  }

  // ---------- rendering ----------
  function factRow(list, label, value) {
    if (!value) return;
    list.appendChild(el('dt', { text: label }));
    list.appendChild(el('dd', { text: value }));
  }
  function card(r, photos) {
    var category = CATEGORIES[r.category] || 'Animal';
    var photoBox = el('div', { class: 'report-photo' });
    var path = (r.photo_paths || [])[0];
    var urls = path && photos[path];
    if (urls) {
      var img = el('img', {
        src: urls.small || urls.full, width: '640', height: '480', loading: 'lazy', decoding: 'async',
        alt: 'Photo of ' + (clean(r.animal_name) || 'the missing animal')
      });
      img.addEventListener('error', function () {
        if (img.src !== urls.full) { img.src = urls.full; return; }
        photoBox.replaceChild(placeholder(r.category), img);
      });
      photoBox.appendChild(img);
    } else {
      photoBox.appendChild(placeholder(r.category));
    }

    var chip = el('span', { class: 'chip missing' });
    chip.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M13 13h-2V7h2m0 10h-2v-2h2M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z"/></svg>';
    chip.appendChild(document.createTextNode('Missing'));

    var where = el('p', { class: 'where' });
    where.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7Zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z"/></svg>';
    where.appendChild(el('span', { text: clean(r.public_location) }));

    var body = el('div', { class: 'report-body' }, [
      chip,
      el('h2', { text: clean(r.animal_name) || 'Unnamed ' + category.toLowerCase() }),
      el('p', { class: 'sub', text: [category, clean(r.breed)].filter(Boolean).join(' · ') }),
      where,
      el('p', { class: 'sub', text: 'Last seen ' + formatDate(r.last_seen_at, r.time_accuracy !== 'approximate') +
        (r.time_accuracy === 'approximate' ? ' (approximate)' : '') })
    ]);

    var approach = APPROACH[r.approach_code];
    if (r.bite_scratch_kick_risk || (approach && r.approach_code !== 'safe' && r.approach_code !== 'unknown')) {
      var bits = [];
      if (approach && r.approach_code !== 'safe' && r.approach_code !== 'unknown') bits.push(approach);
      if (r.bite_scratch_kick_risk) bits.push('may bite, scratch or kick');
      body.appendChild(el('p', { class: 'warn-line', text: '⚠ ' + bits.join(' · ') }));
    }

    var facts = el('dl', { class: 'facts-list' });
    factRow(facts, 'What happened', CIRCUMSTANCES[r.circumstance]);
    factRow(facts, 'Travelled towards', clean(r.travelled_towards));
    factRow(facts, 'Distinctive features', clean(r.distinctive_features));
    factRow(facts, 'Appearance when last seen', clean(r.current_appearance));
    factRow(facts, 'Wearing', clean(r.accessories));
    factRow(facts, 'Urgent needs', (r.urgency_flags || []).map(function (f) { return URGENCY[f]; }).filter(Boolean).join(', '));
    factRow(facts, 'Urgency note', clean(r.urgency_note));
    factRow(facts, 'How to approach', [approach, clean(r.approach_note)].filter(Boolean).join('. '));
    factRow(facts, 'More details', clean(r.explanation));

    var events = Array.isArray(r.public_timeline) ? r.public_timeline : [];
    if (events.length) {
      facts.appendChild(el('dt', { text: 'Updates' }));
      var tl = el('ul', { class: 'timeline' });
      events.slice().reverse().forEach(function (e) {
        tl.appendChild(el('li', null, [el('time', { text: formatDate(e.occurred_at, false) }), document.createTextNode(clean(e.message))]));
      });
      facts.appendChild(el('dd', null, [tl]));
    }

    // Owner details are never shown on the website; responses go through the app.
    var seen = el('a', { class: 'btn btn-primary seen-btn', href: PLAY_URL, target: '_blank', rel: 'noopener' });
    seen.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm0 8a5 5 0 1 1 0-10 5 5 0 0 1 0 10Zm0-12.5C7 4.5 2.7 7.6 1 12c1.7 4.4 6 7.5 11 7.5s9.3-3.1 11-7.5c-1.7-4.4-6-7.5-11-7.5Z"/></svg>';
    seen.appendChild(document.createTextNode('Have you seen me?'));
    var seenNote = el('p', { class: 'seen-note', text: 'Tell the owner in the free Homeward Paws app. Search reference ' + r.public_reference + '.' });

    var ref = el('p', { class: 'ref' });
    ref.appendChild(document.createTextNode('Reference ' + r.public_reference + ' · updated ' + ago(r.published_at) + ' · '));
    ref.appendChild(el('a', { href: 'mailto:info@homewardpaws.org.za?subject=' + encodeURIComponent('Report concern ' + r.public_reference), text: 'Report a concern' }));

    var details = el('details', null, [el('summary', { text: 'More details' }), facts, ref]);
    body.appendChild(seen);
    body.appendChild(seenNote);
    body.appendChild(details);
    return el('article', { class: 'report' }, [photoBox, body]);
  }
  function emptyState(title, text) {
    grid.innerHTML = '';
    grid.appendChild(el('div', { class: 'empty', style: 'grid-column: 1 / -1' }, [
      el('img', { src: 'assets/img/reunited.svg', alt: '' }),
      el('h2', { text: title }),
      el('p', { text: text })
    ]));
  }
  function skeletons() {
    grid.innerHTML = '';
    for (var i = 0; i < 3; i++) grid.appendChild(el('div', { class: 'report skeleton', 'aria-hidden': 'true' }));
  }
  function render(rows, append) {
    return signPhotos(rows).then(function (photos) {
      if (!append) grid.innerHTML = '';
      rows.forEach(function (r) { grid.appendChild(card(r, photos)); });
    });
  }

  // ---------- queries ----------
  function areaLabel(q) {
    return [q.city, q.province].filter(Boolean).join(', ') || 'South Africa';
  }
  function search(append) {
    if (busy || activeType !== 'missing') return;
    if (!getClient()) { setStatus(''); emptyState('Reports are unavailable', 'The page could not connect. Please try again later.'); return; }
    if (!append) {
      offset = 0;
      lastQuery = { province: $('province').value, city: clean($('city').value), category: $('category').value };
      skeletons();
      setStatus('Loading reports…');
    }
    busy = true; moreBtn.hidden = true;
    var q = lastQuery;
    client.rpc('get_website_missing_reports', {
      result_limit: PAGE + 1, result_offset: offset,
      filter_province: q.province || null, filter_city: q.city || null,
      filter_suburb: null, filter_category: q.category || null
    }).then(function (res) {
      if (res.error) throw res.error;
      var rows = stripOwner(res.data);
      var hasMore = rows.length > PAGE;
      rows = rows.slice(0, PAGE);
      if (!append && !rows.length) {
        $('count-missing').textContent = '0';
        setStatus('');
        emptyState('No missing animals reported in ' + areaLabel(q), 'That is good news. Try a wider area, or check back later.');
        return;
      }
      offset += rows.length;
      return render(rows, append).then(function () {
        var shown = grid.querySelectorAll('article.report').length;
        $('count-missing').textContent = hasMore ? shown + '+' : String(shown);
        setStatus(shown + (hasMore ? '+' : '') + ' missing ' + (shown === 1 ? 'animal' : 'animals') + ' in ' + areaLabel(q) + ', most recent activity first.');
        moreBtn.hidden = !hasMore;
      });
    }).catch(function () {
      setStatus('');
      emptyState('Could not load reports', 'You may be offline. Check your connection and try again.');
    }).then(function () { busy = false; });
  }
  function findReference() {
    var raw = clean($('reference').value).toUpperCase();
    if (!/^HP-M-[0-9A-F]{10}$/.test(raw)) { setStatus('A reference looks like HP-M- followed by 10 letters and numbers.'); return; }
    if (!getClient() || busy) return;
    busy = true; skeletons(); moreBtn.hidden = true; setStatus('Looking up ' + raw + '…');
    client.rpc('get_website_missing_reports', { result_limit: 1, result_offset: 0, search_reference: raw })
      .then(function (res) {
        if (res.error) throw res.error;
        var rows = stripOwner(res.data);
        if (!rows.length) { setStatus(''); emptyState('No active alert with that reference', 'The alert may have ended (the animal may be home), or the reference may be mistyped.'); return; }
        return render(rows, false).then(function () {
          setStatus('Report ' + raw + '.');
          var d = grid.querySelector('details'); if (d) d.open = true;
        });
      })
      .catch(function () { setStatus(''); emptyState('Could not look up that reference', 'You may be offline. Please try again.'); })
      .then(function () { busy = false; });
  }

  // ---------- tabs ----------
  function selectTab(type) {
    activeType = type;
    document.querySelectorAll('.tab').forEach(function (t) {
      var on = t.getAttribute('data-type') === type;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      if (on) $('panel').setAttribute('aria-labelledby', t.id);
    });
    $('filters').hidden = type !== 'missing';
    if (type === 'missing') { search(); return; }
    setStatus(''); moreBtn.hidden = true;
    emptyState(type === 'found' ? 'Found animals are coming soon' : 'Public sightings are coming soon',
      type === 'found'
        ? 'Found-animal reports arrive with the Homeward Paws community beta. Until then, ask a vet or the SPCA to scan a found animal for a microchip.'
        : 'Sightings currently go privately to the owner of a missing report, so they are not shown here. Seen a missing animal? Tap "Have you seen me?" on its report.');
  }

  // ---------- init ----------
  PROVINCES.forEach(function (p) { $('province').appendChild(el('option', { value: p, text: p })); });
  Object.keys(CATEGORIES).forEach(function (k) { if (k !== 'unsure') $('category').appendChild(el('option', { value: k, text: CATEGORIES[k] })); });
  $('filters').addEventListener('submit', function (e) { e.preventDefault(); search(); });
  $('province').addEventListener('change', function () { search(); });
  $('category').addEventListener('change', function () { search(); });
  $('locate').addEventListener('click', locate);
  $('ref-go').addEventListener('click', findReference);
  $('reference').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); findReference(); } });
  moreBtn.addEventListener('click', function () { search(true); });
  document.querySelectorAll('.tab').forEach(function (t) { t.addEventListener('click', function () { selectTab(t.getAttribute('data-type')); }); });

  var hashRef = decodeURIComponent((location.hash || '').slice(1));
  if (/^HP-M-[0-9A-F]{10}$/i.test(hashRef)) { $('reference').value = hashRef; findReference(); }
  else search();
})();
