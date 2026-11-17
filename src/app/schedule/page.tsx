"use client";

import Link from "next/link";
import { useStore } from "@/components/store";
import { Heading } from "@/components/ui";
import { money, promiseRemaining, scheduleGroup } from "@/lib/accounting";

export default function SchedulePage() {
  const { data, today } = useStore();
  const invoices = data.invoices
    .filter((invoice) => invoice.promise && promiseRemaining(invoice, data.matches) > 0)
    .sort((a, b) => a.promise!.date.localeCompare(b.promise!.date));
  return (
    <main>
      <Heading
        eyebrow="PAYMENT SCHEDULE"
        title="入金予定"
        description={`基準日 ${today} · 月曜はじまり。消込後も残っている入金予定を表示しています。`}
      />
      {["予定超過", "今週", "来週", "再来週以降"].map((group) => {
        const rows = invoices.filter(
          (invoice) => scheduleGroup(invoice.promise!.date, today) === group,
        );
        return (
          <section className="panel schedule-panel" key={group}>
            <div className="panel-heading">
              <h2>{group === "予定超過" ? "! 予定超過" : group}</h2>
              <span className="amount">
                {rows.length}件 ·
                {money(
                  rows.reduce((sum, invoice) => sum + promiseRemaining(invoice, data.matches), 0),
                )}
              </span>
            </div>
            {rows.length === 0 && <p className="empty">この期間の未回収予定はありません。</p>}
            {rows.map((invoice) => (
              <Link className="invoice-row" key={invoice.id} href={`/invoices/${invoice.id}`}>
                <div>
                  <small>{invoice.number}</small>
                  <strong>
                    {data.customers.find((item) => item.id === invoice.customerId)!.name}
                  </strong>
                </div>
                <div>
                  <small>入金予定日</small>
                  {invoice.promise!.date}
                </div>
                <span className={`badge ${group === "予定超過" ? "red" : "neutral"}`}>{group}</span>
                <div className="amount">
                  <small>予定残額</small>
                  <strong>{money(promiseRemaining(invoice, data.matches))}↗</strong>
                </div>
              </Link>
            ))}
          </section>
        );
      })}
    </main>
  );
}
