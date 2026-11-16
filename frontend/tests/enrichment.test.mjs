import test from "node:test";
import assert from "node:assert/strict";
import { createMexicoEnrichment } from "../src/api/mexicoEnrichment.js";
import {
  contactSummary,
  employeeSummary,
  tradeCount,
  recordPeriod,
} from "../src/utils/supplierPresentation.js";
const settle = () => new Promise((resolve) => setImmediate(resolve));

test("all rows are enriched independently of slow statistics; preserves large identifiers and submitted scope", async () => {
  const calls = [];
  let finishStats;
  const enrich = createMexicoEnrichment(async (path) => {
    calls.push(path);
    if (path.includes("/statistics?"))
      return new Promise((resolve) => {
        finishStats = resolve;
      });
    return {
      "9007199254740993": {
        status: "MATCHED",
        phone: "+52 1",
        employees: 1565,
        employeeBand: "1,000 人及以上",
      },
      2: { status: "MATCHED", website: "example.test" },
    };
  });
  let rows = [{ recordId: "9007199254740993" }, { recordId: "2" }];
  enrich(
    rows,
    { country: "MX", hs: "0101", keyword: "cable", company: "Supplier" },
    () => true,
    (transform) => {
      rows = rows.map(transform);
    },
    () => {},
  );
  await settle();
  assert.match(contactSummary(rows[0]), /电话/);
  assert.match(contactSummary(rows[1]), /名录网站/);
  assert.match(employeeSummary(rows[0]), /1,000/);
  assert.equal(tradeCount(rows[0]), "正在统计…");
  const params = new URL(calls[1], "http://local").searchParams;
  assert.equal(params.get("recordIds"), "2,9007199254740993");
  assert.equal(params.get("hs"), "0101");
  assert.equal(params.get("company"), "Supplier");
  finishStats({
    2: {
      status: "READY",
      matchedRecordCount: 0,
      firstRecordDate: null,
      lastRecordDate: null,
      coverageConfirmed: false,
    },
  });
  await settle();
  assert.equal(tradeCount(rows[1]), "0 条（全期匹配）");
  assert.match(recordPeriod(rows[1]), /连续覆盖未核定/);
});
test("late enrichment cannot change a different history page; failed queries are not presented as missing data", async () => {
  let current = true,
    finish;
  const enrich = createMexicoEnrichment(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  let rows = [{ recordId: "1" }];
  enrich(
    rows,
    null,
    () => current,
    (transform) => {
      rows = rows.map(transform);
    },
    () => {},
  );
  current = false;
  finish({ 1: { status: "MATCHED", phone: "wrong" } });
  await settle();
  assert.equal(rows[0].supplierProfile.status, "LOADING");
  assert.match(
    contactSummary({ supplierProfile: { status: "ERROR" } }),
    /失败/,
  );
  assert.match(
    contactSummary({ supplierProfile: { status: "MATCHED" } }),
    /字段暂无值/,
  );
  assert.match(
    contactSummary({
      supplierProfile: { status: "AMBIGUOUS", message: "关联冲突" },
    }),
    /冲突/,
  );
});
