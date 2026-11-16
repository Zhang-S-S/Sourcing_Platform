import { useLayoutEffect, useRef, useSyncExternalStore } from "react";
import { usePage } from "./usePage.js";
import { createAuthModel } from "../models/authModel.js";
export function useAuth() {
  usePage();
  const model = useRef(null);
  if (!model.current) model.current = createAuthModel();
  const controller = model.current;
  useSyncExternalStore(
    controller.store.subscribe,
    controller.store.getSnapshot,
  );
  useLayoutEffect(() => controller.mount(), [controller]);
  return controller.scope();
}
