/** Public contact for privacy/legal requests; set `VITE_CONTACT_EMAIL` in `.env`. */
export function getContactEmail() {
  const v = import.meta.env.VITE_CONTACT_EMAIL;
  return typeof v === 'string' ? v.trim() : '';
}

export function contactEmailLabel() {
  return getContactEmail() || '[Insert Contact Email]';
}

export function contactEmailMailto() {
  const e = getContactEmail();
  return e.includes('@') ? `mailto:${e}` : null;
}
