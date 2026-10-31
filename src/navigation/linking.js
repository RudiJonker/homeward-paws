import { getStateFromPath } from '@react-navigation/native';

export const linking = {
  prefixes: [
    'homewardpaws://',
    'https://homewardpaws.org.za/',
    'https://www.homewardpaws.org.za/',
    'https://digitack.co.za/paws/',
    'https://www.digitack.co.za/paws/'
  ],
  config: {
    screens: { AuthCallback: 'auth/confirm' }
  },
  getStateFromPath(path, options) {
    const normalized = path.replace(/^\/?auth\/confirm\.html(?=\?|$)/, 'auth/confirm');
    return getStateFromPath(normalized, options);
  }
};
