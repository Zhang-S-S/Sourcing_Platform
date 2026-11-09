<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import Workspace from './Workspace.vue'
import { request } from './api.js'
import illustration from './assets/auth-illustration.png'
import { currentPage, navigate, clearPageData, ensureLoginHistory } from './navigation.js'

const user = ref(null)
const initializing = ref(true)
const startupError = ref('')
const sessionNotice = ref('')
const logoutBusy = ref(false)
const authPage = computed(() => ['login', 'register'].includes(currentPage.value.route.screen))
let sessionTimer

function expireSession(message) {
  user.value = null
  sessionNotice.value = message || '登录已失效，请重新登录。'
}

async function initialize() {
  initializing.value = true
  startupError.value = ''
  try {
    await request('/auth/config')
    try { user.value = await request('/auth/me'); ensureLoginHistory() } catch (error) {
      if (error.status !== 401) throw error
      user.value = null
    }
  } catch (error) { startupError.value = error.message }
  finally { initializing.value = false; syncRoute() }
}

async function checkSession() {
  if (!user.value) return
  try { user.value = await request('/auth/me') } catch (error) {
    if ([401, 403].includes(error.status)) {
      user.value = null
      sessionNotice.value = '登录已失效，请重新登录。'
    }
  }
}

async function logout() {
  if (logoutBusy.value) return
  logoutBusy.value = true
  try {
    await request('/auth/logout', { method: 'POST' })
    user.value = null
    sessionNotice.value = '你已安全退出登录。'
  } catch (error) {
    if (error.status === 401) user.value = null
    else window.alert(error.message)
  } finally { logoutBusy.value = false }
}

const register = ref(false)
const method = ref('password')
const username = ref('')
const company = ref('')
const password = ref('')
const phone = ref('')
const code = ref('')
const errorMessage = ref('')
const successMessage = ref('')
const codeMessage = ref('')
const busy = ref(false)
const sending = ref(false)
const cooldown = ref(0)
let cooldownTimer

function resetSensitive() {
  password.value = ''
  code.value = ''
  errorMessage.value = ''
  successMessage.value = ''
  codeMessage.value = ''
}
function selectRegister(value) {
  if (busy.value) return
  resetSensitive()
  register.value = value
  method.value = 'password'
  navigate({ screen: value ? 'register' : 'login' })
}
function selectMethod(value) {
  if (busy.value) return
  resetSensitive()
  method.value = value
  navigate({ screen: 'login', method: value })
}
function syncRoute() {
  if (initializing.value) return
  const route = currentPage.value.route
  if (!user.value && !authPage.value) {
    navigate({ screen: 'login' }, { replace: true })
    return
  }
  if (!authPage.value) return
  register.value = route.screen === 'register'
  method.value = route.method || 'password'
}
watch(currentPage, () => { if (authPage.value) resetSensitive(); syncRoute() }, { flush: 'sync' })
watch(phone, () => { code.value = ''; codeMessage.value = '' })
watch(user, (value, previous) => {
  if (value?.id !== previous?.id) clearPageData()
  if (!value) resetSensitive()
  syncRoute()
  if (!value) clearPageData()
})

async function sendCode() {
  errorMessage.value = ''
  codeMessage.value = ''
  if (!/^1[3-9][0-9]{9}$/.test(phone.value.trim())) {
    errorMessage.value = '请输入有效的中国大陆 11 位手机号'
    return
  }
  sending.value = true
  try {
    const data = await request('/auth/sms-code', {
      method: 'POST', body: { phone: phone.value.trim(), purpose: register.value ? 'register' : 'login' },
    })
    codeMessage.value = data.message
    cooldown.value = data.retryAfterSeconds
    clearInterval(cooldownTimer)
    cooldownTimer = setInterval(() => {
      if (--cooldown.value <= 0) clearInterval(cooldownTimer)
    }, 1000)
  } catch (error) { errorMessage.value = error.message }
  finally { sending.value = false }
}

async function submit() {
  if (busy.value) return
  busy.value = true
  errorMessage.value = ''
  successMessage.value = ''
  sessionNotice.value = ''
  try {
    if (register.value) {
      const created = await request('/auth/register', {
        method: 'POST', body: { username: username.value, company: company.value, password: password.value, phone: phone.value, code: code.value },
      })
      resetSensitive()
      username.value = created.username
      register.value = false
      method.value = 'password'
      navigate({ screen: 'login' }, { replace: true })
      successMessage.value = '注册成功，账号已开通，请使用用户名密码或手机验证码登录。'
    } else {
      const path = method.value === 'password' ? '/auth/login/password' : '/auth/login/phone'
      user.value = await request(path, {
        method: 'POST', body: method.value === 'password'
          ? { username: username.value, password: password.value }
          : { phone: phone.value, code: code.value },
      })
      resetSensitive()
      navigate({ screen: 'discover' })
    }
  } catch (error) { errorMessage.value = error.message }
  finally { busy.value = false }
}

