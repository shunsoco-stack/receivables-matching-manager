import { validDate } from "./accounting";

export type CsvRow = { date: string; name: string; amount: number; line: number };

export function parseCsv(text: string): { rows: CsvRow[]; errors: string[] } {
  const rows: CsvRow[] = [];
  const errors: string[] = [];
  const lines = text
    .replace(/^\uFEFF/, "")
    .trim()
    .split(/\r?\n/);
  for (const [index, line] of lines.entries()) {
    if (!line.trim()) continue;
    const columns: string[] = [];
    let current = "";
    let quoted = false;
    for (let position = 0; position < line.length; position += 1) {
      const char = line[position];
      if (char === '"' && quoted && line[position + 1] === '"') {
        current += '"';
        position += 1;
      } else if (char === '"') {
        quoted = !quoted;
      } else if (char === "," && !quoted) {
        columns.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    columns.push(current.trim());
    if (index === 0 && columns.join(",") === "日付,名義,金額") continue;
    const [date, name, rawAmount] = columns;
    const amount = Number(rawAmount?.replace(/,/g, ""));
    if (
      quoted ||
      columns.length !== 3 ||
      !validDate(date ?? "") ||
      !name ||
      !/^[\d,]+$/.test(rawAmount ?? "") ||
      !Number.isSafeInteger(amount) ||
      amount <= 0
    ) {
      errors.push(`${index + 1}行目: 日付（YYYY-MM-DD）・名義・正の整数金額を確認してください。`);
    } else {
      rows.push({ date, name, amount, line: index + 1 });
    }
  }
  if (rows.length === 0 && errors.length === 0) errors.push("取込可能な明細がありません。");
  return { rows, errors };
}
