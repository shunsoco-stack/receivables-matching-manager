"use client";

import { useState } from "react";
import { useStore } from "./store";
import { Heading, InvoiceTable } from "./ui";
import { balance, status, validDate } from "@/lib/accounting";

export function InvoiceWorkspace({ initialCustomer }: { initialCustomer: string }) {
  const { data, update, today } = useStore();
  const [customer, setCustomer] = useState(initialCustomer);
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState("");
  const invoices = data.invoices.filter((invoice) => {
    const name = data.customers.find((item) => item.id === invoice.customerId)!.name;
    const remaining = balance(invoice, data.matches);
    const matchesStatus =
      filter === "一部入金"
        ? remaining > 0 && remaining < invoice.amount
        : !filter || status(invoice, data.matches, today) === filter;
    return (
      (!customer || invoice.customerId === customer) &&
      matchesStatus &&
      `${name} ${invoice.number}`.toLowerCase().includes(search.trim().toLowerCase())
    );
  });
  return (
    <main>
      <Heading
        eyebrow="INVOICES"
        title="請求一覧"
        description="請求の残高と支払期日を確認。連絡の記録は請求詳細へ。"
        action={<button onClick={() => setAdding(!adding)}>＋ 請求を追加</button>}
      />
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
      {adding && (
        <form
          className="panel inset form-grid"
          onSubmit={(event) => {
            event.preventDefault();
            const values = new FormData(event.currentTarget);
            const number = String(values.get("number")).trim();
            const amount = Number(values.get("amount"));
            const issued = String(values.get("issued"));
            const due = String(values.get("due"));
            if (
              !number ||
              !Number.isSafeInteger(amount) ||
              amount <= 0 ||
              !validDate(issued) ||
              !validDate(due) ||
              issued > due
            ) {
              setMessage("整数の金額と日付を確認してください。期日は請求日以降にしてください。");
              return;
            }
            if (data.invoices.some((item) => item.number === number)) {
              setMessage("この請求番号は登録済みです。");
              return;
            }
            update({
              ...data,
              invoices: [
                ...data.invoices,
                {
                  id: crypto.randomUUID(),
                  customerId: String(values.get("customer")),
                  number,
                  amount,
                  issued,
                  due,
                  notes: [],
                },
              ],
            });
            setAdding(false);
            setMessage("請求を追加しました。");
          }}
        >
          <label>
            得意先
            <select name="customer">
              {data.customers.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            請求番号
            <input name="number" required />
          </label>
          <label>
            請求額（円）
            <input name="amount" type="number" min="1" required />
          </label>
          <label>
            請求日
            <input name="issued" type="date" defaultValue={today} required />
          </label>
          <label>
            支払期日
            <input name="due" type="date" required />
          </label>
          <button>登録する</button>
        </form>
      )}
      <section className="panel">
        <div className="filters form-grid">
          <label>
            検索
            <input
              value={search}
              placeholder="得意先・請求番号"
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <label>
            得意先
            <select value={customer} onChange={(event) => setCustomer(event.target.value)}>
              <option value="">すべての得意先</option>
              {data.customers.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            ステータス
            <select value={filter} onChange={(event) => setFilter(event.target.value)}>
              <option value="">すべて</option>
              {["未入金", "一部入金", "完済", "期限超過"].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="panel-heading">
          <h2>登録済みの請求</h2>
          <span>{invoices.length}件</span>
        </div>
        <InvoiceTable invoices={invoices} data={data} today={today} />
      </section>
    </main>
  );
}
