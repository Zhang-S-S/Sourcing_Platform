// Start the backend with mysql-test.properties and vendor-local.properties before running.
// Writes are limited to a synthetic account in the local MySQL TEST database.
import assert from 'node:assert/strict'
if (process.env.SOURCING_ACCEPTANCE_TEST_DB !== '1') throw new Error('仅可对独立 MySQL 测试账号库执行；确认后设置 SOURCING_ACCEPTANCE_TEST_DB=1')
const base = process.env.SOURCING_TEST_URL || 'http://127.0.0.1:8080'
let cookie = '', csrf
async function api(path, body, expected = 200, method = body ? 'POST' : 'GET') {
  if (method !== 'GET' && !csrf) csrf = await api('/auth/csrf')
  const response = await fetch(`${base}/api${path}`, {
    method, signal: AbortSignal.timeout(20000),
    headers: { Cookie: cookie, ...(body ? { 'Content-Type': 'application/json' } : {}), ...(method !== 'GET' && csrf ? { [csrf.headerName]: csrf.token } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  for (const value of response.headers.getSetCookie()) if (value.startsWith('SOURCING_SESSION=')) cookie = value.split(';')[0]
  const raw = await response.text()
  assert.equal(response.status, expected, `${path}: ${raw}`)
  if (path.startsWith('/auth/login/') || path === '/auth/logout') csrf = null
  return raw ? JSON.parse(raw) : null
}
await api('/mexico/exports', undefined, 401)
await api('/mexico/exports/1', undefined, 401)
// Registration may already exist from a previous test run; never change existing credentials.
const token = await api('/auth/csrf'); csrf = token
const registered = await fetch(`${base}/api/auth/register`, {
  method: 'POST', headers: { Cookie: cookie, 'Content-Type': 'application/json', [csrf.headerName]: csrf.token },
  body: JSON.stringify({ username: 'mexico_acceptance', company: '本地功能验收', password: 'MexicoLocal888', phone: '13700000000', code: '123456' }),
})
assert.ok([201, 409].includes(registered.status), 'Test registration failed')
await registered.text()
await api('/auth/login/password', { username: 'mexico_acceptance', password: 'MexicoLocal888' })
const started = performance.now()
const first = await api('/mexico/exports?limit=2')
const firstMs = Math.round(performance.now() - started)
assert.equal(first.order, 'RECORD_ID_DESC')
assert.equal(first.items.length, 2)
assert.equal(first.hasNext, true)
assert.equal(first.nextCursor, first.items.at(-1).recordId)
for (const row of first.items) assert.equal(typeof row.recordId, 'string')
assert.ok(BigInt(first.items[0].recordId) > BigInt(first.items[1].recordId))
const second = await api(`/mexico/exports?limit=2&before=${encodeURIComponent(first.nextCursor)}`)
assert.equal(second.items.length, 2)
assert.ok(second.items.every(row => BigInt(row.recordId) < BigInt(first.nextCursor)))
assert.ok(second.items.every(row => !first.items.some(old => old.recordId === row.recordId)))
const detail = await api(`/mexico/exports/${first.items[0].recordId}`)
assert.equal(detail.recordId, first.items[0].recordId)
assert.equal(detail.supplierName, first.items[0].supplierName)
assert.equal(detail.hsCode, first.items[0].hsCode)
await api('/mexico/exports?limit=51', undefined, 400)
await api('/mexico/exports?limit=abc', undefined, 400)
await api('/mexico/exports?before=1%20OR%201%3D1', undefined, 400)
await api('/mexico/exports/9223372036854775807', undefined, 404)
await api('/mexico/exports', {}, 403)
if (process.argv.includes('--search')) {
  for (const suffix of ['country=MX', 'country=MX&hs=8544%25', 'country=ID&hs=8544'])
    await api(`/mexico/exports/search?${suffix}`, undefined, 400)
  await api('/mexico/exports/search', {}, 403)
  const startedSearch = performance.now()
  const result = await api('/mexico/exports/search?country=MX&hs=8544&limit=2')
  assert.equal(result.items.length, 2)
  assert.ok(result.items.every(row => row.hsCode.split(/[^0-9.]+/).some(code => code.replaceAll('.', '').startsWith('8544'))))
  assert.ok(result.items.every(row => ['mexico', 'méxico', 'mx', 'mex', '墨西哥'].includes(row.supplierCountry.trim().toLowerCase())))
  const searchMs = Math.round(performance.now() - startedSearch)
  const next = await api(`/mexico/exports/search?country=MX&hs=8544&limit=2&before=${encodeURIComponent(result.nextCursor)}`)
  assert.ok(next.items.every(row => BigInt(row.recordId) < BigInt(result.nextCursor)))
  assert.ok(next.items.every(row => !result.items.some(previous => previous.recordId === row.recordId)))
  console.log(`PASS: Full-table HS 8544 search and filtered next page. First search request: ${searchMs} ms. No COUNT, sample restriction or vendor writes.`)
}
await api('/auth/logout', undefined, 204, 'POST')
await api('/mexico/exports', undefined, 401)
console.log(`PASS: Mexico SELECT-only list, keyset pagination without overlap, exact-ID detail, validation, write denial and logout. First-page request: ${firstMs} ms. No vendor writes executed.`)
