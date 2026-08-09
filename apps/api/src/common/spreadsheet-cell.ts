const FORMULA_PREFIX = /^[\t\r\n ]*[=+\-@]/;

export function neutralizeSpreadsheetFormula(value: unknown): string {
  const text = String(value ?? '');
  return FORMULA_PREFIX.test(text) ? `'${text}` : text;
}

export function escapeCsvCell(value: unknown): string {
  return `"${neutralizeSpreadsheetFormula(value).replaceAll('"', '""')}"`;
}
