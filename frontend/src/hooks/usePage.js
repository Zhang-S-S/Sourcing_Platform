import { useSyncExternalStore } from "react";
import { currentPage, subscribe } from "../router/navigation.js";
export function usePage() {
  return useSyncExternalStore(subscribe, () => currentPage.value);
}
