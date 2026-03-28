"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DashboardSummary,
  FiscalDocument,
  OrderListItem,
  dashboardSummaryRequest,
  emitOrderFiscalRequest,
  getOrderFiscalRequest,
  invoiceOrderRequest,
  listOrdersRequest,
} from "@/lib/api";
import { clearSession, getAccessToken } from "@/lib/session";
import { ErpShell } from "@/components/ErpShell";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function statusPill(status: string): string {
  const normalized = status.toUpperCase();
  if (normalized.includes("AUTORIZADA") || normalized.includes("AUTHORIZED") || normalized.includes("PAID")) {
    return "bg-[#14532d] text-[#86efac]";
  }
  if (normalized.includes("PENDENTE") || normalized.includes("OPEN") || normalized.includes("PENDING") || normalized.includes("PARTIAL")) {
    return "bg-[#1e3a5f] text-[#93c5fd]";
  }
  if (normalized.includes("CANC")) {
    return "bg-[#3f1f00] text-[#fbbf24]";
  }
  if (normalized.includes("CANCELADA")) {
    return "bg-[#1e2332] text-[#64748b]";
  }
  return "bg-[#7f1d1d] text-[#fca5a5]";
}

function mapFiscalStatus(status: string): string {
  const normalized = status.toUpperCase();
  if (normalized.includes("AUTHORIZED") || normalized.includes("PAID")) return "Autorizada";
  if (normalized.includes("PENDING") || normalized.includes("OPEN") || normalized.includes("PARTIAL")) return "Pendente";
  if (normalized.includes("CANCELLED") || normalized.includes("CANCELED")) return "Cancelada";
  if (normalized.includes("REJECTED") || normalized.includes("ERROR")) return "Erro 999";
  return "Canc. pend.";
}

function parseBrlToNumber(value: string): number {
  const normalized = value.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".").trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

type FiscalRow = {
  id: number;
  orderId: number;
  fiscalId: number | null;
  orderStatus: string;
  numero: string;
  modelo: string;
  serie: string;
  emissao: string;
  destinatario: string;
  doc: string;
  valor: string;
  status: string;
  actions: string[];
};

type EmitItem = {
  id: number;
  code: string;
  description: string;
  ncm: string;
  cfop: string;
  unit: string;
  qty: string;
  unitPrice: string;
};

type FiscalSortBy = "recent" | "numero_asc" | "numero_desc" | "valor_asc" | "valor_desc";
type FiscalStatusFilter = "all" | "autorizada" | "pendente" | "erro" | "cancelada";
type FiscalModelFilter = "all" | "nfe55" | "nfce65";

