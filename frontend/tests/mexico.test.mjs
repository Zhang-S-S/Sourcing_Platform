import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";

const events = new EventTarget();
globalThis.window = {
  scrollY: 0,
  scrollTo() {},
  addEventListener: events.addEventListener.bind(events),
  removeEventListener: events.removeEventListener.bind(events),
};
globalThis.location = { hash: "#/suppliers" };
let entry = null;
globalThis.history = {
  get state() {
    return entry;
  },
  replaceState(state, _, url) {
    entry = structuredClone(state);
    if (url) location.hash = url;
  },
  pushState(state, _, url) {
    this.replaceState(state, _, url);
  },
};
const { navigate, clearPageData } = await import("../src/router/navigation.js");
const { createMexicoModel } = await import("../src/models/mexicoModel.js");
let calls;
beforeEach(() => {
  clearPageData();
  navigate({ screen: "discover" }, { replace: true });
  calls = [];
  globalThis.fetch = async (url, options) => {
    if (/\/exports\/(profiles|statistics)\?/.test(url)) {
      return new Response(JSON.stringify({}));
    }
    calls.push({ url, options });
    return new Response(
      JSON.stringify({
        items: [{ recordId: "9007199254740993", supplierName: "测试供方" }],
        hasNext: true,
        nextCursor: "9007199254740993",
      }),
    );
  };
});
const settle = () => new Promise((resolve) => setImmediate(resolve));
function prepare(model) {
  model.store.setValue("draft", { keyword: "", hs: "0101", country: "MX" });
  model.scope().search();
}

test("search keeps leading zeros, uses applied conditions and passes company/HS refinement to API", async () => {
  const model = createMexicoModel();
  prepare(model);
  await settle();
  assert.equal(
    new URL(calls[0].url, "http://local").searchParams.get("hs"),
    "0101",
  );
  model.store.setValue("draft.hs", "8544");
  model.store.setValue("company", "  Sierra  ");
  model.scope().filterCompany();
  await settle();
  const params = new URL(calls[1].url, "http://local").searchParams;
  assert.equal(params.get("hs"), "0101");
  assert.equal(params.get("company"), "Sierra");
  model.scope().openFilters();
  model.store.setValue("filterDraft.hs", "010121");
  model.scope().applyFilters();
  await settle();
  assert.equal(
    new URL(calls[2].url, "http://local").searchParams.get("refinedHs"),
    "010121",
  );
  assert.equal(model.scope().items[0].recordId, "9007199254740993");
});

test("unavailable advanced criteria never silently trigger an unfiltered request", async () => {
  const model = createMexicoModel();
  prepare(model);
  await settle();
  model.scope().openFilters();
  model.store.setValue("filterDraft.types", ["制造商"]);
  model.scope().applyFilters();
  assert.equal(calls.length, 1);
  assert.equal(model.scope().drawer, true);
  assert.match(model.scope().filterError, /未应用筛选/);
});

test("view and placeholder channels preserve results without extra database requests", async () => {
  const model = createMexicoModel();
  prepare(model);
  await settle();
  model.scope().setView("table");
  model.scope().setChannel("B");
  model.scope().setChannel("C");
  model.scope().setChannel("A");
  assert.equal(calls.length, 1);
  assert.equal(model.scope().view, "table");
  assert.equal(model.scope().items.length, 1);
});

test("selection is limited to five; changing search requires confirmation and clears selection", async () => {
  const notices = [],
    model = createMexicoModel((...args) => notices.push(args));
  prepare(model);
  await settle();
  for (let i = 0; i < 6; i++)
    model.scope().toggleSelection(String(i), { target: { checked: true } });
  assert.equal(model.scope().selected.length, 5);
  assert.match(notices[0][1], /最多选择 5/);
  model.store.setValue("draft.hs", "8544");
  model.scope().search();
  assert.equal(calls.length, 1);
  assert.ok(model.scope().pendingSearch);
  model.scope().confirmSearch();
  await settle();
  assert.equal(calls.length, 2);
  assert.deepEqual(model.scope().selected, []);
});

test("late search response cannot overwrite restored browser page", async () => {
  let complete;
  globalThis.fetch = () =>
    new Promise((resolve) => {
      complete = resolve;
    });
  const model = createMexicoModel();
  prepare(model);
  model.scope().restore(null, { screen: "discover" });
  complete(
    new Response(
      JSON.stringify({ items: [{ recordId: "late" }], hasNext: false }),
    ),
  );
  await settle();
  assert.deepEqual(model.scope().items, []);
  assert.equal(model.scope().loading, false);
});
