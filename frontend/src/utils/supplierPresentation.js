const format = (value) =>
  new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 0 }).format(value);
export function contactSummary(row) {
  const p = row?.supplierProfile;
  if (!p || p.status === "LOADING") return "企业资料读取中…";
  if (p.status === "ERROR") return "资料读取失败，重新搜索重试";
  if (p.status !== "MATCHED") return p.message || "企业名录关联待核实";
  const channels = [];
  const phones = [...new Set([p.phone, p.otherPhone].filter(Boolean))];
  if (phones.length) channels.push(`电话：${phones.join(" / ")}`);
  if (p.website) channels.push(`名录网站：${p.website}`);
  return channels.length
    ? channels.join(" / ")
    : "已关联名录，电话及网站字段暂无值";
}
export function employeeSummary(row) {
  const p = row?.supplierProfile;
  if (!p || p.status === "LOADING") return "企业资料读取中…";
  if (p.status === "ERROR") return "资料读取失败";
  if (p.status !== "MATCHED") return "名录关联待核实";
  if (p.employees != null)
    return `${format(p.employees)} 人${p.employeeBand ? `（规模：${p.employeeBand}）` : ""}`;
  return "已关联名录，员工字段暂无值";
}
export function profileLabel(row) {
  return row?.supplierProfile?.industry
    ? ` · 行业：${row.supplierProfile.industry}`
    : " · 企业属性待核实";
}
export function tradeCount(row) {
  const t = row?.tradeStatistics;
  if (!t || t.status === "LOADING") return "正在统计…";
  if (t.status === "ERROR") return "统计读取失败，重新搜索重试";
  return t.status === "READY" && t.matchedRecordCount != null
    ? `${format(t.matchedRecordCount)} 条（全期匹配）`
    : "暂无可核实的汇总";
}
export function recordPeriod(row) {
  const t = row?.tradeStatistics;
  if (!t || t.status === "LOADING") return "正在读取记录日期范围…";
  if (t.status === "ERROR") return t.message || "统计读取失败";
  if (t.status !== "READY") return t.message || "统计范围待核实";
  return t.firstRecordDate && t.lastRecordDate
    ? `${t.firstRecordDate} ~ ${t.lastRecordDate} · 记录日期范围；连续覆盖未核定`
    : "源记录日期缺失；连续覆盖未核定";
}
export function tradeMetric(row, label) {
  if (label === "近期记录数") return `${tradeCount(row)}；近期覆盖待核定`;
  if (label === "最近记录日期")
    return row?.tradeStatistics?.lastRecordDate || "暂无可核实的统计日期";
  return "未汇总（见下方单条记录）";
}
