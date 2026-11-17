const { readFileSync } = require("node:fs");

const assert = require("node:assert/strict");

const { test } = require("node:test");

const ts = require("typescript");
// Use the project's installed TypeScript compiler; no test runtime dependency.

require.extensions[".ts"] = (module, filename) => {
  const source = readFileSync(filename, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: filename,
  });
  module._compile(outputText, filename);
};

const {
  normalizeName,
  candidates,
  applyMatch,
  cancelMatch,
  balance,
  depositBalance,
  status,
  agingBucket,
  todayJst,
  shiftDate,
  promiseRemaining,
  scheduleGroup,
} = require("../src/lib/accounting.ts");

const { createSeed } = require("../src/lib/seed.ts");

const { parseCsv } = require("../src/lib/csv.ts");

const { isStoredData } = require("../src/lib/storage.ts");

const today = "2026-11-17";

const seed = () => createSeed(today);

const allocation = (invoiceId, amount, fee = 0) => ({ invoiceId, amount, fee });

const match = (data, depositId, allocations, id = "test-match") =>
  applyMatch(data, {
    id,
    depositId,
    allocations,
    date: `${today}T10:00:00+09:00`,
  });

const invoice = (data, id) => data.invoices.find((item) => item.id === id);

const deposit = (data, id) => data.deposits.find((item) => item.id === id);

test("保存データ: 正常データと設定変更を許可し、破損・参照不整合を拒否", () => {
  assert.equal(isStoredData(seed()), true);
  assert.equal(isStoredData({ ...seed(), feeLimit: 0 }), true);
  for (const value of [
    null,
    {},
    { ...seed(), feeLimit: -1 },
    { ...seed(), invoices: [null] },
    { ...seed(), customers: [] },
  ]) {
    assert.equal(isStoredData(value), false);
  }
  const data = seed();
  data.matches[0].allocations[0].amount = 999999;
  assert.equal(isStoredData(data), false);
  const duplicate = seed();
  duplicate.deposits.push(duplicate.deposits[0]);
  assert.equal(isStoredData(duplicate), false);
});

test("名義: 法人略語・全角半角・スペースを正規化", () => {
  const expected = "サンプルショウジ";
  for (const name of [
    "ｶ)ｻﾝﾌﾟﾙｼｮｳｼﾞ",
    "サンプルショウジ（カ",
    "（カ）サンプル ショウジ",
    "カブシキガイシャ　サンプルショウジ",
    "株式会社サンプルショウジ",
  ]) {
    assert.equal(normalizeName(name), expected);
  }
  assert.equal(normalizeName("ﾕ)ﾐﾄﾞﾘ"), "ミドリ");
});

test("候補: 名義・金額一致が先頭、手数料理由と許容額を反映", () => {
  const data = seed();
  const exact = candidates(data, deposit(data, "d1"))[0];
  assert.equal(exact.invoice.id, "i1");
  assert.equal(exact.score, 160);
  assert.deepEqual(exact.labels, ["名義一致", "金額一致"]);
  const fee = candidates(data, deposit(data, "d2"))[0];
  assert.equal(fee.invoice.id, "i2");
  assert.ok(fee.labels.includes("手数料差引 ¥660"));
  assert.equal(candidates({ ...data, feeLimit: 0 }, deposit(data, "d2"))[0].score, 100);
  assert.ok(candidates(data, deposit(data, "d6")).every((row) => row.score === 0));
});

test("1入金→1請求を消込、取消で両方の残高を復元", () => {
  const data = match(seed(), "d1", [allocation("i1", 132000)]);
  assert.equal(balance(invoice(data, "i1"), data.matches), 0);
  assert.equal(depositBalance(deposit(data, "d1"), data.matches), 0);
  const restored = cancelMatch(data, "test-match", `${today}T12:00:00Z`);
  assert.equal(balance(invoice(restored, "i1"), restored.matches), 132000);
  assert.equal(depositBalance(deposit(restored, "d1"), restored.matches), 132000);
  assert.ok(restored.matches.at(-1).canceledAt);
  assert.equal(data.matches.at(-1).canceledAt, undefined);
});

test("まとめ入金: 2請求へ配分して完済", () => {
  const data = match(seed(), "d3", [allocation("i3", 55000), allocation("i4", 33000)]);
  assert.equal(balance(invoice(data, "i3"), data.matches), 0);
  assert.equal(balance(invoice(data, "i4"), data.matches), 0);
  assert.equal(depositBalance(deposit(data, "d3"), data.matches), 0);
});

test("分割入金: 2回目の入金で残高と予定残額が0", () => {
  const data = seed();
  data.deposits.push({ id: "second", date: today, name: "ｱｵｿﾞﾗｷｶｸ", amount: 120000 });
  assert.equal(balance(invoice(data, "i5"), data.matches), 120000);
  const next = match(data, "second", [allocation("i5", 120000)]);
  assert.equal(balance(invoice(next, "i5"), next.matches), 0);
  assert.equal(promiseRemaining(invoice(next, "i5"), next.matches), 0);
});

test("660円・440円の手数料差額で完済、手数料は入金額に含めない", () => {
  for (const [depositId, invoiceId, amount, fee] of [
    ["d2", "i2", 87340, 660],
    ["d5", "i6", 65560, 440],
  ]) {
    const data = match(seed(), depositId, [allocation(invoiceId, amount, fee)]);
    assert.equal(balance(invoice(data, invoiceId), data.matches), 0);
    assert.equal(depositBalance(deposit(data, depositId), data.matches), 0);
  }
});

