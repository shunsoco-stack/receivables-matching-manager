"use client";

import { useState } from "react";
import { useStore } from "./store";
import { money, validDate } from "@/lib/accounting";
import { parseCsv } from "@/lib/csv";

export function DepositImport() {
  const { data, update, today } = useStore();
  const [mode, setMode] = useState<"manual" | "csv" | null>(null);
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<ReturnType<typeof parseCsv> | null>(null);
  const [message, setMessage] = useState("");
  return (
    <section className="import-section">
      <div className="toolbar">
        <button className="secondary" onClick={() => setMode(mode === "manual" ? null : "manual")}>
          ＋ 入金を追加
        </button>
        <button className="secondary" onClick={() => setMode(mode === "csv" ? null : "csv")}>
          ↓ CSV貼り付け
        </button>
      </div>
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
      {mode === "manual" && (
        <form
          className="form-grid inset"
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const values = new FormData(form);
            const date = String(values.get("date"));
            const name = String(values.get("name")).trim();
            const amount = Number(values.get("amount"));
            if (!validDate(date) || !name || !Number.isSafeInteger(amount) || amount <= 0) {
              setMessage("日付・名義・整数の金額を確認してください。");
              return;
            }
            update({
              ...data,
              deposits: [
                ...data.deposits,
                {
                  id: crypto.randomUUID(),
                  date,
                  name,
                  amount,
                },
              ],
            });
            setMessage("入金明細を追加しました。");
            setMode(null);
          }}
        >
          <label>
            入金日
            <input name="date" type="date" defaultValue={today} required />
          </label>
          <label>
            振込名義
            <input name="name" placeholder="ｶ)ｻﾝﾌﾟﾙｼｮｳｼﾞ" required />
          </label>
          <label>
            金額（円）
            <input name="amount" type="number" min="1" step="1" required />
          </label>
          <button type="submit">入金を追加する</button>
        </form>
      )}
      {mode === "csv" && (
        <div className="inset stack">
          <label>
            入金明細CSV（日付,名義,金額）
            <textarea
              rows={5}
              value={text}
              placeholder={`日付,名義,金額\n${today},ﾐﾄﾞﾘｺｳﾎﾞｳ,88000`}
              onChange={(event) => {
                setText(event.target.value);
                setPreview(null);
              }}
            />
          </label>
          <p className="muted">
            日付はYYYY-MM-DD。ヘッダーは省略可。カンマ入り金額は引用符で囲みます。
          </p>
          <button className="secondary" onClick={() => setPreview(parseCsv(text))}>
            プレビュー
          </button>
          {preview && (
            <>
              {preview.errors.map((error) => (
                <p className="error" key={error}>
                  {error}
                </p>
              ))}
              <p>
                {preview.rows.length}件 / 合計
                {money(preview.rows.reduce((sum, row) => sum + row.amount, 0))}
              </p>
              {preview.rows.map((row) => (
                <div className="preview-row" key={row.line}>
                  <span>
                    {row.date}·{row.name}
                  </span>
                  <b>{money(row.amount)}</b>
                  {data.deposits.some(
                    (item) =>
                      item.date === row.date &&
                      item.name === row.name &&
                      item.amount === row.amount,
                  ) && <span className="badge red">登録済みの明細と一致</span>}
                </div>
              ))}
              <p className="muted">
                同じ明細の二重取込にご注意ください。エラーがある場合は全行の取込を停止します。
              </p>
              <button
                disabled={preview.errors.length > 0 || preview.rows.length === 0}
                onClick={() => {
                  update({
                    ...data,
                    deposits: [
                      ...data.deposits,
                      ...preview.rows.map((row) => ({
                        id: crypto.randomUUID(),
                        date: row.date,
                        name: row.name,
                        amount: row.amount,
                      })),
                    ],
                  });
                  setMessage(`${preview.rows.length}件の入金明細を取り込みました。`);
                  setPreview(null);
                  setText("");
                  setMode(null);
                }}
              >
                確認した
                {preview.rows.length}
                件を取り込む
              </button>
            </>
          )}
        </div>
      )}
    </section>
  );
}
