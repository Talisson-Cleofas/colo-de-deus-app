export type DateInput = string | number | Date | null | undefined;
const SHEETS_EPOCH = Date.UTC(1899, 11, 30);

export function parseDateSafe(value: DateInput): Date | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : new Date(value.getTime());
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return parseNumber(value);
  const text = String(value).trim();
  if (!text) return null;
  if (/^-?\d+(?:[.,]\d+)?$/.test(text)) return parseNumber(Number(text.replace(',', '.')));

  const br = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:[ T](\d{1,2}):?(\d{2})?(?::?(\d{2}))?)?$/);
  if (br) return fromParts(+br[3], +br[2], +br[1], +(br[4] || 0), +(br[5] || 0), +(br[6] || 0));

  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDateSafe(value: DateInput, fallback = 'Data não informada'): string {
  const date = parseDateSafe(value);
  if (!date) return fallback;
  try {
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date);
  } catch {
    return fallback;
  }
}

export function dateInputValueSafe(value: DateInput): string {
  const date = parseDateSafe(value);
  if (!date) return '';
  return `${date.getFullYear().toString().padStart(4, '0')}-${(date.getMonth()+1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
}

export function timestampSafe(value: DateInput): number | null { return parseDateSafe(value)?.getTime() ?? null; }

function parseNumber(value: number): Date | null {
  if (!Number.isFinite(value)) return null;
  const ms = value > 10_000_000_000 ? value : value > 1_000_000_000 ? value * 1000 : SHEETS_EPOCH + value * 86_400_000;
  const date = new Date(ms);
  return Number.isNaN(date.getTime()) ? null : date;
}
function fromParts(year:number,month:number,day:number,hour:number,minute:number,second:number):Date|null {
  const date = new Date(year, month-1, day, hour, minute, second);
  if (date.getFullYear()!==year || date.getMonth()!==month-1 || date.getDate()!==day) return null;
  return date;
}
