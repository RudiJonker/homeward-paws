(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var C = { primary: '#227A71', done: '#2E8456', open: '#C8424A', amber: '#D97820', blue: '#2F6FCE', track: '#F5EFE7', line: '#ECE4DA' };
  var ICON = {
    done: 'M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z',
    open: 'M13 13h-2V7h2m0 10h-2v-2h2M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z',
    active: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm-1 5h2v6l4.2 2.5-1 1.6L11 14V7Z',
    next: 'M8.6 16.6 13.2 12 8.6 7.4 10 6l6 6-6 6z',
    flag: 'M14.4 6 14 4H5v17h2v-7h5.6l.4 2h7V6z',
    code: 'm9.4 16.6-4.6-4.6 4.6-4.6L8 6l-6 6 6 6 1.4-1.4Zm5.2 0 4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4Z',
    rocket: 'M12 2.5s4.5 2 4.5 8.5l2 3.5-2.5 2H8l-2.5-2 2-3.5c0-6.5 4.5-8.5 4.5-8.5Zm0 6a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3ZM9 18h6l-1 3h-4l-1-3Z',
    globe: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm6.9 6h-3a15.6 15.6 0 0 0-1.4-3.6A8 8 0 0 1 18.9 8ZM12 4c.8 1.2 1.5 2.5 1.9 4h-3.8c.4-1.5 1.1-2.8 1.9-4ZM4.3 14a8.2 8.2 0 0 1 0-4h3.4a16 16 0 0 0 0 4H4.3Zm.8 2h3a15.6 15.6 0 0 0 1.4 3.6A8 8 0 0 1 5.1 16ZM8 8H5a8 8 0 0 1 4.4-3.6C8.9 5.5 8.4 6.7 8 8Zm4 12c-.8-1.2-1.5-2.5-1.9-4h3.8c-.4 1.5-1.1 2.8-1.9 4Zm2.3-6H9.7a14.7 14.7 0 0 1 0-4h4.6a14.7 14.7 0 0 1 0 4Zm.3 5.6c.6-1.1 1.1-2.3 1.4-3.6h3a8 8 0 0 1-4.4 3.6ZM16.3 14a16 16 0 0 0 0-4h3.4a8.2 8.2 0 0 1 0 4h-3.4Z',
    list: 'M3 13h2v-2H3v2Zm0 4h2v-2H3v2Zm0-8h2V7H3v2Zm4 4h14v-2H7v2Zm0 4h14v-2H7v2ZM7 7v2h14V7H7Z',
    pulse: 'M3 13h4l3-8 4 14 3-6h4v-2h-5.2L14 13.6 10 0.6 6.4 11H3z',
    map: 'M15 19 9 16.9 4.4 18.7A1 1 0 0 1 3 17.8V5.4c0-.4.3-.8.6-.9L9 2.6l6 2.1 4.6-1.8A1 1 0 0 1 21 3.8v12.4c0 .4-.3.8-.6.9L15 19Zm-1-2.2V6.1l-4-1.4v10.7l4 1.4Z'
  };
  var STATUS_LABEL = { done: 'Done', open: 'Open', active: 'In progress', next: 'Next', later: 'Later', unverified: 'Unverified' };

  // ---------- helpers ----------
  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (k === 'text') n.textContent = attrs[k];
      else if (k === 'class') n.className = attrs[k];
      else n.setAttribute(k, attrs[k]);
    }
    (kids || []).forEach(function (c) { if (c != null) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }
  function svg(tag, attrs, kids) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs || {}) n.setAttribute(k, attrs[k]);
    (kids || []).forEach(function (c) { n.appendChild(c); });
    return n;
  }
  function icon(name) { return svg('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true' }, [svg('path', { fill: 'currentColor', d: ICON[name] || ICON.next })]); }
  function chip(status) {
    var key = status === 'later' ? 'next' : status;
    return el('span', { class: 'st ' + status }, [icon(key === 'unverified' ? 'open' : key), STATUS_LABEL[status] || status]);
  }
  function tag(cls, iconName, text) { return el('span', { class: 'st ' + cls }, [icon(iconName), text]); }
  function tick(yes) { return el('span', { class: 'tick ' + (yes ? 'yes' : 'no'), 'aria-label': yes ? 'Done' : 'Not done' }, [yes ? icon('done') : null]); }
  function panel(title, iconName, sub, kids) {
    return el('section', { class: 'panel' }, [el('h2', null, [icon(iconName), title]), sub ? el('p', { class: 'sub', text: sub }) : null].concat(kids));
  }
  function bar(pct, color) {
    var i = el('i'); if (color) i.style.background = color;
    requestAnimationFrame(function () { requestAnimationFrame(function () { i.style.width = Math.max(0, Math.min(100, pct)) + '%'; }); });
    return el('div', { class: 'bar', role: 'progressbar', 'aria-valuenow': String(pct), 'aria-valuemin': '0', 'aria-valuemax': '100' }, [i]);
  }
  function fmtDate(iso, withTime) {
    var d = new Date(iso); if (isNaN(d)) return '';
    var o = { day: 'numeric', month: 'short', timeZone: 'Africa/Johannesburg' };
    if (withTime) { o.hour = '2-digit'; o.minute = '2-digit'; o.hour12 = false; }
    return d.toLocaleString('en-ZA', o);
  }
  function ago(iso) {
    var m = Math.round((Date.now() - new Date(iso)) / 60000);
    if (!isFinite(m)) return '';
    if (m < 2) return 'just now'; if (m < 60) return m + ' min ago';
    var h = Math.round(m / 60); if (h < 24) return h + ' h ago';
    return Math.round(h / 24) + ' days ago';
  }

  // ---------- charts ----------
  function semiGauge(pct) {
    var r = 90, cx = 110, cy = 110, len = Math.PI * r;
    var arc = 'M ' + (cx - r) + ' ' + cy + ' A ' + r + ' ' + r + ' 0 0 1 ' + (cx + r) + ' ' + cy;
    var defs = svg('defs', {}, [svg('linearGradient', { id: 'g-grad', x1: '0', x2: '1' }, [
      svg('stop', { offset: '0%', 'stop-color': '#E8735F' }), svg('stop', { offset: '55%', 'stop-color': '#227A71' }), svg('stop', { offset: '100%', 'stop-color': '#2E8456' })])]);
    var track = svg('path', { d: arc, fill: 'none', stroke: C.track, 'stroke-width': '18', 'stroke-linecap': 'round' });
    var val = svg('path', { d: arc, fill: 'none', stroke: 'url(#g-grad)', 'stroke-width': '18', 'stroke-linecap': 'round', 'stroke-dasharray': len, 'stroke-dashoffset': len, class: 'anim', style: 'transition: stroke-dashoffset 1200ms cubic-bezier(.2,.8,.2,1)' });
    var ticks = [];
    for (var t = 0; t <= 10; t++) {
      var a = Math.PI * (1 - t / 10), r1 = r - 18, r2 = r - (t % 5 === 0 ? 30 : 25);
      ticks.push(svg('line', { x1: cx + r1 * Math.cos(a), y1: cy - r1 * Math.sin(a), x2: cx + r2 * Math.cos(a), y2: cy - r2 * Math.sin(a), stroke: '#C9C0B4', 'stroke-width': t % 5 === 0 ? 2.5 : 1.5, 'stroke-linecap': 'round' }));
    }
    var needle = svg('g', { class: 'anim', style: 'transform-origin: 110px 110px; transform: rotate(-90deg); transition: transform 1200ms cubic-bezier(.2,.8,.2,1)' }, [
      svg('line', { x1: cx, y1: cy, x2: cx, y2: cy - r + 34, stroke: '#1F2D3D', 'stroke-width': 4, 'stroke-linecap': 'round' }),
      svg('circle', { cx: cx, cy: cy, r: 9, fill: '#1F2D3D' }), svg('circle', { cx: cx, cy: cy, r: 3.5, fill: '#fff' })]);
    var s = svg('svg', { viewBox: '0 0 220 128', class: 'gauge', role: 'img', 'aria-label': 'Progress to launch ' + pct + ' percent' }, [defs, track, val].concat(ticks).concat([needle]));
    requestAnimationFrame(function () { requestAnimationFrame(function () {
      val.setAttribute('stroke-dashoffset', String(len * (1 - pct / 100)));
      needle.style.transform = 'rotate(' + (-90 + 180 * pct / 100) + 'deg)';
    }); });
    return s;
  }
  function ring(pct, color, big, small) {
    var r = 46, len = 2 * Math.PI * r;
    var val = svg('circle', { cx: 54, cy: 54, r: r, fill: 'none', stroke: color, 'stroke-width': 11, 'stroke-linecap': 'round', 'stroke-dasharray': len, 'stroke-dashoffset': len, class: 'anim', style: 'transition: stroke-dashoffset 1000ms cubic-bezier(.2,.8,.2,1)' });
    var s = svg('svg', { viewBox: '0 0 108 108', 'aria-hidden': 'true' }, [svg('circle', { cx: 54, cy: 54, r: r, fill: 'none', stroke: C.track, 'stroke-width': 11 }), val]);
    requestAnimationFrame(function () { requestAnimationFrame(function () { val.setAttribute('stroke-dashoffset', String(len * (1 - Math.max(pct, pct > 0 ? 2 : 0) / 100))); }); });
    return el('div', { class: 'ring' }, [s, el('div', { class: 'ring-text' }, [el('div', null, [big, small ? el('small', { text: small }) : null])])]);
  }
  function dial(pct, color, big, small, title, note) {
    return el('div', { class: 'dial' }, [ring(pct, color, big, small), el('strong', { text: title }), el('span', { text: note })]);
  }
  function commitChart(days) {
    var W = 600, H = 150, pad = 18, max = Math.max.apply(null, days.map(function (d) { return d.count; }).concat([4]));
    var bw = (W - pad) / days.length, kids = [];
    for (var g = 0; g <= 2; g++) {
      var y = H - 20 - (H - 34) * g / 2;
      kids.push(svg('line', { x1: pad, x2: W, y1: y, y2: y, stroke: C.line, 'stroke-width': 1 }));
      kids.push(svg('text', { x: 0, y: y + 4, 'font-size': 11, fill: '#5E6B78', 'font-weight': 700 }, [document.createTextNode(String(Math.round(max * g / 2)))]));
    }
    days.forEach(function (d, i) {
      var h = d.count ? Math.max(4, (H - 34) * d.count / max) : 2;
      var rect = svg('rect', { x: pad + i * bw + 2, y: H - 20 - h, width: Math.max(2, bw - 4), height: h, rx: 3, fill: d.count ? C.primary : C.line });
      rect.appendChild(svg('title', {}, [document.createTextNode(fmtDate(d.date) + ': ' + d.count + ' commit' + (d.count === 1 ? '' : 's'))]));
      kids.push(rect);
    });
    return el('div', { class: 'chart' }, [svg('svg', { viewBox: '0 0 ' + W + ' ' + H, preserveAspectRatio: 'none', role: 'img', 'aria-label': 'Commits per day, last 30 days' }, kids),
      el('div', { class: 'chart-legend' }, [el('span', { text: fmtDate(days[0].date) }), el('span', { text: 'Commits per day · last 30 days' }), el('span', { text: 'today' })])]);
  }
  function donut(parts) {
    var r = 38, len = 2 * Math.PI * r, total = parts.reduce(function (s, p) { return s + p.value; }, 0) || 1, off = 0, kids = [svg('circle', { cx: 48, cy: 48, r: r, fill: 'none', stroke: C.track, 'stroke-width': 14 })];
    parts.forEach(function (p) {
      var seg = len * p.value / total;
      kids.push(svg('circle', { cx: 48, cy: 48, r: r, fill: 'none', stroke: p.color, 'stroke-width': 14, 'stroke-dasharray': seg + ' ' + (len - seg), 'stroke-dashoffset': String(-off), transform: 'rotate(-90 48 48)' }));
      off += seg;
    });
    kids.push(svg('text', { x: 48, y: 54, 'text-anchor': 'middle', 'font-size': 20, 'font-weight': 900, fill: '#1F2D3D' }, [document.createTextNode(String(total))]));
    return svg('svg', { viewBox: '0 0 96 96', class: 'donut', role: 'img', 'aria-label': parts.map(function (p) { return p.value + ' ' + p.label; }).join(', ') }, kids);
  }

  // ---------- sections ----------
  function hero(d) {
    var gateDone = d.cp3_gate.filter(function (g) { return g.status === 'done'; }).length;
    var buildDone = d.cp3_build.filter(function (b) { return b.done; }).length;
    var cp3 = d.checkpoints.filter(function (c) { return c.status === 'active'; })[0] || { percent: 0 };
    var listDone = d.launch_checklist.filter(function (c) { return c.done; }).length;
    var gw = el('div', { class: 'gauge-wrap' }, [semiGauge(d.progress_to_launch),
      el('div', { class: 'gauge-value' }, [String(d.progress_to_launch), el('small', { text: '%' })]),
      el('div', { class: 'gauge-label', text: 'Progress to launch' }),
      el('div', { class: 'gauge-note', text: 'Checkpoints 0–5 · partners come after launch' })]);
    var dials = el('div', { class: 'dials' }, [
      dial(cp3.percent, C.primary, cp3.percent + '%', null, 'Checkpoint 3', buildDone + '/' + d.cp3_build.length + ' built · ' + gateDone + '/' + d.cp3_gate.length + ' gate'),
      dial(100 * gateDone / d.cp3_gate.length, gateDone === d.cp3_gate.length ? C.done : C.open, gateDone + '/' + d.cp3_gate.length, 'items', 'Exit gate', gateDone === d.cp3_gate.length ? 'Ready to merge into main' : 'Blocks the merge and the beta'),
      dial(100 * listDone / d.launch_checklist.length, C.amber, listDone + '/' + d.launch_checklist.length, 'done', 'Launch checklist', 'Before the Play Store listing')
    ]);
    return el('section', { class: 'panel hero-panel' }, [gw, dials]);
  }
  function reminders(d) {
    var items = (d.reminders || []).filter(function (r) { return !r.done; });
    if (!items.length) return null;
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var ul = el('ul', { class: 'reminders' });
    items.sort(function (a, b) { return a.date < b.date ? -1 : 1; }).forEach(function (r) {
      var parts = r.date.split('-'), due = new Date(+parts[0], +parts[1] - 1, +parts[2]);
      var days = Math.round((due - today) / 86400000);
      var state = days < 0 ? 'overdue' : days <= 7 ? 'soon' : 'later';
      var when = days < 0 ? Math.abs(days) + ' day' + (days === -1 ? '' : 's') + ' overdue' : days === 0 ? 'today' : 'in ' + days + ' day' + (days === 1 ? '' : 's');
      ul.appendChild(el('li', { class: 'rem ' + state }, [
        el('span', { class: 'rem-date' }, [due.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }), el('small', { text: when })]),
        el('span', { class: 'rem-text', text: r.text }),
        r.owner ? el('span', { class: 'owner', text: r.owner }) : null]));
    });
    return panel('Reminders', 'flag', 'Things to do later, so they don\'t get forgotten', [ul]);
  }
  function roadmap(d) {
    var row = el('div', { class: 'roadmap' });
    d.checkpoints.forEach(function (c) {
      row.appendChild(el('div', { class: 'cp ' + c.status }, [
        el('span', { class: 'cp-num', text: String(c.id) }),
        el('b', { text: c.name }), el('p', { text: c.note }),
        bar(c.percent), chip(c.status)]));
    });
    return panel('Checkpoints', 'map', 'Where the app is on the roadmap', [row]);
  }
  function checkpoint3(d) {
    var build = el('ul', { class: 'checklist' });
    d.cp3_build.forEach(function (b) { build.appendChild(el('li', null, [tick(b.done), b.item])); });
    var gate = el('ul', { class: 'gate' });
    d.cp3_gate.forEach(function (g) { gate.appendChild(el('li', null, [chip(g.status), el('b', { text: g.item }), el('span', { class: 'note', text: g.note })])); });
    return el('div', { class: 'grid-2' }, [
      panel('Checkpoint 3: what is built', 'list', 'Built and deployed; still switched off in the standard app', [build]),
      panel('Checkpoint 3: exit gate', 'flag', 'All three must pass before the merge into main and the beta build', [gate])]);
  }
  function codeHealth(d) {
    var r = d.repo;
    var tiles = el('div', { class: 'tiles' }, [
      ['Migrations', r.migrations], ['SQL test suites', r.sql_suites], ['SQL assertions', d.tests.sql_assertions],
      ['Commits', r.commits_total], ['main behind by', r.main_behind]
    ].map(function (t) { return el('div', { class: 'tile' }, [el('strong', { text: String(t[1]) }), el('span', { text: t[0] })]); }));
    var last = r.last_commit ? el('p', { class: 'last-commit' }, ['Latest on feature/auth-email: ', el('code', { text: r.last_commit.hash }), ' ' + r.last_commit.subject + ' · ' + ago(r.last_commit.date)]) : null;
    return panel('Code health', 'code', d.tests.sql_source + ' · Unit tests: ' + d.tests.unit_status, [tiles, commitChart(r.commits_by_day), last]);
  }
  function findings(d) {
    var order = { high: 0, medium: 1, low: 2 };
    var list = d.findings.slice().sort(function (a, b) { return (a.status === 'done') - (b.status === 'done') || order[a.severity] - order[b.severity]; });
    var open = list.filter(function (f) { return f.status !== 'done'; }).length, done = list.length - open;
    var ul = el('ul', { class: 'findings' });
    list.forEach(function (f) {
      ul.appendChild(el('li', { class: f.status === 'done' ? 'is-done' : '' }, [
        el('span', { class: 'sev ' + f.severity, title: f.severity + ' priority' }),
        el('div', null, [el('span', { class: 'f-title', text: f.title }), el('span', { class: 'f-meta', text: f.area + ' · ' + f.severity + ' priority' })]),
        f.status === 'done' ? chip('done') : el('span', { class: 'owner', text: f.owner })]));
    });
    var head = el('div', { class: 'findings-head' }, [donut([{ value: open, color: C.open, label: 'open' }, { value: done, color: C.done, label: 'done' }]),
      el('div', { class: 'legend' }, [el('div', null, [el('i', { style: 'background:' + C.open }), open + ' open']), el('div', null, [el('i', { style: 'background:' + C.done }), done + ' done']),
        el('div', { style: 'font-size:12px;color:#5E6B78' }, ['Dot colour = priority (red high, orange medium, blue low)'])])]);
    return panel('Review findings', 'pulse', 'From Claude\'s code review and tonight\'s website work', [head, ul]);
  }
  function launch(d) {
    var groups = {};
    d.launch_checklist.forEach(function (c) { (groups[c.group] = groups[c.group] || []).push(c); });
    var rows = el('div', { class: 'groups' });
    Object.keys(groups).forEach(function (g) {
      var items = groups[g], n = items.filter(function (c) { return c.done; }).length;
      rows.appendChild(el('div', { class: 'group-row' }, [el('span', { text: g }), bar(100 * n / items.length, C.amber), el('span', { text: n + '/' + items.length })]));
    });
    var ph = d.website.policy_placeholders || [];
    var pills = el('div', { class: 'pills' }, ph.map(function (p) { return el('span', { class: 'pill-ph', text: p.replace(/[\[\]]/g, '') }); }));
    var all = el('ul', { class: 'checklist' });
    d.launch_checklist.forEach(function (c) { all.appendChild(el('li', null, [tick(c.done), c.item])); });
    return panel('Launch readiness', 'rocket', 'Everything needed before the Google Play listing', [rows,
      el('p', { class: 'sub', style: 'margin-top:16px', text: ph.length ? 'Privacy and legal placeholders still to fill (' + ph.length + '):' : 'All legal placeholders are filled.' }), pills,
      el('details', { class: 'more' }, [el('summary', { text: 'Show the full checklist' }), all])]);
  }
  function website(d) {
    var pages = el('div', { class: 'pages' });
    d.website.pages.forEach(function (p) {
      var ok = p.status === 200;
      pages.appendChild(el('div', { class: 'page', title: 'HTTP ' + p.status }, [el('span', { class: 'dot ' + (ok ? 'ok' : 'bad') }), p.path + (ok ? '' : ' (' + (p.status || 'down') + ')')]));
    });
    var up = d.website.pages.filter(function (p) { return p.status === 200; }).length;
    var ld = d.website.last_deploy;
    var last = ld ? el('p', { class: 'sub', style: 'margin-top:14px' }, [
      el('span', { class: 'dot ' + (ld.verify === 'PASS' ? 'ok' : 'bad'), style: 'display:inline-block;margin-right:8px;vertical-align:middle' }),
      'Last deploy ' + fmtDate(ld.when, true) + ' (' + ago(ld.when) + ') · ' + ld.what + ' · ' + ld.files + ' file' + (ld.files === 1 ? '' : 's') + ' · verify ' + ld.verify]) : null;
    return panel('Website', 'globe', up + ' of ' + d.website.pages.length + ' public pages up', [pages, last]);
  }
  // ---------- testers and accounts ----------
  // Personal data, for Andre and Rudi only: beta sign-ups come live from people.php
  // (folder login) and app accounts from Supabase for a signed-in admin. Kept in
  // memory only; never written to data.json or to browser storage.
  var T = { box: null, beta: null, betaError: '', accounts: null, note: '', signedInAs: '', busy: false, loading: false, filter: 'all', fallbackCount: null };
  var supa = null;
  var TESTER_STATUS = {
    both: ['done', 'done', 'Beta + app account'],
    beta: ['open', 'open', 'No app account yet'],
    app: ['active', 'next', 'App only'],
    unchecked: ['next', 'next', 'App account not checked']
  };

  function supabaseClient() {
    if (supa) return supa;
    var cfg = window.HP_AUTH_CONFIG || {};
    if (!window.supabase || !cfg.supabaseUrl) return null;
    var store = null;
    try { store = window.sessionStorage; } catch (e) { store = null; }
    // The admin session lasts until the tab closes, and never touches localStorage.
    supa = window.supabase.createClient(cfg.supabaseUrl, cfg.supabasePublishableKey, {
      auth: { persistSession: Boolean(store), storage: store || undefined, storageKey: 'hp-dashboard-admin', autoRefreshToken: true, detectSessionInUrl: false }
    });
    return supa;
  }
  function loadBeta() {
    return fetch('people.php?t=' + Date.now(), { cache: 'no-store', credentials: 'same-origin', headers: { Accept: 'application/json' } })
      .then(function (r) { return r.json().catch(function () { return { ok: false, error: 'HTTP ' + r.status }; }); })
      .then(function (j) {
        if (j && j.ok) { T.beta = j.signups || []; T.betaError = ''; }
        else { T.beta = null; T.betaError = (j && j.error) || 'unknown error'; }
      })
      .catch(function () { T.beta = null; T.betaError = 'network error'; });
  }
  function loadAccounts() {
    var c = supabaseClient();
    if (!c) { T.note = 'The Supabase library didn\'t load, so app accounts can\'t be checked.'; return Promise.resolve(); }
    return c.auth.getSession().then(function (s) {
      var session = s.data && s.data.session;
      T.signedInAs = session ? (session.user.email || 'admin') : '';
      if (!session) { T.accounts = null; return; }
      return c.rpc('admin_member_directory').then(function (res) {
        if (!res.error) { T.accounts = res.data || []; T.note = ''; return; }
        T.accounts = null;
        T.note = res.error.code === 'PGRST202' ? 'Signed in. Rudi\'s admin function isn\'t live yet; app accounts appear here as soon as it is.'
          : res.error.code === '42501' ? 'This account doesn\'t have the admin role. Only Andre\'s and Rudi\'s accounts have it.'
          : 'Could not load app accounts: ' + (res.error.message || 'unknown error');
      });
    }).catch(function () { T.note = 'Could not reach Supabase.'; });
  }
  function refreshTesters() {
    T.loading = true; renderTesters();
    Promise.all([loadBeta(), loadAccounts()]).then(function () { T.loading = false; renderTesters(); });
  }
  function signIn(email, password) {
    var c = supabaseClient();
    if (!c) return;
    T.busy = true; T.note = ''; renderTesters();
    c.auth.signInWithPassword({ email: email.trim().toLowerCase(), password: password })
      .then(function (r) {
        if (r.error) { T.note = /invalid login/i.test(r.error.message || '') ? 'That email and password don\'t match an app account. Use your app login, not the dashboard password. Forgot it? Tap "Forgot password?" on the app\'s Log in screen.' : 'Sign-in failed: ' + r.error.message; return; }
        return loadAccounts();
      })
      .catch(function () { T.note = 'Could not reach Supabase.'; })
      .then(function () { T.busy = false; renderTesters(); });
  }
  function signOut() {
    var c = supabaseClient();
    if (!c) return;
    // 'local' ends only this tab's session, never the phone app's.
    c.auth.signOut({ scope: 'local' }).catch(function () {}).then(function () {
      T.accounts = null; T.signedInAs = ''; T.note = ''; T.filter = 'all'; renderTesters();
    });
  }
  function testerRows() {
    var byEmail = {};
    function row(e) { return byEmail[e] || (byEmail[e] = { email: e, beta: null, account: null }); }
    function key(v) { return String(v || '').trim().toLowerCase(); }
    (T.beta || []).forEach(function (b) { if (key(b.email)) row(key(b.email)).beta = b; });
    (T.accounts || []).forEach(function (a) { if (key(a.email)) row(key(a.email)).account = a; });
    var checked = T.accounts !== null;
    return Object.keys(byEmail).map(function (e) {
      var r = byEmail[e];
      r.status = !checked ? 'unchecked' : r.beta && r.account ? 'both' : r.beta ? 'beta' : 'app';
      r.latest = Math.max(r.beta ? +new Date(r.beta.last_signed_up) || 0 : 0, r.account ? +new Date(r.account.created_at) || 0 : 0);
      return r;
    }).sort(function (a, b) { return b.latest - a.latest; });
  }
  function testerItem(r) {
    var betaName = r.beta && r.beta.first_name, appName = r.account && r.account.first_name;
    var differs = betaName && appName && betaName.trim().toLowerCase() !== appName.trim().toLowerCase();
    var facts = [];
    if (r.beta) facts.push('Beta sign-up ' + (fmtDate(r.beta.first_signed_up) || 'date unknown') + (r.beta.times > 1 ? ' (' + r.beta.times + '×)' : ''));
    if (r.account) facts.push('Account ' + (fmtDate(r.account.created_at) || 'date unknown') + (r.account.email_confirmed ? '' : ', email not confirmed'));
    var st = TESTER_STATUS[r.status];
    return el('li', null, [
      el('div', { class: 'tester-main' }, [
        el('b', { text: (betaName || appName || 'No first name') + (differs ? ' · in the app: ' + appName : '') }),
        el('span', { class: 'tester-email', text: r.email }),
        el('span', { class: 'f-meta', text: facts.join(' · ') })]),
      tag(st[0], st[1], st[2])]);
  }
  function testerAccess() {
    if (T.signedInAs) {
      var out = el('button', { type: 'button', class: 'refresh' }, ['Sign out']);
      out.addEventListener('click', signOut);
      return el('div', { class: 'tester-access' }, [el('span', { text: 'App accounts: signed in as ' + T.signedInAs + ', until you close this tab' }), out]);
    }
    // 'new-password' stops the browser filling in a password saved for this site,
    // which is usually not the app password; it is typed by hand instead.
    var email = el('input', { type: 'email', autocomplete: 'off', placeholder: 'Your app email', 'aria-label': 'Your Homeward Paws app email', required: 'required' });
    var pass = el('input', { type: 'password', autocomplete: 'new-password', placeholder: 'Your app password', 'aria-label': 'Your Homeward Paws app password', required: 'required' });
    var go = el('button', { type: 'submit', class: 'refresh' }, [T.busy ? 'Signing in…' : 'Sign in']);
    if (T.busy) go.disabled = true;
    var form = el('form', { class: 'tester-signin' }, [
      el('p', { class: 'sub', text: 'To load the app accounts, sign in with your Homeward Paws app login: the email and password you use in the app on your phone, not the dashboard password. The account needs the admin role. You stay signed in until you close this tab.' }),
      el('div', { class: 'tester-fields' }, [email, pass, go])]);
    form.addEventListener('submit', function (e) { e.preventDefault(); signIn(email.value, pass.value); });
    return form;
  }
  function renderTesters() {
    var box = T.box;
    if (!box) return;
    box.innerHTML = '';
    var rows = testerRows(), checked = T.accounts !== null;
    function count(s) { return String(rows.filter(function (r) { return r.status === s; }).length); }
    var betaCount = T.beta ? T.beta.length : T.fallbackCount;
    box.appendChild(el('div', { class: 'tiles' }, [
      ['Beta sign-ups', betaCount == null ? '–' : String(betaCount)], ['App accounts', checked ? String(T.accounts.length) : '–'],
      ['Beta + app', checked ? count('both') : '–'], ['Beta, no account', checked ? count('beta') : '–'], ['App only', checked ? count('app') : '–']
    ].map(function (t) { return el('div', { class: 'tile' }, [el('strong', { text: t[1] }), el('span', { text: t[0] })]); })));
    box.appendChild(testerAccess());
    if (T.note) box.appendChild(el('p', { class: 'tester-note', text: T.note }));
    if (T.betaError) box.appendChild(el('p', { class: 'tester-note', text: 'Beta sign-ups could not be loaded (' + T.betaError + ').' }));
    if (checked) {
      box.appendChild(el('div', { class: 'tester-filters', role: 'group', 'aria-label': 'Show' }, [['all', 'All'], ['both', 'Beta + app'], ['beta', 'Beta, no account'], ['app', 'App only']].map(function (o) {
        var b = el('button', { type: 'button', class: 'filter' + (T.filter === o[0] ? ' on' : ''), 'aria-pressed': String(T.filter === o[0]) }, [o[1]]);
        b.addEventListener('click', function () { T.filter = o[0]; renderTesters(); });
        return b;
      })));
    }
    var shown = T.filter === 'all' || !checked ? rows : rows.filter(function (r) { return r.status === T.filter; });
    if (!shown.length) { box.appendChild(el('p', { class: 'sub', style: 'margin-top:12px', text: T.loading ? 'Loading…' : 'Nobody to show.' })); return; }
    var ul = el('ul', { class: 'testers' });
    shown.forEach(function (r) { ul.appendChild(testerItem(r)); });
    box.appendChild(ul);
  }
  function testersPanel(d) {
    T.box = el('div');
    T.fallbackCount = d.website.beta_signups;
    renderTesters();
    return panel('Testers and accounts', 'list', 'Beta sign-ups from the website and app accounts, matched by email · read live when you open this page, never stored', [T.box]);
  }

  function boardThread(d) {
    var b = d.board;
    if (!b || !b.recent) return null;
    var NAME = { claude: 'Claude', codex: 'Codex' }, COLOR = { claude: C.primary, codex: C.amber };
    function who(side) { return el('span', { class: 'who', style: 'background:' + COLOR[side] }, [NAME[side]]); }
    var total = b.messages || 0;
    var totals = el('div', { class: 'board-totals' }, [
      el('div', { class: 'big-number', style: 'margin-top:0' }, [el('strong', { text: String(total) }), el('span', { text: 'messages · Claude ' + b.by.claude + ' · Codex ' + b.by.codex })]),
      el('div', { class: 'split', 'aria-hidden': 'true' }, [
        el('i', { style: 'background:' + C.primary + ';width:' + (total ? 100 * b.by.claude / total : 0) + '%' }),
        el('i', { style: 'background:' + C.amber + ';width:' + (total ? 100 * b.by.codex / total : 0) + '%' })])]);
    var seen = el('div', { class: 'seen' }, ['claude', 'codex'].map(function (side) {
      var s = b.sides && b.sides[side];
      return el('div', { class: 'seen-side' }, [who(side), el('div', null, [
        el('strong', { text: s ? 'Last on the board ' + ago(s.last_at) : 'Not seen on the board yet' }),
        el('span', { text: s ? fmtDate(s.last_at, true) + ' · last command: ' + s.last_command + ' · ' + s.reads + ' read' + (s.reads === 1 ? '' : 's') + ', ' + s.posts + ' post' + (s.posts === 1 ? '' : 's') : (b.log_since ? 'No requests since tracking began' : 'Tracking starts with the next request') })])]);
    }));
    var ul = el('ul', { class: 'thread' });
    b.recent.forEach(function (m) {
      var other = m.from === 'claude' ? 'codex' : 'claude';
      var answered = m.replies.filter(function (r) { return r.from === other; });
      var tags = el('div', { class: 'thread-tags' }, [
        answered.length ? tag('done', 'done', 'Answered by ' + NAME[other])
          : m.read_by_other ? tag('active', 'done', 'Read by ' + NAME[other] + ' ' + fmtDate(m.read_by_other, true))
          : tag('next', 'open', b.log_since && m.at < b.log_since ? 'Not read since tracking began' : 'Not read by ' + NAME[other] + ' yet')]);
      var replies = m.replies.map(function (r) {
        return el('span', { class: 'reply' }, ['↳ ', NAME[r.from] + ' answered in “' + r.slug + '” · ' + fmtDate(r.at, true)]);
      });
      ul.appendChild(el('li', null, [who(m.from),
        el('div', { class: 'thread-main' }, [el('b', { text: m.slug }), el('span', { class: 'f-meta', text: fmtDate(m.at, true) + ' · ' + ago(m.at) })].concat(replies)),
        tags]));
    });
    var since = b.log_since ? 'Reads are tracked from ' + fmtDate(b.log_since, true) + '; earlier reads are not known.' : 'Read tracking has just been switched on; nothing logged yet.';
    return panel('Agent board', 'pulse', 'Messages between Claude and Rudi\'s Codex: who has read what, and who answered · newest ' + b.recent.length + ' shown', [totals, seen, ul,
      el('p', { class: 'sub', style: 'margin-top:12px', text: since + ' The log records time, side and command only, never message contents.' })]);
  }
  function activity(d) {
    var ul = el('ul', { class: 'timeline' });
    d.activity.forEach(function (a) { ul.appendChild(el('li', null, [el('time', { text: fmtDate(a.date) }), a.text])); });
    return panel('Recent activity', 'pulse', null, [ul]);
  }

  // ---------- load ----------
  var state = document.getElementById('state'), content = document.getElementById('content');
  function load() {
    fetch('data.json?t=' + Date.now(), { cache: 'no-store', credentials: 'same-origin' })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (d) {
        content.innerHTML = '';
        [hero(d), reminders(d), roadmap(d), checkpoint3(d), el('div', { class: 'grid-2' }, [codeHealth(d), findings(d)]),
         launch(d), el('div', { class: 'grid-2' }, [website(d), activity(d)]), testersPanel(d), boardThread(d)].forEach(function (s) { if (s) content.appendChild(s); });
        content.style.display = 'grid'; content.style.gap = '20px';
        content.hidden = false; state.hidden = true;
        document.getElementById('updated').textContent = 'Updated ' + fmtDate(d.updated, true) + ' (' + ago(d.updated) + ')';
        refreshTesters();
      })
      .catch(function () {
        state.hidden = false; content.hidden = true;
        state.innerHTML = '';
        state.appendChild(el('h2', { text: 'The dashboard data could not be loaded' }));
        state.appendChild(el('p', { text: 'Check your connection and tap Refresh.' }));
        document.getElementById('updated').textContent = 'Not loaded';
      });
  }
  document.getElementById('refresh').addEventListener('click', load);
  load();
})();
