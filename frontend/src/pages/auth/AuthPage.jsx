import React from "react";
import illustration from "../../assets/auth-illustration.png";
import { cx } from "../../utils/ui.js";

export default function AuthPage({ auth }) {
  const {
    sessionNotice,
    register,
    method,
    username,
    company,
    password,
    phone,
    code,
    errorMessage,
    successMessage,
    codeMessage,
    busy,
    sending,
    cooldown,
    selectRegister,
    selectMethod,
    submit,
    sendCode,
    setValue,
  } = auth;
  return (
    <main className={cx("auth-screen")}>
      {
        <section className={cx("auth-art")}>
          {
            <img
              src={illustration}
              alt={"工厂、仓储和全球供应网络的供应商寻源配图"}
            />
          }
          {
            <div className={cx("auth-copy")}>
              {
                <div className={cx("auth-brand")}>
                  {<span className={cx("brand-mark")}>{"S"}</span>}
                  {<span>{"供应商寻源平台"}</span>}
                </div>
              }
              {<h2>{"发现值得接洽的供应商"}</h2>}
              {<p>{"从产品需求出发，核对企业、产品与供货线索。"}</p>}
            </div>
          }
        </section>
      }
      {
        <section className={cx("auth-right")}>
          {
            <div className={cx("auth-form")}>
              {
                <div aria-label={"账号入口"} className={cx("auth-tabs")}>
                  {
                    <button
                      type={"button"}
                      disabled={busy}
                      onClick={(event) => {
                        selectRegister(false);
                      }}
                      className={cx({ on: !register })}
                    >
                      {"登录"}
                    </button>
                  }
                  {
                    <button
                      type={"button"}
                      disabled={busy}
                      onClick={(event) => {
                        selectRegister(true);
                      }}
                      className={cx({ on: register })}
                    >
                      {"注册"}
                    </button>
                  }
                </div>
              }
              {!register ? (
                <div aria-label={"登录方式"} className={cx("login-methods")}>
                  {
                    <button
                      type={"button"}
                      disabled={busy}
                      onClick={(event) => {
                        selectMethod("password");
                      }}
                      className={cx({ on: method === "password" })}
                    >
                      {"账号密码登录"}
                    </button>
                  }
                  {
                    <button
                      type={"button"}
                      disabled={busy}
                      onClick={(event) => {
                        selectMethod("phone");
                      }}
                      className={cx({ on: method === "phone" })}
                    >
                      {"手机验证码登录"}
                    </button>
                  }
                </div>
              ) : null}
              {successMessage || sessionNotice ? (
                <p role={"status"} className={cx("auth-result")}>
                  {successMessage || sessionNotice}
                </p>
              ) : null}
              {
                <form
                  key={`${register}-${method}`}
                  onSubmit={(event) => {
                    event.preventDefault();
                    submit(event);
                  }}
                >
                  {register || method === "password" ? (
                    <label className={cx("field")}>
                      {<span>{"用户名 *"}</span>}
                      {
                        <input
                          value={username}
                          onChange={(event) =>
                            setValue("username", event.target.value)
                          }
                          name={"username"}
                          required={true}
                          maxLength={"32"}
                          autoComplete={"username"}
                          placeholder={"请输入用户名"}
                          disabled={busy}
                        />
                      }
                    </label>
                  ) : null}
                  {register ? (
                    <label className={cx("field")}>
                      {<span>{"公司名称（选填）"}</span>}
                      {
                        <input
                          value={company}
                          onChange={(event) =>
                            setValue("company", event.target.value)
                          }
                          name={"company"}
                          maxLength={"100"}
                          autoComplete={"organization"}
                          placeholder={"可填写所在公司名称"}
                          disabled={busy}
                        />
                      }
                    </label>
                  ) : null}
                  {register || method === "password" ? (
                    <label className={cx("field")}>
                      {<span>{"密码 *"}</span>}
                      {
                        <input
                          value={password}
                          onChange={(event) =>
                            setValue("password", event.target.value)
                          }
                          name={"password"}
                          type={"password"}
                          required={true}
                          minLength={register ? 8 : undefined}
                          maxLength={"72"}
                          autoComplete={
                            register ? "new-password" : "current-password"
                          }
                          placeholder={"请输入密码（注册时至少 8 位）"}
                          disabled={busy}
                        />
                      }
                    </label>
                  ) : null}
                  {register || method === "phone" ? (
                    <label className={cx("field")}>
                      {<span>{"手机号 *"}</span>}
                      {
                        <input
                          value={phone}
                          onChange={(event) =>
                            setValue("phone", event.target.value)
                          }
                          name={"phone"}
                          type={"tel"}
                          required={true}
                          inputMode={"numeric"}
                          pattern={"1[3-9][0-9]{9}"}
                          maxLength={"11"}
                          autoComplete={"tel-national"}
                          placeholder={"请输入中国大陆 11 位手机号"}
                          disabled={busy}
                        />
                      }
                    </label>
                  ) : null}
                  {register || method === "phone" ? (
                    <label className={cx("field")}>
                      {<span>{"短信验证码 *"}</span>}
                      {
                        <div className={cx("otp-row")}>
                          {
                            <input
                              value={code}
                              onChange={(event) =>
                                setValue("code", event.target.value)
                              }
                              name={"code"}
                              required={true}
                              inputMode={"numeric"}
                              pattern={"[0-9]{6}"}
                              maxLength={"6"}
                              autoComplete={"one-time-code"}
                              placeholder={"请输入验证码"}
                              disabled={busy}
                            />
                          }
                          {
                            <button
                              type={"button"}
                              disabled={sending || busy || cooldown > 0}
                              onClick={sendCode}
                            >
                              {cooldown > 0
                                ? `${cooldown} 秒后重试`
                                : sending
                                  ? "获取中…"
                                  : "获取验证码"}
                            </button>
                          }
                        </div>
                      }
                      {codeMessage ? (
                        <span role={"status"} className={cx("small muted")}>
                          {codeMessage}
                        </span>
                      ) : null}
                    </label>
                  ) : null}
                  {errorMessage ? (
                    <p role={"alert"} className={cx("error")}>
                      {errorMessage}
                    </p>
                  ) : null}
                  {
                    <button
                      type={"submit"}
                      disabled={busy}
                      className={cx("primary auth-submit")}
                    >
                      {busy ? "正在提交…" : register ? "提交注册" : "登录平台"}
                    </button>
                  }
                </form>
              }
              {
                <p className={cx("auth-hint")}>
                  {
                    "本地开发模式 · 验证码固定为 123456，可直接输入，不发送真实短信。"
                  }
                </p>
              }
            </div>
          }
        </section>
      }
    </main>
  );
}