test("差額を残す一部入金と未配分の入金残額", () => {
  const data = match(seed(), "d2", [allocation("i2", 87000)]);
  assert.equal(balance(invoice(data, "i2"), data.matches), 1000);
  assert.equal(depositBalance(deposit(data, "d2"), data.matches), 340);
  assert.equal(status(invoice(data, "i2"), data.matches, today), "一部入金");
});

test("不正な配分: 超過、負数、小数、重複、手数料超過を拒否", () => {
  for (const rows of [
    [],
    [allocation("i2", 88000)],
    [allocation("i2", -1)],
    [allocation("i2", 1.5)],
    [allocation("i2", 100, -1)],
    [allocation("i2", 100, 660)],
    [allocation("i2", 87000, 1000)],
    [allocation("i2", 100), allocation("i2", 100)],
    [allocation("missing", 1)],
  ]) {
    assert.throws(() => match(seed(), "d2", rows));
  }
  assert.throws(() => match(seed(), "missing", [allocation("i2", 1)]));
  assert.throws(() => match(seed(), "d1", [allocation("i1", 132001)]));
  assert.throws(() => match(seed(), "d1", [allocation("i1", 1)], "m1"));
});

test("ステータス: 期日当日、超過、一部入金、完済", () => {
  const data = seed();
  assert.equal(status(invoice(data, "i2"), data.matches, today), "未入金");
  assert.equal(status(invoice(data, "i5"), data.matches, today), "期限超過");
  assert.equal(status(invoice(data, "i17"), data.matches, today), "完済");
  assert.equal(status({ ...invoice(data, "i1"), due: today }, [], today), "未入金");
});

test("エイジング: すべての境界値", () => {
  for (const [days, bucket] of [
    [-1, 0],
    [0, 0],
    [1, 1],
    [30, 1],
    [31, 2],
    [60, 2],
    [61, 3],
    [90, 3],
    [91, 4],
  ]) {
    assert.equal(agingBucket(shiftDate(today, -days), today), bucket);
  }
});

test("日本時間の日付と月曜始まりの予定区分", () => {
  assert.equal(todayJst(new Date("2026-11-16T15:00:00Z")), today);
  assert.equal(scheduleGroup("2026-11-16", today), "予定超過");
  assert.equal(scheduleGroup("2026-11-22", today), "今週");
  assert.equal(scheduleGroup("2026-11-23", today), "来週");
  assert.equal(scheduleGroup("2026-11-29", today), "来週");
  assert.equal(scheduleGroup("2026-11-30", today), "再来週以降");
});

test("予定残額: 一部回収で減り、取消すると復元", () => {
  const data = seed();
  const next = match(data, "d6", [allocation("i5", 30000)]);
  assert.equal(promiseRemaining(invoice(next, "i5"), next.matches), 90000);
  const restored = cancelMatch(next, "test-match", new Date().toISOString());
  assert.equal(promiseRemaining(invoice(restored, "i5"), restored.matches), 120000);
});

test("CSV: ヘッダー、引用符、カンマ金額、改行、BOM", () => {
  const result = parseCsv('\uFEFF日付,名義,金額\r\n2026-11-17,"ｶ)ﾃｽﾄ","12,345"\n');
  assert.deepEqual(result.errors, []);
  assert.equal(result.rows[0].amount, 12345);
  assert.equal(parseCsv('2026-11-17,"A""B",100').rows[0].name, 'A"B');
});

test("CSV: 日付不正、列不足、小数、負数、空入力、引用符不整合", () => {
  for (const text of [
    "",
    "2026-02-30,A,100",
    "2026-11-17,A",
    "2026-11-17,A,1.5",
    "2026-11-17,A,-1",
    '2026-11-17,"A,100',
  ]) {
    assert.ok(parseCsv(text).errors.length > 0);
  }
});

test("シード整合性: ID、参照、全エイジング、配分超過なし", () => {
  for (const date of [today, "2026-01-01", "2028-02-29"]) {
    const data = createSeed(date);
    const ids = [
      ...data.customers,
      ...data.invoices,
      ...data.deposits,
      ...data.matches,
      ...data.invoices.flatMap((item) => item.notes),
    ].map((item) => item.id);
    assert.equal(new Set(ids).size, ids.length);
    assert.equal(data.customers.length, 8);
    assert.equal(data.invoices.length, 20);
    assert.equal(data.deposits.length, 12);
    const buckets = new Set();
    for (const item of data.invoices) {
      assert.ok(data.customers.some((customer) => customer.id === item.customerId));
      assert.ok(balance(item, data.matches) >= 0);
      if (balance(item, data.matches) > 0) buckets.add(agingBucket(item.due, date));
    }
    assert.equal(buckets.size, 5);
    for (const item of data.deposits) assert.ok(depositBalance(item, data.matches) >= 0);
    for (const item of data.matches) {
      assert.ok(deposit(data, item.depositId));
      for (const row of item.allocations) assert.ok(invoice(data, row.invoiceId));
    }
    let replay = { ...data, matches: [] };
    for (const item of data.matches) replay = applyMatch(replay, item);
    assert.deepEqual(replay, data);
    assert.ok(data.invoices.some((item) => item.promise?.date < date));
  }
});
