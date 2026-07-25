const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export function parseDateSafe(value?: string | number | Date | null, middayForDateOnly = true): Date | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  const normalized = DATE_ONLY.test(raw) && middayForDateOnly ? `${raw}T12:00:00` : raw;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDateSafe(
  value?: string | number | Date | null,
  options: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' },
  fallback = 'Data não informada',
): string {
  const date = parseDateSafe(value);
  if (!date) return fallback;
  try {
    return new Intl.DateTimeFormat('pt-BR', options).format(date);
  } catch {
    return fallback;
  }
}

export function formatDateTimeSafe(
  value?: string | number | Date | null,
  fallback = 'Data não informada',
): string {
  const date = parseDateSafe(value, false);
  if (!date) return fallback;
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    }).format(date);
  } catch {
    return fallback;
  }
}

export function isValidDateOnly(value?: string | null): boolean {
  if (!value || !DATE_ONLY.test(value)) return false;
  const date = parseDateSafe(value);
  if (!date) return false;
  const [year, month, day] = value.split('-').map(Number);
  return date.getFullYear() === year && date.getMonth() + 1 === month && date.getDate() === day;
}
