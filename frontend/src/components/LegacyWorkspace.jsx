import React, { useLayoutEffect, useRef } from "react";
import { mountWorkspace } from "../legacy/workspace.js";
import {
  currentPage,
  navigate,
  savePage,
  pageState,
  registerPageState,
} from "../router/navigation.js";

export default function LegacyWorkspace({ user, view, onLogout }) {
  const root = useRef(null);
  useLayoutEffect(() => {
    const cleanup = mountWorkspace(root.current, user, onLogout, {
      initialView: view,
      initialCompany: currentPage.value.route.company,
      snapshot: pageState("legacy"),
      beforeNavigate: savePage,
      onDiscover: () => navigate({ screen: "discover" }, { saved: true }),
      onNavigate: (nextView, snapshot) =>
        navigate(
          ["favorites", "compare"].includes(nextView)
            ? { screen: nextView }
            : {
                screen: "demo",
                view: nextView,
                company: snapshot.state.company || "c1",
              },
          { saved: true, state: { legacy: snapshot } },
        ),
    });
    const unregister = registerPageState("legacy", () => cleanup.snapshot());
    return () => {
      unregister();
      cleanup();
    };
  }, [user.id, view]);
  return <div id="workspace-app" ref={root} className="app collapsed" />;
}
