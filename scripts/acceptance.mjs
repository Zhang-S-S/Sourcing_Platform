// Real HTTP checks. Run against an isolated test database, never against personal data.
import assert from 'node:assert/strict'

const stage = process.argv[2] || 'seed'
const base = process.env.SOURCING_TEST_URL || 'http://127.0.0.1:8080'
let cookie = ''
let csrf

async function call(path, { body, method = body ? 'POST' : 'GET', expected = 200, rawCookie } = {}) {
  const response = await fetch(`${base}/api/auth${path}`, {
    method,
    headers: { Cookie: rawCookie ?? cookie, ...(body ? { 'Content-Type': 'application/json' } : {}), ...(method !== 'GET' && csrf ? { [csrf.headerName]: csrf.token } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  for (const value of response.headers.getSetCookie()) {
    if (value.startsWith('SOURCING_SESSION=')) {
      cookie = value.split(';')[0]
      if (cookie !== 'SOURCING_SESSION=') assert.match(value, /HttpOnly/i)
      assert.match(value, /SameSite=Lax/i)
    }
  }
  const text = await response.text()
  assert.equal(response.status, expected, `${path}: ${text}`)
  return text ? JSON.parse(text) : null
}

await call('/me', { expected: 401 })
csrf = await call('/csrf')
if (stage === 'seed') {
  const user = await call('/register', {
    body: { username: 'http_acceptance', company: '', password: 'Acceptance888', phone: '13900000000', code: '123456' }, expected: 201,
  })
  assert.equal(user.username, 'http_acceptance')
  assert.equal(user.password, undefined)
}
const user = await call('/login/password', { body: { username: ' HTTP_ACCEPTANCE ', password: 'Acceptance888' } })
const me = await call('/me')
assert.equal(me.id, user.id)
if (process.env.SOURCING_TEST_VENDOR === '1') {
  const unauthorized = await fetch(`${base}/api/data-source/status`)
  assert.equal(unauthorized.status, 401)
  const source = await fetch(`${base}/api/data-source/status`, { headers: { Cookie: cookie } })
  assert.equal(source.status, 200)
  const status = await source.json()
  assert.equal(status.connected, true)
  assert.equal(status.access, 'READ_ONLY')
  console.log('PASS: authenticated SQL Server data-source check; anonymous access denied.')
}
const oldCookie = cookie
csrf = await call('/csrf')
await call('/logout', { method: 'POST', expected: 204 })
await call('/me', { expected: 401, rawCookie: oldCookie })
csrf = await call('/csrf')
const phoneUser = await call('/login/phone', { body: { phone: '13900000000', code: '123456' } })
assert.equal(phoneUser.id, user.id)
csrf = await call('/csrf')
await call('/logout', { method: 'POST', expected: 204 })
console.log(stage === 'seed'
  ? 'PASS: HTTP registration, both logins, session cookie flags, CSRF rotation, logout and replay rejection.'
  : 'PASS: After backend restart, persisted account can still log in by password and phone; old sessions are rejected.')
