import test, { beforeEach } from 'node:test'
import assert from 'node:assert/strict'

// Exercise the real navigation code with a small browser-history model, without a database.
const events = new EventTarget()
globalThis.window = { scrollY: 0, scrollTo() {}, addEventListener: events.addEventListener.bind(events), removeEventListener: events.removeEventListener.bind(events) }
globalThis.location = { hash: '#/suppliers' }
let entries = [{ state: null, url: location.hash }], index = 0
globalThis.history = {
  get state() { return entries[index].state },
  replaceState(state, _, url) { entries[index] = { state: structuredClone(state), url: url || location.hash }; location.hash = entries[index].url },
  pushState(state, _, url) { entries = [...entries.slice(0, index + 1), { state: structuredClone(state), url }]; index++; location.hash = url },
  back() { if (index > 0) { index--; location.hash = entries[index].url; events.dispatchEvent(new Event('popstate')) } },
  forward() { if (index + 1 < entries.length) { index++; location.hash = entries[index].url; events.dispatchEvent(new Event('popstate')) } },
}
const { currentPage, parseRoute, routeUrl, navigate, registerPageState, clearPageData, pageState, savePage, backToSearch, ensureLoginHistory } = await import('../src/navigation.js')

beforeEach(() => {
  clearPageData()
  entries = [{ state: null, url: '#/suppliers' }]; index = 0; location.hash = '#/suppliers'
  navigate({ screen: 'discover' }, { replace: true })
})

test('addresses preserve search conditions, leading zeros, cursor and exact detail', () => {
  const route = { screen: 'detail', recordId: '9007199254740993', keyword: 'cable eléctrico', hs: '0101', country: 'MX', channel: 'A', mode: 'table', limit: '50', page: '1', before: '100' }
  assert.deepEqual(parseRoute(routeUrl(route)), route)
  assert.equal(parseRoute('#/login?method=phone').method, 'phone')
  assert.equal(parseRoute('#/favorites').screen, 'favorites')
  assert.deepEqual(parseRoute('#/demo/detail/c1'), { screen: 'demo', view: 'detail', company: 'c1' })
  assert.equal(parseRoute('#/unknown').screen, 'discover')
})

test('back and forward restore page state without leaking data into history', () => {
  let state = { hs: '8544', mode: 'table', page: 1, items: [{ supplier: 'temporary trade data' }] }
  const stop = registerPageState('mexico', () => state, saved => { state = saved })
  navigate({ screen: 'detail', recordId: '100' })
  history.back()
  assert.equal(currentPage.value.route.screen, 'discover')
  assert.equal(state.page, 1)
  assert.equal(state.mode, 'table')
  assert.equal(state.hs, '8544')
  history.forward()
  assert.equal(currentPage.value.route.recordId, '100')
  assert.doesNotMatch(JSON.stringify(history.state), /temporary trade data|supplier|8544/)
  stop()
})

test('saved transitions keep the previous search intact instead of overwriting it', () => {
  let state = { hs: '8544', items: ['original'] }
  const stop = registerPageState('mexico', () => state, saved => { state = saved })
  savePage()
  state = { hs: '7408', items: [] }
  navigate({ screen: 'discover', hs: '7408', country: 'MX' }, { saved: true, skip: ['mexico'] })
  state.items.push('new result')
  history.back()
  assert.deepEqual(state, { hs: '8544', items: ['original'] })
  history.forward()
  assert.deepEqual(state, { hs: '7408', items: ['new result'] })
  stop()
})

test('replace and repeated current-page clicks do not create duplicate history entries', () => {
  navigate({ screen: 'favorites' })
  const length = entries.length
  navigate({ screen: 'favorites' })
  assert.equal(entries.length, length)
  navigate({ screen: 'login' }, { replace: true })
  assert.equal(entries.length, length)
})

test('return button uses the existing search entry and supports direct detail links', () => {
  navigate({ screen: 'detail', recordId: '100', hs: '8544', country: 'MX' })
  backToSearch(currentPage.value.route)
  assert.equal(currentPage.value.route.screen, 'discover')
  navigate({ screen: 'detail', recordId: '100', hs: '8544', country: 'MX' }, { replace: true })
  backToSearch(currentPage.value.route)
  assert.equal(currentPage.value.route.screen, 'discover')
  assert.equal(currentPage.value.route.hs, '8544')
})

test('clearing private page data removes trade snapshots from old history entries', () => {
  const stop = registerPageState('mexico', () => ({ items: ['private result'] }))
  navigate({ screen: 'favorites' })
  stop()
  clearPageData()
  history.back()
  assert.equal(pageState('mexico'), undefined)
})

test('successful login leaves login in history for browser back and forward', () => {
  navigate({ screen: 'login' }, { replace: true })
  navigate({ screen: 'discover' })
  history.back()
  assert.equal(currentPage.value.route.screen, 'login')
  history.forward()
  assert.equal(currentPage.value.route.screen, 'discover')
})

test('old or direct authenticated entries get one login predecessor without duplicates', () => {
  ensureLoginHistory()
  assert.equal(entries.length, 2)
  assert.equal(currentPage.value.route.screen, 'discover')
  assert.equal(history.state.sourcingNavigation.previousScreen, 'login')
  ensureLoginHistory()
  assert.equal(entries.length, 2)
  history.back()
  assert.equal(currentPage.value.route.screen, 'login')
  history.forward()
  assert.equal(currentPage.value.route.screen, 'discover')
})
