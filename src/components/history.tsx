"use client";

import Link from "next/link";
import { useState } from "react";
import { cancelMatch, money } from "@/lib/accounting";
import { useStore } from "./store";

export function History({ invoiceId }: { invoiceId?: string }) {
  const { data, update } = useStore();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const rows = data.matches.filter(
    (match) => !invoiceId || match.allocations.some((row) => row.invoiceId === invoiceId),
  );
  return (
    <section className="panel history">
      <div className="panel-heading">
        <h2>消込履歴</h2>
        <span className="count">{rows.length}件</span>
      </div>
      {rows.length === 0 && <p className="empty">消込履歴はありません。</p>}
      {[...rows].reverse().map((match) => {
        const deposit = data.deposits.find((item) => item.id === match.depositId)!;
        return (
          <div className={`history-row ${match.canceledAt ? "canceled" : ""}`} key={match.id}>
            <div>
              <small>
                {new Date(match.date).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}
              </small>
              <strong>{deposit.name}</strong>
              <small>
                入金日
                {deposit.date}·{money(deposit.amount)}
              </small>
            </div>
            <div className="history-allocations">
              {match.allocations.map((row) => (
                <div key={row.invoiceId}>
                  <Link href={`/invoices/${row.invoiceId}`}>
                    {data.invoices.find((item) => item.id === row.invoiceId)?.number}
                  </Link>
                  <span>
                    {money(row.amount)}
                    <small>
                      支払手数料
                      {money(row.fee)}
                    </small>
                  </span>
                </div>
              ))}
            </div>
            {match.canceledAt ? (
              <span className="muted">
                取消済み
                <small>
                  {new Date(match.canceledAt).toLocaleString("ja-JP", {
                    timeZone: "Asia/Tokyo",
                  })}
                </small>
              </span>
            ) : confirmId === match.id ? (
              <div className="stack">
                <small>この履歴の全配分を取り消します。</small>
                <button
                  className="danger"
                  onClick={() => {
                    update(cancelMatch(data, match.id, new Date().toISOString()));
                    setConfirmId(null);
                  }}
                >
                  取消を確定
                </button>
                <button className="secondary" onClick={() => setConfirmId(null)}>
                  戻る
                </button>
              </div>
            ) : (
              <button className="text-button" onClick={() => setConfirmId(match.id)}>
                消込を取り消す
              </button>
            )}
          </div>
        );
      })}
    </section>
  );
}
