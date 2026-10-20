import { env } from './env';

export const links = {
  website: env.websiteUrl,
  privacy: `${env.websiteUrl}/privacy-policy.html`,
  terms: `${env.websiteUrl}/terms.html`,
  deleteAccount: `${env.websiteUrl}/delete-account.html`,
  childSafety: `${env.websiteUrl}/child-safety.html`,
  help: `${env.websiteUrl}/safety.html`,
  companyWebsite: 'https://digitack.co.za',
  supportEmail: 'info@digitack.co.za'
};
