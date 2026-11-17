import Link from "next/link";
import { balance, money, status } from "@/lib/accounting";
import type { Data, Invoice } from "@/lib/types";

export function Heading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="muted">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function Status({ value }: { value: string }) {
  const color = value === "完済" ? "green" : value === "期限超過" ? "red" : "neutral";
  return <span className={`badge ${color}`}>{value}</span>;
}

export function InvoiceTable({
  invoices,
  data,
  today,
}: {
  invoices: Invoice[];
  data: Data;
  today: string;
}) {
  return (
    <div className="invoice-list">
      {invoices.length === 0 && <p className="empty">該当する請求はありません。</p>}
      {invoices.map((invoice) => {
        const customer = data.customers.find((item) => item.id === invoice.customerId)!;
        const remaining = balance(invoice, data.matches);
        return (
          <Link className="invoice-row" href={`/invoices/${invoice.id}`} key={invoice.id}>
            <div>
              <small>{invoice.number}</small>
              <strong>{customer.name}</strong>
            </div>
            <div className="invoice-date">
              <small>支払期日</small>
              {invoice.due}
            </div>
            <div>
              <Status value={status(invoice, data.matches, today)} />
              {invoice.due < today && remaining > 0 && remaining < invoice.amount && (
                <span className="badge neutral">一部入金</span>
              )}
            </div>
            <div className="amount">
              <small>
                残高 / 請求額
                {money(invoice.amount)}
              </small>
              <strong>
                {money(remaining)}
                <span className="arrow">↗</span>
              </strong>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
