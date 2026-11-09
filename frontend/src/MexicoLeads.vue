<script setup>
import { ref, computed, onBeforeUnmount } from 'vue'
import { request } from './api.js'
import { currentPage, navigate, savePage, pageState, registerPageState, backToSearch } from './navigation.js'

const emit = defineEmits(['session-expired'])
const draft = ref({ keyword: '', hs: '', country: '' }), applied = ref(null)
const company = ref(''), appliedCompany = ref(''), refinedHs = ref('')
const channel = ref('A'), formError = ref(''), filterError = ref('')
const drawer = ref(false), filterDraft = ref('')
const items = ref([]), pageSize = ref(20), pageIndex = ref(0), cursors = ref([null])
const nextCursor = ref(null), hasNext = ref(false), loading = ref(false), loadError = ref('')
const hasLoaded = ref(false), view = ref('cards'), detailId = ref(null), detail = ref(null)
const detailLoading = ref(false), detailError = ref(''), retryCursor = ref(null), retryIndex = ref(0)
let listSequence = 0, detailSequence = 0
const responses = new Map(), pending = new Map(), details = new Map()
const stateRefs = { draft, applied, company, appliedCompany, refinedHs, channel, items, pageSize, pageIndex, cursors,
  nextCursor, hasNext, loadError, hasLoaded, view, detailId, detail, detailError, retryCursor, retryIndex }