export default function FiscalPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [fiscalByOrder, setFiscalByOrder] = useState<Record<number, FiscalDocument | null>>({});
  const [kpiReady, setKpiReady] = useState(false);
  const [emitModalOpen, setEmitModalOpen] = useState(false);
  const [toasts, setToasts] = useState<Array<{ id: number; message: string; type: "success" | "error" }>>([]);
  const [manualRows, setManualRows] = useState<FiscalRow[]>([]);
  const [emitForm, setEmitForm] = useState({
    destinatario: "",
    documento: "",
    valor: "",
    modelo: "NF-e 55",
    serie: "001",
  });
  const [emitItems, setEmitItems] = useState<EmitItem[]>([
    {
      id: 1,
      code: "PRD-0042",
      description: "Notebook Lenovo i5",
      ncm: "8471.30.12",
      cfop: "5102",
      unit: "UN",
      qty: "2",
      unitPrice: "3299,00",
    },
  ]);
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<FiscalSortBy>("recent");
  const [statusFilter, setStatusFilter] = useState<FiscalStatusFilter>("all");
  const [modelFilter, setModelFilter] = useState<FiscalModelFilter>("all");
  const [emissaoFilter, setEmissaoFilter] = useState("");

  async function loadOrdersAndFiscal(token: string) {
    const orderResponse = await listOrdersRequest(token, {
      page: 1,
      pageSize: 120,
      sortBy: "id",
      sortDir: "desc",
    });
    const orderItems = orderResponse.items;
    setOrders(orderItems);

    const docs = await Promise.all(
      orderItems.map(async (order) => {
        try {
          const doc = await getOrderFiscalRequest(token, order.id);
          return [order.id, doc] as const;
        } catch {
          return [order.id, null] as const;
        }
      }),
    );
    const map: Record<number, FiscalDocument | null> = {};
    docs.forEach(([orderId, doc]) => {
      map[orderId] = doc;
    });
    setFiscalByOrder(map);
  }

  function pushToast(message: string, type: "success" | "error") {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((current) => [...current, { id, message, type }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 3500);
  }

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace("/");
      return;
    }

    Promise.all([dashboardSummaryRequest(token), loadOrdersAndFiscal(token)])
      .then(([payload]) => {
        setSummary(payload);
        setError("");
      })
      .catch((requestError) => {
        const message =
          requestError instanceof Error ? requestError.message : "Erro ao carregar dashboard.";
        if (message === "unauthorized") {
          clearSession();
          router.replace("/");
          return;
        }
        setError(message);
      })
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    if (loading) return;
    setKpiReady(false);
    const timer = window.setTimeout(() => setKpiReady(true), 80);
    return () => window.clearTimeout(timer);
  }, [loading, orders.length]);

  const totals = useMemo(() => {
    if (!summary) return { emitted: 0, taxes: 0, errors: 0, authorized: 0 };
    const emitted = summary.recent_orders.length;
    const taxes = summary.recent_orders.reduce((acc, item) => acc + item.total_amount * 0.18, 0);
    const errors = summary.kpis.fiscal_rejected ?? 0;
    const authorized = summary.kpis.fiscal_authorized ?? 0;
    return { emitted, taxes, errors, authorized };
  }, [summary]);

  const fiscalRows = useMemo<FiscalRow[]>(() => {
    return orders.flatMap((order) => {
      const fiscal = fiscalByOrder[order.id] ?? null;
      if (!fiscal) {
        return [];
      }

      const model = fiscal.document_type === "NFCE" ? "NFC-e 65" : "NF-e 55";
      const status = mapFiscalStatus(fiscal.status);
      const actions =
        status === "Autorizada"
          ? model === "NF-e 55"
            ? ["XML", "DANFE"]
            : ["XML", "Cupom"]
          : status.startsWith("Erro")
            ? ["Ver log"]
            : ["Consultar"];

      const numero =
        fiscal.number?.trim() && fiscal.number !== "0"
          ? String(fiscal.number).padStart(6, "0")
          : String(fiscal.id).padStart(6, "0");

      return [
        {
          id: fiscal.id,
          orderId: order.id,
          fiscalId: fiscal.id,
          orderStatus: order.status,
          numero,
          modelo: model,
          serie: fiscal.series || "001",
          emissao: new Date(fiscal.issued_at ?? fiscal.created_at).toLocaleDateString("pt-BR"),
          destinatario: order.client_name,
          doc: "--",
          valor: formatCurrency(order.total_amount),
          status,
          actions,
        },
      ];
    });
  }, [orders, fiscalByOrder]);

  const visibleRows = useMemo(() => [...manualRows, ...fiscalRows], [manualRows, fiscalRows]);
  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = visibleRows.filter((row) => {
      if (statusFilter === "autorizada" && !row.status.toLowerCase().includes("autoriz")) return false;
      if (statusFilter === "pendente" && !row.status.toLowerCase().includes("pend")) return false;
      if (statusFilter === "erro" && !row.status.toLowerCase().includes("erro")) return false;
      if (statusFilter === "cancelada" && !row.status.toLowerCase().includes("canc")) return false;

      if (modelFilter === "nfe55" && row.modelo !== "NF-e 55") return false;
      if (modelFilter === "nfce65" && row.modelo !== "NFC-e 65") return false;
      if (emissaoFilter) {
        const [dd, mm, yyyy] = row.emissao.split("/");
        const iso = dd && mm && yyyy ? `${yyyy}-${mm}-${dd}` : "";
        if (iso !== emissaoFilter) return false;
      }

      if (!q) return true;
      return (
        row.numero.toLowerCase().includes(q) ||
        row.destinatario.toLowerCase().includes(q) ||
        row.doc.toLowerCase().includes(q) ||
        row.status.toLowerCase().includes(q)
      );
    });

    const sorted = [...base];
    if (sortBy === "numero_asc") sorted.sort((a, b) => a.numero.localeCompare(b.numero, "pt-BR"));
    else if (sortBy === "numero_desc") sorted.sort((a, b) => b.numero.localeCompare(a.numero, "pt-BR"));
    else if (sortBy === "valor_asc") sorted.sort((a, b) => parseBrlToNumber(a.valor) - parseBrlToNumber(b.valor));
    else if (sortBy === "valor_desc") sorted.sort((a, b) => parseBrlToNumber(b.valor) - parseBrlToNumber(a.valor));
    else sorted.sort((a, b) => b.id - a.id);
    return sorted;
  }, [visibleRows, query, statusFilter, modelFilter, emissaoFilter, sortBy]);
  const pageSize = 8;
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredRows.length);
  const pagedRows = filteredRows.slice(startIndex, endIndex);

  useEffect(() => {
    setPage(1);
  }, [manualRows, fiscalRows, query, sortBy, statusFilter, modelFilter, emissaoFilter]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageItems = useMemo(() => {
    if (totalPages <= 1) return [1];
    const out: Array<number | "..."> = [];
    const push = (value: number | "...") => {
      if (out[out.length - 1] !== value) out.push(value);
    };
    push(1);
    if (currentPage > 3) push("...");
    for (let p = Math.max(2, currentPage - 1); p <= Math.min(totalPages - 1, currentPage + 1); p += 1) push(p);
    if (currentPage < totalPages - 2) push("...");
    if (totalPages > 1) push(totalPages);
    return out;
  }, [currentPage, totalPages]);

  function openEmitModal() {
    setEmitModalOpen(true);
  }

  function closeEmitModal() {
    setEmitModalOpen(false);
  }

  function updateEmitForm(field: keyof typeof emitForm, value: string) {
    setEmitForm((current) => ({ ...current, [field]: value }));
  }

  function parseMoney(input: string): number {
    const normalized = input.replace(/\./g, "").replace(",", ".").trim();
    const value = Number(normalized);
    return Number.isFinite(value) ? value : 0;
  }

  function parseQty(input: string): number {
    const value = Number(input.replace(",", ".").trim());
    return Number.isFinite(value) ? value : 0;
  }

  function updateEmitItem(id: number, field: keyof EmitItem, value: string) {
    setEmitItems((current) =>
      current.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    );
  }

  function addEmitItem() {
    setEmitItems((current) => [
      ...current,
      {
        id: Date.now(),
        code: "",
        description: "",
        ncm: "",
        cfop: "5102",
        unit: "UN",
        qty: "1",
        unitPrice: "0,00",
      },
    ]);
  }

  function removeEmitItem(id: number) {
    setEmitItems((current) => (current.length > 1 ? current.filter((item) => item.id !== id) : current));
  }

  function handleEmitNfeSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const destinatario = emitForm.destinatario.trim();
    const documento = emitForm.documento.trim();
    const manualValue = parseMoney(emitForm.valor);
    const productsValue = emitItems.reduce((acc, item) => acc + parseQty(item.qty) * parseMoney(item.unitPrice), 0);
    const parsedValue = manualValue > 0 ? manualValue : productsValue;

    if (!destinatario) {
      pushToast("Informe o destinatário.", "error");
      return;
    }
    if (!documento) {
      pushToast("Informe o CNPJ/CPF.", "error");
      return;
    }
    if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
      pushToast("Informe um valor válido maior que zero.", "error");
      return;
    }

    const now = new Date();
    const generatedId = Date.now();
    const generatedNumber = String(generatedId).slice(-6).padStart(6, "0");

    setManualRows((current) => [
      {
        id: generatedId,
        orderId: generatedId,
        fiscalId: generatedId,
        orderStatus: "INVOICED",
        numero: generatedNumber,
        modelo: emitForm.modelo,
        serie: emitForm.serie.trim() || "001",
        emissao: now.toLocaleDateString("pt-BR"),
        destinatario,
        doc: documento,
        valor: formatCurrency(parsedValue),
        status: "Pendente",
        actions: ["Consultar", "Reenviar"],
      },
      ...current,
    ]);

    setEmitForm({
      destinatario: "",
      documento: "",
      valor: "",
      modelo: "NF-e 55",
      serie: "001",
    });
    setEmitModalOpen(false);
    pushToast("NF-e adicionada ao monitor com sucesso.", "success");
  }

  async function handleRowAction(row: FiscalRow, action: string) {
    const token = getAccessToken();
    if (!token) {
      clearSession();
      router.replace("/");
      return;
    }

    if (action !== "Emitir fiscal") {
      pushToast(`Ação "${action}" disponível na próxima etapa.`, "success");
      return;
    }

    try {
      if (row.orderStatus !== "INVOICED") {
        await invoiceOrderRequest(token, row.orderId);
      }
      await emitOrderFiscalRequest(token, row.orderId, { series: "001" });
      await loadOrdersAndFiscal(token);
      pushToast(`Venda ${row.numero} emitida no fiscal com sucesso.`, "success");
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Falha ao emitir fiscal.";
      if (message === "unauthorized") {
        clearSession();
        router.replace("/");
        return;
      }
      pushToast(message, "error");
    }
  }

  const emitProductsTotal = useMemo(
    () => emitItems.reduce((acc, item) => acc + parseQty(item.qty) * parseMoney(item.unitPrice), 0),
    [emitItems],
  );
  const firstEmitItem = emitItems[0];
  const firstEmitRowTotal = firstEmitItem
    ? parseQty(firstEmitItem.qty) * parseMoney(firstEmitItem.unitPrice)
    : 0;
  const emitManualTotal = parseMoney(emitForm.valor);
  const emitTotal = emitManualTotal > 0 ? emitManualTotal : emitProductsTotal;

  function handleLogout() {
    clearSession();
    router.replace("/");
  }

  return (
    <ErpShell activeNav="fiscal" onLogout={handleLogout} pageTitle="Modulo Fiscal" headerRight={<div />}>
      {loading ? (
        <section className="flex h-full min-h-full w-full items-center justify-center rounded-md border border-[#2a3045] bg-[#161a24] p-6">
          <div className="flex flex-col items-center gap-3">
            <span className="h-10 w-10 animate-spin rounded-full border-2 border-[#2a3045] border-t-[#3b82f6]" />
            <span className="text-sm text-[#94a3b8]">Carregando painel fiscal...</span>
          </div>
        </section>
      ) : error ? (
        <section className="rounded-md border border-[#7f1d1d] bg-[#2d1518] p-6 text-center text-[#fca5a5]">
          {error}
        </section>
      ) : summary ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#2a3045] px-3 pb-2 mb-3">
            <div className="flex items-center gap-3">
              <h1 className="text-[24px] font-semibold leading-none text-[#e2e8f0]">Módulo Fiscal</h1>
              <span className="text-[12px] text-[#64748b]">Visão geral fiscal e documentos emitidos</span>
            </div>
            <div className="flex items-center gap-2">
              <button className="h-10 rounded border border-[#2a3045] bg-[#1e2332] px-4 text-[13px] font-medium text-[#e2e8f0] transition hover:border-[#3a4260]">
                Importar XML
              </button>
              <button className="h-10 rounded border border-[#2a3045] bg-[#1e2332] px-4 text-[13px] font-medium text-[#e2e8f0] transition hover:border-[#3a4260]">
                Exportar XML
              </button>
              <button
                className="h-10 flex items-center gap-2 rounded border border-[#1d4ed8] bg-[#2563eb] px-5 text-[13px] font-semibold text-white hover:bg-[#1d4ed8]"
                onClick={openEmitModal}
                type="button"
              >
                <span className="material-symbols-outlined">add</span>
                Emitir NF-e
              </button>
            </div>
          </div>

          <section className="grid grid-cols-1 gap-2 md:grid-cols-4">
            {[
              { t: "NOTAS EMITIDAS (MES)", v: totals.emitted.toLocaleString("pt-BR"), s: "+12% em relacao ao mes anterior", c: "bg-[#3b82f6]", x: "0ms" },
              { t: "IMPOSTOS A RECOLHER", v: formatCurrency(totals.taxes), s: "Acompanhamento em tempo real", c: "bg-[#22c55e]", x: "60ms" },
              { t: "ERROS DE TRANSMISSAO", v: String(totals.errors), s: "Acao imediata requerida", c: "bg-[#ef4444]", x: "120ms" },
              { t: "AUTORIZADAS", v: String(totals.authorized), s: "SEFAZ online", c: "bg-[#f59e0b]", x: "180ms" },
            ].map((card) => (
              <article className={`group relative flex min-h-[118px] flex-col items-start justify-between overflow-hidden rounded-md border border-[#2a3045] bg-[#161a24] px-4 py-2.5 text-left transition-all duration-200 ease-out hover:-translate-y-[1px] hover:border-[#3a4260] hover:shadow-[0_8px_18px_rgba(0,0,0,0.24)] ${kpiReady ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"}`} key={card.t} style={{ transitionDelay: card.x }}>
                <div className={`absolute inset-x-0 top-0 h-[2px] ${card.c}`} />
                <p className="font-mono text-xs font-semibold uppercase tracking-wider text-[#475569]">{card.t}</p>
                <h3 className="mt-1.5 font-mono text-3xl font-bold leading-none text-[#e2e8f0]">{card.v}</h3>
                <p className="text-[11px] text-[#64748b]">{card.s}</p>
              </article>
            ))}
          </section>

          <section className="py-1" />

          <section className="rounded-md border border-[#2a3045] bg-[#161a24]">
            <div className="flex flex-wrap items-center gap-2 border-b border-[#2a3045] bg-[#1e2332] px-4 py-2.5">
              <div className="relative min-w-[260px] flex-1">
                <input
                  className="h-9 w-full rounded border border-[#2a3045] bg-[#161a24] px-3 pr-10 text-[13px] text-[#e2e8f0] placeholder:text-[#64748b] outline-none focus:border-[#3b82f6]"
                  onChange={(e) => setQueryInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && setQuery(queryInput.trim())}
                  placeholder="Buscar por numero, destinatario, documento..."
                  value={queryInput}
                />
                <button
                  className="absolute inset-y-0 right-1.5 my-auto inline-flex h-7 w-7 items-center justify-center rounded text-[#64748b] transition hover:text-[#e2e8f0]"
                  onClick={() => setQuery(queryInput.trim())}
                  type="button"
                >
                  <span className="material-symbols-outlined !text-[16px]">search</span>
                </button>
              </div>
              <button
                className="inline-flex h-9 items-center gap-1 rounded border border-[#2a3045] bg-[#cbd5e1] px-3 text-[13px] font-semibold text-[#1f2937] transition hover:bg-[#dbe4ef]"
                onClick={() => setShowFilters((v) => !v)}
                type="button"
              >
                <span className="material-symbols-outlined !text-[16px]">tune</span>
                Filtros
              </button>
              <span className="ml-2 font-mono text-[11px] uppercase tracking-[0.14em] text-[#64748b]">ORDENAR:</span>
              <select className="h-9 rounded border border-[#2a3045] bg-[#161a24] px-3 text-[13px] text-[#e2e8f0]" onChange={(e) => setSortBy(e.target.value as FiscalSortBy)} value={sortBy}>
                <option value="recent">Mais recentes</option>
                <option value="numero_asc">Numero A-Z</option>
                <option value="numero_desc">Numero Z-A</option>
                <option value="valor_asc">Valor menor</option>
                <option value="valor_desc">Valor maior</option>
              </select>
            </div>
            {showFilters ? (
              <div className="space-y-2 px-4 py-2">
                <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
                  <label className="grid gap-1 text-[11px] font-mono uppercase tracking-[0.12em] text-[#64748b]">
                    Status
                    <select className="h-8 rounded border border-[#2a3045] bg-[#1e2332] px-3 text-[12px] normal-case text-[#e2e8f0]" onChange={(e) => setStatusFilter(e.target.value as FiscalStatusFilter)} value={statusFilter}>
                      <option value="all">Todos</option>
                      <option value="autorizada">Autorizada</option>
                      <option value="pendente">Pendente</option>
                      <option value="erro">Erro</option>
                      <option value="cancelada">Cancelada</option>
                    </select>
                  </label>
                  <label className="grid gap-1 text-[11px] font-mono uppercase tracking-[0.12em] text-[#64748b]">
                    Modelo
                    <select className="h-8 rounded border border-[#2a3045] bg-[#1e2332] px-3 text-[12px] normal-case text-[#e2e8f0]" onChange={(e) => setModelFilter(e.target.value as FiscalModelFilter)} value={modelFilter}>
                      <option value="all">Todos</option>
                      <option value="nfe55">NF-e 55</option>
                      <option value="nfce65">NFC-e 65</option>
                    </select>
                  </label>
                  <label className="grid gap-1 text-[11px] font-mono uppercase tracking-[0.12em] text-[#64748b]">
                    Data de emissão
                    <input
                      className="h-8 rounded border border-[#2a3045] bg-[#1e2332] px-3 text-[12px] normal-case text-[#e2e8f0]"
                      onChange={(e) => setEmissaoFilter(e.target.value)}
                      type="date"
                      value={emissaoFilter}
                    />
                  </label>
                  <div className="flex items-end justify-end">
                    <button
                      className="rounded border border-[#2a3045] bg-[#1e2332] px-3 py-1.5 text-[12px] text-[#94a3b8] transition hover:border-[#3a4260] hover:text-[#e2e8f0]"
                      onClick={() => {
                        setStatusFilter("all");
                        setModelFilter("all");
                        setEmissaoFilter("");
                        setQueryInput("");
                        setQuery("");
                      }}
                      type="button"
                    >
                      Limpar filtros
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="flex items-center justify-between border-b border-[#2a3045] px-4 py-3">
              <h2 className="text-[16px] font-semibold text-[#e2e8f0]">Monitor de Documentos Fiscais</h2>
              <span className="flex items-center gap-1 text-xs text-[#94a3b8]">
                <span className="h-2 w-2 rounded-full bg-[#22c55e]" />
                SEFAZ Online
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-[#1e2332]">
                    <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-[0.14em] text-[#64748b]">Numero</th>
                    <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-[0.14em] text-[#64748b]">Modelo</th>
                    <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-[0.14em] text-[#64748b]">Serie</th>
                    <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-[0.14em] text-[#64748b]">Emissao</th>
                    <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-[0.14em] text-[#64748b]">Destinatario</th>
                    <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-[0.14em] text-[#64748b]">CNPJ/CPF</th>
                    <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-[0.14em] text-[#64748b]">Valor</th>
                    <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-[0.14em] text-[#64748b]">Status</th>
                    <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-[0.14em] text-[#64748b]">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedRows.map((order) => (
                    <tr className="border-b border-[#2a3045] transition hover:bg-[#1e2332]" key={order.id}>
                      <td className="px-4 py-3 font-mono text-sm font-semibold text-[#e2e8f0]">{order.numero}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded px-2 py-1 font-mono text-[11px] ${order.modelo === "NF-e 55" ? "bg-[#1e3a5f] text-[#93c5fd]" : "bg-[#14532d] text-[#86efac]"}`}>{order.modelo}</span>
                      </td>
                      <td className="px-4 py-3 font-mono text-sm text-[#e2e8f0]">{order.serie}</td>
                      <td className="px-4 py-3 text-sm text-[#94a3b8]">{order.emissao}</td>
                      <td className="px-4 py-3 text-sm font-medium text-[#e2e8f0]">{order.destinatario}</td>
                      <td className="px-4 py-3 font-mono text-sm text-[#64748b]">{order.doc}</td>
                      <td className="px-4 py-3 font-mono text-sm font-semibold text-[#e2e8f0]">{order.valor}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex h-5 items-center gap-1 rounded-[2px] px-2 font-mono text-[10px] uppercase tracking-[0.08em] ${statusPill(order.status)}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          {order.actions.map((action) => (
                            <button
                              className="rounded border border-[#2a3045] bg-[#161a24] px-2.5 py-1 font-mono text-[11px] text-[#64748b] transition hover:border-[#3a4260] hover:text-[#e2e8f0]"
                              key={`${order.orderId}-${action}`}
                              onClick={() => handleRowAction(order, action)}
                              type="button"
                            >
                              {action}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-[#2a3045] px-4 py-2 font-mono text-[12px] text-[#64748b]">
              <span>{filteredRows.length === 0 ? "Mostrando 0-0" : `Mostrando ${startIndex + 1}-${endIndex}`}</span>
              <div className="flex items-center gap-2">
                <button
                  className="px-1 transition hover:text-[#e2e8f0] disabled:opacity-40 disabled:hover:text-[#64748b]"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  type="button"
                >
                  ←
                </button>
                {pageItems.map((item, index) =>
                  item === "..." ? (
                    <span key={`dots-${index}`} className="px-0.5">...</span>
                  ) : (
                    <button
                      key={item}
                      className={`px-1 transition ${item === currentPage ? "text-[#e2e8f0]" : "hover:text-[#e2e8f0]"}`}
                      onClick={() => setPage(item)}
                      type="button"
                    >
                      {item}
                    </button>
                  ),
                )}
                <button
                  className="px-1 transition hover:text-[#e2e8f0] disabled:opacity-40 disabled:hover:text-[#64748b]"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                  type="button"
                >
                  →
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
      {emitModalOpen ? (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-black/70 p-4">
          <form
            className="flex h-[92vh] w-[min(1040px,98vw)] flex-col overflow-hidden rounded-md border border-[#2a3045] bg-[#0f1117] shadow-2xl"
            onSubmit={handleEmitNfeSubmit}
          >
            <div className="flex items-start gap-2 border-b border-[#2a3045] px-5 py-4">
              <div>
                <h2 className="text-[16px] font-semibold text-[#e2e8f0]">Nova NF-e — Modelo 55</h2>
                <p className="mt-1 font-mono text-xs text-[#64748b]">N° {String(Date.now()).slice(-6)} · Série {emitForm.serie || "001"}</p>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <button className="rounded border border-[#2a3045] bg-[#1e2332] px-4 py-2 text-sm text-[#93c5fd] transition hover:border-[#3a4260]" type="button">
                  Salvar rascunho
                </button>
                <button
                  className="rounded border border-[#7f1d1d] bg-[#7f1d1d] px-4 py-2 text-sm text-[#fca5a5] transition hover:brightness-110"
                  onClick={closeEmitModal}
                  type="button"
                >
                  Cancelar
                </button>
                <button className="rounded border border-[#166534] bg-[#14532d] px-4 py-2 text-sm font-semibold text-[#86efac] transition hover:brightness-110" type="submit">
                  ▶ Transmitir NF-e
                </button>
              </div>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              <section className="overflow-hidden rounded-md border border-[#2a3045] bg-[#161a24]">
                <header className="flex items-center gap-2 border-b border-[#2a3045] bg-[#1e2332] px-4 py-2">
                  <span className="rounded bg-[#1e3a5f] px-1.5 py-0.5 font-mono text-[10px] text-[#93c5fd]">00</span>
                  <h3 className="text-[13px] font-semibold text-[#e2e8f0]">Identificação</h3>
                </header>
                <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-4">
                  <label className="grid gap-1 font-mono text-[11px] uppercase tracking-[0.12em] text-[#64748b]">
                    Modelo
                    <select
                      className="h-10 rounded border border-[#2a3045] bg-[#1e2332] px-3 text-[13px] text-[#e2e8f0] outline-none focus:border-[#3a4260]"
                      onChange={(event) => updateEmitForm("modelo", event.target.value)}
                      value={emitForm.modelo}
                    >
                      <option>NF-e 55</option>
                      <option>NFC-e 65</option>
                    </select>
                  </label>
                  <label className="grid gap-1 font-mono text-[11px] uppercase tracking-[0.12em] text-[#64748b]">
                    Finalidade
                    <select className="h-10 rounded border border-[#2a3045] bg-[#1e2332] px-3 text-[13px] text-[#e2e8f0] outline-none focus:border-[#3a4260]">
                      <option>1 — Normal</option>
                      <option>2 — Complementar</option>
                      <option>4 — Devolução</option>
                    </select>
                  </label>
                  <label className="grid gap-1 font-mono text-[11px] uppercase tracking-[0.12em] text-[#64748b]">
                    Natureza operação
                    <select className="h-10 rounded border border-[#2a3045] bg-[#1e2332] px-3 text-[15px] text-[#e2e8f0] outline-none focus:border-[#3a4260]">
                      <option>Venda de mercadoria</option>
                      <option>Devolução de compra</option>
                    </select>
                  </label>
                  <label className="grid gap-1 font-mono text-[11px] uppercase tracking-[0.12em] text-[#64748b]">
                    Tipo
                    <select className="h-10 rounded border border-[#2a3045] bg-[#1e2332] px-3 text-[15px] text-[#e2e8f0] outline-none focus:border-[#3a4260]">
                      <option>1 — Saída</option>
                      <option>0 — Entrada</option>
                    </select>
                  </label>
                </div>
              </section>

              <section className="overflow-hidden rounded-md border border-[#2a3045] bg-[#161a24]">
                <header className="flex items-center gap-2 border-b border-[#2a3045] bg-[#1e2332] px-4 py-2">
                  <span className="rounded bg-[#1e3a5f] px-1.5 py-0.5 font-mono text-[10px] text-[#93c5fd]">01</span>
                  <h3 className="text-[13px] font-semibold text-[#e2e8f0]">Emitente</h3>
                </header>
                <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-[2fr_1fr_1fr]">
                  <label className="grid gap-1 font-mono text-[11px] uppercase tracking-[0.12em] text-[#64748b]">
                    Razão social
                    <input className="h-10 rounded border border-[#2a3045] bg-[#1e2332] px-3 text-[13px] text-[#94a3b8]" defaultValue="Tech Distribuidora LTDA" readOnly />
                  </label>
                  <label className="grid gap-1 font-mono text-[11px] uppercase tracking-[0.12em] text-[#64748b]">
                    CNPJ
                    <input className="h-10 rounded border border-[#2a3045] bg-[#1e2332] px-3 font-mono text-[13px] text-[#94a3b8]" defaultValue="12.345.678/0001-99" readOnly />
                  </label>
                  <label className="grid gap-1 font-mono text-[11px] uppercase tracking-[0.12em] text-[#64748b]">
                    IE
                    <input className="h-10 rounded border border-[#2a3045] bg-[#1e2332] px-3 font-mono text-[13px] text-[#94a3b8]" defaultValue="111.222.333.444" readOnly />
                  </label>
                </div>
              </section>

              <section className="overflow-hidden rounded-md border border-[#2a3045] bg-[#161a24]">
                <header className="flex items-center gap-2 border-b border-[#2a3045] bg-[#1e2332] px-4 py-2">
                  <span className="rounded bg-[#1e3a5f] px-1.5 py-0.5 font-mono text-[10px] text-[#93c5fd]">02</span>
                  <h3 className="text-[13px] font-semibold text-[#e2e8f0]">Destinatário</h3>
                </header>
                <div className="space-y-3 p-4">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-[100px_1fr_180px_80px]">
                    <label className="grid gap-1 font-mono text-[11px] uppercase tracking-[0.12em] text-[#64748b]">
                      Tipo
                      <select className="h-10 rounded border border-[#2a3045] bg-[#1e2332] px-3 text-[15px] text-[#e2e8f0] outline-none focus:border-[#3a4260]">
                        <option>CNPJ</option>
                        <option>CPF</option>
                      </select>
                    </label>
                    <label className="grid gap-1 font-mono text-[11px] uppercase tracking-[0.12em] text-[#64748b]">
                      CNPJ / CPF
                      <input
                        className="h-10 rounded border border-[#2a3045] bg-[#1e2332] px-3 font-mono text-[13px] text-[#e2e8f0] outline-none focus:border-[#3a4260]"
                        onChange={(event) => updateEmitForm("documento", event.target.value)}
                        placeholder="00.000.000/0001-00"
                        value={emitForm.documento}
                      />
                    </label>
                    <label className="grid gap-1 font-mono text-[11px] uppercase tracking-[0.12em] text-[#64748b]">
                      Indicador IE
                      <select className="h-10 rounded border border-[#2a3045] bg-[#1e2332] px-3 text-[15px] text-[#e2e8f0] outline-none focus:border-[#3a4260]">
                        <option>1 — Contribuinte</option>
                        <option>2 — Isento</option>
                        <option>9 — Não contribuinte</option>
                      </select>
                    </label>
                    <label className="grid gap-1 font-mono text-[11px] uppercase tracking-[0.12em] text-[#64748b]">
                      UF
                      <select className="h-10 rounded border border-[#2a3045] bg-[#1e2332] px-3 text-[15px] text-[#e2e8f0] outline-none focus:border-[#3a4260]">
                        <option>SP</option>
                        <option>RJ</option>
                        <option>MG</option>
                      </select>
                    </label>
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_380px]">
                    <label className="grid gap-1 font-mono text-[11px] uppercase tracking-[0.12em] text-[#64748b]">
                      Razão social / Nome
                      <input
                        className="h-10 rounded border border-[#2a3045] bg-[#1e2332] px-3 text-[15px] text-[#e2e8f0] outline-none focus:border-[#3a4260]"
                        onChange={(event) => updateEmitForm("destinatario", event.target.value)}
                        placeholder="Buscar cliente..."
                        value={emitForm.destinatario}
                      />
                    </label>
                    <label className="grid gap-1 font-mono text-[11px] uppercase tracking-[0.12em] text-[#64748b]">
                      IE / RG
                      <input className="h-10 rounded border border-[#2a3045] bg-[#1e2332] px-3 text-[15px] text-[#e2e8f0] outline-none focus:border-[#3a4260]" placeholder="Inscrição estadual" />
                    </label>
                  </div>
                </div>
              </section>

              <section className="overflow-hidden rounded-md border border-[#2a3045] bg-[#161a24]">
                <header className="flex items-center gap-2 border-b border-[#2a3045] bg-[#1e2332] px-4 py-2">
                  <span className="rounded bg-[#1e3a5f] px-1.5 py-0.5 font-mono text-[10px] text-[#93c5fd]">03</span>
                  <h3 className="text-[13px] font-semibold text-[#e2e8f0]">Produtos</h3>
                </header>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-[#2a3045] bg-[#161a24] text-left font-mono text-[11px] uppercase tracking-[0.12em] text-[#64748b]">
                        <th className="px-3 py-2">#</th>
                        <th className="px-3 py-2">Código</th>
                        <th className="px-3 py-2">Descrição</th>
                        <th className="px-3 py-2">NCM</th>
                        <th className="px-3 py-2">CFOP</th>
                        <th className="px-3 py-2">UN</th>
                        <th className="px-3 py-2">Qtd</th>
                        <th className="px-3 py-2">Vl. Unit.</th>
                        <th className="px-3 py-2">Total</th>
                        <th className="px-3 py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-[#2a3045]">
                        <td className="px-3 py-2 font-mono text-[#64748b]">01</td>
                        <td className="px-3 py-2">
                          <input className="h-9 w-[92px] rounded border border-[#2a3045] bg-[#1e2332] px-2 font-mono text-[13px] text-[#e2e8f0] outline-none focus:border-[#3a4260]" onChange={(event) => firstEmitItem && updateEmitItem(firstEmitItem.id, "code", event.target.value)} value={firstEmitItem?.code ?? ""} />
                        </td>
                        <td className="px-3 py-2">
                          <input className="h-9 w-full rounded border border-[#2a3045] bg-[#1e2332] px-2 text-[13px] text-[#e2e8f0] outline-none focus:border-[#3a4260]" onChange={(event) => firstEmitItem && updateEmitItem(firstEmitItem.id, "description", event.target.value)} value={firstEmitItem?.description ?? ""} />
                        </td>
                        <td className="px-3 py-2"><input className="h-9 w-[120px] rounded border border-[#2a3045] bg-[#1e2332] px-2 font-mono text-[13px] text-[#64748b] outline-none focus:border-[#3a4260]" onChange={(event) => firstEmitItem && updateEmitItem(firstEmitItem.id, "ncm", event.target.value)} value={firstEmitItem?.ncm ?? ""} /></td>
                        <td className="px-3 py-2">
                          <select className="h-9 rounded border border-[#2a3045] bg-[#1e2332] px-2 font-mono text-[13px] text-[#e2e8f0] outline-none focus:border-[#3a4260]" onChange={(event) => firstEmitItem && updateEmitItem(firstEmitItem.id, "cfop", event.target.value)} value={firstEmitItem?.cfop ?? "5102"}>
                            <option>5102</option>
                            <option>6102</option>
                          </select>
                        </td>
                        <td className="px-3 py-2"><select className="h-9 rounded border border-[#2a3045] bg-[#1e2332] px-2 font-mono text-[13px] text-[#e2e8f0] outline-none focus:border-[#3a4260]" onChange={(event) => firstEmitItem && updateEmitItem(firstEmitItem.id, "unit", event.target.value)} value={firstEmitItem?.unit ?? "UN"}><option>UN</option><option>CX</option><option>KG</option></select></td>
                        <td className="px-3 py-2">
                          <input className="h-9 w-14 rounded border border-[#2a3045] bg-[#1e2332] px-2 text-[13px] text-[#e2e8f0] outline-none focus:border-[#3a4260]" onChange={(event) => firstEmitItem && updateEmitItem(firstEmitItem.id, "qty", event.target.value)} value={firstEmitItem?.qty ?? "1"} />
                        </td>
                        <td className="px-3 py-2"><input className="h-9 w-[104px] rounded border border-[#2a3045] bg-[#1e2332] px-2 font-mono text-[13px] text-[#e2e8f0] outline-none focus:border-[#3a4260]" onChange={(event) => firstEmitItem && updateEmitItem(firstEmitItem.id, "unitPrice", event.target.value)} value={firstEmitItem?.unitPrice ?? "0,00"} /></td>
                        <td className="px-3 py-2 font-mono text-[13px] font-semibold text-[#22c55e]">{formatCurrency(firstEmitRowTotal)}</td>
                        <td className="px-3 py-2 text-center text-[#64748b]">✕</td>
                      </tr>
                      {emitItems.slice(1).map((item, idx) => {
                        const rowTotal = parseQty(item.qty) * parseMoney(item.unitPrice);
                        return (
                          <tr className="border-b border-[#2a3045]" key={item.id}>
                            <td className="px-3 py-2 font-mono text-[#64748b]">{String(idx + 2).padStart(2, "0")}</td>
                            <td className="px-3 py-2"><input className="h-9 w-[92px] rounded border border-[#2a3045] bg-[#1e2332] px-2 font-mono text-[13px] text-[#e2e8f0] outline-none focus:border-[#3a4260]" onChange={(event) => updateEmitItem(item.id, "code", event.target.value)} value={item.code} /></td>
                            <td className="px-3 py-2"><input className="h-9 w-full rounded border border-[#2a3045] bg-[#1e2332] px-2 text-[13px] text-[#e2e8f0] outline-none focus:border-[#3a4260]" onChange={(event) => updateEmitItem(item.id, "description", event.target.value)} value={item.description} /></td>
                            <td className="px-3 py-2"><input className="h-9 w-[120px] rounded border border-[#2a3045] bg-[#1e2332] px-2 font-mono text-[13px] text-[#64748b] outline-none focus:border-[#3a4260]" onChange={(event) => updateEmitItem(item.id, "ncm", event.target.value)} value={item.ncm} /></td>
                            <td className="px-3 py-2"><select className="h-9 rounded border border-[#2a3045] bg-[#1e2332] px-2 font-mono text-[13px] text-[#e2e8f0] outline-none focus:border-[#3a4260]" onChange={(event) => updateEmitItem(item.id, "cfop", event.target.value)} value={item.cfop}><option>5102</option><option>6102</option></select></td>
                            <td className="px-3 py-2"><select className="h-9 rounded border border-[#2a3045] bg-[#1e2332] px-2 font-mono text-[13px] text-[#e2e8f0] outline-none focus:border-[#3a4260]" onChange={(event) => updateEmitItem(item.id, "unit", event.target.value)} value={item.unit}><option>UN</option><option>CX</option><option>KG</option></select></td>
                            <td className="px-3 py-2"><input className="h-9 w-14 rounded border border-[#2a3045] bg-[#1e2332] px-2 text-[13px] text-[#e2e8f0] outline-none focus:border-[#3a4260]" onChange={(event) => updateEmitItem(item.id, "qty", event.target.value)} value={item.qty} /></td>
                            <td className="px-3 py-2"><input className="h-9 w-[104px] rounded border border-[#2a3045] bg-[#1e2332] px-2 font-mono text-[13px] text-[#e2e8f0] outline-none focus:border-[#3a4260]" onChange={(event) => updateEmitItem(item.id, "unitPrice", event.target.value)} value={item.unitPrice} /></td>
                            <td className="px-3 py-2 font-mono text-[13px] font-semibold text-[#22c55e]">{formatCurrency(rowTotal)}</td>
                            <td className="px-3 py-2 text-center"><button className="text-[#64748b] transition hover:text-[#e2e8f0]" onClick={() => removeEmitItem(item.id)} type="button">✕</button></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="p-3">
                  <button className="h-10 w-full rounded border border-dashed border-[#3a4260] bg-[#161a24] text-sm text-[#94a3b8] transition hover:border-[#64748b] hover:text-[#e2e8f0]" onClick={addEmitItem} type="button">
                    + Adicionar item
                  </button>
                </div>
              </section>

              <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_280px]">
                <section className="overflow-hidden rounded-md border border-[#2a3045] bg-[#161a24]">
                  <header className="flex items-center gap-2 border-b border-[#2a3045] bg-[#1e2332] px-4 py-2">
                    <span className="rounded bg-[#1e3a5f] px-1.5 py-0.5 font-mono text-[10px] text-[#93c5fd]">04</span>
                    <h3 className="text-[13px] font-semibold text-[#e2e8f0]">Pagamento</h3>
                  </header>
                  <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-[240px_minmax(220px,1fr)_minmax(150px,180px)]">
                    <label className="grid gap-1 font-mono text-[11px] uppercase tracking-[0.12em] text-[#64748b]">
                      Forma
                      <select className="h-10 rounded border border-[#2a3045] bg-[#1e2332] px-3 text-[15px] text-[#e2e8f0] outline-none focus:border-[#3a4260]">
                        <option>01 — Dinheiro</option>
                        <option>03 — Crédito</option>
                        <option>17 — Pix</option>
                      </select>
                    </label>
                    <label className="grid gap-1 font-mono text-[11px] uppercase tracking-[0.12em] text-[#64748b]">
                      Valor
                      <input
                        className="h-10 rounded border border-[#2a3045] bg-[#1e2332] px-3 font-mono text-[15px] text-[#e2e8f0] outline-none focus:border-[#3a4260]"
                        onChange={(event) => updateEmitForm("valor", event.target.value)}
                        placeholder="0,00"
                        value={emitForm.valor}
                      />
                    </label>
                    <div className="flex items-end">
                      <button className="h-10 min-w-[150px] rounded border border-[#2a3045] bg-[#1e2332] px-4 text-sm text-[#94a3b8] transition hover:border-[#3a4260] hover:text-[#e2e8f0]" type="button">
                        + Add forma
                      </button>
                    </div>
                  </div>
                </section>

                <section className="rounded-md border border-[#2a3045] bg-[#161a24] p-4">
                  <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.12em] text-[#64748b]">Totais</p>
                  <div className="space-y-1.5 text-sm text-[#94a3b8]">
                    <div className="flex justify-between"><span>Produtos</span><span className="font-mono text-[#e2e8f0]">{formatCurrency(emitTotal)}</span></div>
                    <div className="flex justify-between"><span>ICMS (12%)</span><span className="font-mono text-[#e2e8f0]">{formatCurrency(emitTotal * 0.12)}</span></div>
                    <div className="flex justify-between"><span>PIS (0,65%)</span><span className="font-mono text-[#e2e8f0]">{formatCurrency(emitTotal * 0.0065)}</span></div>
                    <div className="flex justify-between"><span>COFINS (3%)</span><span className="font-mono text-[#e2e8f0]">{formatCurrency(emitTotal * 0.03)}</span></div>
                  </div>
                  <div className="mt-4 border-t border-[#2a3045] pt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[16px] font-semibold text-[#e2e8f0]">Total NF</span>
                      <span className="font-mono text-[28px] font-bold text-[#22c55e]">{formatCurrency(emitTotal)}</span>
                    </div>
                    <p className="mt-2 text-center font-mono text-xs text-[#64748b]">Rascunho</p>
                  </div>
                </section>
              </div>

            </div>
          </form>
        </div>
      ) : null}
      <div className="pointer-events-none fixed right-5 top-5 z-[95] flex w-[380px] max-w-[calc(100vw-24px)] flex-col gap-2.5">
        {toasts.map((toast) => (
          <div
            className={`pointer-events-auto rounded-md border px-4 py-3 text-[14px] shadow-[0_12px_30px_rgba(0,0,0,0.35)] transition-all duration-300 ${
              toast.type === "success"
                ? "border-[#166534] bg-[#123127] text-[#86efac]"
                : "border-[#7f1d1d] bg-[#2d1518] text-[#fca5a5]"
            }`}
            key={toast.id}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ErpShell>
  );
}
