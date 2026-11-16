import React, { useEffect, useState } from "react";
import MexicoLeads from "../pages/suppliers/MexicoLeads.jsx";
import LegacyWorkspace from "../components/LegacyWorkspace.jsx";
import { navigate } from "../router/navigation.js";
import { usePage } from "../hooks/usePage.js";
import { cx } from "../utils/ui.js";

const languages = [
  ["local", "原国家语言"],
  ["zh-CN", "中文"],
  ["en", "English"],
  ["es", "Español"],
  ["id", "Bahasa Indonesia"],
];
export default function Workspace({ user, onLogout, onSessionExpired }) {
  const page = usePage();
  const [collapsed, setCollapsed] = useState(true);
  const [notice, setNotice] = useState("");
  const [languageOpen, setLanguageOpen] = useState(false);
  const legacyView = ["favorites", "compare"].includes(page.route.screen)
    ? page.route.screen
    : page.route.screen === "demo"
      ? page.route.view
      : null;
  useEffect(() => {
    setNotice("");
    setLanguageOpen(false);
    const titles = {
      discover: "供应商发现",
      detail: "贸易线索详情",
      favorites: "我的收藏",
      compare: "供应商对比",
      demo: "静态原型详情",
    };
    document.title = `${titles[page.route.screen] || "供应商发现"} · 供应商寻源平台`;
  }, [page.key]);
  function chooseLanguage(locale) {
    setLanguageOpen(false);
    if (locale !== "zh-CN")
      setNotice("真实数据页面的语言切换尚未接入，当前仍使用简体中文。");
  }
  return (
    <>
      {legacyView && (
        <LegacyWorkspace
          key={page.key}
          user={user}
          view={legacyView}
          onLogout={onLogout}
        />
      )}
      <div
        style={{ display: legacyView ? "none" : undefined }}
        className={cx("app", { collapsed })}
      >
        <aside className="sidebar">
          <div className="brand">
            <span className="brand-mark">S</span>
            <span className="brand-text">供应商寻源</span>
          </div>
          <nav className="nav" aria-label="一级导航">
            <button
              type="button"
              className="navitem on"
              aria-label="供应商发现"
              title="供应商发现"
              onClick={() => navigate({ screen: "discover" })}
            >
              <span className="navicon" aria-hidden="true">
                ⌕
              </span>
              <span className="navlabel">供应商发现</span>
            </button>
            <button
              type="button"
              className="navitem"
              aria-label="我的收藏"
              title="我的收藏（静态原型）"
              onClick={() => navigate({ screen: "favorites" })}
            >
              <span className="navicon" aria-hidden="true">
                ♡
              </span>
              <span className="navlabel">我的收藏</span>
            </button>
            <button
              type="button"
              className="navitem"
              aria-label="供应商对比"
              title="供应商对比（静态原型）"
              onClick={() => navigate({ screen: "compare" })}
            >
              <span className="navicon" aria-hidden="true">
                ▥
              </span>
              <span className="navlabel">供应商对比</span>
            </button>
          </nav>
          <div className="sidebar-footer">
            <button
              type="button"
              className="collapse-button"
              aria-label={collapsed ? "展开导航" : "收起导航"}
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? "☰" : "‹ 收起导航"}
            </button>
            <button
              type="button"
              className="link"
              aria-label="退出登录"
              title={`${user.username} · 退出登录`}
              onClick={onLogout}
            >
              <span className="avatar">{user.username.slice(0, 1)}</span>
            </button>
          </div>
        </aside>
        <main className="main mexico-main">
          <header className="header">
            <div>
              <p className="breadcrumb">寻源平台</p>
              <h1>
                {page.route.screen === "detail" ? "企业详情" : "供应商发现"}
              </h1>
            </div>
            <div className="row">
              <button
                type="button"
                className="utility-icon"
                title="选择语言"
                aria-label="选择语言"
                aria-expanded={languageOpen}
                aria-haspopup="menu"
                onClick={() => setLanguageOpen(!languageOpen)}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M3 12h18M12 3c5 5 5 13 0 18M12 3c-5 5-5 13 0 18" />
                </svg>
              </button>
              <button
                type="button"
                className="utility-icon"
                title="反馈与支持"
                aria-label="反馈与支持"
                onClick={() =>
                  setNotice("反馈与支持尚未接入，入口按甲方原版保留。")
                }
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 3h8l4 4v14H6zM14 3v5h4M9 12h6M9 16h6" />
                </svg>
              </button>
            </div>
            {languageOpen && (
              <div
                id="language-menu"
                className="language-menu"
                role="menu"
                onKeyDown={(event) => {
                  if (event.key === "Escape") setLanguageOpen(false);
                }}
              >
                <p className="small muted">语言 / Language</p>
                {languages.map(([locale, label]) => (
                  <button
                    key={locale}
                    type="button"
                    role="menuitemradio"
                    aria-checked={locale === "zh-CN"}
                    onClick={() => chooseLanguage(locale)}
                  >
                    {locale === "local" ? "◎" : locale === "zh-CN" ? "✓" : "　"}{" "}
                    <span>{label}</span>
                    {locale === "local" && <small>Español</small>}
                  </button>
                ))}
              </div>
            )}
          </header>
          <MexicoLeads
            onSessionExpired={onSessionExpired}
            onNotice={setNotice}
          />
          {notice && (
            <div className="notice" role="status" aria-live="polite">
              {notice}
            </div>
          )}
          <footer className="footer">
            贸易记录中的企业信息为供方线索，不代表企业资质已核验。
          </footer>
        </main>
      </div>
    </>
  );
}
