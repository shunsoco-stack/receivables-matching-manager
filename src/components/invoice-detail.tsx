"use client";

import Link from "next/link";
import { useState } from "react";
import { useStore } from "./store";
import { Heading, Status } from "./ui";
import { History } from "./history";
import { balance, money, paid, promiseRemaining, status, validDate } from "@/lib/accounting";
import type { Invoice, Note } from "@/lib/types";

export function InvoiceDetail({ id }: { id: string }) {
  const { data, update, today } = useStore();
  const [message, setMessage] = useState("");
  const invoice = data.invoices.find((item) => item.id === id);
  if (!invoice) {
    return (
      <main>
        <h1>請求が見つかりません</h1>
        <Link className="back-link" href="/invoices">
          請求一覧へ
        </Link>
      </main>
    );
  }
  const customer = data.customers.find((item) => item.id === invoice.customerId)!;
  const remaining = balance(invoice, data.matches);
  const fees = data.matches
    .filter((item) => !item.canceledAt)
    .flatMap((item) => item.allocations)
    .filter((item) => item.invoiceId === id)
    .reduce((sum, item) => sum + item.fee, 0);
  function save(next: Invoice) {
    update({ ...data, invoices: data.invoices.map((item) => (item.id === id ? next : item)) });
  }
  return (
    <main>
      <Link className="back-link" href="/invoices">
        ← 請求一覧
      </Link>
      <Heading
        eyebrow={invoice.number}
        title={customer.name}
        description={`請求日 ${invoice.issued} ／ 支払期日 ${invoice.due}`}
        action={<Status value={status(invoice, data.matches, today)} />}
      />
      <section className="summary">
        {[
          ["請求額", invoice.amount],
          ["消込済み入金", paid(id, data.matches) - fees],
          ["支払手数料", fees],
          ["売掛残高", remaining],
        ].map(([label, value]) => (
          <div className="summary-card" key={label}>
            <span>{label}</span>
            <strong>{money(Number(value))}</strong>
          </div>
        ))}
      </section>
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
      <div className="detail-grid">
        <section className="panel inset">
          <h2>連絡メモ</h2>
          <p className="muted">連絡した内容を、そのまま記録します。</p>
          {invoice.notes.map((note) => (
            <article className="note" key={note.id}>
              <small>
                {note.date}·{note.method}
              </small>
              <p>{note.content}</p>
            </article>
          ))}
          {invoice.notes.length === 0 && <p className="empty">メモはまだありません。</p>}
          <form
            className="stack"
            onSubmit={(event) => {
              event.preventDefault();
              const form = event.currentTarget;
              const values = new FormData(form);
              const date = String(values.get("date"));
              const content = String(values.get("content")).trim();
              if (!validDate(date) || !content) {
                setMessage("日付とメモ内容を確認してください。");
                return;
              }
              save({
                ...invoice,
                notes: [
                  ...invoice.notes,
                  {
                    id: crypto.randomUUID(),
                    date,
                    content,
                    method: String(values.get("method")) as Note["method"],
                  },
                ],
              });
              form.reset();
              setMessage("連絡メモを保存しました。");
            }}
          >
            <label>
              連絡日
              <input name="date" type="date" defaultValue={today} required />
            </label>
            <label>
              手段
              <select name="method">
                <option>電話</option>
                <option>メール</option>
                <option>訪問</option>
              </select>
            </label>
            <label>
              内容
              <textarea name="content" rows={4} required />
            </label>
            <button>メモを保存</button>
          </form>
        </section>
        <section className="panel inset">
          <h2>入金予定</h2>
          <p className="muted">保存後の消込で予定残額が減ります。予定は1請求につき1件です。</p>
          {invoice.promise && (
            <p className="notice">
              {invoice.promise.date}·{money(invoice.promise.amount)}
              <br />
              予定残額
              {money(promiseRemaining(invoice, data.matches))}
            </p>
          )}
          <form
            key={`${invoice.id}-${invoice.promise?.date}`}
            className="stack"
            onSubmit={(event) => {
              event.preventDefault();
              const values = new FormData(event.currentTarget);
              const date = String(values.get("date"));
              const amount = Number(values.get("amount"));
              if (
                !validDate(date) ||
                !Number.isSafeInteger(amount) ||
                amount <= 0 ||
                amount > remaining
              ) {
                setMessage("予定日と予定額を確認してください。予定額は現在の残高以内です。");
                return;
              }
              save({ ...invoice, promise: { date, amount, baseline: paid(id, data.matches) } });
              setMessage("入金予定を保存しました。");
            }}
          >
            <label>
              入金予定日
              <input
                name="date"
                type="date"
                defaultValue={invoice.promise?.date ?? today}
                required
              />
            </label>
            <label>
              予定額（円）
              <input
                name="amount"
                type="number"
                min="1"
                max={remaining}
                defaultValue={invoice.promise ? promiseRemaining(invoice, data.matches) : remaining}
                required
              />
            </label>
            <button disabled={remaining === 0}>予定を保存</button>
          </form>
          {invoice.promise && (
            <button
              className="text-button"
              onClick={() => {
                save({ ...invoice, promise: undefined });
                setMessage("入金予定を解除しました。");
              }}
            >
              予定を解除
            </button>
          )}
        </section>
      </div>
      <History invoiceId={id} />
    </main>
  );
}
