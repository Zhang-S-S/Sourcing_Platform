import { nextTick, shallowRef } from 'vue'

// Only navigation belongs in browser history. Page data stays in this tab's memory;
// account credentials and trade rows are never written into history or storage.
const captures = new Map(), restores = new Map(), snapshots = new Map()
const fields = ['keyword', 'hs', 'country', 'company', 'refinedHs', 'channel', 'mode', 'limit', 'before', 'page']
const clone = value => value == null ? value : JSON.parse(JSON.stringify(value))
const key = () => crypto.randomUUID()

export function parseRoute(hash) {
  const url = new URL((hash || '#/suppliers').replace(/^#/, ''), 'http://navigation.local')
  const params = Object.fromEntries(fields.filter(name => url.searchParams.has(name)).map(name => [name, url.searchParams.get(name)]))
  if (url.pathname === '/login') return { screen: 'login', method: url.searchParams.get('method') === 'phone' ? 'phone' : 'password' }
  if (url.pathname === '/register') return { screen: 'register' }
  if (url.pathname === '/favorites' || url.pathname === '/compare') return { screen: url.pathname.slice(1) }
  const detail = url.pathname.match(/^\/suppliers\/exports\/([1-9][0-9]{0,18})$/)
  if (detail) return { ...params, screen: 'detail', recordId: detail[1] }
  const demo = url.pathname.match(/^\/demo\/(detail|report)\/([a-zA-Z0-9_-]+)$/)
  if (demo) return { screen: 'demo', view: demo[1], company: demo[2] }
  return { ...params, screen: 'discover' }
}

export function routeUrl(route) {
  if (route.screen === 'login') return '#/login' + (route.method === 'phone' ? '?method=phone' : '')
  if (route.screen === 'register') return '#/register'
  if (['favorites', 'compare'].includes(route.screen)) return '#/' + route.screen
  if (route.screen === 'demo') return `#/demo/${route.view}/${encodeURIComponent(route.company || 'c1')}`
  const path = route.screen === 'detail' ? `/suppliers/exports/${encodeURIComponent(route.recordId)}` : '/suppliers'
  const params = new URLSearchParams()
  for (const name of fields) if (route[name] != null && route[name] !== '') params.set(name, String(route[name]))
  return '#' + path + (params.size ? '?' + params : '')
}

const initial = history.state?.sourcingNavigation
export const currentPage = shallowRef({ key: initial?.key || key(), route: parseRoute(location.hash) })
history.replaceState({ ...history.state, sourcingNavigation: { ...initial, key: currentPage.value.key } }, '', routeUrl(currentPage.value.route))
const previousScrollRestoration = history.scrollRestoration
history.scrollRestoration = 'manual'

export function savePage() {
  const state = snapshots.get(currentPage.value.key) || {}
  state.scrollY = window.scrollY
  for (const [name, capture] of captures) state[name] = clone(capture())
  snapshots.set(currentPage.value.key, state)
  // Limit memory retention; older entries can still restore search criteria from their URL.
  if (snapshots.size > 100) snapshots.delete(snapshots.keys().next().value)
}

export function pageState(name) { return clone(snapshots.get(currentPage.value.key)?.[name]) }
export function registerPageState(name, capture, restore) {
  captures.set(name, capture)
  if (restore) restores.set(name, restore)
  return () => { captures.delete(name); restores.delete(name) }
}

function restorePage(skip = []) {
  for (const [name, restore] of restores) if (!skip.includes(name)) restore(pageState(name), currentPage.value.route)
}

export function navigate(route, { replace = false, saved = false, skip = [], state = {} } = {}) {
  const url = routeUrl(route)
  if (url === location.hash && !replace) return
  if (!saved) savePage()
  const previous = currentPage.value
  const entryKey = replace ? previous.key : key()
  const copied = clone(snapshots.get(previous.key) || {})
  // Captures after an intentional state change seed the new entry, leaving the old entry intact.
  if (saved) for (const [name, capture] of captures) copied[name] = clone(capture())
  snapshots.set(entryKey, { ...copied, ...clone(state) })
  const navigation = { key: entryKey, previousScreen: replace ? history.state?.sourcingNavigation?.previousScreen : previous.route.screen }
  history[replace ? 'replaceState' : 'pushState']({ ...history.state, sourcingNavigation: navigation }, '', url)
  currentPage.value = { key: entryKey, route }
  restorePage(skip)
  if (previous.route.screen !== route.screen || route.screen === 'detail') nextTick(() => window.scrollTo(0, 0))
}

function pop() {
  savePage()
  let entry = history.state?.sourcingNavigation
  if (!entry?.key) {
    entry = { key: key() }
    history.replaceState({ ...history.state, sourcingNavigation: entry }, '')
  }
  currentPage.value = { key: entry.key, route: parseRoute(location.hash) }
  restorePage()
  const scrollY = snapshots.get(entry.key)?.scrollY || 0
  nextTick(() => window.scrollTo(0, scrollY))
}
window.addEventListener('popstate', pop)

export function backToSearch(route) {
  if (history.state?.sourcingNavigation?.previousScreen === 'discover') history.back()
  else navigate({ ...route, screen: 'discover', recordId: undefined }, { replace: true })
}

export function clearPageData() { snapshots.clear() }

// Also repair an old/direct authenticated entry that has no login page behind it.
// Preserve this marker on refresh so the login entry is only seeded once.
export function ensureLoginHistory() {
  const route = currentPage.value.route
  if (['login', 'register'].includes(route.screen) || history.state?.sourcingNavigation?.previousScreen) return
  navigate({ screen: 'login' }, { replace: true })
  navigate(route)
}

if (import.meta.hot) import.meta.hot.dispose(() => {
  window.removeEventListener('popstate', pop)
  history.scrollRestoration = previousScrollRestoration
})
