export const AUTH_REDIRECT_URL = 'homewardpaws://auth/confirm';
export const AUTH_EMAIL_COOLDOWN_SECONDS = 60;

export function isEmailNotConfirmed(error) {
  return error?.code === 'email_not_confirmed' || /email not confirmed/i.test(error?.message || '');
}

export function authEmailError(error) {
  const code = error?.code || '';
  const message = error?.message || '';
  if (code === 'otp_expired' || /expired/i.test(message)) return 'This link or code has expired.';
  if (code === 'over_email_send_rate_limit' || /rate limit/i.test(message)) return 'Please wait a minute before asking for another email.';
  if (isEmailNotConfirmed(error)) return 'Please confirm your email first.';
  if (/already (confirmed|registered|verified)/i.test(message)) return 'Your email is already confirmed. Please log in.';
  if (/invalid login credentials/i.test(message)) return 'Email or password is incorrect.';
  if (/invalid|token|otp/i.test(message)) return 'That link or code is not valid. Check the latest email.';
  if (/fetch|network|offline|connection/i.test(message) || error instanceof TypeError) return 'You appear to be offline. Please try again when connected.';
  return 'Something went wrong. Please try again.';
}
