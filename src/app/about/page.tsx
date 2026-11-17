"use client";

import { useState } from "react";
import { useStore } from "@/components/store";
import { Heading } from "@/components/ui";

export default function AboutPage() {
  const { data, update, reset } = useStore();
  const [confirm, setConfirm] = useState(false);
  const [message, setMessage] = useState("");
  return (
    <main>
      <Heading
        eyebrow="ABOUT THIS DEMO"
        title="このデモについて"
        description="入金明細を起点に、未入金と差額を見落とさないための経理作業台。"
      />
      <div className="detail-grid">
        <section className="panel inset prose">
          <h2>すべて架空のデータです</h2>
          <p>
            得意先・請求・入金・連絡メモはデモ専用です。実在の企業・個人・金融機関とは無関係です。
          </p>
          <p>
            データはこのブラウザのlocalStorage（rmm:v1）に保存します。認証・外部API・データベースは使用しません。別の端末やブラウザには同期されません。
          </p>
          <h2>この作業台でできること</h2>
          <p>
            まとめ入金・分割入金の消込、手数料差額の処理、売掛残高の確認、連絡メモと入金予定の記録ができます。
          </p>
          <p>請求書・見積書・PDFの作成、商流管理、AI判断・督促文生成・承認フローは扱いません。</p>
          <h2>消込ルール</h2>
          <p>
            名義の法人略語・全角半角・空白を正規化し、名義と金額から候補を表示します。候補は自動確定されません。手数料は1回の消込の合計が許容額以内で、請求を完済する場合に処理できます。
          </p>
          <p>
            今月の回収額は入金日が今月の有効な消込額で、支払手数料を含みません。期限超過かつ一部入金の請求には両方の表示を付けます。
          </p>
        </section>
        <section className="panel inset stack">
          <h2>手数料許容額の設定</h2>
          <form
            key={data.feeLimit}
            className="stack"
            onSubmit={(event) => {
              event.preventDefault();
              const amount = Number(new FormData(event.currentTarget).get("limit"));
              if (!Number.isSafeInteger(amount) || amount < 0) {
                setMessage("0円以上の整数を入力してください。");
                return;
              }
              update({ ...data, feeLimit: amount });
              setMessage("手数料許容額を保存しました。");
            }}
          >
            <label>
              許容額（円）
              <input name="limit" type="number" min="0" defaultValue={data.feeLimit} required />
            </label>
            <small>既定880円。変更は今後の消込に適用されます。</small>
            <button>設定を保存</button>
          </form>
          <hr />
          <h2>既定データに戻す</h2>
          <p>追加したデータ・消込・メモ・設定を削除し、今日を基準に架空データを再作成します。</p>
          {confirm ? (
            <div className="stack">
              <p>この操作は元に戻せません。リセットしますか？</p>
              <button
                className="danger"
                onClick={() => {
                  reset();
                  setConfirm(false);
                  setMessage("既定データに戻しました。");
                }}
              >
                削除して既定データに戻す
              </button>
              <button className="secondary" onClick={() => setConfirm(false)}>
                キャンセル
              </button>
            </div>
          ) : (
            <button className="secondary" onClick={() => setConfirm(true)}>
              既定データに戻す
            </button>
          )}
          {message && (
            <p className="notice" role="status">
              {message}
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
