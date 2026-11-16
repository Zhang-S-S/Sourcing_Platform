import { createStore } from "../store/createStore.js";
import { request } from "../api/client.js";
import { createMexicoEnrichment } from "../api/mexicoEnrichment.js";
import { employeeSummary } from "../utils/supplierPresentation.js";
import {
  currentPage,
  navigate,
  savePage,
  pageState,
  registerPageState,
  backToSearch,
} from "../router/navigation.js";
const initial = {
  draft: {
    keyword: "",
    hs: "",
    country: "",
  },
  applied: null,
  company: "",
  appliedCompany: "",
  refinedHs: "",
  channel: "A",
  formError: "",
  filterError: "",
  drawer: false,
  filterDraft: {
    sources: [],
    types: [],
    hs: "",
    contact: "",
    size: "",
    minQty: "",
    unit: "kg",
  },
  selected: [],
  pendingSearch: null,
  items: [],
  pageSize: 20,
  pageIndex: 0,
  cursors: [null],
  nextCursor: null,
  hasNext: false,
  loading: false,
  loadError: "",
  hasLoaded: false,
  view: "cards",
  detailId: null,
  detail: null,
  detailTab: "基础信息",
  detailLoading: false,
  detailError: "",
  retryCursor: null,
  retryIndex: 0,
};
const savedNames = [
  "draft",
  "applied",
  "company",
  "appliedCompany",
  "refinedHs",
  "channel",
  "items",
  "pageSize",
  "pageIndex",
  "cursors",
  "nextCursor",
  "hasNext",
  "loadError",
  "hasLoaded",
  "view",
  "detailId",
  "detail",
  "detailError",
  "retryCursor",
  "retryIndex",
  "selected",
  "detailTab",
];
export function createMexicoModel(emit = () => {}) {
  const store = createStore(initial),
    s = store.state;
  const enrich = createMexicoEnrichment(request);
  function criteria() {
    return s.applied
      ? { ...s.applied, company: s.appliedCompany, refinedHs: s.refinedHs }
      : null;
  }
  function enrichList() {
    const sequence = listSequence;
    enrich(
      s.items,
      criteria(),
      () => sequence === listSequence,
      (transform) => {
        s.items = s.items.map(transform);
        if (s.detail) s.detail = transform(s.detail);
      },
      (message) => emit("session-expired", message),
    );
  }
  function enrichDetail() {
    const sequence = detailSequence;
    if (s.detail)
      enrich(
        [s.detail],
        criteria(),
        () => sequence === detailSequence,
        (transform) => {
          if (s.detail) s.detail = transform(s.detail);
          s.items = s.items.map(transform);
        },
        (message) => emit("session-expired", message),
      );
  }
  const emptyFilters = () => structuredClone(initial.filterDraft);
  const sources = [
    "海关",
    "官方目录",
    "登记镜像",
    "黄页/公司目录",
    "B2B 平台",
    "企业/官网",
    "公开网页",
  ];
  const detailTabs = ["基础信息", "产品与服务", "贸易画像", "我的评价"];
  let listSequence = 0,
    detailSequence = 0;
  const responses = new Map(),
    pending = new Map(),
    details = new Map();
  const defaults = Object.fromEntries(
    savedNames.map((name) => [name, structuredClone(initial[name])]),
  );
  function capture() {
    return {
      ...Object.fromEntries(savedNames.map((name) => [name, s[name]])),
      draft: s.applied || s.draft,
      company: s.appliedCompany,
    };
  }
  function routeForState() {
    return {
      screen: s.detailId ? "detail" : "discover",
      recordId: s.detailId,
      ...s.applied,
      company: s.appliedCompany,
      refinedHs: s.refinedHs,
      channel: s.channel,
      mode: s.view,
      limit: s.pageSize,
      before: s.cursors[s.pageIndex] || "",
      page: s.pageIndex,
      tab: s.detailId ? s.detailTab : undefined,
    };
  }
  function commit() {
    navigate(routeForState(), { saved: true, skip: ["mexico"] });
  }
  function restore(saved, route) {
    if (!["discover", "detail"].includes(route.screen)) return;
    listSequence++;
    detailSequence++;
    s.loading = false;
    s.detailLoading = false;
    s.drawer = false;
    s.pendingSearch = null;
    const values = saved || JSON.parse(JSON.stringify(defaults));
    for (const name of savedNames)
      s[name] = values[name] ?? structuredClone(defaults[name]);
    if (!saved) {
      s.draft = {
        keyword: route.keyword || "",
        hs: route.hs || "",
        country: route.country || "",
      };
      if (s.draft.country === "MX" && (s.draft.keyword || s.draft.hs))
        s.applied = { ...s.draft };
      s.appliedCompany = s.company = route.company || "";
      s.refinedHs = route.refinedHs || "";
      s.channel = ["A", "B", "C"].includes(route.channel) ? route.channel : "A";
      s.view = route.mode === "table" ? "table" : "cards";
      s.detailTab = detailTabs.includes(route.tab) ? route.tab : "基础信息";
      s.pageSize = Number(route.limit) === 10 ? 10 : 20;
      s.pageIndex = /^[0-9]{1,6}$/.test(route.page || "")
        ? Number(route.page)
        : 0;
      s.retryIndex = s.pageIndex;
      s.retryCursor = route.before || null;
      s.cursors = [];
      s.cursors[s.pageIndex] = s.retryCursor;
    }
    s.detailId = route.screen === "detail" ? route.recordId : null;
    if (saved && route.screen === "discover" && s.applied && !route.country)
      navigate(routeForState(), {
        replace: true,
        saved: true,
        skip: ["mexico"],
      });
    if (s.detailId) {
      if (s.detail?.recordId !== s.detailId) fetchDetail(s.detailId);
      else enrichDetail();
    } else if (s.applied && !s.hasLoaded && !s.loadError)
      loadPage(s.retryCursor, s.retryIndex, false, true);
    else if (s.hasLoaded) enrichList();
  }
  let unregister = () => {};
  const text = (value) =>
    value === null || value === undefined || String(value).trim() === ""
      ? "暂无信息"
      : String(value);
  const normalize = (value) =>
    String(value || "")
      .normalize("NFKC")
      .trim();
  const validHs = (value) => !value || /^(?:[0-9]{2}){1,5}$/.test(value);
  function number(value, digits = 4) {
    if (value === null || value === undefined) return "暂无信息";
    const parsed = Number(value);
    return Number.isFinite(parsed)
      ? new Intl.NumberFormat("zh-CN", {
          maximumFractionDigits: digits,
        }).format(parsed)
      : "暂无信息";
  }
  function quantity(row) {
    return row.quantity == null
      ? "暂无信息"
      : `${number(row.quantity)} ${row.quantityUnit || "（单位未提供）"}`;
  }
  function handleError(error, target) {
    s[target] = error.message;
    if (error.status === 401 || error.status === 403)
      emit("session-expired", error.message);
  }
  async function loadPage(
    cursor = null,
    targetIndex = 0,
    recordHistory = false,
    useCache = false,
  ) {
    if (s.loading || !s.applied || s.channel !== "A") return;
    if (recordHistory) savePage();
    const entryKey = currentPage.value.key;
    s.loading = true;
    s.loadError = "";
    s.retryCursor = cursor;
    s.retryIndex = targetIndex;
    const sequence = ++listSequence;
    // Paging always uses submitted conditions, not unsaved edits in the form.
    const params = new URLSearchParams({
      ...s.applied,
      company: s.appliedCompany,
      refinedHs: s.refinedHs,
      limit: String(s.pageSize),
    });
    if (cursor !== null) params.set("before", cursor);
    const cacheKey = params.toString();
    try {
      let promise = pending.get(cacheKey);
      if (!promise && !(useCache && responses.has(cacheKey))) {
        promise = request(`/mexico/exports/search?${params}`, { timeoutMs: 0 })
          .then((page) => {
            responses.set(cacheKey, page);
            if (responses.size > 30)
              responses.delete(responses.keys().next().value);
            return page;
          })
          .finally(() => pending.delete(cacheKey));
        pending.set(cacheKey, promise);
      }
      const page = promise ? await promise : responses.get(cacheKey);
      if (sequence !== listSequence) return;
      s.items = page.items;
      s.hasNext = page.hasNext;
      s.nextCursor = page.nextCursor;
      s.pageIndex = targetIndex;
      s.cursors = [...s.cursors.slice(0, targetIndex), cursor];
      s.hasLoaded = true;
      enrichList();
      if (recordHistory && currentPage.value.key === entryKey) commit();
    } catch (error) {
      if (sequence === listSequence) handleError(error, "loadError");
    } finally {
      if (sequence === listSequence) s.loading = false;
    }
  }
  function resetPage() {
    s.items = [];
    s.hasLoaded = false;
    s.pageIndex = 0;
    s.cursors = [null];
    s.nextCursor = null;
    s.hasNext = false;
    commit();
    loadPage();
  }
  function search() {
    if (s.loading) return;
    s.formError = "";
    const value = Object.fromEntries(
      Object.entries(s.draft).map(([key, value]) => [key, normalize(value)]),
    );
    if (!value.keyword && !value.hs) {
      s.formError = "产品关键词与 HS Code 至少填写一项。";
      return;
    }
    if (!validHs(value.hs)) {
      s.formError = "HS Code 请输入 2、4、6、8 或 10 位数字，保留前导零。";
      return;
    }
    if (value.country !== "MX") {
      s.formError = value.country
        ? "该国家数据尚未接入，目前可搜索墨西哥。"
        : "请选择寻源国家，目前已接入墨西哥。";
      return;
    }
    const changed =
      s.applied &&
      Object.keys(value).some((key) => value[key] !== s.applied[key]);
    if (changed && s.selected.length) {
      s.pendingSearch = value;
      return;
    }
    submitSearch(value, changed);
  }
  function submitSearch(value, changed) {
    savePage();
    if (changed) s.selected = [];
    s.applied = value;
    s.appliedCompany = "";
    s.company = "";
    s.refinedHs = "";
    s.filterError = "";
    s.channel = "A";
    resetPage();
  }
  function cancelSearch() {
    s.draft = { ...s.applied };
    s.pendingSearch = null;
  }
  function confirmSearch() {
    const value = s.pendingSearch;
    s.pendingSearch = null;
    if (value) submitSearch(value, true);
  }
  function filterCompany() {
    if (!s.applied || s.channel !== "A") {
      unavailable(
        "企业名称筛选",
        !s.applied ? "请先提交产品或 HS 和国家搜索。" : "本通道数据尚未接入。",
      );
      return;
    }
    if (s.loading || normalize(s.company) === s.appliedCompany) return;
    savePage();
    s.appliedCompany = normalize(s.company);
    resetPage();
  }
  function openFilters() {
    s.filterDraft = { ...emptyFilters(), hs: s.refinedHs };
    s.filterError = "";
    s.drawer = true;
  }
  function applyFilters() {
    if (!s.applied || s.channel !== "A") {
      s.filterError = !s.applied
        ? "请先提交产品或 HS 和国家搜索。"
        : "本通道数据尚未接入，筛选条件暂不能应用。";
      return;
    }
    const filters = s.filterDraft;
    if (
      filters.sources.some((source) => source !== "海关") ||
      filters.types.length ||
      filters.contact ||
      filters.size ||
      filters.minQty !== ""
    ) {
      s.filterError =
        "所选条件的数据尚未接入，本次未应用筛选。当前支持海关来源和 HS 细筛；其余控件按原版保留。";
      return;
    }
    const code = normalize(filters.hs),
      base = s.applied?.hs || "";
    if (!validHs(code)) {
      s.filterError = "HS 前缀请输入 2、4、6、8 或 10 位数字。";
      return;
    }
    if (base && code && !base.startsWith(code) && !code.startsWith(base)) {
      s.filterError = "细筛 HS 必须与顶部 HS 属于同一前缀范围。";
      return;
    }
    savePage();
    s.refinedHs = code;
    s.drawer = false;
    resetPage();
  }
  function clearFilters() {
    savePage();
    s.refinedHs = "";
    s.appliedCompany = "";
    s.company = "";
    resetPage();
  }
  function changePageSize(event) {
    savePage();
    s.pageSize = Number(event.target.value);
    if (s.applied && s.channel === "A") resetPage();
    else commit();
  }
  function previous() {
    if (s.pageIndex > 0) {
      const index =
        s.pageIndex > 1 && s.cursors[s.pageIndex - 1] == null
          ? 0
          : s.pageIndex - 1;
      loadPage(s.cursors[index] || null, index, true);
    }
  }
  function next() {
    if (s.hasNext && s.nextCursor)
      loadPage(s.nextCursor, s.pageIndex + 1, true);
  }
  function setChannel(value) {
    if (s.channel === value) return;
    savePage();
    s.channel = value;
    commit();
    if (value === "A" && s.applied && !s.hasLoaded && !s.loadError)
      loadPage(s.retryCursor, s.retryIndex, false, true);
  }
  function setView(value) {
    if (s.view !== value) {
      savePage();
      s.view = value;
      commit();
    }
  }
  function unavailable(
    feature,
    reason = "真实数据功能尚未接入，入口按甲方原版保留。",
  ) {
    emit("notice", `${feature}：${reason}`);
  }
  function toggleSelection(id, event) {
    if (!s.selected.includes(id) && s.selected.length >= 5) {
      event.target.checked = false;
      unavailable("供应商对比", "最多选择 5 家。");
      return;
    }
    s.selected = s.selected.includes(id)
      ? s.selected.filter((value) => value !== id)
      : [...s.selected, id];
  }
  function requestSort(event) {
    const label = event.target.selectedOptions[0].textContent;
    event.target.value = "recommended";
    unavailable(
      label,
      "企业归一与统计口径尚未完成，当前贸易线索仍按记录编号降序返回，本次未改变顺序。",
    );
  }
  function resultSummary() {
    return s.channel !== "A"
      ? "数据待接入"
      : !s.applied
        ? "等待搜索"
        : s.loading
          ? "正在搜索…"
          : s.loadError
            ? "本次查询失败"
            : `本页贸易线索 ${s.items.length} 条`;
  }
  function openDetail(id) {
    savePage();
    s.detailId = id;
    s.detailTab = "基础信息";
    s.detail = null;
    s.detailError = "";
    commit();
    fetchDetail(id);
  }
  function setDetailTab(value) {
    if (value !== s.detailTab) {
      savePage();
      s.detailTab = value;
      commit();
    }
  }
  async function fetchDetail(id) {
    s.detailId = id;
    s.detail = null;
    s.detailError = "";
    s.detailLoading = true;
    const sequence = ++detailSequence;
    try {
      const record =
        details.get(id) ||
        (await request(`/mexico/exports/${encodeURIComponent(id)}`));
      details.set(id, record);
      if (sequence === detailSequence) {
        s.detail = record;
        enrichDetail();
      }
    } catch (error) {
      if (sequence === detailSequence) handleError(error, "detailError");
    } finally {
      if (sequence === detailSequence) s.detailLoading = false;
    }
  }
  function back() {
    backToSearch({ ...routeForState(), tab: undefined });
  }
  function basicGroups() {
    const row = s.detail;
    if (!row) return [];
    const p = row.supplierProfile;
    const profileValue = (value) =>
      !p || p.status === "LOADING"
        ? "企业资料读取中…"
        : p.status !== "MATCHED"
          ? p.message || "企业名录关联待核实"
          : text(value);
    return [
      {
        title: "企业概况",
        fields: [
          ["企业简介", "暂无信息"],
          ["行业 / 经营类别", profileValue(p?.industry)],
          ["成立年份", profileValue(p?.yearFounded)],
          [
            "员工规模",
            p?.employees != null
              ? `${employeeSummary(row)}（企业名录数据）`
              : employeeSummary(row),
          ],
        ],
      },
      {
        title: "主体识别",
        fields: [
          ["税号 / 登记号", text(row.supplierTaxNumber)],
          [
            "登记状态",
            p?.companyStatus
              ? `${p.companyStatus}（名录状态，非登记核验）`
              : profileValue(null),
          ],
          ["企业地址", text(row.supplierAddress)],
        ],
        note: "观察到号码不等于官方核验；号码类型按国家分别标识。",
      },
      {
        title: "联系方式",
        fields: [
          [
            "企业官网",
            p?.website
              ? `${p.website}（名录网站，未独立核验）`
              : profileValue(null),
          ],
          [
            "公开电话",
            profileValue(
              [...new Set([p?.phone, p?.otherPhone].filter(Boolean))].join(
                " / ",
              ),
            ),
          ],
          ["WhatsApp", "暂无信息"],
          ["公开邮箱", "暂无信息"],
          ["联系人", "暂无信息"],
        ],
        note:
          p?.message ||
          "仅展示获授权的公开联系字段；有号码不表示已接通，平台商铺不标为官网。",
      },
    ];
  }
  const tradeMetrics = [
    "近期记录数",
    "最近记录日期",
    "可识别贸易伙伴",
    "贸易额 / 货值性质",
    "商品数量及单位",
    "重量",
    "TEU",
  ];

  return {
    store,
    mount() {
      unregister = registerPageState("mexico", capture, restore);
      restore(pageState("mexico"), currentPage.value.route);
      return () => {
        unregister();
        listSequence++;
        detailSequence++;
      };
    },
    scope() {
      return {
        ...store.getSnapshot(),
        capture,
        routeForState,
        commit,
        restore,
        number,
        quantity,
        handleError,
        loadPage,
        resetPage,
        search,
        submitSearch,
        cancelSearch,
        confirmSearch,
        filterCompany,
        openFilters,
        applyFilters,
        clearFilters,
        changePageSize,
        previous,
        next,
        setChannel,
        setView,
        unavailable,
        toggleSelection,
        requestSort,
        resultSummary,
        openDetail,
        setDetailTab,
        fetchDetail,
        back,
        basicGroups,
        text,
        sources,
        detailTabs,
        tradeMetrics,
        emptyFilters,
        basicGroups: basicGroups(),
        resultSummary: resultSummary(),
        setValue: store.setValue,
      };
    },
  };
}
