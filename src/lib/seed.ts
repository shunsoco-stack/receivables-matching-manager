import { shiftDate, todayJst } from "./accounting";
import type { Data, Invoice, Deposit } from "./types";

export function createSeed(today = todayJst()): Data {
  const date = (days: number) => shiftDate(today, days);
  const invoice = (
    id: string,
    customerId: string,
    amount: number,
    dueDays: number,
    issueDays = dueDays - 30,
  ): Invoice => ({
    id,
    customerId,
    number: `INV-${id.slice(1).padStart(4, "0")}`,
    amount,
    issued: date(Math.min(issueDays, 0)),
    due: date(dueDays),
    notes: [],
  });
  const deposit = (id: string, days: number, name: string, amount: number): Deposit => ({
    id,
    date: date(days),
    name,
    amount,
  });
  const data: Data = {
    version: 1,
    feeLimit: 880,
    customers: [
      { id: "c1", name: "サンプル商事（架空）", kana: "カブシキガイシャ サンプルショウジ" },
      { id: "c2", name: "みどり工房（架空）", kana: "ミドリコウボウ" },
      { id: "c3", name: "こはる制作所（架空）", kana: "コハルセイサクショ" },
      { id: "c4", name: "あおぞら企画（架空）", kana: "アオゾラキカク" },
      { id: "c5", name: "つむぎデザイン（架空）", kana: "ツムギデザイン" },
      { id: "c6", name: "ひだまり製作（架空）", kana: "ヒダマリセイサク" },
      { id: "c7", name: "しらかば商店（架空）", kana: "シラカバショウテン" },
      { id: "c8", name: "なないろ編集室（架空）", kana: "ナナイロヘンシュウシツ" },
    ],
    invoices: [
      invoice("i1", "c1", 132000, -5),
      invoice("i2", "c2", 88000, 3),
      invoice("i3", "c3", 55000, -12),
      invoice("i4", "c3", 33000, 2),
      invoice("i5", "c4", 220000, -18),
      invoice("i6", "c5", 66000, -42),
      invoice("i7", "c6", 154000, -75),
      invoice("i8", "c7", 44000, -105),
      invoice("i9", "c8", 99000, 12),
      invoice("i10", "c1", 110000, 20),
      invoice("i11", "c2", 55000, -2),
      invoice("i12", "c5", 77000, 5),
      invoice("i13", "c6", 33000, 15),
      invoice("i14", "c8", 121000, -7),
      invoice("i15", "c7", 27500, 25),
      invoice("i16", "c4", 66000, 10),
      invoice("i17", "c1", 44000, -15),
      invoice("i18", "c2", 33000, -8),
      invoice("i19", "c8", 55000, -3),
      invoice("i20", "c5", 165000, -1),
    ],
    deposits: [
      deposit("d1", 0, "ｶ)ｻﾝﾌﾟﾙｼｮｳｼﾞ", 132000),
      deposit("d2", 0, "ﾐﾄﾞﾘｺｳﾎﾞｳ", 87340),
      deposit("d3", -1, "ｺﾊﾙｾｲｻｸｼｮ", 88000),
      deposit("d4", -10, "ｱｵｿﾞﾗｷｶｸ", 100000),
      deposit("d5", -1, "ﾂﾑｷﾞﾃﾞｻﾞｲﾝ", 65560),
      deposit("d6", -2, "ﾒｲｷﾞﾌﾒｲ", 30000),
      deposit("d7", -2, "ﾅﾅｲﾛﾍﾝｼｭｳｼﾂ", 121000),
      deposit("d8", -3, "ﾐﾄﾞﾘｺｳﾎﾞｳ", 55000),
      deposit("d9", -14, "ｻﾝﾌﾟﾙｼｮｳｼﾞ(ｶ", 44000),
      deposit("d10", -6, "ﾐﾄﾞﾘｺｳﾎﾞｳ", 32560),
      deposit("d11", -1, "ﾅﾅｲﾛﾍﾝｼｭｳｼﾂ", 55000),
      deposit("d12", 0, "ﾂﾑｷﾞﾃﾞｻﾞｲﾝ", 50000),
    ],
    matches: [
      {
        id: "m1",
        date: `${date(-10)}T10:00:00+09:00`,
        depositId: "d4",
        allocations: [{ invoiceId: "i5", amount: 100000, fee: 0 }],
      },
      {
        id: "m2",
        date: `${date(-14)}T11:00:00+09:00`,
        depositId: "d9",
        allocations: [{ invoiceId: "i17", amount: 44000, fee: 0 }],
      },
      {
        id: "m3",
        date: `${date(-6)}T14:00:00+09:00`,
        depositId: "d10",
        allocations: [{ invoiceId: "i18", amount: 32560, fee: 440 }],
      },
      {
        id: "m4",
        date: `${date(-1)}T09:00:00+09:00`,
        depositId: "d11",
        allocations: [{ invoiceId: "i19", amount: 55000, fee: 0 }],
      },
    ],
  };
  data.invoices[4].notes = [
    {
      id: "n1",
      date: date(-9),
      method: "電話",
      content: "初回10万円の入金を確認。残額は次回の振込で入金いただく予定。",
    },
  ];
  data.invoices[4].promise = { date: date(-2), amount: 120000, baseline: 100000 };
  data.invoices[6].notes = [
    {
      id: "n2",
      date: date(-3),
      method: "メール",
      content: "支払予定を確認。今週中に全額入金予定との連絡あり。",
    },
  ];
  data.invoices[6].promise = { date: today, amount: 154000, baseline: 0 };
  data.invoices[7].promise = { date: date(7), amount: 44000, baseline: 0 };
  data.invoices[19].promise = { date: date(3), amount: 165000, baseline: 0 };
  return data;
}
