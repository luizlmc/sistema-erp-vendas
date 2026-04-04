"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ErpShell } from "@/components/ErpShell";
import {
  ReceivableDetail,
  ReceivableItem,
  getReceivableRequest,
  listReceivablesRequest,
  registerReceivablePaymentRequest,
} from "@/lib/api";
import { clearSession, getAccessToken, getUserIdentity } from "@/lib/session";

type SortBy = "due_asc" | "due_desc" | "value_desc" | "value_asc" | "name_asc" | "name_desc";
type SavedReceivableFilters = {
  queryInput: string;
  query: string;
  status: string;
  paymentMethodFilter: string;
  clientIdFilter: string;
  orderIdFilter: string;
  sortBy: SortBy;
  page: number;
};

function getSafeStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function brl(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
}

function dmy(value?: string | null) {
  if (!value) return "--/--/----";
  const normalized = value.includes(" ") && !value.includes("T") ? value.replace(" ", "T") : value;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? "--/--/----" : date.toLocaleDateString("pt-BR");
}

function dmyhm(value?: string | null) {
  if (!value) return "--/--/---- --:--";
  const normalized = value.includes(" ") && !value.includes("T") ? value.replace(" ", "T") : value;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return "--/--/---- --:--";
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusLabel(status: string) {
  if (status === "PAID") return "Recebido";
  if (status === "CANCELED") return "Cancelado";
  if (status === "PARTIAL") return "Parcial";
  if (status === "OVERDUE") return "Vencido";
  return "Aberto";
}

function statusClass(status: string) {
  if (status === "PAID") return "erp-tag-success";
  if (status === "CANCELED") return "erp-tag-danger";
  if (status === "PARTIAL") return "erp-tag-info";
  if (status === "OVERDUE") return "erp-tag-warn";
  return "erp-tag-warn";
}

export default function ReceivablesPage() {
  const router = useRouter();
  const user = getUserIdentity();
  const userKey = user.login?.trim().toLowerCase() || "default";
  const filtersStorageKey = `erp:receivables:filters:${userKey}`;
  const [loading, setLoading] = useState(true);
  const [kpiReady, setKpiReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [items, setItems] = useState<ReceivableItem[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [status, setStatus] = useState("all");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("all");
  const [clientIdFilter, setClientIdFilter] = useState("");
  const [orderIdFilter, setOrderIdFilter] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("due_asc");

  const [selected, setSelected] = useState<ReceivableDetail | null>(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("PIX");
  const [notes, setNotes] = useState("");
  const [toasts, setToasts] = useState<Array<{ id: number; message: string; type: "success" | "error" }>>([]);
  const [filtersHydrated, setFiltersHydrated] = useState(false);
  const [detailRefreshing, setDetailRefreshing] = useState(false);

  function toast(message: string, type: "success" | "error") {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((s) => [...s, { id, message, type }]);
    window.setTimeout(() => setToasts((s) => s.filter((t) => t.id !== id)), 3500);
  }

  async function load(nextPage = page) {
    const token = getAccessToken();
    if (!token) {
      clearSession();
      router.replace("/");
      return;
    }

    const sortMap: Record<SortBy, { sortBy: string; sortDir: "asc" | "desc" }> = {
      due_asc: { sortBy: "due_date", sortDir: "asc" },
      due_desc: { sortBy: "due_date", sortDir: "desc" },
      value_desc: { sortBy: "balance_amount", sortDir: "desc" },
      value_asc: { sortBy: "balance_amount", sortDir: "asc" },
      name_asc: { sortBy: "client_name", sortDir: "asc" },
      name_desc: { sortBy: "client_name", sortDir: "desc" },
    };
    const sortDef = sortMap[sortBy];

    const response = await listReceivablesRequest(token, {
      page: nextPage,
      pageSize,
      q: query.trim() || undefined,
      status: status === "all" ? undefined : status,
      clientId: clientIdFilter.trim() ? Number(clientIdFilter) : undefined,
      orderId: orderIdFilter.trim() ? Number(orderIdFilter) : undefined,
      sortBy: sortDef.sortBy,
      sortDir: sortDef.sortDir,
    });
    setItems(response.items);
    setTotalItems(response.pagination.total);
    setTotalPages(Math.max(response.pagination.total_pages, 1));
    setPage(response.pagination.page);
  }

  useEffect(() => {
    const storage = getSafeStorage();
    if (!storage) {
      setFiltersHydrated(true);
      return;
    }
    try {
      const raw = storage.getItem(filtersStorageKey);
      if (!raw) {
        setFiltersHydrated(true);
        return;
      }
      const parsed = JSON.parse(raw) as Partial<SavedReceivableFilters>;
      setQueryInput(parsed.queryInput || "");
      setQuery(parsed.query || "");
      setStatus(parsed.status || "all");
      setPaymentMethodFilter(parsed.paymentMethodFilter || "all");
      setClientIdFilter(parsed.clientIdFilter || "");
      setOrderIdFilter(parsed.orderIdFilter || "");
      setSortBy(parsed.sortBy || "due_asc");
      setPage(parsed.page && parsed.page > 0 ? parsed.page : 1);
    } catch {
      // ignora storage invalido e segue com filtros default
    } finally {
      setFiltersHydrated(true);
    }
  }, [filtersStorageKey]);

  useEffect(() => {
    if (!filtersHydrated) return;
    const storage = getSafeStorage();
    if (!storage) return;
    const payload: SavedReceivableFilters = {
      queryInput,
      query,
      status,
      paymentMethodFilter,
      clientIdFilter,
      orderIdFilter,
      sortBy,
      page,
    };
    storage.setItem(filtersStorageKey, JSON.stringify(payload));
  }, [
    filtersHydrated,
    filtersStorageKey,
    queryInput,
    query,
    status,
    paymentMethodFilter,
    clientIdFilter,
    orderIdFilter,
    sortBy,
    page,
  ]);

  useEffect(() => {
    if (!filtersHydrated) return;
    let canceled = false;
    setLoading(true);
    load(page)
      .catch((err) => {
        if (canceled) return;
        const message = err instanceof Error ? err.message : "Falha ao carregar contas a receber.";
        if (message === "unauthorized") {
          clearSession();
          router.replace("/");
          return;
        }
        toast(message, "error");
      })
      .finally(() => {
        if (!canceled) setLoading(false);
      });
    return () => {
      canceled = true;
    };
  }, [router, filtersHydrated, page, query, status, sortBy, clientIdFilter, orderIdFilter, refreshKey]);

  useEffect(() => {
    if (loading) return;
    setKpiReady(false);
    const timer = window.setTimeout(() => setKpiReady(true), 80);
    return () => window.clearTimeout(timer);
  }, [loading, items.length, paymentMethodFilter]);

  const visibleItems = useMemo(() => {
    if (paymentMethodFilter === "all") return items;
    return items.filter((item) => (item.payment_method || "").toUpperCase() === paymentMethodFilter.toUpperCase());
  }, [items, paymentMethodFilter]);

  const kpis = useMemo(() => {
    const now = new Date();
    const openItems = visibleItems.filter((item) => item.status === "OPEN" || item.status === "PARTIAL");
    const overdue = openItems.filter((item) => {
      const due = new Date(item.due_date.includes("T") ? item.due_date : `${item.due_date}T00:00:00`);
      return !Number.isNaN(due.getTime()) && due.getTime() < now.getTime();
    });
    const paid = visibleItems.filter((item) => item.status === "PAID");

    return {
      totalTitles: totalItems,
      openBalance: openItems.reduce((acc, item) => acc + item.balance_amount, 0),
      overdueCount: overdue.length,
      receivedAmount: paid.reduce((acc, item) => acc + item.paid_amount, 0),
    };
  }, [totalItems, visibleItems]);

  async function openDetail(receivableId: number) {
    const token = getAccessToken();
    if (!token) return;
    try {
      const payload = await getReceivableRequest(token, receivableId);
      setSelected(payload);
      setAmount(payload.balance_amount > 0 ? String(payload.balance_amount.toFixed(2)).replace(".", ",") : "");
      setMethod(payload.payment_method || "PIX");
      setNotes("");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Falha ao abrir titulo.", "error");
    }
  }

  async function refreshDetail() {
    if (!selected) return;
    const token = getAccessToken();
    if (!token) return;
    try {
      setDetailRefreshing(true);
      const payload = await getReceivableRequest(token, selected.id);
      setSelected(payload);
      if (payload.balance_amount > 0) {
        setAmount(String(payload.balance_amount.toFixed(2)).replace(".", ","));
      }
      toast("Titulo atualizado.", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Falha ao atualizar titulo.", "error");
    } finally {
      setDetailRefreshing(false);
    }
  }

  async function submitPayment(event: FormEvent) {
    event.preventDefault();
    if (!selected || submitting) return;
    const token = getAccessToken();
    if (!token) return;
    const paymentAmount = Number(amount.replace(",", "."));

    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      toast("Informe um valor de pagamento valido.", "error");
      return;
    }

    try {
      setSubmitting(true);
      await registerReceivablePaymentRequest(token, selected.id, {
        amount: paymentAmount,
        payment_method: method,
        notes: notes.trim() || undefined,
      });
      toast("Pagamento registrado com sucesso.", "success");
      const updated = await getReceivableRequest(token, selected.id);
      setSelected(updated);
      await load(page);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Falha ao registrar pagamento.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  function applySearch() {
    setPage(1);
    setQuery(queryInput.trim());
  }

  function handleLogout() {
    clearSession();
    router.replace("/");
  }

  const canRegisterPayment = selected && selected.status !== "CANCELED" && selected.status !== "PAID";

  return (
    <ErpShell activeNav="receber" onLogout={handleLogout} pageTitle="Contas a receber" headerRight={<div />}>
      {loading ? (
        <section className="flex h-full min-h-full w-full items-center justify-center rounded-md border border-[#2a3045] bg-[#161a24] p-6">
          <div className="flex flex-col items-center gap-3">
            <span className="h-10 w-10 animate-spin rounded-full border-2 border-[#2a3045] border-t-[#3b82f6]" />
            <span className="text-sm text-[#94a3b8]">Carregando contas a receber...</span>
          </div>
        </section>
      ) : (
        <div className="space-y-3">
          <div className="erp-page-header">
            <div className="flex items-center gap-3">
              <h1 className="erp-page-title">Contas a Receber</h1>
              <span className="erp-page-subtitle">Titulos originados de faturamentos e vendas a prazo</span>
            </div>
            <button
              className="erp-btn erp-btn-secondary"
              onClick={() => setRefreshKey((v) => v + 1)}
              type="button"
            >
              Atualizar
            </button>
          </div>

          <section className="grid grid-cols-1 gap-2 md:grid-cols-4">
            {[
              { t: "TITULOS", v: String(kpis.totalTitles), s: "Total em carteira", c: "bg-[#3b82f6]", d: "0ms" },
              { t: "EM ABERTO", v: brl(kpis.openBalance), s: "Saldo pendente para recebimento", c: "bg-[#f59e0b]", d: "60ms" },
              { t: "VENCIDOS", v: String(kpis.overdueCount), s: "Titulos em atraso", c: "bg-[#ef4444]", d: "120ms" },
              { t: "RECEBIDO", v: brl(kpis.receivedAmount), s: "Valores baixados", c: "bg-[#22c55e]", d: "180ms" },
            ].map((kpi) => (
              <article
                className={`erp-kpi-card flex min-h-[118px] flex-col items-start justify-between text-left transition-all duration-200 ease-out hover:-translate-y-[1px] hover:border-[#3a4260] hover:shadow-[0_8px_18px_rgba(0,0,0,0.24)] ${kpiReady ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"}`}
                key={kpi.t}
                style={{ transitionDelay: kpi.d }}
              >
                <span className={`erp-kpi-line ${kpi.c}`} />
                <p className="font-mono text-xs font-semibold uppercase tracking-wider text-[#475569]">{kpi.t}</p>
                <h3 className="mt-1.5 font-mono text-3xl font-bold leading-none text-[#e2e8f0]">{kpi.v}</h3>
                <p className="text-[11px] text-[#64748b]">{kpi.s}</p>
              </article>
            ))}
          </section>

          <section className="overflow-hidden rounded-md border border-[#2a3045] bg-[#161a24]">
            <div className="flex flex-wrap items-center gap-2 border-b border-[#2a3045] bg-[#1e2332] px-4 py-2.5">
              <div className="erp-list-search-wrap min-w-[240px]">
                <input
                  className="erp-list-search-input"
                  onChange={(event) => setQueryInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") applySearch();
                  }}
                  placeholder="Buscar titulo, pedido ou cliente..."
                  value={queryInput}
                />
                <button className="erp-list-search-btn" onClick={applySearch} type="button">
                  <span className="material-symbols-outlined !text-[18px]">search</span>
                </button>
              </div>

              <button
                className={`erp-filter-btn ${showFilters ? "erp-filter-btn-on" : "erp-filter-btn-off"}`}
                onClick={() => setShowFilters((s) => !s)}
                type="button"
              >
                <span className="material-symbols-outlined !text-[17px]">filter_alt</span>
                Filtros
              </button>

              <div className="erp-sort-group">
                <span className="erp-sort-label">Ordenar por:</span>
                <select
                  className="erp-list-sort-select"
                  onChange={(event) => {
                    setPage(1);
                    setSortBy(event.target.value as SortBy);
                  }}
                  value={sortBy}
                >
                  <option value="due_asc">Vencimento (proximo)</option>
                  <option value="due_desc">Vencimento (distante)</option>
                  <option value="value_desc">Maior saldo</option>
                  <option value="value_asc">Menor saldo</option>
                  <option value="name_asc">Cliente A-Z</option>
                  <option value="name_desc">Cliente Z-A</option>
                </select>
              </div>
            </div>

            {showFilters ? (
              <div className="grid grid-cols-1 gap-3 border-b border-[#2a3045] bg-[#161a24] px-4 py-3 md:grid-cols-5">
                <label className="grid gap-1 text-[11px] font-mono uppercase tracking-[0.12em] text-[#64748b]">
                  Status
                  <select
                    className="h-8 rounded border border-[#2a3045] bg-[#1e2332] px-3 text-[12px] normal-case text-[#e2e8f0]"
                    onChange={(event) => {
                      setPage(1);
                      setStatus(event.target.value);
                    }}
                    value={status}
                  >
                    <option value="all">Todos</option>
                    <option value="OPEN">Aberto</option>
                    <option value="PARTIAL">Parcial</option>
                    <option value="PAID">Recebido</option>
                    <option value="CANCELED">Cancelado</option>
                  </select>
                </label>

                <label className="grid gap-1 text-[11px] font-mono uppercase tracking-[0.12em] text-[#64748b]">
                  Forma
                  <select
                    className="h-8 rounded border border-[#2a3045] bg-[#1e2332] px-3 text-[12px] normal-case text-[#e2e8f0]"
                    onChange={(event) => setPaymentMethodFilter(event.target.value)}
                    value={paymentMethodFilter}
                  >
                    <option value="all">Todas</option>
                    <option value="PIX">PIX</option>
                    <option value="CASH">Dinheiro</option>
                    <option value="CARD_CREDIT">Cartao credito</option>
                    <option value="CARD_DEBIT">Cartao debito</option>
                    <option value="BOLETO">Boleto</option>
                    <option value="TRANSFER">Transferencia</option>
                  </select>
                </label>

                <label className="grid gap-1 text-[11px] font-mono uppercase tracking-[0.12em] text-[#64748b]">
                  Cliente (ID)
                  <input
                    className="h-8 rounded border border-[#2a3045] bg-[#1e2332] px-3 text-[12px] normal-case text-[#e2e8f0]"
                    onChange={(event) => {
                      setPage(1);
                      setClientIdFilter(event.target.value.replace(/\D/g, ""));
                    }}
                    placeholder="Ex.: 12"
                    value={clientIdFilter}
                  />
                </label>

                <label className="grid gap-1 text-[11px] font-mono uppercase tracking-[0.12em] text-[#64748b]">
                  Pedido (ID)
                  <input
                    className="h-8 rounded border border-[#2a3045] bg-[#1e2332] px-3 text-[12px] normal-case text-[#e2e8f0]"
                    onChange={(event) => {
                      setPage(1);
                      setOrderIdFilter(event.target.value.replace(/\D/g, ""));
                    }}
                    placeholder="Ex.: 304"
                    value={orderIdFilter}
                  />
                </label>

                <div className="flex items-end">
                  <button
                    className="erp-list-action-btn h-8 w-full px-3 text-[12px]"
                    onClick={() => {
                      setStatus("all");
                      setPaymentMethodFilter("all");
                      setClientIdFilter("");
                      setOrderIdFilter("");
                      setQuery("");
                      setQueryInput("");
                      setPage(1);
                    }}
                    type="button"
                  >
                    Limpar filtros
                  </button>
                </div>
              </div>
            ) : null}

            <div className="grid grid-cols-[0.8fr_1fr_2fr_1fr_1fr_1fr_1fr_1fr] border-b border-[#2a3045] bg-[#1e2332] px-4 py-3 font-mono text-[11px] uppercase tracking-[0.14em] text-[#64748b]">
              <span>Titulo</span>
              <span>Pedido</span>
              <span>Cliente</span>
              <span>Parcela</span>
              <span>Vencimento</span>
              <span>Saldo</span>
              <span>Status</span>
              <span className="text-right">Acoes</span>
            </div>

            {visibleItems.length === 0 ? (
              <div className="px-4 py-10 text-center text-[13px] text-[#64748b]">Nenhum titulo encontrado para os filtros atuais.</div>
            ) : (
              visibleItems.map((item) => (
                <div
                  className="grid cursor-pointer grid-cols-[0.8fr_1fr_2fr_1fr_1fr_1fr_1fr_1fr] items-center border-b border-[#2a3045] px-4 py-3 text-left transition hover:bg-[#1e2332]"
                  key={item.id}
                  onClick={() => openDetail(item.id)}
                >
                  <span className="font-mono text-[12px] text-[#3b82f6]">#{item.id}</span>
                  <span className="font-mono text-[12px] text-[#94a3b8]">PED-{String(item.order_id).padStart(6, "0")}</span>
                  <span className="text-[13px] text-[#e2e8f0]">{item.client_name}</span>
                  <span className="font-mono text-[12px] text-[#94a3b8]">
                    {item.installment_no}/{item.installments_total}
                  </span>
                  <span className="font-mono text-[12px] text-[#94a3b8]">{dmy(item.due_date)}</span>
                  <span className="font-mono text-[12px] text-[#e2e8f0]">{brl(item.balance_amount)}</span>
                  <span>
                    <span className={`erp-tag ${statusClass(item.status)}`}>
                      {statusLabel(item.status)}
                    </span>
                  </span>
                  <div className="flex justify-end">
                    <div className="flex gap-2">
                      <button
                        className="erp-list-action-btn"
                        onClick={(event) => {
                          event.stopPropagation();
                          void openDetail(item.id);
                        }}
                        type="button"
                      >
                        Abrir
                      </button>
                      <button
                        className="erp-list-action-btn"
                        disabled={item.status === "PAID" || item.status === "CANCELED"}
                        onClick={(event) => {
                          event.stopPropagation();
                          void openDetail(item.id);
                        }}
                        type="button"
                      >
                        Receber
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}

            <div className="erp-pagination-footer">
              <span>
                Mostrando {(page - 1) * pageSize + (visibleItems.length > 0 ? 1 : 0)}-
                {(page - 1) * pageSize + visibleItems.length} de {totalItems}
              </span>
              <div className="erp-pagination-nav">
                <button
                  className="erp-list-action-btn h-7 px-2 text-[11px] text-[#94a3b8] disabled:opacity-40"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  type="button"
                >
                  Anterior
                </button>
                <span className="text-[11px] text-[#94a3b8]">
                  Pagina {page} de {totalPages}
                </span>
                <button
                  className="erp-list-action-btn h-7 px-2 text-[11px] text-[#94a3b8] disabled:opacity-40"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                  type="button"
                >
                  Proxima
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      {selected ? (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-black/70 p-4">
          <div className="h-[84vh] w-[min(1080px,98vw)] overflow-hidden rounded-md border border-[#2a3045] bg-[#0f1117] shadow-2xl">
            <div className="flex h-full flex-col">
              <div className="flex items-start gap-2 border-b border-[#2a3045] px-5 py-4">
                <div>
                  <h2 className="text-[18px] font-semibold text-[#e2e8f0]">
                    Titulo #{selected.id} - PED-{String(selected.order_id).padStart(6, "0")}
                  </h2>
                  <p className="mt-1 font-mono text-[11px] text-[#64748b]">{selected.client_name}</p>
                </div>
                <div className="ml-auto flex gap-2">
                  <button
                    className="erp-btn erp-btn-secondary"
                    disabled={detailRefreshing}
                    onClick={() => void refreshDetail()}
                    type="button"
                  >
                    {detailRefreshing ? "Atualizando..." : "Atualizar"}
                  </button>
                  <button className="erp-btn erp-btn-secondary" onClick={() => setSelected(null)} type="button">
                    Fechar
                  </button>
                </div>
              </div>

              <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-y-auto p-4 lg:grid-cols-[1.25fr_1fr]">
                <section className="space-y-3">
                  <article className="grid grid-cols-2 gap-3 rounded border border-[#2a3045] bg-[#161a24] p-3 md:grid-cols-4">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#64748b]">Original</p>
                      <p className="mt-1 font-mono text-[20px] font-semibold text-[#e2e8f0]">{brl(selected.original_amount)}</p>
                    </div>
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#64748b]">Pago</p>
                      <p className="mt-1 font-mono text-[20px] font-semibold text-[#22c55e]">{brl(selected.paid_amount)}</p>
                    </div>
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#64748b]">Saldo</p>
                      <p className="mt-1 font-mono text-[20px] font-semibold text-[#fbbf24]">{brl(selected.balance_amount)}</p>
                    </div>
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#64748b]">Vencimento</p>
                      <p className="mt-1 font-mono text-[18px] font-semibold text-[#e2e8f0]">{dmy(selected.due_date)}</p>
                    </div>
                  </article>

                  <article className="rounded border border-[#2a3045] bg-[#161a24]">
                    <div className="border-b border-[#2a3045] bg-[#1e2332] px-3 py-2">
                      <p className="font-semibold text-[#e2e8f0]">Historico de recebimentos</p>
                    </div>
                    <div className="p-3">
                      {selected.payments.length === 0 ? (
                        <p className="text-[12px] text-[#64748b]">Nenhum pagamento registrado.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {selected.payments.map((payment) => (
                            <div className="rounded border border-[#2a3045] bg-[#1e2332] px-3 py-2 text-[12px]" key={payment.id}>
                              <div className="flex items-center gap-2">
                                <p className="font-mono text-[#e2e8f0]">{brl(payment.amount)}</p>
                                <span className="font-mono text-[#64748b]">-</span>
                                <p className="font-mono text-[#93c5fd]">{payment.payment_method}</p>
                                {payment.is_reversed ? (
                                  <span className="ml-auto inline-flex h-5 items-center rounded-[2px] bg-[#7f1d1d] px-2 font-mono text-[10px] text-[#fca5a5]">
                                    Estornado
                                  </span>
                                ) : null}
                              </div>
                              <p className="mt-1 font-mono text-[10px] text-[#64748b]">{dmyhm(payment.payment_date)}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </article>
                </section>

                <section className="rounded border border-[#2a3045] bg-[#161a24]">
                  <div className="border-b border-[#2a3045] bg-[#1e2332] px-3 py-2">
                    <p className="font-semibold text-[#e2e8f0]">Registrar recebimento</p>
                  </div>
                  <form className="grid gap-2 p-3" onSubmit={submitPayment}>
                    <label className="grid gap-1 text-xs text-[#64748b]">
                      Valor
                      <input
                        className="h-9 rounded border border-[#2a3045] bg-[#1e2332] px-3 text-[13px] text-[#e2e8f0]"
                        onChange={(event) => setAmount(event.target.value)}
                        value={amount}
                      />
                    </label>
                    <label className="grid gap-1 text-xs text-[#64748b]">
                      Forma de pagamento
                      <select
                        className="h-9 rounded border border-[#2a3045] bg-[#1e2332] px-3 text-[13px] text-[#e2e8f0]"
                        onChange={(event) => setMethod(event.target.value)}
                        value={method}
                      >
                        <option value="PIX">PIX</option>
                        <option value="CASH">Dinheiro</option>
                        <option value="CARD_CREDIT">Cartao credito</option>
                        <option value="CARD_DEBIT">Cartao debito</option>
                        <option value="BOLETO">Boleto</option>
                        <option value="TRANSFER">Transferencia</option>
                      </select>
                    </label>
                    <label className="grid gap-1 text-xs text-[#64748b]">
                      Observacao
                      <textarea
                        className="h-24 rounded border border-[#2a3045] bg-[#1e2332] px-3 py-2 text-[13px] text-[#e2e8f0]"
                        onChange={(event) => setNotes(event.target.value)}
                        value={notes}
                      />
                    </label>
                    <button
                      className="mt-1 h-9 rounded border border-[#166534] bg-[#14532d] px-3 text-[13px] font-semibold text-[#86efac] hover:border-[#15803d] disabled:opacity-40"
                      disabled={submitting || !canRegisterPayment}
                      type="submit"
                    >
                      {submitting ? "Registrando..." : "Registrar pagamento"}
                    </button>
                  </form>
                </section>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="erp-toast-stack">
        {toasts.map((toastItem) => (
          <div
            className={`erp-toast ${toastItem.type === "success" ? "erp-toast-success" : "erp-toast-error"}`}
            key={toastItem.id}
          >
            {toastItem.message}
          </div>
        ))}
      </div>
    </ErpShell>
  );
}
