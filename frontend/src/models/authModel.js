import { createStore } from "../store/createStore.js";
import { request } from "../api/client.js";
import {
  currentPage,
  navigate,
  clearPageData,
  ensureLoginHistory,
  subscribe,
} from "../router/navigation.js";
export function createAuthModel() {
  const store = createStore({
      user: null,
      initializing: true,
      startupError: "",
      sessionNotice: "",
      logoutBusy: false,
      register: false,
      method: "password",
      username: "",
      company: "",
      password: "",
      phone: "",
      code: "",
      errorMessage: "",
      successMessage: "",
      codeMessage: "",
      busy: false,
      sending: false,
      cooldown: 0,
    }),
    s = store.state;

  const isAuthPage = () =>
    ["login", "register"].includes(currentPage.value.route.screen);

  function setUser(user) {
    if (user?.id !== s.user?.id) clearPageData();
    s.user = user;
    if (!user) {
      resetSensitive();
      clearPageData();
    }
    syncRoute();
  }

  let sessionTimer;
  function expireSession(message) {
    setUser(null);
    s.sessionNotice = message || "登录已失效，请重新登录。";
  }

  async function initialize() {
    s.initializing = true;
    s.startupError = "";
    try {
      await request("/auth/config");
      try {
        setUser(await request("/auth/me"));
        ensureLoginHistory();
      } catch (error) {
        if (error.status !== 401) throw error;
        setUser(null);
      }
    } catch (error) {
      s.startupError = error.message;
    } finally {
      s.initializing = false;
      syncRoute();
    }
  }

  async function checkSession() {
    if (!s.user) return;
    try {
      setUser(await request("/auth/me"));
    } catch (error) {
      if ([401, 403].includes(error.status)) {
        setUser(null);
        s.sessionNotice = "登录已失效，请重新登录。";
      }
    }
  }

  async function logout() {
    if (s.logoutBusy) return;
    s.logoutBusy = true;
    try {
      await request("/auth/logout", { method: "POST" });
      setUser(null);
      s.sessionNotice = "你已安全退出登录。";
    } catch (error) {
      if (error.status === 401) setUser(null);
      else window.alert(error.message);
    } finally {
      s.logoutBusy = false;
    }
  }

  let cooldownTimer;
  function resetSensitive() {
    s.password = "";
    s.code = "";
    s.errorMessage = "";
    s.successMessage = "";
    s.codeMessage = "";
  }
  function selectRegister(value) {
    if (s.busy) return;
    resetSensitive();
    s.register = value;
    s.method = "password";
    navigate({ screen: value ? "register" : "login" });
  }
  function selectMethod(value) {
    if (s.busy) return;
    resetSensitive();
    s.method = value;
    navigate({ screen: "login", method: value });
  }
  function syncRoute() {
    if (s.initializing) return;
    const route = currentPage.value.route;
    if (!s.user && !isAuthPage()) {
      navigate({ screen: "login" }, { replace: true });
      return;
    }
    if (!isAuthPage()) return;
    s.register = route.screen === "register";
    s.method = route.method || "password";
  }
  async function sendCode() {
    s.errorMessage = "";
    s.codeMessage = "";
    if (!/^1[3-9][0-9]{9}$/.test(s.phone.trim())) {
      s.errorMessage = "请输入有效的中国大陆 11 位手机号";
      return;
    }
    s.sending = true;
    try {
      const data = await request("/auth/sms-code", {
        method: "POST",
        body: {
          phone: s.phone.trim(),
          purpose: s.register ? "register" : "login",
        },
      });
      s.codeMessage = data.message;
      s.cooldown = data.retryAfterSeconds;
      clearInterval(cooldownTimer);
      cooldownTimer = setInterval(() => {
        if (--s.cooldown <= 0) clearInterval(cooldownTimer);
      }, 1000);
    } catch (error) {
      s.errorMessage = error.message;
    } finally {
      s.sending = false;
    }
  }

  async function submit() {
    if (s.busy) return;
    s.busy = true;
    s.errorMessage = "";
    s.successMessage = "";
    s.sessionNotice = "";
    try {
      if (s.register) {
        const created = await request("/auth/register", {
          method: "POST",
          body: {
            username: s.username,
            company: s.company,
            password: s.password,
            phone: s.phone,
            code: s.code,
          },
        });
        resetSensitive();
        s.username = created.username;
        s.register = false;
        s.method = "password";
        navigate({ screen: "login" }, { replace: true });
        s.successMessage =
          "注册成功，账号已开通，请使用用户名密码或手机验证码登录。";
      } else {
        const path =
          s.method === "password"
            ? "/auth/login/password"
            : "/auth/login/phone";
        setUser(
          await request(path, {
            method: "POST",
            body:
              s.method === "password"
                ? { username: s.username, password: s.password }
                : { phone: s.phone, code: s.code },
          }),
        );
        resetSensitive();
        navigate({ screen: "discover" });
      }
    } catch (error) {
      s.errorMessage = error.message;
    } finally {
      s.busy = false;
    }
  }

  function setValue(name, value) {
    store.setValue(name, value);
    if (name === "phone") {
      s.code = "";
      s.codeMessage = "";
    }
  }
  return {
    store,
    mount() {
      const stop = subscribe(() => {
        if (isAuthPage()) resetSensitive();
        syncRoute();
      });
      initialize();
      sessionTimer = setInterval(checkSession, 60000);
      window.addEventListener("focus", checkSession);
      return () => {
        stop();
        clearInterval(sessionTimer);
        clearInterval(cooldownTimer);
        window.removeEventListener("focus", checkSession);
      };
    },
    scope() {
      return {
        ...store.getSnapshot(),
        authPage: isAuthPage(),
        expireSession,
        initialize,
        checkSession,
        logout,
        resetSensitive,
        selectRegister,
        selectMethod,
        syncRoute,
        sendCode,
        submit,
        setValue,
      };
    },
  };
}