const defaults = Object.fromEntries(Object.entries(stateRefs).map(([name, value]) => [name, JSON.parse(JSON.stringify(value.value))]))
function capture() {
  return { ...Object.fromEntries(Object.entries(stateRefs).map(([name, value]) => [name, value.value])),
    draft: applied.value || draft.value, company: appliedCompany.value }
}
function routeForState() {
  return { screen: detailId.value ? 'detail' : 'discover', recordId: detailId.value, ...applied.value,
    company: appliedCompany.value, refinedHs: refinedHs.value, channel: channel.value, mode: view.value,
    limit: pageSize.value, before: cursors.value[pageIndex.value] || '', page: pageIndex.value }
}
function commit() { navigate(routeForState(), { saved: true, skip: ['mexico'] }) }
function restore(saved, route) {
  if (!['discover', 'detail'].includes(route.screen)) return
  listSequence++; detailSequence++; loading.value = false; detailLoading.value = false; drawer.value = false
  const values = saved || JSON.parse(JSON.stringify(defaults))
  for (const [name, value] of Object.entries(stateRefs)) value.value = values[name] ?? JSON.parse(JSON.stringify(defaults[name]))
  if (!saved) {
    draft.value = { keyword: route.keyword || '', hs: route.hs || '', country: route.country || '' }
    if (draft.value.country === 'MX' && (draft.value.keyword || draft.value.hs)) applied.value = { ...draft.value }
    appliedCompany.value = company.value = route.company || ''; refinedHs.value = route.refinedHs || ''
    channel.value = ['A', 'B', 'C'].includes(route.channel) ? route.channel : 'A'
    view.value = route.mode === 'table' ? 'table' : 'cards'
    pageSize.value = Number(route.limit) === 50 ? 50 : 20
    pageIndex.value = /^[0-9]{1,6}$/.test(route.page || '') ? Number(route.page) : 0
    retryIndex.value = pageIndex.value; retryCursor.value = route.before || null
    cursors.value = []; cursors.value[pageIndex.value] = retryCursor.value
  }
  detailId.value = route.screen === 'detail' ? route.recordId : null
  if (saved && route.screen === 'discover' && applied.value && !route.country)
    navigate(routeForState(), { replace: true, saved: true, skip: ['mexico'] })
  if (detailId.value) {
    if (detail.value?.recordId !== detailId.value) fetchDetail(detailId.value)
  } else if (applied.value && !hasLoaded.value && !loadError.value) loadPage(retryCursor.value, retryIndex.value, false, true)
}
const unregister = registerPageState('mexico', capture, restore)
const text = value => value === null || value === undefined || String(value).trim() === '' ? '暂无信息' : String(value)
const normalize = value => String(value || '').normalize('NFKC').trim()
const validHs = value => !value || /^(?:[0-9]{2}){1,5}$/.test(value)
function number(value, digits = 4) {
  if (value === null || value === undefined) return '暂无信息'
  const parsed = Number(value)
  return Number.isFinite(parsed) ? new Intl.NumberFormat('zh-CN', { maximumFractionDigits: digits }).format(parsed) : '暂无信息'
}
function quantity(row) {
  return row.quantity == null ? '暂无信息' : `${number(row.quantity)} ${row.quantityUnit || '（单位未提供）'}`
}
function handleError(error, target) {
  target.value = error.message
  if (error.status === 401 || error.status === 403) emit('session-expired', error.message)
}
async function loadPage(cursor = null, targetIndex = 0, recordHistory = false, useCache = false) {
  if (loading.value || !applied.value) return
  if (recordHistory) savePage()
  const entryKey = currentPage.value.key
  loading.value = true; loadError.value = ''; retryCursor.value = cursor; retryIndex.value = targetIndex
  const sequence = ++listSequence
  // Paging always uses submitted conditions, not unsaved edits in the form.
  const params = new URLSearchParams({ ...applied.value, company: appliedCompany.value, refinedHs: refinedHs.value, limit: String(pageSize.value) })
  if (cursor !== null) params.set('before', cursor)
  const cacheKey = params.toString()
  try {
    let promise = pending.get(cacheKey)
    if (!promise && !(useCache && responses.has(cacheKey))) {
      promise = request(`/mexico/exports/search?${params}`, { timeoutMs: 0 })
        .then(page => { responses.set(cacheKey, page); if (responses.size > 30) responses.delete(responses.keys().next().value); return page })
        .finally(() => pending.delete(cacheKey))
      pending.set(cacheKey, promise)
    }
    const page = promise ? await promise : responses.get(cacheKey)
    if (sequence !== listSequence) return
    items.value = page.items; hasNext.value = page.hasNext; nextCursor.value = page.nextCursor
    pageIndex.value = targetIndex; cursors.value = [...cursors.value.slice(0, targetIndex), cursor]; hasLoaded.value = true
    if (recordHistory && currentPage.value.key === entryKey) commit()
  } catch (error) { if (sequence === listSequence) handleError(error, loadError) }
  finally { if (sequence === listSequence) loading.value = false }
}
function resetPage() {
  items.value = []; hasLoaded.value = false; pageIndex.value = 0
  cursors.value = [null]; nextCursor.value = null; hasNext.value = false
  commit()
  loadPage()
}
function search() {
  if (loading.value) return
  formError.value = ''
  const value = Object.fromEntries(Object.entries(draft.value).map(([key, value]) => [key, normalize(value)]))
  if (!value.keyword && !value.hs) { formError.value = '产品关键词与 HS Code 至少填写一项。'; return }
  if (!validHs(value.hs)) { formError.value = 'HS Code 请输入 2、4、6、8 或 10 位数字，保留前导零。'; return }
  if (value.country !== 'MX') { formError.value = '请选择寻源国家，目前已接入墨西哥。'; return }
  savePage()
  applied.value = value; appliedCompany.value = ''; company.value = ''; refinedHs.value = ''; filterError.value = ''
  channel.value = 'A'; resetPage()
}
function filterCompany() {
  if (!applied.value || loading.value) return
  savePage()
  appliedCompany.value = normalize(company.value); resetPage()
}
function openFilters() { filterDraft.value = refinedHs.value; filterError.value = ''; drawer.value = true }
function applyFilters() {
  const code = normalize(filterDraft.value), base = applied.value?.hs || ''
  if (!validHs(code)) { filterError.value = 'HS 前缀请输入 2、4、6、8 或 10 位数字。'; return }
  if (base && code && !base.startsWith(code) && !code.startsWith(base)) {
    filterError.value = '细筛 HS 必须与顶部 HS 属于同一前缀范围。'; return
  }
  savePage(); refinedHs.value = code; drawer.value = false; resetPage()
}
function clearFilters() { savePage(); refinedHs.value = ''; appliedCompany.value = ''; company.value = ''; resetPage() }
function refresh() { if (!loading.value) { savePage(); resetPage() } }
function changePageSize(event) { savePage(); pageSize.value = Number(event.target.value); resetPage() }
function previous() {
  if (pageIndex.value > 0) {
    const index = pageIndex.value > 1 && cursors.value[pageIndex.value - 1] == null ? 0 : pageIndex.value - 1
    loadPage(cursors.value[index] || null, index, true)
  }
}
function next() { if (hasNext.value && nextCursor.value) loadPage(nextCursor.value, pageIndex.value + 1, true) }
function setChannel(value) { if (channel.value !== value) { savePage(); channel.value = value; commit() } }
function setView(value) { if (view.value !== value) { savePage(); view.value = value; commit() } }
function openDetail(id) { savePage(); detailId.value = id; detail.value = null; detailError.value = ''; commit(); fetchDetail(id) }
async function fetchDetail(id) {
  detailId.value = id; detail.value = null; detailError.value = ''; detailLoading.value = true
  const sequence = ++detailSequence
  try {
    const record = details.get(id) || await request(`/mexico/exports/${encodeURIComponent(id)}`)
    details.set(id, record)
    if (sequence === detailSequence) detail.value = record
  } catch (error) { if (sequence === detailSequence) handleError(error, detailError) }
  finally { if (sequence === detailSequence) detailLoading.value = false }
}
function back() { backToSearch(routeForState()) }
const groups = computed(() => {
  const row = detail.value
  if (!row) return []
  return [
    { title: '供应商信息', fields: [
      ['供应商名称', text(row.supplierName)], ['企业所属国家 / 地区', text(row.supplierCountry)],
      ['税号（源记录，未经官方核验）', text(row.supplierTaxNumber)], ['供应商地址', text(row.supplierAddress)],
    ] },
    { title: '商品与贸易记录', fields: [
      ['贸易日期（源字段，语义待核定）', text(row.shipmentDate)], ['HS 编码（原文）', text(row.hsCode)],
      ['商品数量 / 单位', quantity(row)], ['毛重（kg）', number(row.grossWeightKg)],
      ['商品货值（源字段 CIF，USD）', number(row.itemValueCifUsd, 2)], ['集装箱体积（TEU）', number(row.volumeTeu)],
      ['运输方式', text(row.transportMethod)], ['装货港', text(row.portOfLading)],
      ['目的地（源记录）', text(row.itemDestination)], ['提单编号', text(row.billOfLadingNumber)],
    ] },
    { title: '贸易伙伴', fields: [['收货方名称', text(row.customerName)], ['收货方国家 / 地区', text(row.customerCountry)]] },
  ]
})
restore(pageState('mexico'), currentPage.value.route)
onBeforeUnmount(() => { unregister(); listSequence++; detailSequence++ })
</script>

