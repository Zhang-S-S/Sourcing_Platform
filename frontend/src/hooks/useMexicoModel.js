import { useLayoutEffect, useRef, useSyncExternalStore } from "react";
import { createMexicoModel } from "../models/mexicoModel.js";
export function useMexicoModel(onSessionExpired, onNotice) {
  const handlers = useRef({ onSessionExpired, onNotice });
  handlers.current = { onSessionExpired, onNotice };
  const model = useRef(null);
  if (!model.current)
    model.current = createMexicoModel((event, message) =>
      handlers.current[event === "notice" ? "onNotice" : "onSessionExpired"]?.(
        message,
      ),
    );
  const controller = model.current;
  useSyncExternalStore(
    controller.store.subscribe,
    controller.store.getSnapshot,
  );
  useLayoutEffect(() => controller.mount(), [controller]);
  return controller.scope();
}
