/**
 * Display name for a person joined in from `registration`.
 *
 * Every such join is a LEFT JOIN server-side, so any of these fields can be
 * null even when the row exists — a project whose client record is missing
 * still has to render rather than crash or show an empty cell. The fallback
 * chain degrades to something an operator can still act on: full name, then
 * email, then the raw id, and only then a generic label.
 */
export function personName(person: {
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  id?: number | string | null;
}): string {
  const full = [person.first_name, person.last_name].filter(Boolean).join(' ').trim();
  if (full) return full;
  if (person.email) return person.email;
  if (person.id !== null && person.id !== undefined) return `Client #${person.id}`;
  return 'Unknown client';
}

/** `personName` for a project row carrying the admin/staff client join. */
export function clientName(project: {
  client_first_name?: string | null;
  client_last_name?: string | null;
  client_email?: string | null;
  client_id?: number | string | null;
}): string {
  return personName({
    first_name: project.client_first_name,
    last_name: project.client_last_name,
    email: project.client_email,
    id: project.client_id,
  });
}

/** `personName` for a payment row carrying the verification-queue join. */
export function paymentClientName(payment: {
  client_first_name?: string | null;
  client_last_name?: string | null;
}): string {
  return personName({
    first_name: payment.client_first_name,
    last_name: payment.client_last_name,
  });
}

/**
 * What to call a project in an admin list: its human reference code and title.
 * Falls back to the bare title, then to a shortened id — never the full raw
 * UUID, which is what the verification queue used to show.
 */
export function projectLabel(row: {
  project_title?: string | null;
  project_reference_code?: string | null;
  project_id?: string | null;
}): string {
  if (row.project_title) {
    return row.project_reference_code
      ? `${row.project_reference_code} · ${row.project_title}`
      : row.project_title;
  }
  if (row.project_reference_code) return row.project_reference_code;
  return row.project_id ? `Project ${row.project_id.slice(0, 8)}` : 'Unknown project';
}
