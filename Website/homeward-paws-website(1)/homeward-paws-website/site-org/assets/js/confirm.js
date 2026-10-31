(function () {
  var params = new URLSearchParams(window.location.search);
  var tokenHash = params.get('token_hash');
  var type = params.get('type');
  var allowed = { email: true, recovery: true };

  var el = function (id) { return document.getElementById(id); };
  var openApp = el('openApp'), confirmHere = el('confirmHere'), statusBox = el('status');

  function show(kind, text) {
    statusBox.hidden = false;
    statusBox.className = 'auth-status ' + kind;
    statusBox.textContent = text;
  }

  // Strip the token from the address bar so it is not kept in history or shared by accident.
  if (window.history && window.history.replaceState) {
    window.history.replaceState(null, '', window.location.pathname);
  }

  if (!tokenHash || !allowed[type]) {
    el('title').textContent = 'This link is not complete';
    el('intro').textContent = 'Open the latest email from Homeward Paws and tap its button again, or type the 6-digit code from that email in the app.';
    openApp.hidden = true;
    el('hint').innerHTML = 'Need help? Email <strong>info@digitack.co.za</strong>.';
    return;
  }

  openApp.href = 'homewardpaws://auth/confirm?token_hash=' + encodeURIComponent(tokenHash) + '&type=' + encodeURIComponent(type);

  if (type === 'email') {
    el('title').textContent = 'Confirm your email';
    el('intro').textContent = 'On your phone, tap the button to confirm your email and continue in the app.';
    confirmHere.hidden = false;
  } else {
    el('title').textContent = 'Reset your password';
    el('intro').textContent = 'Passwords are changed in the app. On your phone, tap the button to choose a new password.';
    el('hint').textContent = 'Reading this on a computer? Open the email on your phone instead, or type the 6-digit code from the email in the app.';
  }

  confirmHere.addEventListener('click', function () {
    var cfg = window.HP_AUTH_CONFIG || {};
    if (!window.supabase || !cfg.supabaseUrl || !cfg.supabasePublishableKey || cfg.supabaseUrl.indexOf('YOUR-') !== -1) {
      show('err', 'Confirmation from a computer is not available right now. Please use the button on your phone or type the code in the app.');
      return;
    }
    confirmHere.disabled = true;
    confirmHere.textContent = 'Confirming…';
    var client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabasePublishableKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
    });
    client.auth.verifyOtp({ token_hash: tokenHash, type: 'email' }).then(function (res) {
      if (res.error) {
        var expired = /expired|invalid/i.test(res.error.message || '');
        show('err', expired
          ? 'This link has expired or was already used. Open the app and ask for a new email, or log in if you have already confirmed.'
          : 'We could not confirm your email. Please try again from your phone, or type the code in the app.');
        confirmHere.disabled = false;
        confirmHere.textContent = 'Confirm on this computer instead';
        return;
      }
      client.auth.signOut();
      openApp.hidden = true;
      confirmHere.hidden = true;
      el('title').textContent = 'Email confirmed';
      el('intro').textContent = 'Thank you. Open Homeward Paws on your phone and log in to finish setting up your account.';
      el('hint').hidden = true;
      show('ok', 'Your email address is confirmed.');
    }).catch(function () {
      show('err', 'You seem to be offline. Check your connection and try again.');
      confirmHere.disabled = false;
      confirmHere.textContent = 'Confirm on this computer instead';
    });
  });
})();
