"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ErpShell } from "@/components/ErpShell";
import { useThemeMode } from "@/components/ThemeProvider";
import { clearSession, getAccessToken, getUserIdentity } from "@/lib/session";
import {
  QuoteListItem,
  QuoteStatus,
  QuoteDetail,
  QuoteHistoryItem,
  OrderHistoryItem,
  ClientApiItem,
  OrderDetail,
  OrderListItem,
  Product,
  approveQuoteRequest,
  cancelQuoteRequest,
  cancelOrderRequest,
  convertQuoteRequest,
  createQuoteRequest,
  getQuoteHistoryRequest,
  getQuoteRequest,
  confirmOrderRequest,
  createOrderRequest,
  updateOrderRequest,
  emitOrderFiscalRequest,
  getOrderRequest,
  getOrderHistoryRequest,
  getOrderFiscalRequest,
  invoiceOrderRequest,
  listClientsRequest,
  listOrdersRequest,
  listQuotesRequest,
  listProductsRequest,
  rejectQuoteRequest,
  updateQuoteRequest,
} from "@/lib/api";

type ListTab = "orders" | "quotes";
type SortBy = "recent" | "amount_desc" | "amount_asc" | "name_asc" | "name_desc";
type OrderStatusFilter = "all" | "open" | "awaiting" | "approved" | "partial" | "invoiced" | "canceled";
type QuoteStatusFilter = "all" | "drafting" | "pending" | "approved" | "rejected" | "converted" | "canceled";
type FiscalFilter = "all" | "with_fiscal" | "without_fiscal";
type CreateMode = "order" | "quote";

type CreateItem = { id: number; productId: string; qty: string };
type DetailAttachment = { id: number; name: string; size: number; createdAt: string };
type SavedFilters = {
  tab: ListTab;
  queryInput: string;
  orderStatusFilter: OrderStatusFilter;
  quoteStatusFilter: QuoteStatusFilter;
  fiscalFilter: FiscalFilter;
  sortBy: SortBy;
  emissionDate: string;
  dateFrom: string;
  dateTo: string;
  clientFilter: string;
  minAmount: string;
  maxAmount: string;
};
const PAGE_SIZE = 8;
const INITIAL_PAGE_SIZE = 80;
const INITIAL_CATALOG_PAGE_SIZE = 120;
const ACTIVE_CLIENTS_QUERY_KEY = ["catalog", "clients", "active"] as const;
const ACTIVE_PRODUCTS_QUERY_KEY = ["catalog", "products", "active"] as const;

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
  const direct = new Date(normalized);
  if (!Number.isNaN(direct.getTime())) return direct.toLocaleDateString("pt-BR");
  const brPattern = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const match = normalized.match(brPattern);
  if (match) {
    const [, dd, mm, yyyy] = match;
    const fromBr = new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
    if (!Number.isNaN(fromBr.getTime())) return fromBr.toLocaleDateString("pt-BR");
  }
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? "--/--/----" : date.toLocaleDateString("pt-BR");
}

