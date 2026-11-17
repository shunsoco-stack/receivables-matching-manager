import type { Allocation, Data, Deposit, Invoice, Match } from "./types";

export const money = (value: number) => `¥${value.toLocaleString("ja-JP")}`;

export function todayJst(now = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Tokyo",
  }).format(now);
}

export function shiftDate(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function validDate(date: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    !Number.isNaN(Date.parse(date)) &&
    new Date(date).toISOString().slice(0, 10) === date
  );
}

export function normalizeName(name: string): string {
  return name
    .normalize("NFKC")
    .toUpperCase()
    .replace(/[\s\u3000]/g, "")
    .replace(/株式会社|有限会社|合同会社|カブシキガイシャ|ユウゲンガイシャ|ゴウドウガイシャ/g, "")
    .replace(/\([カユド]\)|^[カユド]\)|\([カユド]$/g, "")
    .replace(/[・.．ー−-]/g, "");
}

export function paid(invoiceId: string, matches: Match[]): number {
  return matches
    .filter((match) => !match.canceledAt)
    .reduce((total, match) => {
      return (
        total +
        match.allocations
          .filter((allocation) => allocation.invoiceId === invoiceId)
          .reduce((sum, allocation) => sum + allocation.amount + allocation.fee, 0)
      );
    }, 0);
}

export function balance(invoice: Invoice, matches: Match[]): number {
  return invoice.amount - paid(invoice.id, matches);
}

export function depositBalance(deposit: Deposit, matches: Match[]): number {
  return (
    deposit.amount -
    matches
      .filter((match) => match.depositId === deposit.id && !match.canceledAt)
      .reduce((sum, match) => {
        return sum + match.allocations.reduce((value, row) => value + row.amount, 0);
      }, 0)
  );
}

export function status(invoice: Invoice, matches: Match[], today: string): string {
  const remaining = balance(invoice, matches);
  if (remaining === 0) return "完済";
  if (invoice.due < today) return "期限超過";
  return remaining < invoice.amount ? "一部入金" : "未入金";
}

export function agingBucket(due: string, today: string): number {
  const days = Math.round((Date.parse(today) - Date.parse(due)) / 86_400_000);
  if (days <= 0) return 0;
  if (days <= 30) return 1;
  if (days <= 60) return 2;
  if (days <= 90) return 3;
  return 4;
}

export const agingLabels = ["期日内", "1〜30日超過", "31〜60日", "61〜90日", "91日超"];

export function candidates(data: Data, deposit: Deposit) {
  const available = depositBalance(deposit, data.matches);
  return data.invoices
    .filter((invoice) => balance(invoice, data.matches) > 0)
    .map((invoice) => {
      const customer = data.customers.find((item) => item.id === invoice.customerId)!;
      const remaining = balance(invoice, data.matches);
      const difference = remaining - available;
      const nameMatches = normalizeName(deposit.name) === normalizeName(customer.kana);
      const labels: string[] = [];
      let score = 0;
      if (nameMatches) {
        labels.push("名義一致");
        score += 100;
      }
      if (difference === 0) {
        labels.push("金額一致");
        score += 60;
      } else if (difference > 0 && difference <= data.feeLimit) {
        labels.push(`手数料差引 ${money(difference)}`);
        score += 40;
      } else if (nameMatches && difference > 0) {
        labels.push("一部入金の候補");
      } else if (nameMatches && difference < 0) {
        labels.push("まとめ入金の候補");
      }
      return { invoice, customer, remaining, labels, score };
    })
    .sort((a, b) => b.score - a.score || a.invoice.due.localeCompare(b.invoice.due));
}

export function validateAllocations(
  data: Data,
  depositId: string,
  allocations: Allocation[],
): void {
  const deposit = data.deposits.find((item) => item.id === depositId);
  if (!deposit || allocations.length === 0) throw new Error("入金と請求を選択してください。");
  if (new Set(allocations.map((row) => row.invoiceId)).size !== allocations.length) {
    throw new Error("同じ請求を重複して消込できません。");
  }
  let total = 0;
  let fees = 0;
  for (const row of allocations) {
    const invoice = data.invoices.find((item) => item.id === row.invoiceId);
    if (
      !invoice ||
      !Number.isSafeInteger(row.amount) ||
      !Number.isSafeInteger(row.fee) ||
      row.amount <= 0 ||
      row.fee < 0
    ) {
      throw new Error("消込額は1円以上、手数料は0円以上の整数で入力してください。");
    }
    const remaining = balance(invoice, data.matches);
    if (row.amount + row.fee > remaining) throw new Error("請求残高を超えています。");
    if (row.fee > 0 && row.amount + row.fee !== remaining) {
      throw new Error("手数料処理は差額を全額処理して完済する場合に使えます。");
    }
    total += row.amount;
    fees += row.fee;
  }
  if (total > depositBalance(deposit, data.matches)) throw new Error("入金残額を超えています。");
  if (fees > data.feeLimit) throw new Error("手数料の合計が許容額を超えています。");
}

export function applyMatch(data: Data, match: Match): Data {
  if (data.matches.some((item) => item.id === match.id))
    throw new Error("履歴IDが重複しています。");
  validateAllocations(data, match.depositId, match.allocations);
  return { ...data, matches: [...data.matches, match] };
}

export function cancelMatch(data: Data, id: string, canceledAt: string): Data {
  return {
    ...data,
    matches: data.matches.map((match) => (match.id === id ? { ...match, canceledAt } : match)),
  };
}

export function promiseRemaining(invoice: Invoice, matches: Match[]): number {
  if (!invoice.promise || balance(invoice, matches) === 0) return 0;
  const since = Math.max(0, paid(invoice.id, matches) - invoice.promise.baseline);
  return Math.min(balance(invoice, matches), Math.max(0, invoice.promise.amount - since));
}

export function scheduleGroup(date: string, today: string): string {
  if (date < today) return "予定超過";
  const day = new Date(`${today}T00:00:00Z`).getUTCDay();
  const sunday = shiftDate(today, (7 - day) % 7);
  if (date <= sunday) return "今週";
  if (date <= shiftDate(sunday, 7)) return "来週";
  return "再来週以降";
}