<template>
  <section v-if="detailId" aria-label="墨西哥贸易线索详情">
    <button type="button" class="link" @click="back">← 返回搜索结果</button>
    <div class="detail-head"><div><p class="small muted">A 本地 · 贸易线索 · 墨西哥出口</p><h2 class="lead-detail-name">{{ detail ? text(detail.supplierName) : '贸易线索详情' }}</h2></div><span class="tag blue">海关</span></div>
    <p v-if="detailLoading" class="data-loading" role="status">正在读取记录详情…</p>
    <div v-else-if="detailError" class="data-error" role="alert"><h3>无法读取记录详情</h3><p>{{ detailError }}</p><button type="button" @click="fetchDetail(detailId)">重新读取详情</button></div>
    <template v-else-if="detail">
      <div class="hint">当前展示单条出口记录中的供方线索，尚未关联企业名录或核验联系方式；缺失字段显示“暂无信息”。</div>
      <section class="panel"><h2>贸易记录中的商品（原文）</h2><p class="goods-original">{{ text(detail.goodsDescription) }}</p><p class="small muted match-basis">匹配依据：{{ applied?.keyword ? `商品原文包含“${applied.keyword}”` : '' }}{{ applied?.keyword && (applied?.hs || refinedHs) ? '；' : '' }}{{ applied?.hs || refinedHs ? `HS 前缀 ${applied?.hs || refinedHs}${applied?.hs && refinedHs ? `，细筛 ${refinedHs}` : ''}` : '' }}。</p></section>
      <section v-for="group in groups" :key="group.title" class="panel"><h2>{{ group.title }}</h2><dl class="infogrid lead-info"><div v-for="[label, value] in group.fields" :key="label"><dt class="small muted">{{ label }}</dt><dd>{{ value }}</dd></div></dl></section>
      <div class="data-notes">数量保留源记录单位；货值不代表企业总交易额。尚未核定连续覆盖期，不计算近期记录数、产能或供应商排名。</div>
    </template>
  </section>
  <section v-else aria-label="供应商搜索">
    <form class="search-form" novalidate @submit.prevent="search">
      <label class="field"><span>产品关键词</span><input v-model="draft.keyword" maxlength="100" placeholder="例如 cable / cable eléctrico" :disabled="loading"></label>
      <label class="field"><span>HS Code</span><input v-model="draft.hs" maxlength="10" inputmode="numeric" placeholder="例如 8544" :disabled="loading"></label>
      <label class="field"><span>国家 *</span><select v-model="draft.country" :disabled="loading" aria-label="寻源国家"><option value="">请选择国家</option><option value="MX">墨西哥</option></select></label>
      <button type="submit" class="primary" :disabled="loading">{{ loading ? '搜索中…' : '搜索' }}</button>
    </form>
    <p v-if="formError" class="error search-validation" role="alert">{{ formError }}</p>
    <div class="tabs search-channels" role="tablist" aria-label="供应商通道">
      <button id="channel-A" type="button" role="tab" :aria-selected="channel === 'A'" aria-controls="channel-panel" :class="{ on: channel === 'A' }" @click="setChannel('A')">A 本地 · 贸易线索 <span class="tag">{{ hasLoaded && !loadError ? '已接入' : '墨西哥' }}</span></button>
      <button id="channel-B" type="button" role="tab" :aria-selected="channel === 'B'" aria-controls="channel-panel" :class="{ on: channel === 'B' }" @click="setChannel('B')">B 本地 · 名录 <span class="tag">待接入</span></button>
      <button id="channel-C" type="button" role="tab" :aria-selected="channel === 'C'" aria-controls="channel-panel" :class="{ on: channel === 'C' }" @click="setChannel('C')">C 境外 · 贸易线索 <span class="tag">待接入</span></button>
    </div>
    <div id="channel-panel" role="tabpanel" :aria-labelledby="`channel-${channel}`">
      <div v-if="channel !== 'A'" class="empty channel-placeholder"><h2>{{ channel === 'B' ? '本地名录 · 待接入' : '境外贸易线索 · 待接入' }}</h2><p>{{ channel === 'B' ? '此处将展示企业属于寻源国家、具有相关目录产品或经营线索的企业。' : '此处将展示企业位于其他国家、具有向寻源国家供应相关产品的真实贸易线索。' }}</p><p>入口已保留，当前尚未接入数据，不表示没有匹配企业。</p><p v-if="applied" class="small muted">已保留搜索条件：{{ applied.keyword || '未填关键词' }} · HS {{ applied.hs || '未填' }} · 墨西哥</p><button type="button" @click="setChannel('A')">返回 A 本地 · 贸易线索</button></div>
      <template v-else>
        <div v-if="!applied" class="empty"><h2>从产品与国家开始寻找供应商</h2><p>产品关键词与 HS Code 至少填写一项，同时填写取交集；国家必选。</p><p class="small muted">搜索覆盖墨西哥出口表全部记录，不限于当前页或本地样本。关键词按商品原文匹配，尚未启用审核跨语词典。</p></div>
        <template v-else>
          <div class="toolbar search-toolbar">
            <span class="small muted" role="status">{{ loading ? '正在查询墨西哥出口全表…' : loadError ? '本次查询失败' : `本页 ${items.length} 条贸易线索` }}</span>
            <div class="row">
              <form class="company-search company-search-form" @submit.prevent="filterCompany"><input v-model="company" maxlength="100" aria-label="模糊搜索企业名称" placeholder="模糊搜索企业名称，回车筛选" :disabled="loading"><button type="submit" :disabled="loading">筛选</button></form>
              <button type="button" :disabled="loading" @click="openFilters">高级筛选<span v-if="refinedHs" class="filter-dot"> · 1</span></button>
              <button type="button" disabled title="真实数据对比尚未接入">去对比</button>
              <div class="view-switch" aria-label="展示方式">
                <button type="button" :class="{ on: view === 'cards' }" title="卡片展示" aria-label="卡片展示" :aria-pressed="view === 'cards'" @click="setView('cards')"><svg viewBox="0 0 20 20" aria-hidden="true"><rect x="2" y="2" width="6" height="6" rx="1"/><rect x="12" y="2" width="6" height="6" rx="1"/><rect x="2" y="12" width="6" height="6" rx="1"/><rect x="12" y="12" width="6" height="6" rx="1"/></svg></button>
                <button type="button" :class="{ on: view === 'table' }" title="表格展示" aria-label="表格展示" :aria-pressed="view === 'table'" @click="setView('table')"><svg viewBox="0 0 20 20" aria-hidden="true"><rect x="2" y="3" width="16" height="14" rx="1"/><path d="M2 8h16M2 12h16M7 3v14"/></svg></button>
              </div>
              <select aria-label="结果排序"><option>记录编号降序</option><option disabled>综合排序（待核定）</option><option disabled>贸易量优先（待核定）</option></select>
            </div>
          </div>
          <div class="hint search-scope"><p>检索范围：墨西哥出口全表 · {{ applied.keyword ? `商品原文“${applied.keyword}”` : '' }}{{ applied.keyword && applied.hs ? ' ∩ ' : '' }}{{ applied.hs ? `HS ${applied.hs} 前缀` : '' }}{{ appliedCompany ? ` · 企业名称“${appliedCompany}”` : '' }}{{ refinedHs ? ` · 细筛 HS ${refinedHs}` : '' }}</p><p>当前每条结果是一条贸易记录，同一企业可能重复；不计算全库总数或企业排名。</p><button v-if="refinedHs || appliedCompany" type="button" class="link" :disabled="loading" @click="clearFilters">清空结果筛选</button></div>
          <div v-if="loadError" class="data-error" role="alert"><h3>搜索未完成</h3><p>{{ loadError }}</p><button type="button" :disabled="loading" @click="loadPage(retryCursor, retryIndex)">重试本次查询</button></div>
          <div v-else-if="loading" class="data-loading" role="status">正在查找符合条件的记录，请稍候…</div>
          <div v-else-if="hasLoaded && !items.length" class="empty"><h2>当前条件未找到匹配贸易线索</h2><p>本次查询已完成；可调整关键词、HS 或结果筛选。不会自动放宽条件或用演示数据补充。</p><button v-if="appliedCompany || refinedHs" type="button" @click="clearFilters">清空结果筛选</button></div>
          <div v-else-if="view === 'cards'" class="supplier-grid" aria-label="贸易线索卡片">
            <article v-for="row in items" :key="row.recordId" class="supplier mexico-lead">
              <div class="supplier-title"><button type="button" class="link supplier-name lead-name" @click="openDetail(row.recordId)">{{ text(row.supplierName) }}</button><button type="button" class="heart" disabled aria-label="收藏尚未接入" title="真实数据收藏尚未接入">♥</button></div>
              <p class="small muted">{{ text(row.supplierCountry) }} · 企业属性暂无信息</p>
              <div class="lead-source"><span class="tag">海关</span><span class="tag">出口线索</span></div>
              <div class="supplier-meta"><div><p class="small muted">匹配商品（贸易原文）</p><p class="supplier-product lead-description">{{ text(row.goodsDescription) }}</p><p class="small muted">HS {{ text(row.hsCode) }} · {{ applied.keyword && applied.hs ? '关键词与 HS 同条记录命中' : applied.hs ? 'HS 前缀命中' : '商品原文命中' }}</p><p class="small muted">联系方式：暂无信息</p></div><div><p class="small muted">贸易日期（源字段）</p><p>{{ text(row.shipmentDate) }}</p><p class="small muted lead-quantity">数量：{{ quantity(row) }}</p><p class="small muted">毛重：{{ row.grossWeightKg == null ? '暂无信息' : `${number(row.grossWeightKg)} kg` }}</p></div></div>
              <div class="supplier-foot"><span class="small muted">单条贸易线索</span><button type="button" class="link" @click="openDetail(row.recordId)">查看详情 →</button></div>
            </article>
          </div>
          <div v-else class="tablebox"><table class="mexico-table"><thead><tr><th>供应商 / 国家</th><th>匹配商品 / HS</th><th>贸易日期（源字段）</th><th>数量 / 单位</th><th>来源 / 操作</th></tr></thead><tbody><tr v-for="row in items" :key="row.recordId"><td><button type="button" class="link table-name" @click="openDetail(row.recordId)">{{ text(row.supplierName) }}</button><p class="small muted">{{ text(row.supplierCountry) }}</p></td><td><p class="lead-description">{{ text(row.goodsDescription) }}</p><p class="small muted">HS {{ text(row.hsCode) }}</p></td><td>{{ text(row.shipmentDate) }}</td><td>{{ quantity(row) }}</td><td><span class="tag">海关</span><button type="button" class="link" @click="openDetail(row.recordId)">查看详情</button></td></tr></tbody></table></div>
          <div class="pager" aria-label="搜索结果分页"><label class="page-size-label">每页 <select :value="pageSize" aria-label="每页条数" :disabled="loading" @change="changePageSize"><option :value="20">20 条</option><option :value="50">50 条</option></select></label><button type="button" :disabled="loading" @click="refresh">重新搜索</button><button type="button" :disabled="loading || pageIndex === 0" @click="previous">上一页</button><span class="tag" aria-current="page">{{ pageIndex + 1 }}</span><button type="button" :disabled="loading || !!loadError || !hasNext" @click="next">下一页</button></div>
        </template>
      </template>
    </div>
    <div v-if="drawer" class="overlay" @click.self="drawer = false" @keydown.esc="drawer = false">
      <section class="drawer" role="dialog" aria-modal="true" aria-labelledby="filter-title"><div class="drawer-head"><h2 id="filter-title">高级筛选</h2><button type="button" @click="drawer = false">关闭</button></div>
        <form class="form" @submit.prevent="applyFilters">
          <div class="filter-group"><h3>来源类别</h3><div class="chips"><label v-for="source in ['海关', '官方目录', '登记镜像', '黄页/公司目录', 'B2B 平台', '企业/官网', '公开网页']" :key="source" class="check"><input type="checkbox" :checked="source === '海关'" disabled>{{ source }}</label></div><p class="small muted">当前 A 通道仅接入海关出口记录，其余来源待接入。</p></div>
          <label class="field"><span>HS Code · 当前结果内细筛</span><input v-model="filterDraft" maxlength="10" inputmode="numeric" placeholder="输入 HS 前缀"></label>
          <div class="cols"><label class="field"><span>企业属性</span><select disabled><option>暂无结构化属性数据</option></select></label><label class="field"><span>联系方式</span><select disabled><option>联系方式数据待接入</option></select></label></div>
          <div class="cols"><label class="field"><span>企业规模</span><select disabled><option>员工规模数据待接入</option></select></label><label class="field"><span>供货量下限</span><input disabled placeholder="统计期、单位及粒度待核定"></label></div>
          <p class="small muted">无真实数据或未核定统计口径的条件暂不可用，不用缺失值冒充 0。取消或关闭不应用修改。</p>
          <p v-if="filterError" class="error" role="alert">{{ filterError }}</p>
          <div class="row"><button type="submit" class="primary">应用筛选</button><button type="button" @click="filterDraft = ''; filterError = ''">重置筛选</button><button type="button" @click="drawer = false">取消</button></div>
        </form>
      </section>
    </div>
  </section>
</template>
