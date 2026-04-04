"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  dashboardSummaryRequest,
  getOrderRequest,
  listOrdersRequest,
  listProductsRequest,
  type DashboardSummary,
  type OrderListItem,
} from "@/lib/api";
import { ErpShell } from "@/components/ErpShell";
import { useThemeMode } from "@/components/ThemeProvider";
import { clearSession, getAccessToken } from "@/lib/session";

function brl(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
}

function brlNoCents(value: number) {
  return `R$ ${Math.round(value || 0).toLocaleString("pt-BR")}`;
}

function brlTicket(value: number) {
  return `R$ ${(value || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function asNumber(value: unknown, fallback = 0) {
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  if (typeof value === "string") {
    const normalized = value.trim().replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function parseBrDate(value: string) {
  if (!value) return null;
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}):(\d{2}))?$/);
  if (!match) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const [, dd, mm, yyyy, hh = "00", mi = "00", ss = "00"] = match;
  return new Date(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh), Number(mi), Number(ss));
}

function statusClass(value: string) {
  const s = (value || "").toLowerCase();
  if (s.includes("aut") || s.includes("invoic") || s.includes("confirm")) return "bg-[#14532d] text-[#86efac]";
  if (s.includes("pend") || s.includes("open") || s.includes("partial")) return "bg-[#1e3a5f] text-[#93c5fd]";
  if (s.includes("erro") || s.includes("error") || s.includes("reject")) return "bg-[#7f1d1d] text-[#fca5a5]";
  if (s.includes("cancel")) return "bg-[#451a03] text-[#fbbf24]";
  return "bg-[#1e2332] text-[#94a3b8]";
}

function statusLabel(value: string) {
  const s = (value || "").toLowerCase();
  if (s === "invoiced") return "Autorizada";
  if (s === "confirmed") return "Confirmada";
  if (s === "open" || s === "partial") return "Pendente";
  if (s === "rejected" || s === "error") return "Erro";
  if (s === "canceled" || s === "cancelled") return "Cancelada";
  return value;
}

export default function DashboardPage() {
  const router = useRouter();
  const { isLight } = useThemeMode();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [allOrders, setAllOrders] = useState<OrderListItem[]>([]);
  const [periodOrders, setPeriodOrders] = useState<OrderListItem[]>([]);
  const [topSoldProducts, setTopSoldProducts] = useState<Array<{ name: string; amount: number }>>([]);
  const [criticalFromProducts, setCriticalFromProducts] = useState<Array<{ name: string; qty: string; severe: boolean }>>([]);
  const [chartReady, setChartReady] = useState(false);
  const [kpiReady, setKpiReady] = useState(false);
  const [period] = useState<"today" | "week" | "month">("today");

  const loadDashboard = useCallback(
    async (nextPeriod: "today" | "week" | "month", isRefresh = false) => {
      const token = getAccessToken();
      if (!token) {
        router.replace("/");
        return;
      }

      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError("");

      try {
        const data = await dashboardSummaryRequest(token, nextPeriod);
        const firstPage = await listOrdersRequest(token, { page: 1, pageSize: 200, sortBy: "created_at", sortDir: "desc" });
        const totalPages = Math.max(1, firstPage.pagination.total_pages || 1);
        let allOrderItems = [...firstPage.items];

        if (totalPages > 1) {
          const nextPages = await Promise.all(
            Array.from({ length: totalPages - 1 }, (_, idx) =>
              listOrdersRequest(token, { page: idx + 2, pageSize: 200, sortBy: "created_at", sortDir: "desc" }),
            ),
          );
          allOrderItems = allOrderItems.concat(nextPages.flatMap((pageData) => pageData.items));
        }

        const now = new Date();
        const periodFiltered = allOrderItems.filter((order) => {
          if (String(order.status || "").toUpperCase() === "CANCELED") return false;
          const dt = parseBrDate(order.created_at);
          if (!dt) return false;
          if (nextPeriod === "today") {
            return dt.getFullYear() === now.getFullYear() && dt.getMonth() === now.getMonth() && dt.getDate() === now.getDate();
          }
          if (nextPeriod === "week") {
            const start = new Date(now);
            start.setHours(0, 0, 0, 0);
            start.setDate(start.getDate() - 6);
            return dt >= start && dt <= now;
          }
          return dt.getFullYear() === now.getFullYear() && dt.getMonth() === now.getMonth();
        });

        const detailRows = await Promise.all(
          periodFiltered.map(async (order) => {
            try {
              return await getOrderRequest(token, order.id);
            } catch {
              return null;
            }
          }),
        );

        const productMap = new Map<string, number>();
        detailRows.forEach((detail) => {
          if (!detail) return;
          detail.items.forEach((item) => {
            const current = productMap.get(item.product_name) ?? 0;
            productMap.set(item.product_name, current + Number(item.line_total || 0));
          });
        });

        const topFromSales = Array.from(productMap.entries())
          .map(([name, amount]) => ({ name, amount }))
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 5);

        const productsFirstPage = await listProductsRequest(token, { page: 1, pageSize: 200, sortBy: "stock_qty", sortDir: "asc", isActive: "true" });
        const productsTotalPages = Math.max(1, productsFirstPage.pagination.total_pages || 1);
        let allProducts = [...productsFirstPage.items];
        if (productsTotalPages > 1) {
          const nextPages = await Promise.all(
            Array.from({ length: productsTotalPages - 1 }, (_, idx) =>
              listProductsRequest(token, { page: idx + 2, pageSize: 200, sortBy: "stock_qty", sortDir: "asc", isActive: "true" }),
            ),
          );
          allProducts = allProducts.concat(nextPages.flatMap((pageData) => pageData.items));
        }

        const criticalProducts = allProducts
          .filter((product) => asNumber(product.stock_qty, 0) <= 10)
          .sort((a, b) => asNumber(a.stock_qty, 0) - asNumber(b.stock_qty, 0))
          .slice(0, 5)
          .map((product) => {
            const qty = Math.round(asNumber(product.stock_qty, 0));
            return { name: product.name, qty: `${qty} un.`, severe: qty <= 2 };
          });

        setSummary(data);
        setAllOrders(allOrderItems);
        setPeriodOrders(periodFiltered);
        setTopSoldProducts(topFromSales);
        setCriticalFromProducts(criticalProducts);
      } catch (requestError) {
        const message = requestError instanceof Error ? requestError.message : "Falha ao carregar dashboard.";
        if (message === "unauthorized") {
          clearSession();
          router.replace("/");
          return;
        }
        setError(message);
      } finally {
        if (isRefresh) setRefreshing(false);
        else setLoading(false);
      }
    },
    [router],
  );

  useEffect(() => {
    void loadDashboard(period, false);
  }, [period, loadDashboard]);

  useEffect(() => {
    if (loading) return;
    setChartReady(false);
    const timer = window.setTimeout(() => setChartReady(true), 80);
    return () => window.clearTimeout(timer);
  }, [loading, summary]);

  useEffect(() => {
    if (loading) return;
    setKpiReady(false);
    const timer = window.setTimeout(() => setKpiReady(true), 80);
    return () => window.clearTimeout(timer);
  }, [loading, summary]);

  const totalRevenue = asNumber(summary?.kpis?.billing_period, periodOrders.reduce((acc, item) => acc + asNumber(item.total_amount, 0), 0));
  const ticketMedio = asNumber(summary?.kpis?.avg_ticket_period, periodOrders.length ? totalRevenue / periodOrders.length : 0);
  const nfErro = asNumber(summary?.kpis?.fiscal_rejected, 0);

  const todayRevenue = useMemo(() => {
    const byKpi = asNumber(summary?.kpis?.billing_today, -1);
    if (byKpi >= 0) return byKpi;
    const now = new Date();
    return allOrders.reduce((acc, item) => {
      if (String(item.status || "").toUpperCase() === "CANCELED") return acc;
      const dt = parseBrDate(item.created_at);
      if (!dt) return acc;
      const sameDay = dt.getFullYear() === now.getFullYear() && dt.getMonth() === now.getMonth() && dt.getDate() === now.getDate();
      return sameDay ? acc + asNumber(item.total_amount, 0) : acc;
    }, 0);
  }, [summary, allOrders]);

  const chart = useMemo(() => {
    const fallback = [8200, 12400, 9800, 15600, 11200, 18400, 14820];
    if (!periodOrders.length) return fallback;
    const weekTotals = [0, 0, 0, 0, 0, 0, 0];
    periodOrders.forEach((order) => {
      const dt = parseBrDate(order.created_at);
      if (!dt) return;
      const jsDay = dt.getDay();
      const idx = jsDay === 0 ? 6 : jsDay - 1;
      weekTotals[idx] += asNumber(order.total_amount, 0);
    });
    const values = weekTotals.map((v) => Math.round(v));
    while (values.length < 7) values.push(fallback[values.length]);
    return values;
  }, [periodOrders]);
  const maxChart = Math.max(...chart, 1);

  const latestSales = periodOrders.length
    ? periodOrders.slice(0, 5).map((x) => ({ id: String(x.id), client: x.client_name, amount: asNumber(x.total_amount, 0), status: statusLabel(x.status) }))
    : [];

  const topProducts = useMemo(() => {
    if (topSoldProducts.length) {
      const max = Math.max(...topSoldProducts.map((x) => x.amount), 1);
      return topSoldProducts.map((x, idx) => ({
        name: x.name,
        amount: brlNoCents(x.amount),
        pct: Math.max(12, Math.round((x.amount / max) * 100)),
        color: idx === 0 ? "bg-[#22c55e]" : idx < 3 ? "bg-[#3b82f6]" : "bg-[#f59e0b]",
      }));
    }
    return [];
  }, [topSoldProducts]);

  const stockCritical = useMemo(() => {
    if ((summary?.critical_stock?.length || 0) > 0) {
      return (summary?.critical_stock || []).map((x) => ({ name: x.name, qty: `${Math.round(x.qty)} un.`, severe: x.qty <= 2 }));
    }
    return criticalFromProducts;
  }, [summary, criticalFromProducts]);

  const fiscalRows = (summary?.fiscal_notes?.length
    ? summary.fiscal_notes.map((x) => ({ num: x.num, dest: x.dest, status: statusLabel(x.status) }))
    : []);

  const panelClass = isLight ? "border-[#d1d9e6] bg-[#ffffff]" : "border-[#2a3045] bg-[#161a24]";
  const panelHeadClass = isLight ? "border-[#d1d9e6] bg-[#eef1f7] text-[#0f172a]" : "border-[#2a3045] bg-[#1e2332] text-[#e2e8f0]";
  const textMain = isLight ? "text-[#0f172a]" : "text-[#e2e8f0]";
  const textSub = isLight ? "text-[#64748b]" : "text-[#64748b]";
  const gridLine = isLight ? "border-[#d1d9e6]" : "border-[#2a3045]";

  function handleLogout() {
    clearSession();
    router.replace("/");
  }

  return (
    <ErpShell activeNav="dashboard" onLogout={handleLogout} pageTitle="Dashboard Executivo">
      {loading ? (
        <div className={`rounded-md border p-6 ${panelClass} ${textSub}`}>Carregando dashboard...</div>
      ) : error ? (
        <div className="rounded-md border border-[#7f1d1d] bg-[#2d1518] p-6 text-[#fca5a5]">{error}</div>
      ) : (
        <div className="grid h-full min-h-0 w-full grid-rows-[auto_auto_minmax(260px,1fr)_minmax(220px,1fr)] gap-2">
          <div className={`flex flex-wrap items-center justify-between gap-2 border-b px-3 pb-2 ${gridLine}`}>
            <div>
              <h1 className={`text-[24px] font-semibold leading-none ${textMain}`}>Dashboard</h1>
              <p className={`mt-1 text-[12px] ${textSub}`}>Visao geral do negocio</p>
            </div>
            <button
              className="erp-btn erp-btn-secondary"
              disabled={refreshing}
              onClick={() => void loadDashboard(period, true)}
              type="button"
            >
              {refreshing ? "Atualizando..." : "Atualizar"}
            </button>
          </div>

          <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
            {[
              ["FATURAMENTO HOJE", brlNoCents(todayRevenue), "â–² 8,4% vs. ontem", "bg-[#3b82f6]"],
              ["FATURAMENTO MES", brlNoCents(totalRevenue), "â–² 12,1% vs. mes anterior", "bg-[#22c55e]"],
              ["TICKET MEDIO", brlTicket(ticketMedio), "â–¼ 2,3% vs. mes anterior", "bg-[#f59e0b]"],
              ["NF COM ERRO", String(nfErro), "Requer atencao imediata", "bg-[#ef4444]"],
            ].map((card, idx) => (
              <article
                className={`erp-kpi-card flex min-h-[118px] flex-col items-start justify-between text-left transition-all duration-200 ease-out hover:-translate-y-[1px] hover:border-[#3a4260] hover:shadow-[0_8px_18px_rgba(0,0,0,0.24)] ${kpiReady ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"}`}
                key={String(card[0])}
                style={{ transitionDelay: `${idx * 60}ms` }}
              >
                <div className={`erp-kpi-line ${card[3]}`} />
                <p className="font-mono text-xs font-semibold uppercase tracking-wider text-[#475569]">{card[0]}</p>
                <h2 className={`mt-1 font-mono text-[30px] font-bold leading-none ${textMain}`}>{card[1]}</h2>
                <p className="mt-1.5 text-[11px] text-[#64748b]">{card[2]}</p>
              </article>
            ))}
          </div>

          <div className="grid min-h-0 grid-cols-1 gap-2 xl:grid-cols-12">
            <section className={`min-w-0 rounded-md border xl:col-span-8 flex h-full flex-col ${panelClass}`}>
              <header className={`flex items-center border-b px-4 py-1.5 text-[16px] font-semibold ${panelHeadClass}`}>
                Vendas por período
              </header>
              <div className="min-h-0 flex-1 p-2.5">
                <div className="grid h-full min-h-[220px] grid-cols-[34px_1fr] gap-2">
                  <div className="flex h-full flex-col justify-between pb-7 font-mono text-[10px] text-[#64748b]">
                    <span>R$ 20k</span><span>R$ 16k</span><span>R$ 12k</span><span>R$ 8k</span><span>R$ 4k</span><span>R$ 0k</span>
                  </div>
                  <div className="relative h-full pb-7">
                    {[0, 1, 2, 3, 4, 5].map((line) => (
                      <div className={`absolute left-0 right-0 border-t ${gridLine}`} key={line} style={{ bottom: `${(line / 5) * 100}%` }} />
                    ))}
                    <div className="absolute inset-x-0 bottom-7 top-0 flex items-end gap-2.5">
                      {chart.map((value, index) => (
                        <div className="group flex h-full flex-1 items-end" key={`${value}-${index}`}>
                          <div
                            className="w-full rounded-t-[3px] border border-[#3b82f6] bg-[#243a63] transition-[height,background-color] duration-1000 ease-out group-hover:bg-[#2d4d86]"
                            style={{ height: chartReady ? `${Math.max(18, Math.round((value / maxChart) * 100))}%` : "0%" }}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 flex gap-2.5">
                      {["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"].map((label) => (
                        <span className="flex-1 text-center font-mono text-[10px] text-[#64748b]" key={label}>{label}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className={`min-w-0 rounded-md border xl:col-span-4 flex h-full flex-col ${panelClass}`}>
              <header className={`flex items-center border-b px-4 py-1.5 text-[16px] font-semibold ${panelHeadClass}`}>Últimas vendas</header>
              <table className="w-full border-collapse">
                <thead>
                  <tr className={`border-b text-left font-mono text-[10px] uppercase tracking-[0.12em] text-[#64748b] ${gridLine}`}>
                    <th className="px-3 py-2">#</th><th className="px-3 py-2">Cliente</th><th className="px-3 py-2">Valor</th><th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {latestSales.map((sale) => (
                    <tr className={`border-b transition-colors ${gridLine} ${isLight ? "hover:bg-[#eef1f7]" : "hover:bg-[#1e2332]"}`} key={`${sale.id}-${sale.client}`}>
                      <td className="px-3 py-1.5 font-mono text-[11px] text-[#64748b]">{sale.id}</td>
                      <td className={`px-3 py-1.5 text-[13px] ${textMain}`}>{sale.client}</td>
                      <td className={`px-3 py-1.5 font-mono text-[13px] ${textMain}`}>{brl(sale.amount)}</td>
                      <td className="px-3 py-1.5"><span className={`inline-flex h-5 items-center rounded-[2px] px-2 font-mono text-[10px] ${statusClass(sale.status)}`}>{sale.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <footer className="mt-auto px-4 py-1.5 font-mono text-[11px] text-[#475569]">Ver todas as vendas →</footer>
            </section>
          </div>

          <div className="grid min-h-0 grid-cols-1 gap-2 xl:grid-cols-12">
            <section className={`min-w-0 rounded-md border xl:col-span-4 flex h-full flex-col ${panelClass}`}>
              <header className={`flex items-center border-b px-4 py-1.5 text-[16px] font-semibold ${panelHeadClass}`}>Top produtos vendidos</header>
              <div className="space-y-2 p-3">
                {topProducts.map((item) => (
                  <div key={item.name}>
                    <div className="mb-1 flex items-center justify-between text-[13px] text-[#94a3b8]">
                      <span>{item.name}</span><span className="font-mono text-[12px] text-[#64748b]">{item.amount}</span>
                    </div>
                    <div className={`${isLight ? "bg-[#dbeafe]" : "bg-[#1e2332]"} h-1 rounded`}>
                      <div className={`h-1 rounded ${item.color}`} style={{ width: `${item.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className={`min-w-0 rounded-md border xl:col-span-4 flex h-full flex-col ${panelClass}`}>
              <header className={`flex items-center border-b px-4 py-1.5 text-[16px] font-semibold ${panelHeadClass}`}>Estoque crítico</header>
              <div className="p-3">
                {stockCritical.map((item) => (
                  <div className={`flex items-center gap-2 border-b py-1.5 last:border-none ${gridLine}`} key={item.name}>
                    <span className={`h-2 w-2 rounded-full ${item.severe ? "bg-[#ef4444]" : "bg-[#f59e0b]"}`} />
                    <span className={`flex-1 text-[13px] ${textMain}`}>{item.name}</span>
                    <span className={`font-mono text-[12px] ${item.severe ? "text-[#ef4444]" : "text-[#f59e0b]"}`}>{item.qty}</span>
                  </div>
                ))}
              </div>
              <footer className={`mt-auto border-t px-4 py-1.5 font-mono text-[11px] text-[#475569] ${gridLine}`}>Mín. estoque configurado em Produtos →</footer>
            </section>

            <section className={`min-w-0 rounded-md border xl:col-span-4 flex h-full flex-col ${panelClass}`}>
              <header className={`flex items-center border-b px-4 py-1.5 text-[16px] font-semibold ${panelHeadClass}`}>Notas fiscais</header>
              <table className="w-full border-collapse">
                <thead>
                  <tr className={`border-b text-left font-mono text-[10px] uppercase tracking-[0.12em] text-[#64748b] ${gridLine}`}>
                    <th className="px-3 py-2">Nº</th><th className="px-3 py-2">Destinatário</th><th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {fiscalRows.map((row) => (
                    <tr className={`border-b transition-colors ${gridLine} ${isLight ? "hover:bg-[#eef1f7]" : "hover:bg-[#1e2332]"}`} key={row.num}>
                      <td className={`px-3 py-1.5 font-mono text-[11px] ${textMain}`}>{row.num}</td>
                      <td className={`px-3 py-1.5 text-[13px] ${textMain}`}>{row.dest}</td>
                      <td className="px-3 py-1.5"><span className={`inline-flex h-5 items-center rounded-[2px] px-2 font-mono text-[10px] ${statusClass(row.status)}`}>{row.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <footer className="mt-auto px-4 py-1.5 font-mono text-[11px] text-[#475569]">Ver módulo fiscal →</footer>
            </section>
          </div>
        </div>
      )}
    </ErpShell>
  );
}

