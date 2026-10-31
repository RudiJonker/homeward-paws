(function () {
  var form = document.getElementById('beta-form');
  if (!form || !window.fetch) return;
  document.getElementById('started').value = String(Date.now());
  var err = document.getElementById('form-error');
  var btn = document.getElementById('submit-btn');
  function fail(msg) { err.textContent = msg; err.hidden = false; btn.disabled = false; btn.textContent = 'Send me the download link'; }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    err.hidden = true;
    var f = form.elements;
    if (!f.first_name.value.trim()) return fail('Please enter your first name.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.value.trim())) return fail('Please enter a valid email address.');
    if (!f.adult.checked) return fail('Beta testers must be 18 or older and use an Android phone.');
    if (!f.agree.checked) return fail('Please accept the terms and privacy policy.');
    btn.disabled = true; btn.textContent = 'Sending…';
    fetch(form.action, { method: 'POST', body: new FormData(form), headers: { 'Accept': 'application/json' } })
      .then(function (r) { return r.json().catch(function () { return { ok: false }; }); })
      .then(function (d) {
        if (!d.ok) return fail(d.error || 'Something went wrong. Please try again, or email info@digitack.co.za.');
        document.getElementById('done-email').textContent = f.email.value.trim();
        form.hidden = true;
        document.getElementById('beta-done').hidden = false;
      })
      .catch(function () { fail('We could not reach the server. Check your connection and try again.'); });
  });
})();
