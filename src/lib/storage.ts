import { balance, depositBalance, validDate } from "./accounting";
import type { Data } from "./types";

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;
const text = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;
const yen = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
const date = (value: unknown): value is string => typeof value === "string" && validDate(value);
const timestamp = (value: unknown): boolean =>
  typeof value === "string" && Number.isFinite(Date.parse(value));

/** Validate local data before it can reach rendering or accounting functions. */
export function isStoredData(value: unknown): value is Data {
  if (!record(value) || value.version !== 1 || !yen(value.feeLimit)) return false;
  const { customers, invoices, deposits, matches } = value;
  if (
    !Array.isArray(customers) ||
    !Array.isArray(invoices) ||
    !Array.isArray(deposits) ||
    !Array.isArray(matches)
  )
    return false;

  if (
    !customers.every((item) => record(item) && text(item.id) && text(item.name) && text(item.kana))
  )
    return false;
  if (
    !deposits.every(
      (item) =>
        record(item) &&
        text(item.id) &&
        date(item.date) &&
        text(item.name) &&
        yen(item.amount) &&
        item.amount > 0,
    )
  )
    return false;
  if (
    !invoices.every((item) => {
      if (
        !record(item) ||
        !text(item.id) ||
        !text(item.customerId) ||
        !text(item.number) ||
        !yen(item.amount) ||
        item.amount === 0 ||
        !date(item.issued) ||
        !date(item.due) ||
        item.issued > item.due ||
        !Array.isArray(item.notes)
      )
        return false;
      if (
        !item.notes.every(
          (note) =>
            record(note) &&
            text(note.id) &&
            date(note.date) &&
            ["電話", "メール", "訪問"].includes(String(note.method)) &&
            text(note.content),
        )
      )
        return false;
      const promise = item.promise;
      return (
        promise === undefined ||
        (record(promise) &&
          date(promise.date) &&
          yen(promise.amount) &&
          promise.amount > 0 &&
          promise.amount <= item.amount &&
          yen(promise.baseline) &&
          promise.baseline <= item.amount)
      );
    })
  )
    return false;
  if (
    !matches.every(
      (item) =>
        record(item) &&
        text(item.id) &&
        text(item.depositId) &&
        timestamp(item.date) &&
        (item.canceledAt === undefined || timestamp(item.canceledAt)) &&
        Array.isArray(item.allocations) &&
        item.allocations.length > 0 &&
        item.allocations.every(
          (row) =>
            record(row) && text(row.invoiceId) && yen(row.amount) && row.amount > 0 && yen(row.fee),
        ),
    )
  )
    return false;

  // The complete shape is checked above; now check identity and accounting references.
  const data = value as Data;
  const allIds = [
    ...data.customers,
    ...data.invoices,
    ...data.deposits,
    ...data.matches,
    ...data.invoices.flatMap((item) => item.notes),
  ].map((item) => item.id);
  if (new Set(allIds).size !== allIds.length) return false;
  if (
    !data.invoices.every(
      (item) =>
        data.customers.some((customer) => customer.id === item.customerId) &&
        balance(item, data.matches) >= 0,
    )
  )
    return false;
  if (!data.deposits.every((item) => depositBalance(item, data.matches) >= 0)) return false;
  return data.matches.every(
    (item) =>
      data.deposits.some((deposit) => deposit.id === item.depositId) &&
      new Set(item.allocations.map((row) => row.invoiceId)).size === item.allocations.length &&
      item.allocations.every((row) =>
        data.invoices.some((invoice) => invoice.id === row.invoiceId),
      ),
  );
}