function dmyhm(value?: string | null) {
  if (!value) return "--/--/---- --:--";
  const normalized = value.includes(" ") && !value.includes("T") ? value.replace(" ", "T") : value;
  const direct = new Date(normalized);
  if (!Number.isNaN(direct.getTime())) {
    return direct.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  const brPattern = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const match = normalized.match(brPattern);
  if (match) {
    const [, dd, mm, yyyy] = match;
    const fromBr = new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
    if (!Number.isNaN(fromBr.getTime())) {
      return fromBr.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  }
  return "--/--/---- --:--";
}

function isoDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value.includes(" ") && !value.includes("T") ? value.replace(" ", "T") : value);
  if (Number.isNaN(date.getTime())) return "";
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function toNumber(value: string) {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function orderStatusLabel(status: string) {
  const s = status.toUpperCase();
  if (s.includes("CANCEL")) return "Cancelado";
  if (s.includes("INVOICED")) return "Faturado";
  if (s.includes("PARTIAL")) return "Faturado parcial";
  if (s.includes("APPROV")) return "Aprovado";
  if (s.includes("AWAIT") || s.includes("PEND")) return "Aguardando aprovacao";
  return "Em aberto";
}

function orderStatusClass(status: string) {
  const s = status.toUpperCase();
  if (s.includes("INVOICED")) return "bg-[#14532d] text-[#86efac]";
  if (s.includes("APPROV") || s.includes("PARTIAL")) return "bg-[#1e3a5f] text-[#93c5fd]";
  if (s.includes("AWAIT") || s.includes("PEND")) return "bg-[#3f1f00] text-[#fbbf24]";
  if (s.includes("CANCEL")) return "bg-[#7f1d1d] text-[#fca5a5]";
  return "bg-[#1e2332] text-[#94a3b8]";
}

function quoteStatusLabel(status: QuoteStatus) {
  if (status === "DRAFTING") return "Em digitacao";
  if (status === "PENDING") return "Pendente";
  if (status === "APPROVED") return "Aprovado";
  if (status === "REJECTED") return "Reprovado";
  if (status === "CONVERTED") return "Convertido";
  return "Cancelado";
}

function quoteStatusClass(status: QuoteStatus) {
  if (status === "APPROVED" || status === "CONVERTED") return "bg-[#14532d] text-[#86efac]";
  if (status === "PENDING") return "bg-[#1e3a5f] text-[#93c5fd]";
  if (status === "DRAFTING") return "bg-[#3f1f00] text-[#fbbf24]";
  if (status === "REJECTED") return "bg-[#7f1d1d] text-[#fca5a5]";
  return "bg-[#1e2332] text-[#94a3b8]";
}

function canQuoteAction(
  status: QuoteStatus,
  action: "approve" | "reject" | "cancel" | "convert",
  linkedOrderId?: number | null,
) {
  if (action === "approve") return status === "DRAFTING" || status === "PENDING";
  if (action === "reject") return status === "DRAFTING" || status === "PENDING";
  if (action === "cancel") return status !== "CONVERTED" && status !== "CANCELED";
  return status === "APPROVED" && !linkedOrderId;
}

function quoteActionLabel(action?: string) {
  const normalized = (action || "").toUpperCase();
  if (normalized === "CREATED") return "Orcamento criado";
  if (normalized === "UPDATED") return "Orcamento atualizado";
  if (normalized === "APPROVED") return "Aprovacao comercial";
  if (normalized === "REJECTED") return "Reprovacao comercial";
  if (normalized === "CONVERTED") return "Conversao para pedido";
  if (normalized === "CANCELED") return "Cancelamento";
  return "Movimentacao";
}

function parseDateValue(value?: string | null) {
  if (!value) return null;
  const normalized = value.includes(" ") && !value.includes("T") ? value.replace(" ", "T") : value;
  const direct = new Date(normalized);
  if (!Number.isNaN(direct.getTime())) return direct;

  const brPattern = /^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/;
  const match = value.match(brPattern);
  if (match) {
    const [, dd, mm, yyyy, hh = "00", mi = "00", ss = "00"] = match;
    const fromBr = new Date(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh), Number(mi), Number(ss));
    if (!Number.isNaN(fromBr.getTime())) return fromBr;
  }

  return null;
}

function canOrderAction(statusRaw: string, action: "confirm" | "invoice" | "emit" | "cancel", hasFiscal = false) {
  const status = statusRaw.toUpperCase();
  const isCanceled = status.includes("CANCEL");
  const isInvoiced = status.includes("INVOICED");
  const isApproved = status.includes("APPROV");
  const isAwaiting = status.includes("AWAIT") || status.includes("PEND");
  const isOpen = status.includes("OPEN");
  const isPartial = status.includes("PARTIAL");

  if (action === "confirm") return !isCanceled && !isInvoiced && (isOpen || isAwaiting);
  // Regra comercial: faturamento deve ocorrer apenas quando o pedido estiver aprovado ou parcialmente atendido.
  if (action === "invoice") return !isCanceled && !isInvoiced && (isApproved || isPartial);
  // Emissao fiscal apenas apos faturamento (total ou parcial) e sem documento fiscal ja vinculado.
  if (action === "emit") return !isCanceled && !hasFiscal && (isInvoiced || isPartial);
  return !isCanceled && !isInvoiced;
}

export default function SalesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isLight } = useThemeMode();
  const user = getUserIdentity();
  const userKey = user.login?.trim().toLowerCase() || "default";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [kpiReady, setKpiReady] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const [tab, setTab] = useState<ListTab>("orders");
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [quotes, setQuotes] = useState<QuoteListItem[]>([]);
  const [clients, setClients] = useState<ClientApiItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [fiscalByOrder, setFiscalByOrder] = useState<Record<number, { document_type: string; number: string; issued_at: string; created_at: string } | null>>({});
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(false);

  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [orderStatusFilter, setOrderStatusFilter] = useState<OrderStatusFilter>("all");
  const [quoteStatusFilter, setQuoteStatusFilter] = useState<QuoteStatusFilter>("all");
  const [fiscalFilter, setFiscalFilter] = useState<FiscalFilter>("all");
  const [sortBy, setSortBy] = useState<SortBy>("recent");
  const [emissionDate, setEmissionDate] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [clientFilter, setClientFilter] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [page, setPage] = useState(1);

  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [orderHistory, setOrderHistory] = useState<OrderHistoryItem[]>([]);
  const [quoteDetail, setQuoteDetail] = useState<QuoteDetail | null>(null);
  const [quoteHistory, setQuoteHistory] = useState<QuoteHistoryItem[]>([]);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [invoiceModal, setInvoiceModal] = useState<{ orderId: number; emitAfter: boolean } | null>(null);
  const [invoiceTerm, setInvoiceTerm] = useState<"CASH" | "INSTALLMENT">("INSTALLMENT");
  const [invoiceInstallments, setInvoiceInstallments] = useState("1");
  const [invoiceIntervalDays, setInvoiceIntervalDays] = useState("30");
  const [invoiceFirstDueDate, setInvoiceFirstDueDate] = useState("");
  const [invoicePaymentMethod, setInvoicePaymentMethod] = useState("PIX");

  const [createOpen, setCreateOpen] = useState(false);
  const [createMode, setCreateMode] = useState<CreateMode>("order");
  const [createClientId, setCreateClientId] = useState("");
  const [createItems, setCreateItems] = useState<CreateItem[]>([{ id: 1, productId: "", qty: "1" }]);
  const [creating, setCreating] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<number | null>(null);
  const [editingQuoteId, setEditingQuoteId] = useState<number | null>(null);

  const [toasts, setToasts] = useState<Array<{ id: number; message: string; type: "success" | "error" }>>([]);
  const [detailAttachments, setDetailAttachments] = useState<Record<string, DetailAttachment[]>>({});
  const [detailNotes, setDetailNotes] = useState<Record<string, string>>({});
  const [noteDraft, setNoteDraft] = useState("");

  const activeDetailKey = detail
    ? `order:${detail.id}`
    : quoteDetail
      ? `quote:${quoteDetail.id}`
      : "";

  function toast(message: string, type: "success" | "error") {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((s) => [...s, { id, message, type }]);
    window.setTimeout(() => setToasts((s) => s.filter((t) => t.id !== id)), 3500);
  }

  function saveCurrentNote() {
    if (!activeDetailKey) return;
    setDetailNotes((current) => ({ ...current, [activeDetailKey]: noteDraft.trim() }));
    toast("Observacao salva com sucesso.", "success");
  }

  function onAttachmentUpload(files: FileList | null) {
    if (!activeDetailKey || !files || files.length === 0) return;
    const nextItems: DetailAttachment[] = Array.from(files).map((file) => ({
      id: Date.now() + Math.floor(Math.random() * 1000),
      name: file.name,
      size: file.size,
      createdAt: new Date().toISOString(),
    }));
    setDetailAttachments((current) => ({
      ...current,
      [activeDetailKey]: [...(current[activeDetailKey] ?? []), ...nextItems],
    }));
    toast(`${nextItems.length} anexo(s) adicionado(s).`, "success");
  }

  function removeAttachment(attachmentId: number) {
    if (!activeDetailKey) return;
    setDetailAttachments((current) => ({
      ...current,
      [activeDetailKey]: (current[activeDetailKey] ?? []).filter((item) => item.id !== attachmentId),
    }));
  }

  function printCurrentDetail() {
    if (!detail && !quoteDetail) return;
    window.print();
  }

  function openProfessionalReport() {
    const timeline = detail ? orderTimeline : quoteTimeline;
    const isOrder = !!detail;
    const code = detail
      ? `PED-${String(detail.id).padStart(6, "0")}`
      : quoteDetail
        ? quoteDetail.code
        : "";
    const clientName = detail?.client_name || quoteDetail?.client_name || "--";
    const createdAt = dmy(detail?.created_at || quoteDetail?.created_at || "");
    const totalValue = detail?.total_amount ?? quoteDetail?.total_amount ?? 0;
    const items = (detail?.items || quoteDetail?.items || []).map((item) => ({
      line: String(item.line_no).padStart(2, "0"),
      product: item.product_name,
      qty: item.quantity,
      unit: brl(item.unit_price),
      total: brl(item.line_total),
    }));
    const notes = activeDetailKey ? detailNotes[activeDetailKey] || "" : "";
    const attachments = activeDetailKey ? detailAttachments[activeDetailKey] ?? [] : [];

    const reportWindow = window.open("", "_blank", "noopener,noreferrer,width=1200,height=840");
    if (!reportWindow) {
      toast("Nao foi possivel abrir o relatorio.", "error");
      return;
    }

    const html = `
      <!doctype html>
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width,initial-scale=1" />
          <title>Relatorio comercial - ${code}</title>
          <style>
            * { box-sizing: border-box; }
            body { margin: 0; padding: 32px; font-family: "Segoe UI", Arial, sans-serif; color: #0f172a; background: #f8fafc; }
            .header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 20px; }
            .title { margin: 0; font-size: 26px; line-height: 1.1; }
            .subtitle { margin: 8px 0 0; color: #475569; font-size: 13px; }
            .badge { display: inline-flex; align-items: center; border: 1px solid #cbd5e1; background: #fff; padding: 8px 12px; border-radius: 8px; font-size: 12px; color: #334155; }
            .grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 20px; }
            .card { background: #fff; border: 1px solid #dbe2ea; border-radius: 10px; padding: 12px 14px; }
            .label { font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: #64748b; margin-bottom: 6px; }
            .value { font-size: 18px; font-weight: 700; color: #0f172a; }
            .section { background: #fff; border: 1px solid #dbe2ea; border-radius: 10px; margin-bottom: 14px; overflow: hidden; }
            .section h2 { margin: 0; font-size: 14px; padding: 12px 14px; border-bottom: 1px solid #e2e8f0; background: #f8fafc; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 10px 12px; border-bottom: 1px solid #eef2f7; text-align: left; font-size: 13px; }
            th { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; }
            tr:last-child td { border-bottom: 0; }
            .mono { font-family: "Consolas", "Menlo", monospace; }
            .right { text-align: right; }
            .timeline { display: grid; gap: 10px; padding: 12px; }
            .event { border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; background: #fff; }
            .event .t { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; margin-bottom: 6px; }
            .event .n { font-size: 13px; color: #0f172a; margin-bottom: 4px; }
            .event .d { font-size: 12px; color: #475569; }
            .notes { padding: 12px; white-space: pre-wrap; font-size: 13px; color: #0f172a; }
            .muted { color: #64748b; font-size: 12px; }
            .footer { margin-top: 12px; font-size: 11px; color: #64748b; text-align: right; }
            @media print { body { background: #fff; padding: 16px; } .section, .card { break-inside: avoid; } }
          </style>
        </head>
        <body>
          <header class="header">
            <div>
              <h1 class="title">Relatorio ${isOrder ? "de Pedido" : "de Orcamento"} #${code}</h1>
              <p class="subtitle">Cliente: ${clientName} · Emissao: ${createdAt}</p>
            </div>
            <span class="badge">${isOrder ? "Comercial > Pedido" : "Comercial > Orcamento"}</span>
          </header>

          <section class="grid">
            <article class="card"><div class="label">Documento</div><div class="value">${code}</div></article>
            <article class="card"><div class="label">Cliente</div><div class="value" style="font-size:15px;">${clientName}</div></article>
            <article class="card"><div class="label">Itens</div><div class="value">${items.length}</div></article>
            <article class="card"><div class="label">Total</div><div class="value">${brl(totalValue)}</div></article>
          </section>

          <section class="section">
            <h2>Itens</h2>
            <table>
              <thead>
                <tr>
                  <th>#</th><th>Produto</th><th>Qtd</th><th class="right">Unit.</th><th class="right">Total</th>
                </tr>
              </thead>
              <tbody>
                ${items
                  .map(
                    (item) => `
                  <tr>
                    <td class="mono">${item.line}</td>
                    <td>${item.product}</td>
                    <td class="mono">${item.qty}</td>
                    <td class="mono right">${item.unit}</td>
                    <td class="mono right">${item.total}</td>
                  </tr>`,
                  )
                  .join("")}
              </tbody>
            </table>
          </section>

          <section class="section">
            <h2>Timeline comercial</h2>
            <div class="timeline">
              ${timeline
                .map(
                  (row) => `
                <div class="event">
                  <div class="t">${row.label}</div>
                  <div class="n">${row.note}</div>
                  <div class="d">${dmyhm(row.value)}</div>
                </div>`,
                )
                .join("")}
            </div>
          </section>

          <section class="section">
            <h2>Anexos e observacoes</h2>
            <div class="notes">
              <div><strong>Anexos:</strong> ${
                attachments.length
                  ? attachments.map((item) => `${item.name} (${Math.max(1, Math.round(item.size / 1024))} KB)`).join(", ")
                  : "Sem anexos"
              }</div>
              <div style="margin-top:10px;"><strong>Observacoes:</strong></div>
              <div class="muted" style="margin-top:6px;">${notes || "Sem observacoes registradas."}</div>
            </div>
          </section>

          <div class="footer">Gerado em ${new Date().toLocaleString("pt-BR")}</div>
        </body>
      </html>
    `;

    reportWindow.document.open();
    reportWindow.document.write(html);
    reportWindow.document.close();
    reportWindow.focus();
  }

  async function loadCatalogData(token: string, force = false) {
    if (!force && (catalogLoading || catalogLoaded)) return;
    setCatalogLoading(true);
    try {
      const [clientResponse, productResponse] = await Promise.all([
        queryClient.fetchQuery({
          queryKey: [...ACTIVE_CLIENTS_QUERY_KEY, token],
          queryFn: () =>
            listClientsRequest(token, {
              page: 1,
              pageSize: INITIAL_CATALOG_PAGE_SIZE,
              sortBy: "name",
              sortDir: "asc",
              isActive: "true",
            }),
          staleTime: 90_000,
        }),
        queryClient.fetchQuery({
          queryKey: [...ACTIVE_PRODUCTS_QUERY_KEY, token],
          queryFn: () =>
            listProductsRequest(token, {
              page: 1,
              pageSize: INITIAL_CATALOG_PAGE_SIZE,
              sortBy: "name",
              sortDir: "asc",
              isActive: "true",
            }),
          staleTime: 90_000,
        }),
      ]);
      setClients(clientResponse.items);
      setProducts(productResponse.items);
      setCatalogLoaded(true);
    } finally {
      setCatalogLoading(false);
    }
  }

  async function loadData(token: string) {
    const [orderResponse, quoteResponse] = await Promise.all([
      listOrdersRequest(token, { page: 1, pageSize: INITIAL_PAGE_SIZE, sortBy: "id", sortDir: "desc" }),
      listQuotesRequest(token, { page: 1, pageSize: INITIAL_PAGE_SIZE, sortBy: "id", sortDir: "desc" }),
    ]);
    setOrders(orderResponse.items);
    setQuotes(quoteResponse.items);
    setFiscalByOrder({});

    // Segunda fase: carregar catálogos sem bloquear a abertura da tela.
    void loadCatalogData(token, false).catch((requestError) => {
      const message = requestError instanceof Error ? requestError.message : "Falha ao carregar catálogos.";
      if (message !== "unauthorized") {
        toast("Catálogos em carregamento parcial. A tela segue disponível.", "error");
      }
    });
  }

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace("/");
      return;
    }

    let cancel = false;
    setLoading(true);
    setError("");

    loadData(token)
      .catch((requestError) => {
        const message = requestError instanceof Error ? requestError.message : "Falha ao carregar vendas.";
        if (message === "unauthorized") {
          clearSession();
          router.replace("/");
          return;
        }
        if (!cancel) {
          setError(message);
          toast(message, "error");
        }
      })
      .finally(() => {
        if (!cancel) setLoading(false);
      });

    return () => {
      cancel = true;
    };
  }, [router, reload, queryClient]);

  useEffect(() => {
    if (loading) return;
    setKpiReady(false);
    const timer = window.setTimeout(() => setKpiReady(true), 80);
    return () => window.clearTimeout(timer);
  }, [loading, orders.length, quotes.length, tab]);

  useEffect(() => {
    const storage = getSafeStorage();
    if (!storage) return;
    try {
      const raw = storage.getItem(`erp_sales_filters_${userKey}`);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<SavedFilters>;
      if (parsed.tab === "orders" || parsed.tab === "quotes") setTab(parsed.tab);
      if (typeof parsed.queryInput === "string") {
        setQueryInput(parsed.queryInput);
        setQuery(parsed.queryInput.trim());
      }
      if (parsed.orderStatusFilter) setOrderStatusFilter(parsed.orderStatusFilter);
      if (parsed.quoteStatusFilter) setQuoteStatusFilter(parsed.quoteStatusFilter);
      if (parsed.fiscalFilter) setFiscalFilter(parsed.fiscalFilter);
      if (parsed.sortBy) setSortBy(parsed.sortBy);
      if (typeof parsed.emissionDate === "string") setEmissionDate(parsed.emissionDate);
      if (typeof parsed.dateFrom === "string") setDateFrom(parsed.dateFrom);
      if (typeof parsed.dateTo === "string") setDateTo(parsed.dateTo);
      if (typeof parsed.clientFilter === "string") setClientFilter(parsed.clientFilter);
      if (typeof parsed.minAmount === "string") setMinAmount(parsed.minAmount);
      if (typeof parsed.maxAmount === "string") setMaxAmount(parsed.maxAmount);
    } catch {
      // ignore invalid local storage payload
    }
  }, [userKey]);

  useEffect(() => {
    const storage = getSafeStorage();
    if (!storage) return;
    const payload: SavedFilters = {
      tab,
      queryInput,
      orderStatusFilter,
      quoteStatusFilter,
      fiscalFilter,
      sortBy,
      emissionDate,
      dateFrom,
      dateTo,
      clientFilter,
      minAmount,
      maxAmount,
    };
    storage.setItem(`erp_sales_filters_${userKey}`, JSON.stringify(payload));
  }, [
    userKey,
    tab,
    queryInput,
    orderStatusFilter,
    quoteStatusFilter,
    fiscalFilter,
    sortBy,
    emissionDate,
    dateFrom,
    dateTo,
    clientFilter,
    minAmount,
    maxAmount,
  ]);

  useEffect(() => {
    const storage = getSafeStorage();
    if (!storage) return;
    try {
      const raw = storage.getItem(`erp_sales_detail_meta_${userKey}`);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        attachments?: Record<string, DetailAttachment[]>;
        notes?: Record<string, string>;
      };
      setDetailAttachments(parsed.attachments ?? {});
      setDetailNotes(parsed.notes ?? {});
    } catch {
      // ignore invalid local storage payload
    }
  }, [userKey]);

  useEffect(() => {
    const storage = getSafeStorage();
    if (!storage) return;
    storage.setItem(
      `erp_sales_detail_meta_${userKey}`,
      JSON.stringify({
        attachments: detailAttachments,
        notes: detailNotes,
      }),
    );
  }, [userKey, detailAttachments, detailNotes]);

  useEffect(() => {
    if (!activeDetailKey) {
      setNoteDraft("");
      return;
    }
    setNoteDraft(detailNotes[activeDetailKey] ?? "");
  }, [activeDetailKey, detailNotes]);

  const filteredOrders = useMemo(() => {
    const q = query.toLowerCase();
    const min = toNumber(minAmount);
    const max = toNumber(maxAmount);
    const hasMin = minAmount.trim().length > 0;
    const hasMax = maxAmount.trim().length > 0;
    const fromDate = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null;
    const toDateValue = dateTo ? new Date(`${dateTo}T23:59:59`) : null;
    const base = orders.filter((order) => {
      const status = order.status.toUpperCase();
      const hasFiscal = Object.prototype.hasOwnProperty.call(fiscalByOrder, order.id)
        ? !!fiscalByOrder[order.id]
        : Boolean(order.invoice_number);
      const orderDate = parseDateValue(order.created_at);

      if (orderStatusFilter === "open" && !status.includes("OPEN")) return false;
      if (orderStatusFilter === "awaiting" && !(status.includes("AWAIT") || status.includes("PEND"))) return false;
      if (orderStatusFilter === "approved" && !status.includes("APPROV")) return false;
      if (orderStatusFilter === "partial" && !status.includes("PARTIAL")) return false;
      if (orderStatusFilter === "invoiced" && !status.includes("INVOICED")) return false;
      if (orderStatusFilter === "canceled" && !status.includes("CANCEL")) return false;
      if (clientFilter && String(order.client_id) !== clientFilter) return false;
      if (hasMin && order.total_amount < min) return false;
      if (hasMax && order.total_amount > max) return false;

      if (fiscalFilter === "with_fiscal" && !hasFiscal) return false;
      if (fiscalFilter === "without_fiscal" && hasFiscal) return false;

      if (emissionDate && isoDate(order.created_at) !== emissionDate) return false;
      if (fromDate && (!orderDate || orderDate < fromDate)) return false;
      if (toDateValue && (!orderDate || orderDate > toDateValue)) return false;
      if (!q) return true;
      return (
        String(order.id).includes(q) ||
        (order.client_name || "").toLowerCase().includes(q) ||
        orderStatusLabel(order.status).toLowerCase().includes(q)
      );
    });

    const sorted = [...base];
    if (sortBy === "amount_desc") sorted.sort((a, b) => b.total_amount - a.total_amount);
    else if (sortBy === "amount_asc") sorted.sort((a, b) => a.total_amount - b.total_amount);
    else if (sortBy === "name_asc") sorted.sort((a, b) => a.client_name.localeCompare(b.client_name, "pt-BR"));
    else if (sortBy === "name_desc") sorted.sort((a, b) => b.client_name.localeCompare(a.client_name, "pt-BR"));
    else sorted.sort((a, b) => b.id - a.id);
    return sorted;
  }, [
    orders,
    query,
    orderStatusFilter,
    fiscalFilter,
    emissionDate,
    sortBy,
    fiscalByOrder,
    clientFilter,
    minAmount,
    maxAmount,
    dateFrom,
    dateTo,
  ]);

  const filteredQuotes = useMemo(() => {
    const q = query.toLowerCase();
    const min = toNumber(minAmount);
    const max = toNumber(maxAmount);
    const hasMin = minAmount.trim().length > 0;
    const hasMax = maxAmount.trim().length > 0;
    const fromDate = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null;
    const toDateValue = dateTo ? new Date(`${dateTo}T23:59:59`) : null;
    const base = quotes.filter((quote) => {
      const quoteDate = parseDateValue(quote.created_at);
      if (quoteStatusFilter === "drafting" && quote.status !== "DRAFTING") return false;
      if (quoteStatusFilter === "pending" && quote.status !== "PENDING") return false;
      if (quoteStatusFilter === "approved" && quote.status !== "APPROVED") return false;
      if (quoteStatusFilter === "rejected" && quote.status !== "REJECTED") return false;
      if (quoteStatusFilter === "converted" && quote.status !== "CONVERTED") return false;
      if (quoteStatusFilter === "canceled" && quote.status !== "CANCELED") return false;
      if (clientFilter && String(quote.client_id) !== clientFilter) return false;
      if (hasMin && quote.total_amount < min) return false;
      if (hasMax && quote.total_amount > max) return false;
      if (emissionDate && isoDate(quote.created_at) !== emissionDate) return false;
      if (fromDate && (!quoteDate || quoteDate < fromDate)) return false;
      if (toDateValue && (!quoteDate || quoteDate > toDateValue)) return false;
      if (!q) return true;
      return (
        quote.code.toLowerCase().includes(q) ||
        quote.client_name.toLowerCase().includes(q) ||
        quoteStatusLabel(quote.status).toLowerCase().includes(q)
      );
    });

    const sorted = [...base];
    if (sortBy === "amount_desc") sorted.sort((a, b) => b.total_amount - a.total_amount);
    else if (sortBy === "amount_asc") sorted.sort((a, b) => a.total_amount - b.total_amount);
    else if (sortBy === "name_asc") sorted.sort((a, b) => a.client_name.localeCompare(b.client_name, "pt-BR"));
    else if (sortBy === "name_desc") sorted.sort((a, b) => b.client_name.localeCompare(a.client_name, "pt-BR"));
    else sorted.sort((a, b) => b.id - a.id);
    return sorted;
  }, [quotes, query, quoteStatusFilter, emissionDate, sortBy, clientFilter, minAmount, maxAmount, dateFrom, dateTo]);

  const list = tab === "orders" ? filteredOrders : filteredQuotes;
  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, list.length);
  const rows = list.slice(startIndex, endIndex);

  useEffect(() => {
    setPage(1);
  }, [
    tab,
    query,
    orderStatusFilter,
    quoteStatusFilter,
    fiscalFilter,
    emissionDate,
    sortBy,
    orders.length,
    quotes.length,
    clientFilter,
    minAmount,
    maxAmount,
    dateFrom,
    dateTo,
  ]);

  useEffect(() => {
    if (tab !== "orders") return;
    const token = getAccessToken();
    if (!token) return;
    const currentRows = rows as OrderListItem[];
    const missingIds = currentRows
      .map((order) => order.id)
      .filter((id) => !Object.prototype.hasOwnProperty.call(fiscalByOrder, id));
    if (missingIds.length === 0) return;

    let canceled = false;
    Promise.all(
      missingIds.map(async (id) => {
        try {
          const doc = await getOrderFiscalRequest(token, id);
          const safeDoc = doc as NonNullable<typeof doc>;
          return [
            id,
            {
              document_type: safeDoc.document_type,
              number: safeDoc.number || "",
              issued_at: safeDoc.issued_at || "",
              created_at: safeDoc.created_at || "",
            },
          ] as const;
        } catch {
          return [id, null] as const;
        }
      }),
    ).then((entries) => {
      if (canceled) return;
      setFiscalByOrder((current) => {
        const next = { ...current };
        entries.forEach(([id, doc]) => {
          next[id] = doc;
        });
        return next;
      });
    });

    return () => {
      canceled = true;
    };
  }, [tab, rows, fiscalByOrder]);

  const orderKpi = useMemo(() => {
    const total = orders.length;
    const open = orders.filter((o) => o.status.toUpperCase().includes("OPEN")).length;
    const invoiced = orders.filter((o) => o.status.toUpperCase().includes("INVOICED")).length;
    const revenue = orders
      .filter((o) => o.status.toUpperCase().includes("INVOICED"))
      .reduce((acc, item) => acc + item.total_amount, 0);
    return { total, open, invoiced, revenue };
  }, [orders]);

  const quoteKpi = useMemo(() => {
    const total = quotes.length;
    const pending = quotes.filter((q) => q.status === "PENDING").length;
    const approved = quotes.filter((q) => q.status === "APPROVED").length;
    const conversionRate = total > 0 ? (quotes.filter((q) => q.status === "CONVERTED").length / total) * 100 : 0;
    return { total, pending, approved, conversionRate };
  }, [quotes]);

  const currentOrderListItem = useMemo(
    () => (detail ? orders.find((item) => item.id === detail.id) ?? null : null),
    [orders, detail],
  );

  const currentQuoteListItem = useMemo(
    () => (quoteDetail ? quotes.find((item) => item.id === quoteDetail.id) ?? null : null),
    [quotes, quoteDetail],
  );

  const currentOrderStatus = (currentOrderListItem?.status || "").toUpperCase();
  const currentOrderHasFiscal = detail
    ? (Object.prototype.hasOwnProperty.call(fiscalByOrder, detail.id)
        ? !!fiscalByOrder[detail.id]
        : Boolean(currentOrderListItem?.invoice_number))
    : false;

  const orderTimeline = useMemo(() => {
    if (!detail) return [];
    const fromHistory = orderHistory
      .filter((item) => parseDateValue(item.changed_at))
      .map((item) => ({
        label: item.action === "CREATED"
          ? "Pedido criado"
          : item.action === "CONFIRMED"
            ? "Aprovacao comercial"
            : item.action === "INVOICED"
              ? "Faturamento"
              : item.action === "CANCELED"
                ? "Cancelamento"
                : "Movimentacao",
        value: item.changed_at,
        note: item.note?.trim()
          ? item.note
          : `${item.old_status ? `${orderStatusLabel(item.old_status)} -> ` : ""}${orderStatusLabel(item.new_status)}${item.changed_by_name ? ` por ${item.changed_by_name}` : ""}`,
      }));
    if (fromHistory.length > 0) {
      return [...fromHistory].sort((a, b) => {
        const da = parseDateValue(a.value);
        const db = parseDateValue(b.value);
        return (db?.getTime() || 0) - (da?.getTime() || 0);
      });
    }

    const fiscal = fiscalByOrder[detail.id];
    const fromDetail = detail as unknown as {
      confirmed_at?: string;
      invoiced_at?: string;
      canceled_at?: string;
      invoice_number?: string;
    };
    const events = [
      {
        label: "Pedido criado",
        value: detail.created_at || currentOrderListItem?.created_at || "",
        note: "Registro inicial do pedido",
      },
      {
        label: "Aprovacao comercial",
        value: fromDetail.confirmed_at || currentOrderListItem?.confirmed_at || "",
        note: "Liberacao para faturamento",
      },
      {
        label: "Faturamento",
        value: fromDetail.invoiced_at || currentOrderListItem?.invoiced_at || "",
        note: currentOrderListItem?.invoice_number || fromDetail.invoice_number || `PED-${String(detail.id).padStart(6, "0")}`,
      },
      {
        label: "Documento fiscal",
        value: fiscal?.issued_at || fiscal?.created_at || "",
        note: fiscal ? `${fiscal.document_type} ${fiscal.number || ""}`.trim() : "",
      },
      {
        label: "Cancelamento",
        value: fromDetail.canceled_at || currentOrderListItem?.canceled_at || "",
        note: "Pedido cancelado",
      },
    ];
    return events
      .filter((event) => parseDateValue(event.value))
      .sort((a, b) => {
        const da = parseDateValue(a.value);
        const db = parseDateValue(b.value);
        return (db?.getTime() || 0) - (da?.getTime() || 0);
      });
  }, [detail, currentOrderListItem, fiscalByOrder, orderHistory]);

  const quoteTimeline = useMemo(() => {
    if (!quoteDetail) return [];
    const fromHistory = quoteHistory
      .filter((item) => parseDateValue(item.changed_at))
      .map((item) => ({
      label: quoteActionLabel(item.action),
      value: item.changed_at,
      note: item.note?.trim()
        ? item.note
        : `${item.old_status ? `${quoteStatusLabel(item.old_status)} -> ` : ""}${quoteStatusLabel(item.new_status)}${item.changed_by_name ? ` por ${item.changed_by_name}` : ""}`,
      }));
    if (fromHistory.length > 0) {
      return [...fromHistory].sort((a, b) => {
        const da = parseDateValue(a.value);
        const db = parseDateValue(b.value);
        return (db?.getTime() || 0) - (da?.getTime() || 0);
      });
    }
    const createdOnly = [
      { label: "Orcamento criado", value: quoteDetail.created_at, note: "Documento em construcao" },
    ];
    return createdOnly
      .filter((event) => parseDateValue(event.value))
      .sort((a, b) => {
        const da = parseDateValue(a.value);
        const db = parseDateValue(b.value);
        return (db?.getTime() || 0) - (da?.getTime() || 0);
      });
  }, [quoteDetail, quoteHistory]);

  const createClientName = useMemo(() => {
    const selectedId = Number(createClientId);
    if (!Number.isFinite(selectedId) || selectedId <= 0) return "Selecione um cliente";
    return clients.find((client) => client.id === selectedId)?.name || "Cliente selecionado";
  }, [clients, createClientId]);

  const createItemsPreview = useMemo(
    () =>
      createItems.map((item) => {
        const selectedId = Number(item.productId);
        const product = products.find((candidate) => candidate.id === selectedId) || null;
        const qty = Math.max(0, toNumber(item.qty));
        const unitPrice = product?.unit_price || 0;
        return {
          id: item.id,
          product,
          qty,
          unitPrice,
          lineTotal: qty * unitPrice,
        };
      }),
    [createItems, products],
  );

  const createSubtotal = useMemo(
    () => createItemsPreview.reduce((acc, item) => acc + item.lineTotal, 0),
    [createItemsPreview],
  );

  const createValidItemsCount = useMemo(
    () => createItemsPreview.filter((item) => item.product && item.qty > 0).length,
    [createItemsPreview],
  );

  const currentAttachments = activeDetailKey ? detailAttachments[activeDetailKey] ?? [] : [];

  function normalizeQuoteHistory(payload: unknown): QuoteHistoryItem[] {
    if (Array.isArray(payload)) return payload as QuoteHistoryItem[];
    if (
      payload &&
      typeof payload === "object" &&
      "items" in payload &&
      Array.isArray((payload as { items?: unknown }).items)
    ) {
      return (payload as { items: QuoteHistoryItem[] }).items;
    }
    return [];
  }

  function normalizeOrderHistory(payload: unknown): OrderHistoryItem[] {
    if (Array.isArray(payload)) return payload as OrderHistoryItem[];
    if (
      payload &&
      typeof payload === "object" &&
      "items" in payload &&
      Array.isArray((payload as { items?: unknown }).items)
    ) {
      return (payload as { items: OrderHistoryItem[] }).items;
    }
    return [];
  }

  async function refreshData(successMessage?: string) {
    const token = getAccessToken();
    if (!token) {
      clearSession();
      router.replace("/");
      return;
    }
    await loadData(token);
    if (successMessage) toast(successMessage, "success");
  }

  async function openCreate(mode: CreateMode) {
    setCreateMode(mode);
    setEditingOrderId(null);
    setEditingQuoteId(null);
    setCreateClientId("");
    setCreateItems([{ id: 1, productId: "", qty: "1" }]);
    setCreateOpen(true);
    if (clients.length === 0 || products.length === 0) {
      const token = getAccessToken();
      if (token) {
        try {
          await loadCatalogData(token, true);
        } catch {
          // O modal abre mesmo com catálogo parcial; usuário pode atualizar em seguida.
        }
      }
    }
  }

  function addCreateItem() {
    setCreateItems((current) => [...current, { id: Date.now(), productId: "", qty: "1" }]);
  }

  function removeCreateItem(id: number) {
    setCreateItems((current) => (current.length > 1 ? current.filter((item) => item.id !== id) : current));
  }

  function updateCreateItem(id: number, field: "productId" | "qty", value: string) {
    setCreateItems((current) => current.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  }

  function buildPayloadItems() {
    return createItems
      .map((item) => ({ product_id: Number(item.productId), quantity: toNumber(item.qty) }))
      .filter((item) => Number.isFinite(item.product_id) && item.product_id > 0 && item.quantity > 0);
  }

  async function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (creating) return;
    const token = getAccessToken();
    if (!token) return;
    if (!createClientId) {
      toast("Selecione um cliente.", "error");
      return;
    }
    const payloadItems = buildPayloadItems();
    if (payloadItems.length === 0) {
      toast("Adicione pelo menos um item valido.", "error");
      return;
    }

    try {
      setCreating(true);
      if (createMode === "order") {
        if (editingOrderId) {
          await updateOrderRequest(token, editingOrderId, {
            client_id: Number(createClientId),
            items: payloadItems,
          });
          toast(`Venda #${editingOrderId} atualizada com sucesso.`, "success");
        } else {
          const created = await createOrderRequest(token, { client_id: Number(createClientId), items: payloadItems });
          toast(`Venda #${created.id} criada com sucesso.`, "success");
        }
        setReload((value) => value + 1);
      } else {
        if (editingQuoteId) {
          await updateQuoteRequest(token, editingQuoteId, {
            client_id: Number(createClientId),
            items: payloadItems,
          });
          toast(`Orcamento #${editingQuoteId} atualizado com sucesso.`, "success");
        } else {
          const created = await createQuoteRequest(token, { client_id: Number(createClientId), items: payloadItems });
          toast(`Orcamento #${created.id} criado com sucesso.`, "success");
        }
        setReload((value) => value + 1);
      }

      setCreateOpen(false);
      setEditingOrderId(null);
      setEditingQuoteId(null);
      setCreateClientId("");
      setCreateItems([{ id: 1, productId: "", qty: "1" }]);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Falha ao criar registro comercial.";
      toast(message, "error");
    } finally {
      setCreating(false);
    }
  }

  async function openDetail(orderId: number) {
    const token = getAccessToken();
    if (!token) return;
    try {
      setBusyId(orderId);
      const [payload, historyPayload] = await Promise.all([
        getOrderRequest(token, orderId),
        getOrderHistoryRequest(token, orderId),
      ]);
      setDetail(payload);
      setOrderHistory(normalizeOrderHistory(historyPayload));
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Falha ao abrir pedido.";
      toast(message, "error");
    } finally {
      setBusyId(null);
    }
  }

  function openInvoiceModal(orderId: number, emitAfter: boolean) {
    const today = new Date();
    const base = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 30);
    const yyyy = base.getFullYear();
    const mm = String(base.getMonth() + 1).padStart(2, "0");
    const dd = String(base.getDate()).padStart(2, "0");
    setInvoiceTerm("INSTALLMENT");
    setInvoiceInstallments("1");
    setInvoiceIntervalDays("30");
    setInvoiceFirstDueDate(`${yyyy}-${mm}-${dd}`);
    setInvoicePaymentMethod("PIX");
    setInvoiceModal({ orderId, emitAfter });
  }

  async function submitInvoiceModal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!invoiceModal) return;
    const token = getAccessToken();
    if (!token) return;

    const installments = Math.max(1, Math.floor(Number(invoiceInstallments) || 1));
    const intervalDays = Math.max(1, Math.floor(Number(invoiceIntervalDays) || 30));
    const payload = {
      invoice_number: `PED-${String(invoiceModal.orderId).padStart(6, "0")}`,
      payment_term: invoiceTerm,
      installments: invoiceTerm === "CASH" ? 1 : installments,
      interval_days: invoiceTerm === "CASH" ? 0 : intervalDays,
      first_due_date: invoiceTerm === "CASH" ? "" : invoiceFirstDueDate,
      payment_method: invoicePaymentMethod,
    } as const;

    try {
      setBusyId(invoiceModal.orderId);
      await invoiceOrderRequest(token, invoiceModal.orderId, payload);
      if (invoiceModal.emitAfter) {
        await emitOrderFiscalRequest(token, invoiceModal.orderId, { series: "001" });
      }
      await refreshData();
      if (detail?.id === invoiceModal.orderId) {
        const [orderPayload, historyPayload] = await Promise.all([
          getOrderRequest(token, invoiceModal.orderId),
          getOrderHistoryRequest(token, invoiceModal.orderId),
        ]);
        setDetail(orderPayload);
        setOrderHistory(normalizeOrderHistory(historyPayload));
      }
      setInvoiceModal(null);
      toast(invoiceModal.emitAfter ? "Pedido faturado e fiscal emitido com sucesso." : "Pedido faturado com sucesso.", "success");
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Falha ao faturar pedido.";
      toast(message, "error");
    } finally {
      setBusyId(null);
    }
  }

  async function runOrderAction(orderId: number, action: "confirm" | "invoice" | "cancel" | "emit") {
    const token = getAccessToken();
    if (!token) return;
    const current = orders.find((o) => o.id === orderId);
    const hasFiscal = Object.prototype.hasOwnProperty.call(fiscalByOrder, orderId)
      ? !!fiscalByOrder[orderId]
      : Boolean(current?.invoice_number);
    if (current && !canOrderAction(current.status, action, hasFiscal)) {
      toast("Status atual do pedido nao permite esta acao.", "error");
      return;
    }
    try {
      setBusyId(orderId);
      if (action === "confirm") await confirmOrderRequest(token, orderId);
      if (action === "invoice")
        await invoiceOrderRequest(token, orderId, {
          invoice_number: `PED-${String(orderId).padStart(6, "0")}`,
          payment_term: "INSTALLMENT",
          installments: 1,
          interval_days: 30,
          payment_method: "UNSPECIFIED",
        });
      if (action === "cancel") await cancelOrderRequest(token, orderId);
      if (action === "emit") {
        if (current && !current.status.toUpperCase().includes("INVOICED")) {
          await invoiceOrderRequest(token, orderId, {
            invoice_number: `PED-${String(orderId).padStart(6, "0")}`,
            payment_term: "INSTALLMENT",
            installments: 1,
            interval_days: 30,
            payment_method: "UNSPECIFIED",
          });
        }
        await emitOrderFiscalRequest(token, orderId, { series: "001" });
      }
      await refreshData();
      if (detail?.id === orderId) {
        const [payload, historyPayload] = await Promise.all([
          getOrderRequest(token, orderId),
          getOrderHistoryRequest(token, orderId),
        ]);
        setDetail(payload);
        setOrderHistory(normalizeOrderHistory(historyPayload));
      }
      toast("Acao aplicada com sucesso.", "success");
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Falha ao executar acao.";
      toast(message, "error");
    } finally {
      setBusyId(null);
    }
  }

  async function runQuoteAction(quoteId: number, action: "approve" | "reject" | "cancel") {
    const token = getAccessToken();
    if (!token) return;
    const current = quotes.find((q) => q.id === quoteId);
    if (current && !canQuoteAction(current.status, action, current.linked_order_id)) {
      toast("Status atual do orcamento nao permite esta acao.", "error");
      return;
    }
    try {
      setBusyId(quoteId);
      if (action === "approve") await approveQuoteRequest(token, quoteId);
      if (action === "reject") await rejectQuoteRequest(token, quoteId);
      if (action === "cancel") await cancelQuoteRequest(token, quoteId);
      await refreshData();
      if (quoteDetail?.id === quoteId) {
        const [detailPayload, historyPayload] = await Promise.all([
          getQuoteRequest(token, quoteId),
          getQuoteHistoryRequest(token, quoteId),
        ]);
        setQuoteDetail(detailPayload);
        setQuoteHistory(normalizeQuoteHistory(historyPayload));
      }
      toast("Acao aplicada com sucesso.", "success");
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Falha ao executar acao.";
      toast(message, "error");
    } finally {
      setBusyId(null);
    }
  }

  async function openQuote(quoteId: number) {
    const token = getAccessToken();
    if (!token) return;
    try {
      setQuoteLoading(true);
      const detailPayload = await getQuoteRequest(token, quoteId);
      setQuoteDetail(detailPayload);
      try {
        const historyPayload = await getQuoteHistoryRequest(token, quoteId);
        setQuoteHistory(normalizeQuoteHistory(historyPayload));
      } catch {
        setQuoteHistory([]);
      }
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Falha ao abrir orcamento.";
      toast(message, "error");
    } finally {
      setQuoteLoading(false);
    }
  }

  function openEditOrder(order: OrderListItem) {
    const status = order.status.toUpperCase();
    if (status.includes("CANCEL") || status.includes("INVOICED")) {
      toast("Status atual do pedido nao permite edicao.", "error");
      return;
    }
    const token = getAccessToken();
    if (!token) return;
    setBusyId(order.id);
    getOrderRequest(token, order.id)
      .then((payload) => {
        setCreateMode("order");
        setEditingOrderId(order.id);
        setEditingQuoteId(null);
        setCreateClientId(String(payload.client_id));
        setCreateItems(
          (payload.items || []).map((item, index) => ({
            id: Date.now() + index,
            productId: String(item.product_id),
            qty: String(item.quantity),
          })),
        );
        setDetail(null);
        setOrderHistory([]);
        setCreateOpen(true);
      })
      .catch((requestError) => {
        const message = requestError instanceof Error ? requestError.message : "Falha ao abrir edicao do pedido.";
        toast(message, "error");
      })
      .finally(() => setBusyId(null));
  }

  function openEditQuote(quote: QuoteListItem) {
    if (quote.status === "CONVERTED" || quote.status === "CANCELED") {
      toast("Orcamento convertido/cancelado nao pode ser alterado.", "error");
      return;
    }
    const token = getAccessToken();
    if (!token) return;
    setBusyId(quote.id);
    getQuoteRequest(token, quote.id)
      .then((payload) => {
        setCreateMode("quote");
        setEditingOrderId(null);
        setEditingQuoteId(quote.id);
        setCreateClientId(String(payload.client_id));
        setCreateItems(
          (payload.items || []).map((item, index) => ({
            id: Date.now() + index,
            productId: String(item.product_id),
            qty: String(item.quantity),
          })),
        );
        setCreateOpen(true);
      })
      .catch((requestError) => {
        const message = requestError instanceof Error ? requestError.message : "Falha ao abrir edicao do orcamento.";
        toast(message, "error");
      })
      .finally(() => setBusyId(null));
  }

  async function convertQuoteToOrder(quoteId: number) {
    const token = getAccessToken();
    if (!token) return;
    const quote = quotes.find((item) => item.id === quoteId);
    if (!quote) return;
    if (!canQuoteAction(quote.status, "convert", quote.linked_order_id)) {
      toast("Apenas orcamento aprovado pode ser convertido em pedido.", "error");
      return;
    }
    try {
      setBusyId(quoteId);
      const converted = await convertQuoteRequest(token, quoteId);
      setReload((value) => value + 1);
      if (quoteDetail?.id === quoteId) {
        const [detailPayload, historyPayload] = await Promise.all([
          getQuoteRequest(token, quoteId),
          getQuoteHistoryRequest(token, quoteId),
        ]);
        setQuoteDetail(detailPayload);
        setQuoteHistory(normalizeQuoteHistory(historyPayload));
      }
      toast(`Orcamento convertido em pedido #${converted.order_id}.`, "success");
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Falha ao converter orcamento.";
      toast(message, "error");
    } finally {
      setBusyId(null);
    }
  }

  function handleLogout() {
    clearSession();
    router.replace("/");
  }

  return (
    <ErpShell activeNav="vendas" onLogout={handleLogout} pageTitle="Historico de vendas" headerRight={<div />}>
      {loading ? (
        <section className="flex h-full min-h-full w-full items-center justify-center rounded-md border border-[#2a3045] bg-[#161a24] p-6">
          <div className="flex flex-col items-center gap-3">
            <span className="h-10 w-10 animate-spin rounded-full border-2 border-[#2a3045] border-t-[#3b82f6]" />
            <span className="text-sm text-[#94a3b8]">Carregando historico comercial...</span>
          </div>
        </section>
      ) : error ? (
        <section className="rounded-md border border-[#7f1d1d] bg-[#2d1518] p-6 text-center text-[#fca5a5]">{error}</section>
      ) : (
        <div className="space-y-3">
          <div className="erp-page-header">
            <div className="flex items-center gap-3">
              <h1 className="erp-page-title">Vendas / Comercial</h1>
              <span className="erp-page-subtitle">Orcamentos, pedidos, faturamento e fiscal</span>
            </div>
            <div className="erp-pagination-nav">
              <button className="erp-btn erp-btn-secondary" onClick={() => refreshData("Dados comerciais atualizados.")} type="button">Atualizar</button>
              <button className="erp-btn erp-btn-secondary" onClick={() => openCreate("quote")} type="button"><span className="erp-icon-plus">add</span>Novo orcamento</button>
              <button className="erp-btn erp-btn-primary" onClick={() => openCreate("order")} type="button"><span className="erp-icon-plus">add</span>Nova venda</button>
            </div>
          </div>

          <section className="grid grid-cols-1 gap-2 md:grid-cols-4">
            {(tab === "orders"
              ? [
                  { t: "PEDIDOS TOTAL", v: String(orderKpi.total), s: "Historico geral de vendas", c: "bg-[#3b82f6]", d: "0ms" },
                  { t: "EM ABERTO", v: String(orderKpi.open), s: "Pedidos aguardando faturamento", c: "bg-[#f59e0b]", d: "60ms" },
                  { t: "FATURADOS", v: String(orderKpi.invoiced), s: "Pedidos com faturamento concluido", c: "bg-[#22c55e]", d: "120ms" },
                  { t: "FATURAMENTO", v: brl(orderKpi.revenue), s: "Valor dos pedidos faturados", c: "bg-[#ef4444]", d: "180ms" },
                ]
              : [
                  { t: "ORCAMENTOS TOTAL", v: String(quoteKpi.total), s: "Orcamentos cadastrados", c: "bg-[#3b82f6]", d: "0ms" },
                  { t: "PENDENTES", v: String(quoteKpi.pending), s: "Aguardando aprovacao", c: "bg-[#f59e0b]", d: "60ms" },
                  { t: "APROVADOS", v: String(quoteKpi.approved), s: "Prontos para conversao", c: "bg-[#22c55e]", d: "120ms" },
                  { t: "CONVERSAO", v: `${quoteKpi.conversionRate.toFixed(1)}%`, s: "Taxa de conversao em pedido", c: "bg-[#ef4444]", d: "180ms" },
                ]
            ).map((card) => (
              <article className={`erp-kpi-card flex min-h-[118px] flex-col items-start justify-between text-left transition-all duration-200 ease-out hover:-translate-y-[1px] hover:border-[#3a4260] hover:shadow-[0_8px_18px_rgba(0,0,0,0.24)] ${kpiReady ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"}`} key={card.t} style={{ transitionDelay: card.d }}>
                <div className={`erp-kpi-line ${card.c}`} />
                <p className="font-mono text-xs font-semibold uppercase tracking-wider text-[#475569]">{card.t}</p>
                <h3 className="mt-1.5 font-mono text-3xl font-bold leading-none text-[#e2e8f0]">{card.v}</h3>
                <p className="text-[11px] text-[#64748b]">{card.s}</p>
              </article>
            ))}
          </section>

          <section className={`rounded-md border ${isLight ? "border-[#d1d9e6] bg-[#ffffff]" : "border-[#2a3045] bg-[#161a24]"}`}>
            <div className={`flex flex-wrap items-center gap-2 border-b px-4 py-2.5 ${isLight ? "border-[#d1d9e6] bg-[#eef1f7]" : "border-[#2a3045] bg-[#1e2332]"}`}>
              <div className={`inline-flex overflow-hidden rounded border ${isLight ? "border-[#b0bcce]" : "border-[#2a3045]"}`}>
                <button className={`h-8 px-3 text-[12px] ${tab === "orders" ? (isLight ? "bg-[#dbeafe] text-[#0f172a]" : "bg-[#1e3a5f] text-[#e2e8f0]") : (isLight ? "bg-[#ffffff] text-[#475569] hover:text-[#0f172a]" : "bg-[#161a24] text-[#94a3b8] hover:text-[#e2e8f0]")}`} onClick={() => setTab("orders")} type="button">Pedidos</button>
                <button className={`h-8 border-l px-3 text-[12px] ${isLight ? "border-[#b0bcce]" : "border-[#2a3045]"} ${tab === "quotes" ? (isLight ? "bg-[#dbeafe] text-[#0f172a]" : "bg-[#1e3a5f] text-[#e2e8f0]") : (isLight ? "bg-[#ffffff] text-[#475569] hover:text-[#0f172a]" : "bg-[#161a24] text-[#94a3b8] hover:text-[#e2e8f0]")}`} onClick={() => setTab("quotes")} type="button">Orcamentos</button>
              </div>

              <div className="erp-list-search-wrap min-w-[220px]">
                <input className="erp-list-search-input" onChange={(event) => setQueryInput(event.target.value)} onKeyDown={(event) => event.key === "Enter" && setQuery(queryInput.trim())} placeholder={tab === "orders" ? "Buscar pedido, cliente ou status..." : "Buscar orcamento, cliente ou status..."} value={queryInput} />
                <button className="erp-list-search-btn" onClick={() => setQuery(queryInput.trim())} type="button"><span className="material-symbols-outlined !text-[18px]">search</span></button>
              </div>

              <button className={`erp-filter-btn ${showFilters ? "erp-filter-btn-on" : "erp-filter-btn-off"}`} onClick={() => setShowFilters((s) => !s)} type="button"><span className="material-symbols-outlined !text-[17px]">filter_alt</span>Filtros</button>

              <div className="erp-sort-group">
                <span className="erp-sort-label">Ordenar por:</span>
                <select className="erp-list-sort-select outline-none focus:border-[#3b82f6]" onChange={(event) => setSortBy(event.target.value as SortBy)} value={sortBy}>
                  <option value="recent">Mais recente</option><option value="amount_desc">Maior valor</option><option value="amount_asc">Menor valor</option><option value="name_asc">Nome A-Z</option><option value="name_desc">Nome Z-A</option>
                </select>
              </div>
            </div>

            {showFilters ? (
              <div className="grid grid-cols-1 gap-3 border-b border-[#2a3045] bg-[#161a24] px-4 py-3 md:grid-cols-6">
                {tab === "orders" ? (
                  <>
                    <label className="grid gap-1 text-[11px] font-mono uppercase tracking-[0.12em] text-[#64748b]">Status pedido
                      <select className="h-8 rounded border border-[#2a3045] bg-[#1e2332] px-3 text-[12px] normal-case text-[#e2e8f0]" onChange={(event) => setOrderStatusFilter(event.target.value as OrderStatusFilter)} value={orderStatusFilter}><option value="all">Todos</option><option value="open">Em aberto</option><option value="awaiting">Aguardando aprovacao</option><option value="approved">Aprovado</option><option value="partial">Parcial</option><option value="invoiced">Faturado</option><option value="canceled">Cancelado</option></select>
                    </label>
                    <label className="grid gap-1 text-[11px] font-mono uppercase tracking-[0.12em] text-[#64748b]">Fiscal
                      <select className="h-8 rounded border border-[#2a3045] bg-[#1e2332] px-3 text-[12px] normal-case text-[#e2e8f0]" onChange={(event) => setFiscalFilter(event.target.value as FiscalFilter)} value={fiscalFilter}><option value="all">Todos</option><option value="with_fiscal">Com fiscal</option><option value="without_fiscal">Sem fiscal</option></select>
                    </label>
                  </>
                ) : (
                  <>
                    <label className="grid gap-1 text-[11px] font-mono uppercase tracking-[0.12em] text-[#64748b]">Status orcamento
                      <select className="h-8 rounded border border-[#2a3045] bg-[#1e2332] px-3 text-[12px] normal-case text-[#e2e8f0]" onChange={(event) => setQuoteStatusFilter(event.target.value as QuoteStatusFilter)} value={quoteStatusFilter}><option value="all">Todos</option><option value="drafting">Em digitacao</option><option value="pending">Pendente</option><option value="approved">Aprovado</option><option value="rejected">Reprovado</option><option value="converted">Convertido</option><option value="canceled">Cancelado</option></select>
                    </label>
                    <div />
                  </>
                )}
                <label className="grid gap-1 text-[11px] font-mono uppercase tracking-[0.12em] text-[#64748b]">Cliente
                  <select className="h-8 rounded border border-[#2a3045] bg-[#1e2332] px-3 text-[12px] normal-case text-[#e2e8f0]" onChange={(event) => setClientFilter(event.target.value)} value={clientFilter}>
                    <option value="">Todos</option>
                    {clients.map((client) => (
                      <option key={client.id} value={String(client.id)}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1 text-[11px] font-mono uppercase tracking-[0.12em] text-[#64748b]">Data emissao
                  <input className="h-8 rounded border border-[#2a3045] bg-[#1e2332] px-3 text-[12px] normal-case text-[#e2e8f0] outline-none" onChange={(event) => setEmissionDate(event.target.value)} type="date" value={emissionDate} />
                </label>
                <label className="grid gap-1 text-[11px] font-mono uppercase tracking-[0.12em] text-[#64748b]">Periodo (de)
                  <input className="h-8 rounded border border-[#2a3045] bg-[#1e2332] px-3 text-[12px] normal-case text-[#e2e8f0] outline-none" onChange={(event) => setDateFrom(event.target.value)} type="date" value={dateFrom} />
                </label>
                <label className="grid gap-1 text-[11px] font-mono uppercase tracking-[0.12em] text-[#64748b]">Periodo (ate)
                  <input className="h-8 rounded border border-[#2a3045] bg-[#1e2332] px-3 text-[12px] normal-case text-[#e2e8f0] outline-none" onChange={(event) => setDateTo(event.target.value)} type="date" value={dateTo} />
                </label>
                <label className="grid gap-1 text-[11px] font-mono uppercase tracking-[0.12em] text-[#64748b]">Valor min.
                  <input className="h-8 rounded border border-[#2a3045] bg-[#1e2332] px-3 text-[12px] normal-case text-[#e2e8f0] outline-none" onChange={(event) => setMinAmount(event.target.value)} placeholder="0,00" value={minAmount} />
                </label>
                <label className="grid gap-1 text-[11px] font-mono uppercase tracking-[0.12em] text-[#64748b]">Valor max.
                  <input className="h-8 rounded border border-[#2a3045] bg-[#1e2332] px-3 text-[12px] normal-case text-[#e2e8f0] outline-none" onChange={(event) => setMaxAmount(event.target.value)} placeholder="0,00" value={maxAmount} />
                </label>
                <div className="col-span-full flex items-end justify-between gap-2 pt-1">
                  <span className="font-mono text-[11px] text-[#64748b]">Filtros salvos automaticamente para o usuario: {user.login || "padrao"}</span>
                  <button className="erp-list-action-btn h-8 px-3 text-[12px]" onClick={() => { setOrderStatusFilter("all"); setQuoteStatusFilter("all"); setFiscalFilter("all"); setEmissionDate(""); setDateFrom(""); setDateTo(""); setClientFilter(""); setMinAmount(""); setMaxAmount(""); setQueryInput(""); setQuery(""); }} type="button">Limpar filtros</button>
                </div>
              </div>
            ) : null}

            {tab === "orders" ? (
              <>
                <div className="grid grid-cols-[1fr_2fr_1fr_1fr_1fr_1fr_1.6fr] border-b border-[#2a3045] bg-[#1e2332] px-4 py-3 font-mono text-[11px] uppercase tracking-[0.14em] text-[#64748b]"><span>Pedido</span><span>Cliente</span><span>Data</span><span>Status</span><span>Valor</span><span>Fiscal</span><span className="text-right">Acoes</span></div>
                {(rows as OrderListItem[]).map((order) => {
                  const fiscal = Object.prototype.hasOwnProperty.call(fiscalByOrder, order.id)
                    ? fiscalByOrder[order.id]
                    : null;
                  const hasFiscal = fiscal ? true : Boolean(order.invoice_number);
                  const fiscalLabel = fiscal
                    ? fiscal.document_type === "NFCE"
                      ? "NFC-e"
                      : "NF-e"
                    : hasFiscal
                      ? "Fiscal"
                      : "Sem fiscal";
                  return (
                    <div className="grid cursor-pointer grid-cols-[1fr_2fr_1fr_1fr_1fr_1fr_1.6fr] items-center border-b border-[#2a3045] px-4 py-3 text-left transition hover:bg-[#1e2332]" key={order.id} onClick={() => openDetail(order.id)}>
                      <div><p className="font-mono text-[13px] font-bold text-[#3b82f6]">#PED-{String(order.id).padStart(6, "0")}</p><p className="font-mono text-[10px] text-[#64748b]">{order.items_count} itens</p></div>
                      <div><p className="text-[14px] font-semibold text-[#e2e8f0]">{order.client_name}</p><p className="font-mono text-[10px] text-[#64748b]">{order.invoice_number || "Sem faturamento"}</p></div>
                      <span className="font-mono text-[12px] text-[#94a3b8]">{dmy(order.created_at)}</span>
                      <span><span className={`erp-tag ${orderStatusClass(order.status)}`}>{orderStatusLabel(order.status)}</span></span>
                      <span className="font-mono text-[13px] text-[#e2e8f0]">{brl(order.total_amount)}</span>
                      <span>{hasFiscal ? <span className="erp-tag erp-tag-success">{fiscalLabel}</span> : <span className="erp-tag erp-tag-neutral">Sem fiscal</span>}</span>
                      <div className="flex justify-end gap-1">
                        <button className="erp-list-action-btn" disabled={busyId === order.id} onClick={(event) => { event.stopPropagation(); openDetail(order.id); }} type="button">Abrir</button>
                        <button className="erp-list-action-btn disabled:opacity-40" disabled={busyId === order.id || !canOrderAction(order.status, "confirm", hasFiscal)} onClick={(event) => { event.stopPropagation(); runOrderAction(order.id, "confirm"); }} type="button">Aprovar</button>
                        <button className="erp-list-action-btn disabled:opacity-40" disabled={busyId === order.id || !canOrderAction(order.status, "invoice", hasFiscal)} onClick={(event) => { event.stopPropagation(); runOrderAction(order.id, "invoice"); }} type="button">Faturar</button>
                        <button className="erp-list-action-btn border-[#166534] bg-[#14532d] text-[#86efac] hover:border-[#15803d] hover:bg-[#166534] disabled:opacity-40" disabled={busyId === order.id || !canOrderAction(order.status, "emit", hasFiscal)} onClick={(event) => { event.stopPropagation(); runOrderAction(order.id, "emit"); }} type="button">Emitir</button>
                      </div>
                    </div>
                  );
                })}
              </>
            ) : (
              <>
                <div className="grid grid-cols-[1fr_2fr_1fr_1fr_1fr_1.8fr] border-b border-[#2a3045] bg-[#1e2332] px-4 py-3 font-mono text-[11px] uppercase tracking-[0.14em] text-[#64748b]"><span>Orcamento</span><span>Cliente</span><span>Data</span><span>Status</span><span>Valor</span><span className="text-right">Acoes</span></div>
                {(rows as QuoteListItem[]).map((quote) => (
                  <div className="grid cursor-pointer grid-cols-[1fr_2fr_1fr_1fr_1fr_1.8fr] items-center border-b border-[#2a3045] px-4 py-3 text-left transition hover:bg-[#1e2332]" key={quote.id} onClick={() => openQuote(quote.id)}>
                    <div><p className="font-mono text-[13px] font-bold text-[#3b82f6]">{quote.code}</p><p className="font-mono text-[10px] text-[#64748b]">{quote.items_count} itens</p></div>
                    <div><p className="text-[14px] font-semibold text-[#e2e8f0]">{quote.client_name}</p><p className="font-mono text-[10px] text-[#64748b]">{quote.linked_order_id ? `Pedido #${quote.linked_order_id}` : "Sem pedido"}</p></div>
                    <span className="font-mono text-[12px] text-[#94a3b8]">{dmy(quote.created_at)}</span>
                    <span><span className={`erp-tag ${quoteStatusClass(quote.status)}`}>{quoteStatusLabel(quote.status)}</span></span>
                    <span className="font-mono text-[13px] text-[#e2e8f0]">{brl(quote.total_amount)}</span>
                    <div className="flex justify-end gap-1">
                      <button className="erp-list-action-btn" disabled={busyId === quote.id} onClick={(event) => { event.stopPropagation(); openQuote(quote.id); }} type="button">Abrir</button>
                      <button className="erp-list-action-btn disabled:opacity-40" disabled={busyId === quote.id || quote.status === "CONVERTED" || quote.status === "CANCELED"} onClick={(event) => { event.stopPropagation(); openEditQuote(quote); }} type="button">Editar</button>
                      <button className="erp-list-action-btn disabled:opacity-40" disabled={busyId === quote.id || !canQuoteAction(quote.status, "approve")} onClick={(event) => { event.stopPropagation(); runQuoteAction(quote.id, "approve"); }} type="button">Aprovar</button>
                      <button className="erp-list-action-btn disabled:opacity-40" disabled={busyId === quote.id || !canQuoteAction(quote.status, "reject")} onClick={(event) => { event.stopPropagation(); runQuoteAction(quote.id, "reject"); }} type="button">Reprovar</button>
                      <button className="erp-list-action-btn disabled:opacity-40" disabled={busyId === quote.id || !canQuoteAction(quote.status, "cancel")} onClick={(event) => { event.stopPropagation(); runQuoteAction(quote.id, "cancel"); }} type="button">Cancelar</button>
                      <button className="erp-list-action-btn border-[#166534] bg-[#14532d] text-[#86efac] hover:border-[#15803d] hover:bg-[#166534] disabled:opacity-40" disabled={busyId === quote.id || !canQuoteAction(quote.status, "convert", quote.linked_order_id)} onClick={(event) => { event.stopPropagation(); convertQuoteToOrder(quote.id); }} type="button">Converter</button>
                    </div>
                  </div>
                ))}
              </>
            )}

            <div className="erp-pagination-footer">
              <span>{list.length === 0 ? "Mostrando 0-0" : `Mostrando ${startIndex + 1}-${endIndex} de ${list.length}`}</span>
              <div className="erp-pagination-nav">
                <button
                  className="erp-list-action-btn h-7 px-2 text-[11px] text-[#94a3b8] disabled:opacity-40"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  type="button"
                >
                  Anterior
                </button>
                <span className="text-[11px] text-[#94a3b8]">
                  Pagina {currentPage} de {totalPages}
                </span>
                <button
                  className="erp-list-action-btn h-7 px-2 text-[11px] text-[#94a3b8] disabled:opacity-40"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                  type="button"
                >
                  Proxima
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      {createOpen ? (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-black/70 p-4">
          <div
            className={`h-[86vh] w-[min(1080px,98vw)] overflow-hidden rounded-md border shadow-2xl ${
              isLight ? "border-[#d1d9e6] bg-[#f8fafc]" : "border-[#2a3045] bg-[#0f1117]"
            }`}
          >
            <div className="flex h-full flex-col">
              <div
                className={`flex items-start gap-2 border-b px-5 py-4 ${
                  isLight ? "border-[#d1d9e6]" : "border-[#2a3045]"
                }`}
              >
                <div>
                  <h2 className={`text-[17px] font-semibold ${isLight ? "text-[#0f172a]" : "text-[#e2e8f0]"}`}>
                    {createMode === "order"
                      ? editingOrderId
                        ? `Editar venda #${editingOrderId}`
                        : "Nova venda"
                      : editingQuoteId
                        ? `Editar orcamento #${editingQuoteId}`
                        : "Novo orcamento"}
                  </h2>
                  <p className="mt-1 font-mono text-[11px] text-[#64748b]">
                    {createMode === "order" ? "Pedido comercial" : "Orcamento comercial"}
                  </p>
                </div>
                <div className="ml-auto flex gap-2">
                  <button
                    className="erp-btn erp-btn-secondary"
                    onClick={() => {
                      setCreateOpen(false);
                      setEditingOrderId(null);
                      setEditingQuoteId(null);
                    }}
                    type="button"
                  >
                    Cancelar
                  </button>
                  <button className="erp-btn erp-btn-success" form="create-sales-form" type="submit">
                    {creating ? "Salvando..." : "Salvar"}
                  </button>
                </div>
              </div>
              <form className="min-h-0 flex-1 overflow-y-auto p-4" id="create-sales-form" onSubmit={submitCreate}>
                <div className="grid gap-4 xl:grid-cols-[1.65fr_1fr]">
                  <section
                    className={`rounded-md border p-4 ${
                      isLight ? "border-[#d1d9e6] bg-[#ffffff]" : "border-[#2a3045] bg-[#111827]"
                    }`}
                  >
                    <label className="grid gap-1 text-xs text-[#64748b]">
                      Cliente *
                      <select
                        className={`h-10 rounded border px-3 text-[13px] outline-none focus:border-[#3b82f6] ${
                          isLight
                            ? "border-[#d1d9e6] bg-[#f8fafc] text-[#0f172a]"
                            : "border-[#2a3045] bg-[#1e2332] text-[#e2e8f0]"
                        }`}
                        onChange={(event) => setCreateClientId(event.target.value)}
                        value={createClientId}
                      >
                        <option value="">Selecione...</option>
                        {clients.map((client) => (
                          <option key={client.id} value={String(client.id)}>
                            {client.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <div className="mt-4 space-y-2">
                      {createItems.map((item, index) => (
                        <div className="grid grid-cols-[1.6fr_110px_44px] gap-2" key={item.id}>
                          <label className="grid gap-1 text-xs text-[#64748b]">
                            Produto {index + 1} *
                            <select
                              className={`h-10 rounded border px-3 text-[13px] outline-none focus:border-[#3b82f6] ${
                                isLight
                                  ? "border-[#d1d9e6] bg-[#f8fafc] text-[#0f172a]"
                                  : "border-[#2a3045] bg-[#1e2332] text-[#e2e8f0]"
                              }`}
                              onChange={(event) => updateCreateItem(item.id, "productId", event.target.value)}
                              value={item.productId}
                            >
                              <option value="">Selecione...</option>
                              {products.map((product) => (
                                <option key={product.id} value={String(product.id)}>
                                  {product.sku} - {product.name}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="grid gap-1 text-xs text-[#64748b]">
                            Qtd *
                            <input
                              className={`h-10 rounded border px-3 text-[13px] outline-none focus:border-[#3b82f6] ${
                                isLight
                                  ? "border-[#d1d9e6] bg-[#f8fafc] text-[#0f172a]"
                                  : "border-[#2a3045] bg-[#1e2332] text-[#e2e8f0]"
                              }`}
                              onChange={(event) => updateCreateItem(item.id, "qty", event.target.value)}
                              value={item.qty}
                            />
                          </label>
                          <div className="flex items-end">
                            <button
                              className={`h-10 w-11 rounded border transition ${
                                isLight
                                  ? "border-[#d1d9e6] bg-[#f8fafc] text-[#475569] hover:border-[#94a3b8] hover:text-[#0f172a]"
                                  : "border-[#2a3045] bg-[#1e2332] text-[#94a3b8] hover:border-[#3a4260] hover:text-[#e2e8f0]"
                              }`}
                              disabled={createItems.length <= 1}
                              onClick={() => removeCreateItem(item.id)}
                              type="button"
                            >
                              <span className="material-symbols-outlined !text-[17px]">delete</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      className={`mt-2 h-10 w-full rounded border border-dashed text-sm transition ${
                        isLight
                          ? "border-[#94a3b8] bg-[#f8fafc] text-[#475569] hover:border-[#64748b] hover:text-[#0f172a]"
                          : "border-[#3a4260] bg-[#161a24] text-[#94a3b8] hover:border-[#64748b] hover:text-[#e2e8f0]"
                      }`}
                      onClick={addCreateItem}
                      type="button"
                    >
                      + Adicionar item
                    </button>
                  </section>

                  <aside
                    className={`h-fit rounded-md border p-4 ${
                      isLight ? "border-[#d1d9e6] bg-[#ffffff]" : "border-[#2a3045] bg-[#111827]"
                    }`}
                  >
                    <h3 className={`text-[13px] font-semibold uppercase tracking-[0.08em] ${isLight ? "text-[#334155]" : "text-[#94a3b8]"}`}>
                      Resumo da venda
                    </h3>
                    <div className="mt-3 space-y-2">
                      <div
                        className={`rounded border px-3 py-2 ${
                          isLight ? "border-[#d1d9e6] bg-[#f8fafc]" : "border-[#2a3045] bg-[#161a24]"
                        }`}
                      >
                        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#64748b]">Cliente</p>
                        <p className={`mt-1 text-[13px] font-semibold ${isLight ? "text-[#0f172a]" : "text-[#e2e8f0]"}`}>
                          {createClientName}
                        </p>
                      </div>
                      <div
                        className={`rounded border px-3 py-2 ${
                          isLight ? "border-[#d1d9e6] bg-[#f8fafc]" : "border-[#2a3045] bg-[#161a24]"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[11px] text-[#64748b]">Itens validos</span>
                          <span className={`font-mono text-[13px] font-semibold ${isLight ? "text-[#0f172a]" : "text-[#e2e8f0]"}`}>
                            {createValidItemsCount}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center justify-between">
                          <span className="font-mono text-[11px] text-[#64748b]">Subtotal</span>
                          <span className="font-mono text-[14px] font-semibold text-[#22c55e]">{brl(createSubtotal)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3">
                      <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[#64748b]">Itens selecionados</p>
                      <div
                        className={`max-h-[270px] overflow-y-auto rounded border ${
                          isLight ? "border-[#d1d9e6] bg-[#f8fafc]" : "border-[#2a3045] bg-[#161a24]"
                        }`}
                      >
                        {createItemsPreview.length === 0 ? (
                          <p className="px-3 py-2 text-[12px] text-[#64748b]">Nenhum item adicionado.</p>
                        ) : (
                          <ul className="divide-y divide-[#2a3045]">
                            {createItemsPreview.map((item, index) => (
                              <li className="px-3 py-2" key={item.id}>
                                <p className={`line-clamp-1 text-[12px] font-semibold ${isLight ? "text-[#0f172a]" : "text-[#e2e8f0]"}`}>
                                  {item.product ? `${item.product.sku} - ${item.product.name}` : `Produto ${index + 1} nao selecionado`}
                                </p>
                                <div className="mt-1 flex items-center justify-between font-mono text-[11px] text-[#64748b]">
                                  <span>Qtd: {item.qty.toLocaleString("pt-BR")}</span>
                                  <span>{brl(item.lineTotal)}</span>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </aside>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}

      {detail ? (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-black/70 p-4">
          <div
            className={`h-[86vh] w-[min(1280px,99vw)] overflow-hidden rounded-md border shadow-2xl ${
              isLight ? "border-[#d1d9e6] bg-[#f8fafc]" : "border-[#2a3045] bg-[#0f1117]"
            }`}
          >
            <div className="flex h-full flex-col">
              <div className="flex items-start gap-2 border-b border-[#2a3045] px-5 py-4">
                <div>
                  <h2 className="text-[16px] font-semibold text-[#e2e8f0]">Pedido #PED-{String(detail.id).padStart(6, "0")}</h2>
                  <p className="mt-1 font-mono text-[11px] text-[#64748b]">{detail.client_name} · {dmy(detail.created_at)}</p>
                </div>
                <div className="ml-auto flex gap-2">
                  <button className="erp-btn erp-btn-secondary disabled:opacity-40" disabled={busyId === detail.id || currentOrderStatus.includes("INVOICED") || currentOrderStatus.includes("CANCEL")} onClick={() => currentOrderListItem && openEditOrder(currentOrderListItem)} type="button">Editar</button>
                  <button className="erp-btn erp-btn-secondary disabled:opacity-40" disabled={busyId === detail.id || !canOrderAction(currentOrderStatus, "confirm", currentOrderHasFiscal)} onClick={() => runOrderAction(detail.id, "confirm")} type="button">Aprovar</button>
                  <button className="erp-btn erp-btn-secondary disabled:opacity-40" disabled={busyId === detail.id || !canOrderAction(currentOrderStatus, "invoice", currentOrderHasFiscal)} onClick={() => runOrderAction(detail.id, "invoice")} type="button">Faturar</button>
                  <button className="erp-btn erp-btn-success disabled:opacity-40" disabled={busyId === detail.id || !canOrderAction(currentOrderStatus, "emit", currentOrderHasFiscal)} onClick={() => runOrderAction(detail.id, "emit")} type="button">Emitir fiscal</button>
                  <button className="erp-btn erp-btn-danger disabled:opacity-40" disabled={busyId === detail.id || !canOrderAction(currentOrderStatus, "cancel", currentOrderHasFiscal)} onClick={() => runOrderAction(detail.id, "cancel")} type="button">Cancelar</button>
                  <button className="erp-btn erp-btn-secondary" onClick={openProfessionalReport} type="button">Relatorio</button>
                  <button className="erp-btn erp-btn-secondary" onClick={printCurrentDetail} type="button">Imprimir</button>
                  <button className="erp-btn erp-btn-secondary" onClick={() => { setDetail(null); setOrderHistory([]); }} type="button">Fechar</button>
                </div>
              </div>
              <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 lg:grid-cols-[1.75fr_1fr]">
                <div className="overflow-y-auto space-y-3 p-4">
                  <section className="grid grid-cols-1 gap-2 md:grid-cols-4">
                    <article className="rounded border border-[#2a3045] bg-[#161a24] p-3">
                      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#64748b]">Pedido</p>
                      <p className="mt-1 font-mono text-[16px] font-semibold text-[#e2e8f0]">#PED-{String(detail.id).padStart(6, "0")}</p>
                    </article>
                    <article className="rounded border border-[#2a3045] bg-[#161a24] p-3 md:col-span-2">
                      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#64748b]">Cliente</p>
                      <p className="mt-1 text-[15px] font-semibold text-[#e2e8f0]">{detail.client_name}</p>
                    </article>
                    <article className="rounded border border-[#2a3045] bg-[#161a24] p-3">
                      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#64748b]">Total</p>
                      <p className="mt-1 font-mono text-[16px] font-semibold text-[#22c55e]">{brl(detail.total_amount)}</p>
                    </article>
                  </section>

                  <section className="overflow-hidden rounded border border-[#2a3045] bg-[#161a24]">
                    <div className="grid grid-cols-[0.7fr_2.4fr_1fr_1fr_1fr] border-b border-[#2a3045] bg-[#1e2332] px-3 py-2 font-mono text-[11px] uppercase tracking-[0.12em] text-[#64748b]">
                      <span>#</span><span>Produto</span><span>Qtd</span><span>Unit.</span><span>Total</span>
                    </div>
                    <div className="divide-y divide-[#2a3045]">
                      {detail.items.map((item) => (
                        <div className="grid grid-cols-[0.7fr_2.4fr_1fr_1fr_1fr] px-3 py-2.5 text-[13px] text-[#e2e8f0]" key={item.id}>
                          <span className="font-mono text-[#64748b]">{String(item.line_no).padStart(2, "0")}</span>
                          <span>{item.product_name}</span>
                          <span className="font-mono">{item.quantity}</span>
                          <span className="font-mono">{brl(item.unit_price)}</span>
                          <span className="font-mono text-[#22c55e]">{brl(item.line_total)}</span>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="grid grid-cols-1 gap-2 md:grid-cols-3">
                    <article className="rounded border border-[#2a3045] bg-[#161a24] p-3">
                      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#64748b]">Subtotal</p>
                      <p className="mt-1 font-mono text-[15px] font-semibold text-[#e2e8f0]">{brl(detail.total_amount)}</p>
                    </article>
                    <article className="rounded border border-[#2a3045] bg-[#161a24] p-3">
                      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#64748b]">Desconto</p>
                      <p className="mt-1 font-mono text-[15px] font-semibold text-[#fbbf24]">R$ 0,00</p>
                    </article>
                    <article className="rounded border border-[#2a3045] bg-[#161a24] p-3">
                      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#64748b]">Total final</p>
                      <p className="mt-1 font-mono text-[15px] font-semibold text-[#22c55e]">{brl(detail.total_amount)}</p>
                    </article>
                  </section>
                </div>
                <aside className={`overflow-y-auto border-l p-4 ${isLight ? "border-[#d1d9e6] bg-[#ffffff]" : "border-[#2a3045] bg-[#111827]"}`}>
                  <h3 className="mb-2 text-[13px] font-semibold uppercase tracking-[0.08em] text-[#94a3b8]">Timeline</h3>
                  <div className="mb-4 space-y-2">
                    {orderTimeline.length === 0 ? (
                      <p className="text-[12px] text-[#64748b]">Sem eventos registrados.</p>
                    ) : (
                      orderTimeline.map((row, index) => (
                        <div
                          className={`rounded border p-3 ${
                            isLight ? "border-[#d1d9e6] bg-[#f8fafc]" : "border-[#2a3045] bg-[#161a24]"
                          }`}
                          key={`${row.label}-${index}`}
                        >
                          <p className={`font-mono text-[11px] ${isLight ? "text-[#2563eb]" : "text-[#93c5fd]"}`}>{row.label}</p>
                          <p className={`mt-1 text-[13px] ${isLight ? "text-[#0f172a]" : "text-[#e2e8f0]"}`}>{row.note}</p>
                          <p className="mt-1 font-mono text-[10px] text-[#64748b]">{dmyhm(row.value)}</p>
                        </div>
                      ))
                    )}
                  </div>
                  <h3 className="mb-2 text-[13px] font-semibold uppercase tracking-[0.08em] text-[#94a3b8]">Anexos</h3>
                  <label className="mb-2 inline-flex h-8 cursor-pointer items-center rounded border border-dashed border-[#3a4260] bg-[#161a24] px-3 font-mono text-[11px] text-[#94a3b8] transition hover:border-[#64748b] hover:text-[#e2e8f0]">
                    + Adicionar anexo
                    <input className="hidden" multiple onChange={(event) => onAttachmentUpload(event.target.files)} type="file" />
                  </label>
                  <div className="mb-4 space-y-1.5">
                    {currentAttachments.length === 0 ? <p className="font-mono text-[11px] text-[#64748b]">Sem anexos.</p> : currentAttachments.map((item) => (
                      <div className="flex items-center gap-2 rounded border border-[#2a3045] bg-[#161a24] px-2 py-1.5" key={item.id}>
                        <span className="line-clamp-1 flex-1 font-mono text-[11px] text-[#e2e8f0]">{item.name}</span>
                        <button className="font-mono text-[10px] text-[#94a3b8] transition hover:text-[#fca5a5]" onClick={() => removeAttachment(item.id)} type="button">remover</button>
                      </div>
                    ))}
                  </div>
                  <h3 className="mb-2 text-[13px] font-semibold uppercase tracking-[0.08em] text-[#94a3b8]">Observacoes</h3>
                  <textarea className="h-24 w-full rounded border border-[#2a3045] bg-[#161a24] px-3 py-2 text-[12px] text-[#e2e8f0] outline-none focus:border-[#3b82f6]" onChange={(event) => setNoteDraft(event.target.value)} placeholder="Digite observacoes comerciais do pedido..." value={noteDraft} />
                  <button className="mt-2 h-8 rounded border border-[#2a3045] bg-[#1e2332] px-3 text-[12px] text-[#e2e8f0] transition hover:border-[#3a4260]" onClick={saveCurrentNote} type="button">Salvar observacao</button>
                </aside>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {quoteDetail || quoteLoading ? (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-black/70 p-4">
          <div
            className={`h-[86vh] w-[min(1280px,99vw)] overflow-hidden rounded-md border shadow-2xl ${
              isLight ? "border-[#d1d9e6] bg-[#f8fafc]" : "border-[#2a3045] bg-[#0f1117]"
            }`}
          >
            <div className="flex h-full flex-col">
              <div className="flex items-start gap-2 border-b border-[#2a3045] px-5 py-4">
                <div>
                  <h2 className="text-[16px] font-semibold text-[#e2e8f0]">
                    {quoteDetail ? `Orcamento ${quoteDetail.code}` : "Carregando orcamento..."}
                  </h2>
                  <p className="mt-1 font-mono text-[11px] text-[#64748b]">
                    {quoteDetail ? `${quoteDetail.client_name} · ${dmy(quoteDetail.created_at)}` : ""}
                  </p>
                </div>
                <div className="ml-auto flex gap-2">
                  <button className="erp-btn erp-btn-secondary disabled:opacity-40" disabled={!quoteDetail || busyId === quoteDetail.id || !canQuoteAction(quoteDetail.status, "approve")} onClick={() => quoteDetail && runQuoteAction(quoteDetail.id, "approve")} type="button">Aprovar</button>
                  <button className="erp-btn erp-btn-secondary disabled:opacity-40" disabled={!quoteDetail || busyId === quoteDetail.id || !canQuoteAction(quoteDetail.status, "reject")} onClick={() => quoteDetail && runQuoteAction(quoteDetail.id, "reject")} type="button">Reprovar</button>
                  <button className="erp-btn erp-btn-danger disabled:opacity-40" disabled={!quoteDetail || busyId === quoteDetail.id || !canQuoteAction(quoteDetail.status, "cancel")} onClick={() => quoteDetail && runQuoteAction(quoteDetail.id, "cancel")} type="button">Cancelar</button>
                  <button className="erp-btn erp-btn-secondary disabled:opacity-40" disabled={!quoteDetail || busyId === quoteDetail.id || quoteDetail.status === "CONVERTED" || quoteDetail.status === "CANCELED"} onClick={() => quoteDetail && openEditQuote({ id: quoteDetail.id, code: quoteDetail.code, client_id: quoteDetail.client_id, client_name: quoteDetail.client_name, status: quoteDetail.status, total_amount: quoteDetail.total_amount, items_count: quoteDetail.items.length, linked_order_id: quoteDetail.linked_order_id, created_at: quoteDetail.created_at })} type="button">Editar</button>
                  <button className="erp-btn erp-btn-success disabled:opacity-40" disabled={!quoteDetail || busyId === quoteDetail.id || !canQuoteAction(quoteDetail.status, "convert", quoteDetail.linked_order_id)} onClick={() => quoteDetail && convertQuoteToOrder(quoteDetail.id)} type="button">Converter</button>
                  <button
                    className="erp-btn erp-btn-secondary"
                    onClick={openProfessionalReport}
                    type="button"
                  >
                    Relatorio
                  </button>
                  <button
                    className="erp-btn erp-btn-secondary"
                    onClick={printCurrentDetail}
                    type="button"
                  >
                    Imprimir
                  </button>
                  <button
                    className="erp-btn erp-btn-secondary"
                    onClick={() => {
                      setQuoteDetail(null);
                      setQuoteHistory([]);
                    }}
                    type="button"
                  >
                    Fechar
                  </button>
                </div>
              </div>
              {quoteLoading ? (
                <div className="flex flex-1 items-center justify-center">
                  <span className="h-10 w-10 animate-spin rounded-full border-2 border-[#2a3045] border-t-[#3b82f6]" />
                </div>
              ) : quoteDetail ? (
                <div className="grid min-h-0 flex-1 gap-0 overflow-hidden lg:grid-cols-[1.75fr_1fr]">
                  <div className="overflow-y-auto space-y-3 p-4">
                    <section className="grid grid-cols-1 gap-2 md:grid-cols-4">
                      <article className="rounded border border-[#2a3045] bg-[#161a24] p-3">
                        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#64748b]">Orcamento</p>
                        <p className="mt-1 font-mono text-[16px] font-semibold text-[#e2e8f0]">{quoteDetail.code}</p>
                      </article>
                      <article className="rounded border border-[#2a3045] bg-[#161a24] p-3 md:col-span-2">
                        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#64748b]">Cliente</p>
                        <p className="mt-1 text-[15px] font-semibold text-[#e2e8f0]">{quoteDetail.client_name}</p>
                      </article>
                      <article className="rounded border border-[#2a3045] bg-[#161a24] p-3">
                        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#64748b]">Total</p>
                        <p className="mt-1 font-mono text-[16px] font-semibold text-[#22c55e]">{brl(quoteDetail.total_amount)}</p>
                      </article>
                    </section>
                    <div className="mb-3 grid grid-cols-[0.7fr_2.4fr_1fr_1fr_1fr] rounded-t border-b border-[#2a3045] bg-[#1e2332] px-3 py-2 font-mono text-[11px] uppercase tracking-[0.12em] text-[#64748b]">
                      <span>#</span><span>Produto</span><span>Qtd</span><span>Unit.</span><span>Total</span>
                    </div>
                    {quoteDetail.items.map((item) => (
                      <div className="grid grid-cols-[0.7fr_2.4fr_1fr_1fr_1fr] border-b border-[#2a3045] px-3 py-2.5 text-[13px] text-[#e2e8f0]" key={item.id}>
                        <span className="font-mono text-[#64748b]">{String(item.line_no).padStart(2, "0")}</span>
                        <span>{item.product_name}</span>
                        <span className="font-mono">{item.quantity}</span>
                        <span className="font-mono">{brl(item.unit_price)}</span>
                        <span className="font-mono text-[#22c55e]">{brl(item.line_total)}</span>
                      </div>
                    ))}
                  </div>
                  <aside className={`overflow-y-auto border-l p-4 ${isLight ? "border-[#d1d9e6] bg-[#ffffff]" : "border-[#2a3045] bg-[#111827]"}`}>
                    <h3 className="mb-2 text-[13px] font-semibold uppercase tracking-[0.08em] text-[#94a3b8]">Timeline</h3>
                    <div className="mb-4 space-y-2 overflow-y-auto pr-1">
                      {quoteTimeline.length === 0 ? (
                        <p className="text-[12px] text-[#64748b]">Sem historico registrado.</p>
                      ) : (
                        quoteTimeline.map((row, index) => (
                          <div
                            className={`rounded border p-3 ${
                              isLight ? "border-[#d1d9e6] bg-[#f8fafc]" : "border-[#2a3045] bg-[#161a24]"
                            }`}
                            key={`${row.label}-${index}`}
                          >
                            <p className={`font-mono text-[11px] ${isLight ? "text-[#2563eb]" : "text-[#93c5fd]"}`}>{row.label}</p>
                            <p className={`mt-1 text-[13px] ${isLight ? "text-[#0f172a]" : "text-[#e2e8f0]"}`}>{row.note}</p>
                            <p className="mt-1 font-mono text-[10px] text-[#64748b]">{dmyhm(row.value)}</p>
                          </div>
                        ))
                      )}
                    </div>
                    <h3 className="mb-2 mt-4 text-[13px] font-semibold uppercase tracking-[0.08em] text-[#94a3b8]">Anexos</h3>
                    <label className="mb-2 inline-flex h-8 cursor-pointer items-center rounded border border-dashed border-[#3a4260] bg-[#161a24] px-3 font-mono text-[11px] text-[#94a3b8] transition hover:border-[#64748b] hover:text-[#e2e8f0]">
                      + Adicionar anexo
                      <input className="hidden" multiple onChange={(event) => onAttachmentUpload(event.target.files)} type="file" />
                    </label>
                    <div className="mb-4 space-y-1.5">
                      {currentAttachments.length === 0 ? <p className="font-mono text-[11px] text-[#64748b]">Sem anexos.</p> : currentAttachments.map((item) => (
                        <div className="flex items-center gap-2 rounded border border-[#2a3045] bg-[#161a24] px-2 py-1.5" key={item.id}>
                          <span className="line-clamp-1 flex-1 font-mono text-[11px] text-[#e2e8f0]">{item.name}</span>
                          <button className="font-mono text-[10px] text-[#94a3b8] transition hover:text-[#fca5a5]" onClick={() => removeAttachment(item.id)} type="button">remover</button>
                        </div>
                      ))}
                    </div>
                    <h3 className="mb-2 text-[13px] font-semibold uppercase tracking-[0.08em] text-[#94a3b8]">Observacoes</h3>
                    <textarea className="h-24 w-full rounded border border-[#2a3045] bg-[#161a24] px-3 py-2 text-[12px] text-[#e2e8f0] outline-none focus:border-[#3b82f6]" onChange={(event) => setNoteDraft(event.target.value)} placeholder="Digite observacoes comerciais do orcamento..." value={noteDraft} />
                    <button className="mt-2 h-8 rounded border border-[#2a3045] bg-[#1e2332] px-3 text-[12px] text-[#e2e8f0] transition hover:border-[#3a4260]" onClick={saveCurrentNote} type="button">Salvar observacao</button>
                  </aside>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <div className="erp-toast-stack">
        {toasts.map((toastItem) => <div className={`erp-toast ${toastItem.type === "success" ? "erp-toast-success" : "erp-toast-error"}`} key={toastItem.id}>{toastItem.message}</div>)}
      </div>
    </ErpShell>
  );
}
