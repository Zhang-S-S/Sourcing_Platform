let csrf = null

export class ApiError extends Error {
  constructor(message, status) { super(message); this.status = status }
}

export async function request(path, { method = 'GET', body, timeoutMs = 15000 } = {}) {
  const mutates = method !== 'GET'
  if (mutates && !csrf) csrf = await request('/auth/csrf')
  const controller = new AbortController()
  const timeout = timeoutMs > 0 ? setTimeout(() => controller.abort(), timeoutMs) : undefined
  try {
    const response = await fetch(`/api${path}`, {
      method,
      credentials: 'same-origin',
      signal: controller.signal,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(mutates ? { [csrf.headerName]: csrf.token } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
    const text = await response.text()
    let data
    try { data = text ? JSON.parse(text) : null } catch { data = null }
    if (!response.ok) {
      if (response.status === 403) csrf = null
      throw new ApiError(data?.message || '后端暂时无法响应，请确认 8080 端口的服务已启动。', response.status)
    }
    if (mutates && (path.startsWith('/auth/login/') || path === '/auth/logout')) csrf = null
    return data
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError(error.name === 'AbortError' ? '请求超时，请稍后重试。' : '连接后端失败，请确认后端已启动。', 0)
  } finally {
    clearTimeout(timeout)
  }
}
