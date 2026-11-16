export function createStore(initial) {
  let snapshot = structuredClone(initial);
  const listeners = new Set();
  const set = (patch) => {
    snapshot = { ...snapshot, ...patch };
    for (const listener of listeners) listener();
  };
  const state = new Proxy(
    {},
    {
      get: (_, key) => snapshot[key],
      set: (_, key, value) => {
        set({ [key]: value });
        return true;
      },
    },
  );
  const setValue = (path, value) => {
    const [name, ...parts] = path.split(".");
    if (!parts.length) {
      set({ [name]: value });
      return;
    }
    const copy = structuredClone(snapshot[name]);
    let target = copy;
    for (const part of parts.slice(0, -1)) target = target[part];
    target[parts.at(-1)] = value;
    set({ [name]: copy });
  };
  return {
    state,
    set,
    setValue,
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
