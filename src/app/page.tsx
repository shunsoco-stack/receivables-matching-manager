"use client";

import Link from "next/link";
import { useState } from "react";
import { useStore } from "@/components/store";
import { Heading, Status } from "@/components/ui";
import { DepositImport } from "@/components/deposit-import";
import { History } from "@/components/history";
import {
  applyMatch,
  balance,
  candidates,
  depositBalance,
  money,
  status,
  validateAllocations,
} from "@/lib/accounting";
import type { Allocation } from "@/lib/types";

export default function MatchingPage() {
  const { data, update, today } = useStore();
  const [selected, setSelected] = useState("");
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [message, setMessage] = useState("");
  const [showAll, setShowAll] = useState(false);
  const deposits = data.deposits.filter((item) => depositBalance(item, data.matches) > 0);
  const deposit = deposits.find((item) => item.id === selected);
  const ranked = deposit ? candidates(data, deposit) : [];
  const visible = showAll ? ranked : ranked.filter((item) => item.score > 0);
  const total = allocations.reduce((sum, row) => sum + row.amount, 0);
  const fees = allocations.reduce((sum, row) => sum + row.fee, 0);
  const remaining = deposit ? depositBalance(deposit, data.matches) : 0;
  let validation = "";
  if (deposit && allocations.length > 0) {
    try {
      validateAllocations(data, deposit.id, allocations);
    } catch (error) {
      validation = (error as Error).message;
    }
  }
  const outstanding = data.invoices.reduce((sum, item) => sum + balance(item, data.matches), 0);
  const overdue = data.invoices
    .filter((item) => item.due < today)
    .reduce((sum, item) => sum + balance(item, data.matches), 0);
  const unmatched = deposits.reduce((sum, item) => sum + depositBalance(item, data.matches), 0);
  const collected = data.matches
    .filter((item) => !item.canceledAt)
    .reduce((sum, match) => {
      const source = data.deposits.find((item) => item.id === match.depositId)!;
      return (
        sum +
        (source.date.slice(0, 7) === today.slice(0, 7) && source.date <= today
          ? match.allocations.reduce((value, row) => value + row.amount, 0)
          : 0)
      );
    }, 0);
  function changeAllocation(id: string, field: "amount" | "fee", value: number) {
    setAllocations((current) =>
      current.map((row) => (row.invoiceId === id ? { ...row, [field]: value } : row)),
    );
  }
  return (
    <main>
      <Heading
        eyebrow="RECONCILIATION WORKSPACE"
        title="消込作業台"
        description="通帳の一行を、確かな回収に。入金を選んで、請求と突き合わせましょう。"
        action={
          <span className="date-label">
            基準日
            {today}
            <small>日本時間</small>
          </span>
        }
      />
      <section className="summary" aria-label="売掛サマリー">
        {[
          ["売掛残高合計", outstanding, "未回収の請求残高"],
          ["期限超過額", overdue, "支払期日を過ぎた残高"],
          ["未消込の入金額", unmatched, `${deposits.length}件の明細が消込待ち`],
          ["今月の回収額", collected, "入金日基準 · 手数料を除く消込額"],
        ].map(([label, value, hint], index) => (
          <div className={`summary-card summary-${index}`} key={label}>
            <span>{label}</span>
            <strong>{money(Number(value))}</strong>
            <small>{hint}</small>
          </div>
        ))}
      </section>
      <div className="section-caption">
        <h2>入金と請求を突き合わせる</h2>
        <span>
          01 入金を選択
          <b>→</b>
          02 請求へ配分
          <b>→</b>
          03 消込を確定
        </span>
      </div>
      <DepositImport />
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
      <div className="workbench">
        <section className="panel deposits">
          <div className="panel-heading">
            <h2>
              <span className="step">1</span>
              未消込の入金明細
            </h2>
            <span className="count">{deposits.length}件</span>
          </div>
          <div className="list-caption">
            <span>入金日 / 振込名義</span>
            <span>未消込額</span>
          </div>
          {deposits.length === 0 && <p className="empty">すべての入金を消し込みました。</p>}
          {deposits.map((item) => (
            <button
              className={`deposit-row ${item.id === selected ? "selected" : ""}`}
              key={item.id}
              aria-pressed={item.id === selected}
              onClick={() => {
                setSelected(item.id);
                setAllocations([]);
                setShowAll(false);
                setMessage("");
              }}
            >
              <span>
                <small>{item.date}</small>
                <strong>{item.name}</strong>
                {depositBalance(item, data.matches) < item.amount && <small>一部消込済み</small>}
              </span>
              <span className="amount">
                <b>{money(depositBalance(item, data.matches))}</b>
                <small>{item.id === selected ? "選択中 →" : "未消込"}</small>
              </span>
            </button>
          ))}
        </section>
        <section className="panel candidates">
          <div className="panel-heading">
            <h2>
              <span className="step">2</span>
              消込候補の請求
            </h2>
            <span className="count">{deposit ? `${visible.length}件` : "入金を選択"}</span>
          </div>
          {!deposit ? (
            <div className="welcome">
              <span className="welcome-icon" aria-hidden="true">
                ⇄
              </span>
              <h3>入金明細から、はじめましょう</h3>
              <p>
                入金を選ぶと、名義・金額・手数料差額から
                <br />
                候補となる請求がここに表示されます。
              </p>
              <span className="badge neutral">まとめ入金・分割入金にも対応</span>
            </div>
          ) : (
            <>
              <div className="selected-summary">
                <small>選択中の入金</small>
                <strong>
                  {deposit.name}
                  <span>{money(remaining)}</span>
                </strong>
                <p>候補は照合の補助です。得意先と配分額を確認してください。</p>
              </div>
              <div className="candidate-toolbar">
                <span>名義・金額の一致順</span>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={showAll}
                    onChange={(event) => setShowAll(event.target.checked)}
                  />
                  すべての未回収請求
                </label>
              </div>
              {visible.length === 0 && (
                <p className="empty">
                  一致する候補はありません。
                  <br />
                  「すべての未回収請求」から手動で選択できます。
                </p>
              )}
              {visible.map(({ invoice, customer, labels, remaining: invoiceBalance }) => {
                const row = allocations.find((item) => item.invoiceId === invoice.id);
                return (
                  <div className={`candidate-card ${row ? "checked" : ""}`} key={invoice.id}>
                    <label className="candidate-select">
                      <input
                        type="checkbox"
                        checked={Boolean(row)}
                        onChange={(event) => {
                          if (event.target.checked) {
                            setAllocations([
                              ...allocations,
                              {
                                invoiceId: invoice.id,
                                amount: Math.min(invoiceBalance, Math.max(0, remaining - total)),
                                fee: 0,
                              },
                            ]);
                          } else {
                            setAllocations(
                              allocations.filter((item) => item.invoiceId !== invoice.id),
                            );
                          }
                        }}
                      />
                      <span>
                        <small>
                          {invoice.number}· 支払期日
                          {invoice.due}
                        </small>
                        <strong>{customer.name}</strong>
                      </span>
                      <span className="amount">
                        <small>残高</small>
                        <b>{money(invoiceBalance)}</b>
                      </span>
                    </label>
                    <div className="candidate-meta">
                      <Status value={status(invoice, data.matches, today)} />
                      {labels.map((label) => (
                        <span className="badge match" key={label}>
                          {label}
                        </span>
                      ))}
                      <small>
                        請求額
                        {money(invoice.amount)}
                      </small>
                      <Link href={`/invoices/${invoice.id}`}>詳細 ↗</Link>
                    </div>
                    {row && (
                      <div className="allocation-fields">
                        <label>
                          消込額（円）
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={row.amount}
                            onChange={(event) =>
                              changeAllocation(invoice.id, "amount", Number(event.target.value))
                            }
                          />
                        </label>
                        <label>
                          支払手数料（円）
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={row.fee}
                            onChange={(event) =>
                              changeAllocation(invoice.id, "fee", Number(event.target.value))
                            }
                          />
                        </label>
                        {invoiceBalance - row.amount > 0 &&
                          invoiceBalance - row.amount <= data.feeLimit && (
                            <button
                              className="text-button"
                              onClick={() =>
                                changeAllocation(invoice.id, "fee", invoiceBalance - row.amount)
                              }
                            >
                              差額
                              {money(invoiceBalance - row.amount)}
                              を手数料にする
                            </button>
                          )}
                        <small>
                          処理後の請求残高
                          {money(invoiceBalance - row.amount - row.fee)}
                        </small>
                      </div>
                    )}
                  </div>
                );
              })}
              <div className="match-confirm">
                <div>
                  <span>
                    {allocations.length}
                    件を選択
                  </span>
                  <b>
                    消込額
                    {money(total)}
                  </b>
                </div>
                <div className="muted">
                  <span>
                    支払手数料
                    {money(fees)}
                  </span>
                  <span>
                    入金の未配分額
                    {money(remaining - total)}
                  </span>
                </div>
                <p className="muted">
                  手数料0円なら差額を残して一部入金。複数請求を選ぶとまとめ入金になります。
                </p>
                {validation && (
                  <p className="error" role="alert">
                    {validation}
                  </p>
                )}
                <button
                  className="wide"
                  disabled={allocations.length === 0 || Boolean(validation)}
                  onClick={() => {
                    try {
                      update(
                        applyMatch(data, {
                          id: crypto.randomUUID(),
                          date: new Date().toISOString(),
                          depositId: deposit.id,
                          allocations,
                        }),
                      );
                      setAllocations([]);
                      setMessage("消込を記録しました。履歴から取り消せます。");
                    } catch (error) {
                      setMessage((error as Error).message);
                    }
                  }}
                >
                  {allocations.length}
                  件の消込を確定する →
                </button>
              </div>
            </>
          )}
        </section>
      </div>
      <History />
    </main>
  );
}
