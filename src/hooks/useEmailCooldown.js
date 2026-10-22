import { useEffect, useState } from 'react';

import { AUTH_EMAIL_COOLDOWN_SECONDS } from '../utils/authEmail';

export function useEmailCooldown(initialSeconds = 0) {
  const [seconds, setSeconds] = useState(initialSeconds);

  useEffect(() => {
    if (seconds <= 0) return undefined;
    const timer = setTimeout(() => setSeconds((current) => Math.max(0, current - 1)), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);

  return { seconds, startCooldown: () => setSeconds(AUTH_EMAIL_COOLDOWN_SECONDS) };
}
