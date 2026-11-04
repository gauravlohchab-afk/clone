/** Formats digits typed into a date field as YYYY-MM-DD. */
export function formatDob(raw: string) {
  const d = raw.replace(/\D/g, '').slice(0, 8);
  return [d.slice(0, 4), d.slice(4, 6), d.slice(6, 8)].filter(Boolean).join('-');
}
