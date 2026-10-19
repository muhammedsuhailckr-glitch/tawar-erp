export type CsvCell = string | number | null | undefined;

export function csvCell(value: CsvCell): string {
  let text = String(value ?? '');
  // Money calculated by the app stays numeric, including negative balances.
  // User-entered text is escaped to prevent spreadsheet formula execution.
  if (typeof value !== 'number' && (/^[=+@\-\t\r\n]/.test(text) || /^[=+@\-]/.test(text.trimStart()))) {
    text = "'" + text;
  }
  return '"' + text.replaceAll('"', '""') + '"';
}

export function csvDocument(rows: CsvCell[][]): string {
  return '\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n');
}
