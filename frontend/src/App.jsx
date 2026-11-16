import React from "react";
import Workspace from "./layouts/Workspace.jsx";
import AuthPage from "./pages/auth/AuthPage.jsx";
import { useAuth } from "./hooks/useAuth.js";

export default function App() {
  const auth = useAuth();
  const {
    initializing,
    startupError,
    initialize,
    user,
    authPage,
    logout,
    expireSession,
  } = auth;
  if (initializing) {
    return (
      <main aria-live="polite" className="boot-state">
        正在连接寻源平台…
      </main>
    );
  }
  if (startupError) {
    return (
      <main className="boot-state">
        <h2>暂时无法连接后端</h2>
        <p role="alert">{startupError}</p>
        <button type="button" onClick={initialize} className="primary">
          重新连接
        </button>
      </main>
    );
  }
  if (user && !authPage) {
    return (
      <Workspace
        user={user}
        onLogout={logout}
        onSessionExpired={expireSession}
      />
    );
  }
  return <AuthPage auth={auth} />;
}
