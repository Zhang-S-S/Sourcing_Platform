import React from "react";
import {
  contactSummary,
  employeeSummary,
  profileLabel,
  tradeCount,
  recordPeriod,
  tradeMetric,
} from "../../utils/supplierPresentation.js";
import { cx, css } from "../../utils/ui.js";
import { useMexicoModel } from "../../hooks/useMexicoModel.js";
export default function MexicoLeads({ onSessionExpired, onNotice }) {
  const {
    text,
    draft,
    applied,
    company,
    appliedCompany,
    refinedHs,
    channel,
    formError,
    filterError,
    drawer,
    filterDraft,
    selected,
    pendingSearch,
    items,
    pageSize,
    pageIndex,
    cursors,
    nextCursor,
    hasNext,
    loading,
    loadError,
    hasLoaded,
    view,
    detailId,
    detail,
    detailTab,
    detailLoading,
    detailError,
    retryCursor,
    retryIndex,
    capture,
    routeForState,
    commit,
    restore,
    number,
    quantity,
    handleError,
    loadPage,
    resetPage,
    search,
    submitSearch,
    cancelSearch,
    confirmSearch,
    filterCompany,
    openFilters,
    applyFilters,
    clearFilters,
    changePageSize,
    previous,
    next,
    setChannel,
    setView,
    unavailable,
    toggleSelection,
    requestSort,
    openDetail,
    setDetailTab,
    fetchDetail,
    back,
    sources,
    detailTabs,
    tradeMetrics,
    emptyFilters,
    basicGroups,
    resultSummary,
    setValue,
  } = useMexicoModel(onSessionExpired, onNotice);
  return (
    <React.Fragment>
      {detailId ? (
        <section aria-label={"墨西哥贸易线索详情"}>
          {
            <button type={"button"} onClick={back} className={cx("link")}>
              {"← 返回列表"}
            </button>
          }
          {
            <div className={cx("detail-head")}>
              {
                <div>
                  {<h2>{detail ? text(detail.supplierName) : "企业详情"}</h2>}
                  {
                    <p style={css("margin:6px 0")} className={cx("muted")}>
                      {detail ? text(detail.supplierCountry) : "暂无信息"}
                      {profileLabel(detail)}
                    </p>
                  }
                  {<p>{<span className={cx("tag")}>{"海关"}</span>}</p>}
                </div>
              }
              {
                <div className={cx("row")}>
                  {
                    <button
                      type={"button"}
                      aria-label={"收藏供应商"}
                      aria-pressed={"false"}
                      onClick={(event) => {
                        unavailable("收藏");
                      }}
                      className={cx("favorite")}
                    >
                      {"♥"}
                    </button>
                  }
                  {
                    <button
                      type={"button"}
                      onClick={(event) => {
                        unavailable("供应商对比");
                      }}
                    >
                      {"加入对比"}
                    </button>
                  }
                  {
                    <button
                      type={"button"}
                      disabled={true}
                      title={"请先收藏该供应商"}
                    >
                      {"跟进"}
                    </button>
                  }
                </div>
              }
            </div>
          }
          {
            <div
              role={"tablist"}
              aria-label={"企业详情页签"}
              className={cx("tabs")}
            >
              {detailTabs.map((tab) => (
                <button
                  key={tab}
                  type={"button"}
                  role={"tab"}
                  aria-selected={detailTab === tab}
                  onClick={(event) => {
                    setDetailTab(tab);
                  }}
                  className={cx({ on: detailTab === tab })}
                >
                  {tab}
                </button>
              ))}
            </div>
          }
          {detailLoading ? (
            <p role={"status"} className={cx("data-loading")}>
              {"正在读取记录详情…"}
            </p>
          ) : detailError ? (
            <div role={"alert"} className={cx("data-error")}>
              {<h3>{"无法读取记录详情"}</h3>}
              {<p>{detailError}</p>}
              {
                <button
                  type={"button"}
                  onClick={(event) => {
                    fetchDetail(detailId);
                  }}
                >
                  {"重新读取详情"}
                </button>
              }
            </div>
          ) : detail ? (
            <React.Fragment>
              {detailTab === "基础信息" ? (
                <React.Fragment>
                  {basicGroups.map((group) => (
                    <section key={group.title} className={cx("panel")}>
                      {<h2>{group.title}</h2>}
                      {
                        <div className={cx("infogrid")}>
                          {group.fields.map(([label, value]) => (
                            <div key={label}>
                              {<p className={cx("small muted")}>{label}</p>}
                              {<p>{value}</p>}
                            </div>
                          ))}
                        </div>
                      }
                      {group.note ? (
                        <p className={cx("small muted section-note")}>
                          {group.note}
                        </p>
                      ) : null}
                    </section>
                  ))}
                  {
                    <section className={cx("data-notes")}>
                      {<span>{"资料采集：暂无信息"}</span>}
                      {<span>{"企业资料更新时间：暂无信息"}</span>}
                    </section>
                  }
                </React.Fragment>
              ) : detailTab === "产品与服务" ? (
                <React.Fragment>
                  {
                    <section className={cx("panel")}>
                      {
                        <div className={cx("row between")}>
                          {<h2>{"目录产品 / 服务"}</h2>}
                          {
                            <span className={cx("small muted")}>
                              {"目录数据待接入 · 当前搜索匹配优先"}
                            </span>
                          }
                        </div>
                      }
                      {
                        <div className={cx("empty compact")}>
                          {<h3>{"暂无可展示的目录产品"}</h3>}
                          {
                            <p>
                              {
                                "可在下方查看贸易记录中的商品，不补造目录规格或图片。"
                              }
                            </p>
                          }
                        </div>
                      }
                    </section>
                  }
                  {
                    <section className={cx("panel")}>
                      {<h2>{"商品交易条件"}</h2>}
                      {<p className={cx("muted")}>{"暂无信息"}</p>}
                    </section>
                  }
                  {
                    <section className={cx("panel")}>
                      {<h2>{"贸易记录中的商品"}</h2>}
                      {
                        <div className={cx("tablebox")}>
                          {
                            <table>
                              {
                                <thead>
                                  {
                                    <tr>
                                      {<th>{"商品原文"}</th>}
                                      {<th>{"关联 HS"}</th>}
                                      {<th>{"方向 / 当前国家"}</th>}
                                      {<th>{"操作"}</th>}
                                    </tr>
                                  }
                                </thead>
                              }
                              {
                                <tbody>
                                  {
                                    <tr>
                                      {<td>{text(detail.goodsDescription)}</td>}
                                      {<td>{text(detail.hsCode)}</td>}
                                      {
                                        <td>
                                          {"供方 / "}
                                          {text(detail.supplierCountry)}
                                        </td>
                                      }
                                      {
                                        <td>
                                          {
                                            <button
                                              type={"button"}
                                              onClick={(event) => {
                                                setDetailTab("贸易画像");
                                              }}
                                              className={cx("link")}
                                            >
                                              {"查看贸易画像"}
                                            </button>
                                          }
                                        </td>
                                      }
                                    </tr>
                                  }
                                </tbody>
                              }
                            </table>
                          }
                        </div>
                      }
                      {
                        <p className={cx("small muted section-note")}>
                          {
                            "展示该供应商全部获授权目录产品；目录与贸易商品分别关联，不默认为同一 SKU。"
                          }
                        </p>
                      }
                    </section>
                  }
                </React.Fragment>
              ) : detailTab === "贸易画像" ? (
                <React.Fragment>
                  {
                    <section className={cx("scope-box")}>
                      {
                        <div>
                          {<h3>{"统计范围"}</h3>}
                          {
                            <p>
                              {applied?.keyword || "未填产品词"}
                              {" · HS "}
                              {applied?.hs || "未填"}
                              {" · 墨西哥"}
                            </p>
                          }
                          {
                            <p className={cx("small muted")}>
                              {
                                "单条线索明细与供方全期匹配汇总分别展示；仅当前国家及产品/HS，同一来源供方编号内汇总，连续覆盖与近期口径待核定。"
                              }
                            </p>
                          }
                        </div>
                      }
                      {<span className={cx("tag")}>{"海关"}</span>}
                    </section>
                  }
                  {
                    <section className={cx("panel coverage")}>
                      {<h2>{"来源与覆盖期"}</h2>}
                      {
                        <div className={cx("tablebox")}>
                          {
                            <table>
                              {
                                <thead>
                                  {
                                    <tr>
                                      {<th>{"来源类别"}</th>}
                                      {<th>{"可用内容 / 覆盖范围"}</th>}
                                      {<th>{"数据状态"}</th>}
                                    </tr>
                                  }
                                </thead>
                              }
                              {
                                <tbody>
                                  {
                                    <tr>
                                      {<td>{"海关"}</td>}
                                      {
                                        <td>
                                          {"出口贸易线索 / 连续覆盖期尚未核定"}
                                        </td>
                                      }
                                      {
                                        <td>
                                          {detail.tradeStatistics?.status ===
                                          "READY"
                                            ? "全期匹配汇总已接入；近期覆盖待核定"
                                            : tradeCount(detail)}
                                        </td>
                                      }
                                    </tr>
                                  }
                                </tbody>
                              }
                            </table>
                          }
                        </div>
                      }
                      {
                        <p
                          style={css("margin-top:10px")}
                          className={cx("small muted")}
                        >
                          {
                            "同一企业多来源只计一家。数量、趋势和明细均使用实际覆盖期；无覆盖不视为 0。"
                          }
                        </p>
                      }
                    </section>
                  }
                  {
                    <section className={cx("panel")}>
                      {<h2>{"核心指标与贸易规模"}</h2>}
                      {
                        <div className={cx("trade-stats")}>
                          {tradeMetrics.map((label) => (
                            <div key={label} className={cx("stat")}>
                              {<p className={cx("small muted")}>{label}</p>}
                              {<strong>{tradeMetric(detail, label)}</strong>}
                            </div>
                          ))}
                        </div>
                      }
                      {
                        <p className={cx("small muted section-note")}>
                          {
                            "记录数不等于订单数；数量、重量与 TEU 分开，币种/FOB-CIF/粒度不可混加，缺失不计零。"
                          }
                        </p>
                      }
                    </section>
                  }
                  {
                    <section className={cx("panel")}>
                      {<h2>{"贸易趋势"}</h2>}
                      {
                        <div className={cx("chart-grid")}>
                          {
                            <div className={cx("analytics-card")}>
                              {<h3>{"月度记录数 · 条"}</h3>}
                              {
                                <div className={cx("empty compact")}>
                                  {
                                    <p>
                                      {
                                        "覆盖期与统计口径尚未核定，暂不展示曲线。"
                                      }
                                    </p>
                                  }
                                </div>
                              }
                            </div>
                          }
                          {
                            <div className={cx("analytics-card")}>
                              {<h3>{"月度贸易额 · USD / CIF"}</h3>}
                              {
                                <div className={cx("empty compact")}>
                                  {
                                    <p>
                                      {"金额口径或覆盖不足，暂不展示曲线。"}
                                    </p>
                                  }
                                </div>
                              }
                            </div>
                          }
                        </div>
                      }
                      {
                        <p className={cx("small muted section-note")}>
                          {
                            "同范围、同源、同口径展示；无覆盖月份留缺口，已确认覆盖内无记录才为 0。"
                          }
                        </p>
                      }
                    </section>
                  }
                  {
                    <section className={cx("panel")}>
                      {<h2>{"贸易伙伴"}</h2>}
                      {
                        <p className={cx("muted")}>
                          {"暂无可识别伙伴统计；当前记录中的收货方见下方明细。"}
                        </p>
                      }
                    </section>
                  }
                  {
                    <section className={cx("panel")}>
                      {<h2>{"记录明细"}</h2>}
                      {
                        <div className={cx("tablebox")}>
                          {
                            <table>
                              {
                                <thead>
                                  {
                                    <tr>
                                      {<th>{"日期 / 类型"}</th>}
                                      {<th>{"方向 / 发收货方"}</th>}
                                      {<th>{"商品 / HS / 目的国"}</th>}
                                      {<th>{"货值 / 口径"}</th>}
                                      {<th>{"数量 / 重量 / TEU"}</th>}
                                    </tr>
                                  }
                                </thead>
                              }
                              {
                                <tbody>
                                  {
                                    <tr>
                                      {
                                        <td>
                                          {text(detail.shipmentDate)}
                                          {" / 日期语义待核定"}
                                        </td>
                                      }
                                      {
                                        <td>
                                          {"供方："}
                                          {text(detail.supplierName)}
                                          {<br />}
                                          {"收货方："}
                                          {text(detail.customerName)}
                                          {
                                            <p className={cx("small muted")}>
                                              {"收货方国家："}
                                              {text(detail.customerCountry)}
                                            </p>
                                          }
                                          {
                                            <p className={cx("small muted")}>
                                              {"运输方式："}
                                              {text(detail.transportMethod)}
                                              {" · 装货港："}
                                              {text(detail.portOfLading)}
                                            </p>
                                          }
                                          {
                                            <p className={cx("small muted")}>
                                              {"提单编号："}
                                              {text(detail.billOfLadingNumber)}
                                            </p>
                                          }
                                        </td>
                                      }
                                      {
                                        <td>
                                          {text(detail.goodsDescription)}
                                          {<br />}
                                          {"HS "}
                                          {text(detail.hsCode)}
                                          {" · "}
                                          {text(detail.itemDestination)}
                                        </td>
                                      }
                                      {
                                        <td>
                                          {number(detail.itemValueCifUsd, 2)}
                                          {" / USD / 源字段 CIF"}
                                        </td>
                                      }
                                      {
                                        <td>
                                          {quantity(detail)}
                                          {" / "}
                                          {number(detail.grossWeightKg)}
                                          {" kg 毛重 / "}
                                          {number(detail.volumeTeu)}
                                          {" TEU"}
                                        </td>
                                      }
                                    </tr>
                                  }
                                </tbody>
                              }
                            </table>
                          }
                        </div>
                      }
                      {
                        <p className={cx("small muted section-note")}>
                          {
                            "当前展示选中的单条贸易线索，不作为企业全量记录或汇总指标。"
                          }
                        </p>
                      }
                    </section>
                  }
                  {
                    <section className={cx("data-notes")}>
                      {<span>{"文件发布日期：暂无信息"}</span>}
                      {<span>{"成功接入时间：暂无信息"}</span>}
                      {<span>{"上述时间均不替代贸易事件日期"}</span>}
                    </section>
                  }
                </React.Fragment>
              ) : (
                <div className={cx("panel")}>
                  {<h2>{"我的评价"}</h2>}
                  {
                    <p
                      style={css("font-size:23px;color:#bd8422;margin:16px 0")}
                    >
                      {"尚未评价"}
                    </p>
                  }
                  {<p className={cx("original")}>{"评价数据尚未接入。"}</p>}
                  {
                    <p
                      style={css("margin:16px 0")}
                      className={cx("small muted")}
                    >
                      {"本人在本搜索条件下的判断，仅本人可见。"}
                    </p>
                  }
                  {
                    <button
                      type={"button"}
                      onClick={(event) => {
                        unavailable("我的评价");
                      }}
                      className={cx("primary")}
                    >
                      {"写评价"}
                    </button>
                  }
                </div>
              )}
            </React.Fragment>
          ) : null}
        </section>
      ) : (
        <section aria-label={"供应商搜索"}>
          {
            <form
              id={"search-form"}
              noValidate={true}
              onSubmit={(event) => {
                event.preventDefault();
                search(event);
              }}
              className={cx("search")}
            >
              {
                <label className={cx("field")}>
                  {<span>{"产品关键词"}</span>}
                  {
                    <input
                      value={draft.keyword}
                      onChange={(event) =>
                        setValue("draft.keyword", event.target.value)
                      }
                      name={"q"}
                      maxLength={"100"}
                      placeholder={"例如 电缆 / electric cable"}
                      disabled={loading}
                    />
                  }
                </label>
              }
              {
                <label className={cx("field")}>
                  {<span>{"HS Code"}</span>}
                  {
                    <input
                      value={draft.hs}
                      onChange={(event) =>
                        setValue("draft.hs", event.target.value)
                      }
                      name={"hs"}
                      maxLength={"10"}
                      inputMode={"numeric"}
                      placeholder={"例如 8544"}
                      disabled={loading}
                    />
                  }
                </label>
              }
              {
                <label className={cx("field")}>
                  {<span>{"国家 *"}</span>}
                  {
                    <select
                      value={draft.country}
                      onChange={(event) =>
                        setValue("draft.country", event.target.value)
                      }
                      name={"country"}
                      disabled={loading}
                      aria-label={"寻源国家"}
                    >
                      {<option value={""}>{"请选择国家"}</option>}
                      {<option value={"MX"}>{"墨西哥"}</option>}
                      {<option value={"ID"}>{"印度尼西亚"}</option>}
                    </select>
                  }
                </label>
              }
              {
                <button
                  type={"submit"}
                  disabled={loading}
                  className={cx("primary")}
                >
                  {loading ? "搜索中…" : "搜索"}
                </button>
              }
            </form>
          }
          {formError ? (
            <p role={"alert"} className={cx("error search-validation")}>
              {formError}
            </p>
          ) : null}
          {
            <div
              role={"tablist"}
              aria-label={"供应商通道"}
              className={cx("tabs")}
            >
              {[
                ["A", "本地 · 贸易线索"],
                ["B", "本地 · 名录"],
                ["C", "境外 · 贸易线索"],
              ].map(([id, label]) => (
                <button
                  id={`channel-${id}`}
                  key={id}
                  type={"button"}
                  role={"tab"}
                  aria-selected={channel === id}
                  aria-controls={"channel-panel"}
                  onClick={(event) => {
                    setChannel(id);
                  }}
                  className={cx({ on: channel === id })}
                >
                  {id} {label}{" "}
                  {
                    <span
                      title={id === "A" ? "企业总数尚未统计" : "数据待接入"}
                      className={cx("tag")}
                    >
                      {"—"}
                    </span>
                  }
                </button>
              ))}
            </div>
          }
          {
            <div className={cx("toolbar")}>
              {
                <span
                  role={"status"}
                  title={
                    "当前结果为单条贸易线索，同一企业可能重复；企业总数、近期统计和排名尚未接入。"
                  }
                  className={cx("small muted")}
                >
                  {resultSummary}
                </span>
              }
              {
                <div className={cx("row")}>
                  {
                    <label className={cx("company-search")}>
                      {
                        <input
                          id={"company-name"}
                          value={company}
                          onChange={(event) =>
                            setValue("company", event.target.value)
                          }
                          maxLength={"100"}
                          aria-label={"模糊搜索企业名称"}
                          placeholder={"模糊搜索企业名称"}
                          title={"输入后按回车或移开焦点筛选"}
                          disabled={loading}
                          onBlur={filterCompany}
                          onKeyDown={(event) => {
                            if (event.key !== "Enter") return;
                            event.preventDefault();
                            filterCompany(event);
                          }}
                        />
                      }
                    </label>
                  }
                  {
                    <button type={"button"} onClick={openFilters}>
                      {"高级筛选"}
                    </button>
                  }
                  {
                    <button
                      type={"button"}
                      disabled={selected.length < 2 || selected.length > 5}
                      onClick={(event) => {
                        unavailable("供应商对比");
                      }}
                      className={cx({
                        primary: selected.length >= 2 && selected.length <= 5,
                      })}
                    >
                      {"去对比"}
                    </button>
                  }
                  {
                    <div aria-label={"展示方式"} className={cx("view-switch")}>
                      {
                        <button
                          type={"button"}
                          data-mode={"cards"}
                          title={"卡片展示"}
                          aria-label={"卡片展示"}
                          aria-pressed={view === "cards"}
                          onClick={(event) => {
                            setView("cards");
                          }}
                          className={cx({ on: view === "cards" })}
                        >
                          {
                            <svg viewBox={"0 0 20 20"} aria-hidden={"true"}>
                              {
                                <rect
                                  x={"2"}
                                  y={"2"}
                                  width={"6"}
                                  height={"6"}
                                  rx={"1"}
                                ></rect>
                              }
                              {
                                <rect
                                  x={"12"}
                                  y={"2"}
                                  width={"6"}
                                  height={"6"}
                                  rx={"1"}
                                ></rect>
                              }
                              {
                                <rect
                                  x={"2"}
                                  y={"12"}
                                  width={"6"}
                                  height={"6"}
                                  rx={"1"}
                                ></rect>
                              }
                              {
                                <rect
                                  x={"12"}
                                  y={"12"}
                                  width={"6"}
                                  height={"6"}
                                  rx={"1"}
                                ></rect>
                              }
                            </svg>
                          }
                        </button>
                      }
                      {
                        <button
                          type={"button"}
                          data-mode={"table"}
                          title={"表格展示"}
                          aria-label={"表格展示"}
                          aria-pressed={view === "table"}
                          onClick={(event) => {
                            setView("table");
                          }}
                          className={cx({ on: view === "table" })}
                        >
                          {
                            <svg viewBox={"0 0 20 20"} aria-hidden={"true"}>
                              {
                                <rect
                                  x={"2"}
                                  y={"3"}
                                  width={"16"}
                                  height={"14"}
                                  rx={"1"}
                                ></rect>
                              }
                              {<path d={"M2 8h16M2 12h16M7 3v14"}></path>}
                            </svg>
                          }
                        </button>
                      }
                    </div>
                  }
                  {
                    <select
                      id={"sort"}
                      aria-label={"结果排序"}
                      title={"排序功能待接入，当前贸易线索按记录编号降序返回"}
                      onChange={requestSort}
                    >
                      {<option value={"recommended"}>{"综合排序"}</option>}
                      {<option value={"trade"}>{"贸易量优先"}</option>}
                    </select>
                  }
                </div>
              }
            </div>
          }
          {selected.length ? (
            <div className={cx("comparebar")}>
              {
                <span>
                  {"已选 "}
                  {selected.length}
                  {" / 5 家供应商"}
                </span>
              }
              {
                <button
                  type={"button"}
                  onClick={(event) => {
                    setValue("selected", []);
                  }}
                  className={cx("link")}
                >
                  {"清空选择"}
                </button>
              }
            </div>
          ) : null}
          {
            <div
              id={"channel-panel"}
              role={"tabpanel"}
              aria-labelledby={`channel-${channel}`}
            >
              {channel !== "A" ? (
                <div className={cx("empty")}>
                  {
                    <h2>
                      {channel === "B"
                        ? "本地名录 · 待接入"
                        : "境外贸易线索 · 待接入"}
                    </h2>
                  }
                  {<p>{"此通道尚未接入真实数据，不表示没有匹配企业。"}</p>}
                </div>
              ) : !applied ? (
                <div className={cx("empty")}>
                  {<h2>{"从产品与国家开始寻找供应商"}</h2>}
                  {
                    <p>
                      {"产品关键词与 HS Code 至少填写一项；同时填写取交集。"}
                    </p>
                  }
                </div>
              ) : loadError ? (
                <div role={"alert"} className={cx("data-error")}>
                  {<h3>{"搜索未完成"}</h3>}
                  {<p>{loadError}</p>}
                  {
                    <button
                      type={"button"}
                      disabled={loading}
                      onClick={(event) => {
                        loadPage(retryCursor, retryIndex);
                      }}
                    >
                      {"重试本次查询"}
                    </button>
                  }
                </div>
              ) : loading ? (
                <div role={"status"} className={cx("data-loading")}>
                  {"正在查找符合条件的记录，请稍候…"}
                </div>
              ) : hasLoaded && !items.length ? (
                <div className={cx("empty")}>
                  {<h2>{"未找到匹配供应商"}</h2>}
                  {
                    <p>
                      {"可调整企业名称或高级筛选，不会自动放宽产品与 HS 条件。"}
                    </p>
                  }
                  {
                    <button type={"button"} onClick={clearFilters}>
                      {"清空结果筛选"}
                    </button>
                  }
                </div>
              ) : view === "cards" ? (
                <div
                  aria-label={"贸易线索卡片"}
                  className={cx("supplier-grid")}
                >
                  {items.map((row) => (
                    <article
                      key={row.recordId}
                      className={cx("supplier selectable")}
                    >
                      {
                        <div className={cx("supplier-check")}>
                          {
                            <input
                              type={"checkbox"}
                              checked={selected.includes(row.recordId)}
                              aria-label={`选择 ${text(row.supplierName)} 对比`}
                              onChange={(event) => {
                                toggleSelection(row.recordId, event);
                              }}
                            />
                          }
                        </div>
                      }
                      {
                        <div className={cx("supplier-body")}>
                          {
                            <div className={cx("supplier-title")}>
                              {
                                <div>
                                  {
                                    <div className={cx("row")}>
                                      {
                                        <button
                                          type={"button"}
                                          onClick={(event) => {
                                            openDetail(row.recordId);
                                          }}
                                          className={cx(
                                            "link supplier-name lead-name",
                                          )}
                                        >
                                          {text(row.supplierName)}
                                        </button>
                                      }
                                    </div>
                                  }
                                  {
                                    <p
                                      style={css("margin-top:6px")}
                                      className={cx("small muted")}
                                    >
                                      {text(row.supplierCountry)}
                                      {profileLabel(row)}
                                    </p>
                                  }
                                </div>
                              }
                              {
                                <button
                                  type={"button"}
                                  aria-label={"收藏供应商"}
                                  onClick={(event) => {
                                    unavailable("收藏");
                                  }}
                                  className={cx("favorite")}
                                >
                                  {"♥"}
                                </button>
                              }
                            </div>
                          }
                          {
                            <div style={css("margin-top:11px")}>
                              {<span className={cx("tag")}>{"海关"}</span>}
                            </div>
                          }
                          {
                            <div className={cx("supplier-meta")}>
                              {
                                <div>
                                  {
                                    <p className={cx("small muted")}>
                                      {"匹配产品"}
                                    </p>
                                  }
                                  {
                                    <p
                                      className={cx(
                                        "supplier-product lead-description",
                                      )}
                                    >
                                      {text(row.goodsDescription)}
                                    </p>
                                  }
                                  {
                                    <p className={cx("small muted")}>
                                      {"HS "}
                                      {text(row.hsCode)}
                                      {" · "}
                                      {applied.keyword && applied.hs
                                        ? "关键词与 HS 同条记录命中"
                                        : applied.hs
                                          ? "HS 前缀命中"
                                          : "商品原文命中"}
                                    </p>
                                  }
                                  {
                                    <p
                                      style={css("margin-top:7px")}
                                      className={cx("small muted")}
                                    >
                                      {"联系方式：" + contactSummary(row)}
                                    </p>
                                  }
                                </div>
                              }
                              {
                                <div>
                                  {
                                    <p className={cx("small muted")}>
                                      {"近期贸易记录"}
                                    </p>
                                  }
                                  {
                                    <p style={css("margin-top:6px")}>
                                      {tradeCount(row)}
                                    </p>
                                  }
                                  {
                                    <p className={cx("small muted")}>
                                      {recordPeriod(row)}
                                    </p>
                                  }
                                  {
                                    <p
                                      style={css("margin-top:7px")}
                                      className={cx("small muted")}
                                    >
                                      {"企业规模：" + employeeSummary(row)}
                                    </p>
                                  }
                                </div>
                              }
                            </div>
                          }
                          {
                            <div className={cx("supplier-foot")}>
                              {<span></span>}
                              {
                                <div className={cx("row")}>
                                  {
                                    <button
                                      type={"button"}
                                      onClick={(event) => {
                                        openDetail(row.recordId);
                                      }}
                                      className={cx("link")}
                                    >
                                      {"查看详情"}
                                    </button>
                                  }
                                </div>
                              }
                            </div>
                          }
                        </div>
                      }
                    </article>
                  ))}
                </div>
              ) : (
                <div className={cx("tablebox")}>
                  {
                    <table className={cx("supplier-table")}>
                      {
                        <thead>
                          {
                            <tr>
                              {<th>{"选择"}</th>}
                              {<th>{"企业名称 / 国家"}</th>}
                              {<th>{"匹配产品 / HS"}</th>}
                              {<th>{"来源类别"}</th>}
                              {<th>{"联系 / 规模"}</th>}
                              {<th>{"近期记录 / 统计期"}</th>}
                              {<th>{"操作"}</th>}
                            </tr>
                          }
                        </thead>
                      }
                      {
                        <tbody>
                          {items.map((row) => (
                            <tr key={row.recordId}>
                              {
                                <td>
                                  {
                                    <input
                                      type={"checkbox"}
                                      checked={selected.includes(row.recordId)}
                                      aria-label={`选择 ${text(row.supplierName)} 对比`}
                                      onChange={(event) => {
                                        toggleSelection(row.recordId, event);
                                      }}
                                    />
                                  }
                                </td>
                              }
                              {
                                <td>
                                  {
                                    <button
                                      type={"button"}
                                      onClick={(event) => {
                                        openDetail(row.recordId);
                                      }}
                                      className={cx("link")}
                                    >
                                      {text(row.supplierName)}
                                    </button>
                                  }
                                  {
                                    <p className={cx("small muted")}>
                                      {text(row.supplierCountry)}
                                      {profileLabel(row)}
                                    </p>
                                  }
                                </td>
                              }
                              {
                                <td>
                                  {
                                    <p className={cx("lead-description")}>
                                      {text(row.goodsDescription)}
                                    </p>
                                  }
                                  {
                                    <p className={cx("small muted")}>
                                      {text(row.hsCode)}
                                    </p>
                                  }
                                </td>
                              }
                              {
                                <td>
                                  {<span className={cx("tag")}>{"海关"}</span>}
                                </td>
                              }
                              {
                                <td>
                                  {contactSummary(row)}
                                  {
                                    <p className={cx("small muted")}>
                                      {employeeSummary(row)}
                                    </p>
                                  }
                                </td>
                              }
                              {
                                <td>
                                  {tradeCount(row)}
                                  {
                                    <p className={cx("small muted")}>
                                      {recordPeriod(row)}
                                    </p>
                                  }
                                </td>
                              }
                              {
                                <td>
                                  {
                                    <div className={cx("row")}>
                                      {
                                        <button
                                          type={"button"}
                                          aria-label={"收藏供应商"}
                                          onClick={(event) => {
                                            unavailable("收藏");
                                          }}
                                          className={cx("favorite")}
                                        >
                                          {"♥"}
                                        </button>
                                      }
                                      {
                                        <button
                                          type={"button"}
                                          onClick={(event) => {
                                            openDetail(row.recordId);
                                          }}
                                          className={cx("link")}
                                        >
                                          {"查看详情"}
                                        </button>
                                      }
                                    </div>
                                  }
                                </td>
                              }
                            </tr>
                          ))}
                        </tbody>
                      }
                    </table>
                  }
                </div>
              )}
            </div>
          }
          {
            <div aria-label={"搜索结果分页"} className={cx("pager")}>
              {
                <span
                  title={
                    channel === "A"
                      ? "当前为贸易记录粒度，企业总数尚未统计"
                      : "本通道数据待接入"
                  }
                >
                  {"共 — 家"}
                </span>
              }
              {
                <select
                  value={pageSize}
                  aria-label={"每页条数"}
                  disabled={loading}
                  onChange={changePageSize}
                >
                  {<option value={20}>{"20 条/页"}</option>}
                  {<option value={10}>{"10 条/页"}</option>}
                </select>
              }
              {
                <button
                  type={"button"}
                  disabled={channel !== "A" || loading || pageIndex === 0}
                  aria-label={"上一页"}
                  onClick={previous}
                >
                  {"‹"}
                </button>
              }
              {
                <span aria-current={"page"} className={cx("tag")}>
                  {channel === "A" ? pageIndex + 1 : 1}
                </span>
              }
              {
                <button
                  type={"button"}
                  disabled={
                    channel !== "A" || loading || !!loadError || !hasNext
                  }
                  aria-label={"下一页"}
                  onClick={next}
                >
                  {"›"}
                </button>
              }
            </div>
          }
          {drawer ? (
            <div
              onClick={(event) => {
                if (event.target !== event.currentTarget) return;
                setValue("drawer", false);
              }}
              onKeyDown={(event) => {
                if (event.key !== "Escape") return;
                setValue("drawer", false);
              }}
              className={cx("overlay")}
            >
              {
                <section
                  role={"dialog"}
                  aria-modal={"true"}
                  aria-labelledby={"filter-title"}
                  className={cx("drawer")}
                >
                  {
                    <div className={cx("drawer-head")}>
                      {<h2 id={"filter-title"}>{"高级筛选"}</h2>}
                      {
                        <button
                          type={"button"}
                          title={"选择语言"}
                          aria-label={"选择语言"}
                          onClick={(event) => {
                            unavailable("语言切换");
                          }}
                          className={cx("utility-icon")}
                        >
                          {
                            <svg viewBox={"0 0 24 24"} aria-hidden={"true"}>
                              {<circle cx={"12"} cy={"12"} r={"9"}></circle>}
                              {
                                <path
                                  d={
                                    "M3 12h18M12 3c5 5 5 13 0 18M12 3c-5 5-5 13 0 18"
                                  }
                                ></path>
                              }
                            </svg>
                          }
                        </button>
                      }
                      {
                        <button
                          type={"button"}
                          onClick={(event) => {
                            setValue("drawer", false);
                          }}
                        >
                          {"关闭"}
                        </button>
                      }
                    </div>
                  }
                  {
                    <form
                      id={"advanced-form"}
                      onSubmit={(event) => {
                        event.preventDefault();
                        applyFilters(event);
                      }}
                      className={cx("form")}
                    >
                      {
                        <div className={cx("filter-group")}>
                          {<h3>{"来源类别"}</h3>}
                          {
                            <div className={cx("chips")}>
                              {sources.map((source) => (
                                <label key={source} className={cx("check")}>
                                  {
                                    <input
                                      checked={filterDraft.sources.includes(
                                        source,
                                      )}
                                      onChange={(event) =>
                                        setValue(
                                          "filterDraft.sources",
                                          event.target.checked
                                            ? [...filterDraft.sources, source]
                                            : filterDraft.sources.filter(
                                                (item) => item !== source,
                                              ),
                                        )
                                      }
                                      type={"checkbox"}
                                      name={"sources"}
                                      value={source}
                                    />
                                  }
                                  {source}
                                </label>
                              ))}
                            </div>
                          }
                        </div>
                      }
                      {
                        <div className={cx("filter-group")}>
                          {<h3>{"企业属性"}</h3>}
                          {
                            <div className={cx("chips")}>
                              {["制造商", "贸易商", "分销商"].map((type) => (
                                <label key={type} className={cx("check")}>
                                  {
                                    <input
                                      checked={filterDraft.types.includes(type)}
                                      onChange={(event) =>
                                        setValue(
                                          "filterDraft.types",
                                          event.target.checked
                                            ? [...filterDraft.types, type]
                                            : filterDraft.types.filter(
                                                (item) => item !== type,
                                              ),
                                        )
                                      }
                                      type={"checkbox"}
                                      name={"types"}
                                      value={type}
                                    />
                                  }
                                  {type}
                                </label>
                              ))}
                            </div>
                          }
                        </div>
                      }
                      {
                        <div className={cx("cols")}>
                          {
                            <label className={cx("field")}>
                              {<span>{"HS Code · 当前结果内细筛"}</span>}
                              {
                                <input
                                  value={filterDraft.hs}
                                  onChange={(event) =>
                                    setValue(
                                      "filterDraft.hs",
                                      event.target.value,
                                    )
                                  }
                                  name={"hs"}
                                  maxLength={"10"}
                                  inputMode={"numeric"}
                                  placeholder={"输入 HS 前缀"}
                                />
                              }
                            </label>
                          }
                          {
                            <label className={cx("field")}>
                              {<span>{"联系方式"}</span>}
                              {
                                <select
                                  value={filterDraft.contact}
                                  onChange={(event) =>
                                    setValue(
                                      "filterDraft.contact",
                                      event.target.value,
                                    )
                                  }
                                  name={"contact"}
                                >
                                  {<option value={""}>{"不限"}</option>}
                                  {
                                    <option value={"yes"}>
                                      {"有公开联系方式"}
                                    </option>
                                  }
                                  {
                                    <option value={"no"}>
                                      {"暂无联系方式数据"}
                                    </option>
                                  }
                                </select>
                              }
                            </label>
                          }
                        </div>
                      }
                      {
                        <label className={cx("field")}>
                          {<span>{"企业规模"}</span>}
                          {
                            <select
                              value={filterDraft.size}
                              onChange={(event) =>
                                setValue("filterDraft.size", event.target.value)
                              }
                              name={"size"}
                            >
                              {<option value={""}>{"不限"}</option>}
                              {<option value={"10-49"}>{"10–49 人"}</option>}
                              {<option value={"50-99"}>{"50–99 人"}</option>}
                              {
                                <option value={"100-499"}>
                                  {"100–499 人"}
                                </option>
                              }
                              {
                                <option value={"unknown"}>
                                  {"暂无规模数据"}
                                </option>
                              }
                            </select>
                          }
                        </label>
                      }
                      {
                        <div className={cx("cols")}>
                          {
                            <label className={cx("field")}>
                              {<span>{"供货量下限（可观察贸易数量）"}</span>}
                              {
                                <input
                                  value={filterDraft.minQty}
                                  onChange={(event) =>
                                    setValue(
                                      "filterDraft.minQty",
                                      event.target.value,
                                    )
                                  }
                                  name={"minQty"}
                                  type={"number"}
                                  min={"0"}
                                  placeholder={"不填则不限"}
                                />
                              }
                            </label>
                          }
                          {
                            <label className={cx("field")}>
                              {<span>{"单位"}</span>}
                              {
                                <select
                                  value={filterDraft.unit}
                                  onChange={(event) =>
                                    setValue(
                                      "filterDraft.unit",
                                      event.target.value,
                                    )
                                  }
                                  name={"unit"}
                                >
                                  {<option value={"kg"}>{"千克 kg"}</option>}
                                  {<option value={"t"}>{"吨 t"}</option>}
                                </select>
                              }
                            </label>
                          }
                        </div>
                      }
                      {
                        <p className={cx("small muted")}>
                          {
                            "数量按原始单位及实际统计期筛选，缺失不视为 0，不代表产能或承诺交付量。不同单位不直接混比。"
                          }
                        </p>
                      }
                      {filterError ? (
                        <p role={"alert"} className={cx("error")}>
                          {filterError}
                        </p>
                      ) : null}
                      {
                        <div className={cx("row")}>
                          {
                            <button
                              type={"submit"}
                              disabled={loading}
                              className={cx("primary")}
                            >
                              {"应用筛选"}
                            </button>
                          }
                          {
                            <button
                              type={"button"}
                              onClick={(event) => {
                                setValue("filterDraft", emptyFilters());
                                setValue("filterError", "");
                              }}
                            >
                              {"重置筛选"}
                            </button>
                          }
                        </div>
                      }
                    </form>
                  }
                </section>
              }
            </div>
          ) : null}
          {pendingSearch ? (
            <div
              onClick={(event) => {
                if (event.target !== event.currentTarget) return;
                cancelSearch(event);
              }}
              onKeyDown={(event) => {
                if (event.key !== "Escape") return;
                cancelSearch(event);
              }}
              className={cx("overlay center")}
            >
              {
                <section
                  role={"dialog"}
                  aria-modal={"true"}
                  aria-labelledby={"changed-search-title"}
                  className={cx("drawer")}
                >
                  {
                    <div className={cx("drawer-head")}>
                      {
                        <h2 id={"changed-search-title"}>
                          {"搜索条件发生变化"}
                        </h2>
                      }
                      {
                        <button
                          type={"button"}
                          title={"选择语言"}
                          aria-label={"选择语言"}
                          onClick={(event) => {
                            unavailable("语言切换");
                          }}
                          className={cx("utility-icon")}
                        >
                          {
                            <svg viewBox={"0 0 24 24"} aria-hidden={"true"}>
                              {<circle cx={"12"} cy={"12"} r={"9"}></circle>}
                              {
                                <path
                                  d={
                                    "M3 12h18M12 3c5 5 5 13 0 18M12 3c-5 5-5 13 0 18"
                                  }
                                ></path>
                              }
                            </svg>
                          }
                        </button>
                      }
                      {
                        <button type={"button"} onClick={cancelSearch}>
                          {"关闭"}
                        </button>
                      }
                    </div>
                  }
                  {
                    <p>
                      {"产品、HS 或国家变化会清空已选的 "}
                      {selected.length}
                      {" 家对比企业。"}
                    </p>
                  }
                  {
                    <div style={css("margin-top:20px")} className={cx("row")}>
                      {
                        <button type={"button"} onClick={cancelSearch}>
                          {"取消变更"}
                        </button>
                      }
                      {
                        <button
                          type={"button"}
                          onClick={confirmSearch}
                          className={cx("primary")}
                        >
                          {"确认清空并搜索"}
                        </button>
                      }
                    </div>
                  }
                </section>
              }
            </div>
          ) : null}
        </section>
      )}
    </React.Fragment>
  );
}
