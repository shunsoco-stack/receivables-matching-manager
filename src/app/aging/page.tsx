"use client";

import Link from "next/link";
import { useStore } from "@/components/store";
import { Heading } from "@/components/ui";
import { agingBucket, agingLabels, balance, money } from "@/lib/accounting";

export default function AgingPage() {
  const { data, today } = useStore();
  const rows = data.customers.map((customer) => {
    const amounts = [0, 0, 0, 0, 0];
    data.invoices
      .filter((invoice) => invoice.customerId === customer.id)
      .forEach((invoice) => {
        amounts[agingBucket(invoice.due, today)] += balance(invoice, data.matches);
      });
    return { customer, amounts, total: amounts.reduce((sum, value) => sum + value, 0) };
  });
  const totals = agingLabels.map((_, index) =>
    rows.reduce((sum, row) => sum + row.amounts[index], 0),
  );
  return (
    <main>
      <Heading
        eyebrow="RECEIVABLES AGING"
        title="売掛エイジング"
        description={`基準日 ${today}（日本時間）。得意先を選ぶと請求一覧へ移動します。`}
      />
      <section className="panel aging-table" aria-label="得意先別売掛残高">
        <div className="aging-row aging-head">
          <strong>得意先</strong>
          {agingLabels.map((label) => (
            <span key={label}>{label}</span>
          ))}
          <strong>合計</strong>
        </div>
        {rows.map(({ customer, amounts, total }) => (
          <Link className="aging-row" key={customer.id} href={`/invoices?customer=${customer.id}`}>
            <strong>
              {customer.name}
              <small>請求を見る ↗</small>
            </strong>
            {amounts.map((value, index) => (
              <span key={index} data-label={agingLabels[index]}>
                {money(value)}
              </span>
            ))}
            <b data-label="合計">{money(total)}</b>
          </Link>
        ))}
        <div className="aging-row aging-total">
          <strong>全得意先 合計</strong>
          {totals.map((value, index) => (
            <span key={index} data-label={agingLabels[index]}>
              {money(value)}
            </span>
          ))}
          <b data-label="合計">{money(totals.reduce((sum, value) => sum + value, 0))}</b>
        </div>
      </section>
    </main>
  );
}