onMounted(() => {
  initialize()
  sessionTimer = setInterval(checkSession, 60000)
  window.addEventListener('focus', checkSession)
})
onBeforeUnmount(() => {
  clearInterval(sessionTimer)
  clearInterval(cooldownTimer)
  window.removeEventListener('focus', checkSession)
})
</script>

<template>
  <main v-if="initializing" class="boot-state" aria-live="polite">正在连接寻源平台…</main>
  <main v-else-if="startupError" class="boot-state">
    <h2>暂时无法连接后端</h2><p role="alert">{{ startupError }}</p>
    <button type="button" class="primary" @click="initialize">重新连接</button>
  </main>
  <Workspace v-else-if="user && !authPage" :user="user" @logout="logout" @session-expired="expireSession" />
  <main v-else class="auth-screen">
    <section class="auth-art">
      <img :src="illustration" alt="工厂、仓储和全球供应网络的供应商寻源配图">
      <div class="auth-copy">
        <div class="auth-brand"><span class="brand-mark">S</span><span>供应商寻源平台</span></div>
        <h2>发现值得接洽的供应商</h2>
        <p>从产品需求出发，核对企业、产品与供货线索。</p>
      </div>
    </section>
    <section class="auth-right">
      <div class="auth-form">
        <div class="auth-tabs" aria-label="账号入口">
          <button type="button" :class="{ on: !register }" :disabled="busy" @click="selectRegister(false)">登录</button>
          <button type="button" :class="{ on: register }" :disabled="busy" @click="selectRegister(true)">注册</button>
        </div>
        <div v-if="!register" class="login-methods" aria-label="登录方式">
          <button type="button" :class="{ on: method === 'password' }" :disabled="busy" @click="selectMethod('password')">账号密码登录</button>
          <button type="button" :class="{ on: method === 'phone' }" :disabled="busy" @click="selectMethod('phone')">手机验证码登录</button>
        </div>
        <p v-if="successMessage || sessionNotice" class="auth-result" role="status">{{ successMessage || sessionNotice }}</p>
        <form :key="`${register}-${method}`" @submit.prevent="submit">
          <label v-if="register || method === 'password'" class="field">
            <span>用户名 *</span><input v-model="username" name="username" required maxlength="32" autocomplete="username" placeholder="请输入用户名" :disabled="busy">
          </label>
          <label v-if="register" class="field">
            <span>公司名称（选填）</span><input v-model="company" name="company" maxlength="100" autocomplete="organization" placeholder="可填写所在公司名称" :disabled="busy">
          </label>
          <label v-if="register || method === 'password'" class="field">
            <span>密码 *</span><input v-model="password" name="password" type="password" required :minlength="register ? 8 : undefined" maxlength="72" :autocomplete="register ? 'new-password' : 'current-password'" placeholder="请输入密码（注册时至少 8 位）" :disabled="busy">
          </label>
          <label v-if="register || method === 'phone'" class="field">
            <span>手机号 *</span><input v-model="phone" name="phone" type="tel" required inputmode="numeric" pattern="1[3-9][0-9]{9}" maxlength="11" autocomplete="tel-national" placeholder="请输入中国大陆 11 位手机号" :disabled="busy">
          </label>
          <label v-if="register || method === 'phone'" class="field">
            <span>短信验证码 *</span>
            <div class="otp-row">
              <input v-model="code" name="code" required inputmode="numeric" pattern="[0-9]{6}" maxlength="6" autocomplete="one-time-code" placeholder="请输入验证码" :disabled="busy">
              <button type="button" :disabled="sending || busy || cooldown > 0" @click="sendCode">{{ cooldown > 0 ? `${cooldown} 秒后重试` : sending ? '获取中…' : '获取验证码' }}</button>
            </div>
            <span v-if="codeMessage" class="small muted" role="status">{{ codeMessage }}</span>
          </label>
          <p v-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p>
          <button type="submit" class="primary auth-submit" :disabled="busy">{{ busy ? '正在提交…' : register ? '提交注册' : '登录平台' }}</button>
        </form>
        <p class="auth-hint">本地开发模式 · 验证码固定为 123456，可直接输入，不发送真实短信。</p>
      </div>
    </section>
  </main>
</template>
