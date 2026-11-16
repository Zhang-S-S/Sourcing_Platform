// Directory lookup and full-scope statistics run independently of the first search page.
export function createMexicoEnrichment(request) {
  const completed = new Map(),
    pending = new Map();
  function load(path) {
    const hit = completed.get(path);
    if (hit && hit.expires > Date.now()) return Promise.resolve(hit.data);
    completed.delete(path);
    if (!pending.has(path)) {
      pending.set(
        path,
        request(path, { timeoutMs: 0 })
          .then((data) => {
          completed.set(path, { data, expires: Date.now() + 10 * 60 * 1000 });
            if (completed.size > 100)
              completed.delete(completed.keys().next().value);
            return data;
          })
          .finally(() => pending.delete(path)),
      );
    }
    return pending.get(path);
  }
  return function enrich(rows, criteria, isCurrent, update, sessionExpired) {
    for (const [endpoint, field] of [
      ["profiles", "supplierProfile"],
      ["statistics", "tradeStatistics"],
    ]) {
      const needed = rows.filter(
        (row) => !row[field] || row[field].status === "LOADING",
      );
      if (!needed.length) continue;
      const ids = new Set(needed.map((row) => row.recordId));
      const patch = (value) => {
        if (isCurrent())
          update((row) =>
            ids.has(row.recordId)
              ? {
                  ...row,
                  [field]: typeof value === "function" ? value(row) : value,
                }
              : row,
          );
      };
      if (endpoint === "statistics" && !criteria) {
        patch({
          status: "UNAVAILABLE",
          message: "请从产品搜索结果进入，确定贸易统计范围",
        });
        continue;
      }
      patch({ status: "LOADING" });
      const params = new URLSearchParams(
        endpoint === "statistics" ? criteria : {},
      );
      params.set("recordIds", [...ids].sort().join(","));
      load(`/mexico/exports/${endpoint}?${params}`)
        .then((data) => {
          patch(
            (row) =>
              data[row.recordId] || {
                status: "UNAVAILABLE",
                message: "该贸易记录没有可核实的补充资料",
              },
          );
        })
        .catch((error) => {
          if (isCurrent() && [401, 403].includes(error.status))
            sessionExpired(error.message);
          patch({ status: "ERROR", message: error.message });
        });
    }
  };
}
