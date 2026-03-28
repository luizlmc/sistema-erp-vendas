"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ErpShell } from "@/components/ErpShell";
import { clearSession, getAccessToken } from "@/lib/session";
import {
  ClientApiItem,
  createClientRequest,
  listClientsRequest,
  updateClientRequest,
} from "@/lib/api";
const ACTIVE_CLIENTS_QUERY_KEY = ["catalog", "clients", "active"] as const;

type SortBy = "recent" | "name_asc" | "name_desc";
type StatusFilter = "all" | "active" | "inactive";
type PersonType = "Pessoa juridica" | "Pessoa fisica";
type PersonFilter = "all" | "pf" | "pj";
type LimitFilter = "all" | "0-5000" | "5000-20000" | "20000+";

type Purchase = { id: string; description: string; date: string; value: string; status: "Pago" | "A receber" };

type Client = {
  id: number;
  code: string;
  personType: PersonType;
  document: string;
  name: string;
  fantasyName: string;
  ie: string;
  ieIndicator: string;
  email: string;
  phoneWhatsapp: string;
  contactResponsible: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  municipio: string;
  uf: string;
  priceTable: string;
  defaultDiscount: string;
  creditLimit: string;
  paymentTerm: string;
  totalBought: string;
  customerSince: string;
  isActive: boolean;
  purchases: Purchase[];
};

type FormState = Omit<Client, "id" | "purchases" | "isActive"> & { isActive: "true" | "false" };
type ClientFieldErrorKey =
  | "code"
  | "personType"
  | "document"
  | "name"
  | "ieIndicator"
  | "email"
  | "phoneWhatsapp"
  | "cep"
  | "logradouro"
  | "numero"
  | "bairro"
  | "municipio"
  | "uf"
  | "priceTable"
  | "defaultDiscount"
  | "creditLimit"
  | "paymentTerm";
type ClientFieldErrors = Partial<Record<ClientFieldErrorKey, string>>;

const INITIAL: Client[] = [
  {
    id: 1,
    code: "CLI-0001",
    personType: "Pessoa juridica",
    document: "12.345.678/0001-99",
    name: "Tech Distribuidora LTDA",
    fantasyName: "TechDist",
    ie: "111.222.333.444",
    ieIndicator: "1 - Contribuinte",
    email: "contato@techdist.com.br",
    phoneWhatsapp: "(11) 3456-7890",
    contactResponsible: "Joao Mendes",
    cep: "01310-100",
    logradouro: "Av. Paulista",
    numero: "1000",
    complemento: "Sala 42",
    bairro: "Bela Vista",
    municipio: "Sao Paulo",
    uf: "SP",
    priceTable: "Padrao",
    defaultDiscount: "5,00",
    creditLimit: "20.000,00",
    paymentTerm: "30 dias",
    totalBought: "148.200,00",
    customerSince: "10/01/2023",
    isActive: true,
    purchases: [
      { id: "#5521", description: "4x Notebook Lenovo i5", date: "17/03/2026", value: "R$ 13.196,00", status: "Pago" },
      { id: "#5489", description: "2x Monitor LG 24\" + 10x Teclado", date: "02/03/2026", value: "R$ 6.199,00", status: "Pago" },
      { id: "#5401", description: "20x Mouse Gamer + 5x Headset", date: "15/02/2026", value: "R$ 6.925,00", status: "A receber" },
    ],
  },
  {
    id: 2,
    code: "CLI-0002",
    personType: "Pessoa fisica",
    document: "987.654.321-00",
    name: "Marcos Ferreira",
    fantasyName: "",
    ie: "",
    ieIndicator: "9 - Nao contribuinte",
    email: "marcos@email.com",
    phoneWhatsapp: "(11) 97777-2233",
    contactResponsible: "Marcos Ferreira",
    cep: "04021-001",
    logradouro: "Rua Augusta",
    numero: "500",
    complemento: "",
    bairro: "Consolacao",
    municipio: "Sao Paulo",
    uf: "SP",
    priceTable: "Padrao",
    defaultDiscount: "2,00",
    creditLimit: "5.000,00",
    paymentTerm: "A vista",
    totalBought: "4.820,00",
    customerSince: "12/02/2024",
    isActive: true,
    purchases: [],
  },
];

const EMPTY_FORM: FormState = {
  code: "",
  personType: "Pessoa juridica",
  document: "",
  name: "",
  fantasyName: "",
  ie: "",
  ieIndicator: "1 - Contribuinte",
  email: "",
  phoneWhatsapp: "",
  contactResponsible: "",
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  municipio: "",
  uf: "SP",
  priceTable: "Padrao",
  defaultDiscount: "0,00",
  creditLimit: "0,00",
  paymentTerm: "30 dias",
  totalBought: "0,00",
  customerSince: new Date().toLocaleDateString("pt-BR"),
  isActive: "true",
};

const brl = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
const moneyToNumber = (v: string) => Number(v.replace(/\./g, "").replace(",", ".")) || 0;
const dmy = (value?: string | null) => {
  if (!value) return "--/--/----";
  const raw = String(value).trim();
  if (!raw) return "--/--/----";

  const normalizeIsoLike = raw.includes(" ") && !raw.includes("T") ? raw.replace(" ", "T") : raw;
  let date = new Date(normalizeIsoLike);
  if (!Number.isNaN(date.getTime())) return date.toLocaleDateString("pt-BR");

  const dmyMatch = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (dmyMatch) {
    const [, dd, mm, yyyy] = dmyMatch;
    date = new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
    if (!Number.isNaN(date.getTime())) return date.toLocaleDateString("pt-BR");
  }

  const ymdMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymdMatch) {
    const [, yyyy, mm, dd] = ymdMatch;
    date = new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
    if (!Number.isNaN(date.getTime())) return date.toLocaleDateString("pt-BR");
  }

  return "--/--/----";
};

function apiClientToUi(client: ClientApiItem): Client {
  const isPf = (client.document_type || "").toUpperCase() === "CPF";
  return {
    id: client.id,
    code: `CLI-${String(client.id).padStart(4, "0")}`,
    personType: isPf ? "Pessoa fisica" : "Pessoa juridica",
    document: client.document || "",
    name: client.name || "",
    fantasyName: "",
    ie: "",
    ieIndicator: "1 - Contribuinte",
    email: client.email || "",
    phoneWhatsapp: client.phone || "",
    contactResponsible: "",
    cep: "",
    logradouro: "",
    numero: "",
    complemento: "",
    bairro: "",
    municipio: "",
    uf: "SP",
    priceTable: "Padrao",
    defaultDiscount: "0,00",
    creditLimit: "0,00",
    paymentTerm: "30 dias",
    totalBought: "0,00",
    customerSince: dmy(client.created_at),
    isActive: client.is_active,
    purchases: [],
  };
}

export default function ClientsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [items, setItems] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [personFilter, setPersonFilter] = useState<PersonFilter>("all");
  const [ufFilter, setUfFilter] = useState("all");
  const [limitFilter, setLimitFilter] = useState<LimitFilter>("all");
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("recent");
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<ClientFieldErrors>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [kpiReady, setKpiReady] = useState(false);
  const [toasts, setToasts] = useState<Array<{ id: number; message: string; type: "success" | "error" }>>([]);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace("/");
      return;
    }

    let cancel = false;
    setLoading(true);
    setError("");

    listClientsRequest(token, {
      page: 1,
      pageSize: 200,
      q: query,
      sortBy: "name",
      sortDir: "asc",
      isActive: "all",
    })
      .then((response) => {
        if (cancel) return;
        setItems(response.items.map(apiClientToUi));
      })
      .catch((requestError) => {
        const message = requestError instanceof Error ? requestError.message : "Falha ao carregar clientes.";
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
  }, [router, query, reload]);

  useEffect(() => {
    if (loading) return;
    setKpiReady(false);
    const timer = window.setTimeout(() => setKpiReady(true), 80);
    return () => window.clearTimeout(timer);
  }, [loading, items.length]);

  const ufs = useMemo(() => {
    const set = new Set<string>();
    items.forEach((c) => {
      const uf = (c.uf || "").trim().toUpperCase();
      if (uf) set.add(uf);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    const base = items.filter((c) => {
      if (statusFilter === "active" && !c.isActive) return false;
      if (statusFilter === "inactive" && c.isActive) return false;
      if (personFilter === "pj" && c.personType !== "Pessoa juridica") return false;
      if (personFilter === "pf" && c.personType !== "Pessoa fisica") return false;
      if (ufFilter !== "all" && c.uf.toUpperCase() !== ufFilter) return false;

      const limit = moneyToNumber(c.creditLimit);
      if (limitFilter === "0-5000" && !(limit >= 0 && limit <= 5000)) return false;
      if (limitFilter === "5000-20000" && !(limit > 5000 && limit <= 20000)) return false;
      if (limitFilter === "20000+" && !(limit > 20000)) return false;

      if (!q) return true;
      return (
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.document.toLowerCase().includes(q) ||
        (c.email || "").toLowerCase().includes(q) ||
        (c.phoneWhatsapp || "").toLowerCase().includes(q)
      );
    });
    const arr = [...base];
    if (sortBy === "name_asc") arr.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    if (sortBy === "name_desc") arr.sort((a, b) => b.name.localeCompare(a.name, "pt-BR"));
    if (sortBy === "recent") arr.sort((a, b) => b.id - a.id);
    return arr;
  }, [items, query, sortBy, statusFilter, personFilter, ufFilter, limitFilter]);
  const pageSize = 8;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filtered.length);
  const pagedFiltered = filtered.slice(startIndex, endIndex);

  useEffect(() => {
    setPage(1);
  }, [query, sortBy, statusFilter, personFilter, ufFilter, limitFilter]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const kpis = useMemo(() => {
    const total = items.length;
    const active = items.filter((c) => c.isActive).length;
    const avg = total ? items.reduce((acc, c) => acc + moneyToNumber(c.creditLimit), 0) / total : 0;
    return { total, active, avg, inactive: total - active };
  }, [items]);

  const editingClient = items.find((c) => c.id === editingId) ?? null;
  const req = <span className="ml-1 align-middle font-mono text-[12px] leading-none text-[#ef4444]">*</span>;

  function toast(message: string, type: "success" | "error") {
    const id = Date.now();
    setToasts((s) => [...s, { id, message, type }]);
    window.setTimeout(() => setToasts((s) => s.filter((t) => t.id !== id)), 3500);
  }

  function openCreate() {
    setMode("create");
    setEditingId(null);
    const nextId = items.length > 0 ? Math.max(...items.map((item) => item.id)) + 1 : 1;
    setForm({ ...EMPTY_FORM, code: `CLI-${String(nextId).padStart(4, "0")}` });
    setFormError("");
    setFieldErrors({});
    setModalOpen(true);
  }

  function openEdit(client: Client) {
    setMode("edit");
    setEditingId(client.id);
    setForm({ ...client, isActive: String(client.isActive) as "true" | "false" });
    setFormError("");
    setFieldErrors({});
    setModalOpen(true);
  }

  function validateForm(values: FormState): ClientFieldErrors {
    const errors: ClientFieldErrors = {};
    if (!values.code.trim()) errors.code = "Código é obrigatório.";
    if (!values.personType.trim()) errors.personType = "Tipo é obrigatório.";
    if (!values.document.trim()) errors.document = "Documento é obrigatório.";
    if (!values.name.trim()) errors.name = "Nome/Razão social é obrigatório.";
    if (!values.ieIndicator.trim()) errors.ieIndicator = "Indicador IE é obrigatório.";
    if (!values.email.trim()) errors.email = "E-mail é obrigatório.";
    if (!values.phoneWhatsapp.trim()) errors.phoneWhatsapp = "Telefone é obrigatório.";
    if (!values.cep.trim()) errors.cep = "CEP é obrigatório.";
    if (!values.logradouro.trim()) errors.logradouro = "Logradouro é obrigatório.";
    if (!values.numero.trim()) errors.numero = "Número é obrigatório.";
    if (!values.bairro.trim()) errors.bairro = "Bairro é obrigatório.";
    if (!values.municipio.trim()) errors.municipio = "Município é obrigatório.";
    if (!values.uf.trim()) errors.uf = "UF é obrigatória.";
    if (!values.priceTable.trim()) errors.priceTable = "Tabela de preço é obrigatória.";
    if (!values.defaultDiscount.trim()) errors.defaultDiscount = "Desconto padrão é obrigatório.";
    if (!values.creditLimit.trim()) errors.creditLimit = "Limite de crédito é obrigatório.";
    if (!values.paymentTerm.trim()) errors.paymentTerm = "Prazo de pagamento é obrigatório.";
    return errors;
  }

  function clearFieldError(key: ClientFieldErrorKey) {
    setFieldErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function inputClass(key: ClientFieldErrorKey) {
    return `h-10 rounded border bg-[#1e2332] px-3 text-[13px] text-[#e2e8f0] outline-none ${
      fieldErrors[key] ? "border-[#ef4444] ring-1 ring-[#ef4444]" : "border-[#2a3045]"
    }`;
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    const validationErrors = validateForm(form);
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      setFormError("");
      const firstError = Object.values(validationErrors)[0] || "Corrija os campos obrigatórios destacados.";
      toast(firstError, "error");
      return;
    }
    setFieldErrors({});
    setSaving(true);
    try {
      const token = getAccessToken();
      if (!token) {
        clearSession();
        router.replace("/");
        return;
      }

      const payload = {
        document_type: form.personType === "Pessoa fisica" ? "CPF" : "CNPJ",
        document: form.document.trim(),
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phoneWhatsapp.trim(),
        is_active: form.isActive === "true",
      };

      if (mode === "create") {
        await createClientRequest(token, payload);
        toast("Cliente criado com sucesso.", "success");
      } else if (editingId) {
        await updateClientRequest(token, editingId, payload);
        toast("Cliente atualizado com sucesso.", "success");
      }

      await queryClient.invalidateQueries({ queryKey: ACTIVE_CLIENTS_QUERY_KEY });
      setReload((value) => value + 1);
      setModalOpen(false);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Falha ao salvar cliente.";
      if (message === "unauthorized") {
        clearSession();
        router.replace("/");
        return;
      }
      toast(message, "error");
    } finally {
      setSaving(false);
    }
  }

  async function inactivate() {
    if (!editingId) return;
    setDeleting(true);
    try {
      const token = getAccessToken();
      if (!token) {
        clearSession();
        router.replace("/");
        return;
      }

      await updateClientRequest(token, editingId, { is_active: false });
      toast("Cliente inativado com sucesso.", "success");
      await queryClient.invalidateQueries({ queryKey: ACTIVE_CLIENTS_QUERY_KEY });
      setReload((value) => value + 1);
      setModalOpen(false);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Falha ao inativar cliente.";
      if (message === "unauthorized") {
        clearSession();
        router.replace("/");
        return;
      }
      toast(message, "error");
    } finally {
      setDeleting(false);
    }
  }

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((s) => ({ ...s, [key]: value }));
    clearFieldError(key as ClientFieldErrorKey);
  };

  return (
    <ErpShell activeNav="clientes" pageTitle="Cadastro de Clientes" headerRight={<div />} onLogout={() => { clearSession(); router.replace("/"); }}>
      <div className="space-y-3">
        <div className="erp-page-header">
          <div className="flex items-center gap-3">
            <h1 className="erp-page-title">Clientes</h1>
            <span className="erp-page-subtitle">Visão geral do cadastro</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="erp-btn erp-btn-secondary"
              onClick={() => setReload((v) => v + 1)}
              type="button"
            >
              Atualizar
            </button>
            <button className="erp-btn erp-btn-primary" onClick={openCreate} type="button">
              <span className="erp-icon-plus">add</span>
              Novo cliente
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
          {[
            { t: "TOTAL CLIENTES", v: String(kpis.total), s: "Clientes na base cadastral", c: "bg-[#3b82f6]", d: "0ms" },
            { t: "CLIENTES ATIVOS", v: String(kpis.active), s: "Habilitados para venda", c: "bg-[#22c55e]", d: "60ms" },
            { t: "LIMITE MEDIO", v: brl(kpis.avg), s: "Media de limite de credito", c: "bg-[#f59e0b]", d: "120ms" },
            { t: "CLIENTES INATIVOS", v: String(kpis.inactive), s: "Bloqueados ou suspensos", c: "bg-[#ef4444]", d: "180ms" },
          ].map((k) => (
            <article className={`erp-kpi-card flex min-h-[118px] flex-col items-start justify-between text-left transition-all duration-200 ease-out hover:-translate-y-[1px] hover:border-[#3a4260] hover:shadow-[0_8px_18px_rgba(0,0,0,0.24)] ${kpiReady ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"}`} style={{ transitionDelay: k.d }} key={k.t}>
              <div className={`erp-kpi-line ${k.c}`} />
              <p className="font-mono text-xs font-semibold uppercase tracking-wider text-[#475569]">{k.t}</p>
              <h2 className="mt-1.5 font-mono text-3xl font-bold leading-none text-[#e2e8f0]">{k.v}</h2>
              <p className="text-[11px] text-[#64748b]">{k.s}</p>
            </article>
          ))}
        </div>

        <section className="rounded-md border border-[#2a3045] bg-[#161a24]">
          <div className="flex flex-wrap items-center gap-2 border-b border-[#2a3045] bg-[#1e2332] px-4 py-2.5">
            <div className="erp-list-search-wrap min-w-[260px]">
              <input
                className="erp-list-search-input"
                placeholder="Buscar por cliente, codigo, documento..."
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && setQuery(queryInput.trim())}
              />
              <button className="erp-list-search-btn" onClick={() => setQuery(queryInput.trim())} type="button">
                <span className="material-symbols-outlined !text-[16px]">search</span>
              </button>
            </div>
            <button className={`erp-filter-btn ${showFilters ? "erp-filter-btn-on" : "erp-filter-btn-off"}`} onClick={() => setShowFilters((v) => !v)} type="button"><span className="material-symbols-outlined !text-[16px]">tune</span>Filtros</button>
            <span className="erp-sort-label ml-2">ORDENAR:</span>
            <select className="erp-list-sort-select" value={sortBy} onChange={(e) => setSortBy(e.target.value as SortBy)}>
              <option value="recent">Mais recentes</option><option value="name_asc">Nome A-Z</option><option value="name_desc">Nome Z-A</option>
            </select>
          </div>
          {showFilters ? (
            <div className="space-y-2 px-4 py-2">
              <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
                <label className="grid gap-1 text-[11px] font-mono uppercase tracking-[0.12em] text-[#64748b]">
                  Status
                  <select className="h-8 rounded border border-[#2a3045] bg-[#1e2332] px-3 text-[12px] normal-case text-[#e2e8f0]" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}>
                    <option value="all">Todos</option>
                    <option value="active">Ativos</option>
                    <option value="inactive">Inativos</option>
                  </select>
                </label>
                <label className="grid gap-1 text-[11px] font-mono uppercase tracking-[0.12em] text-[#64748b]">
                  Tipo
                  <select className="h-8 rounded border border-[#2a3045] bg-[#1e2332] px-3 text-[12px] normal-case text-[#e2e8f0]" value={personFilter} onChange={(e) => setPersonFilter(e.target.value as PersonFilter)}>
                    <option value="all">Todos</option>
                    <option value="pj">Pessoa jurídica</option>
                    <option value="pf">Pessoa física</option>
                  </select>
                </label>
                <label className="grid gap-1 text-[11px] font-mono uppercase tracking-[0.12em] text-[#64748b]">
                  UF
                  <select className="h-8 rounded border border-[#2a3045] bg-[#1e2332] px-3 text-[12px] normal-case text-[#e2e8f0]" value={ufFilter} onChange={(e) => setUfFilter(e.target.value)}>
                    <option value="all">Todas</option>
                    {ufs.map((uf) => (
                      <option key={uf} value={uf}>{uf}</option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1 text-[11px] font-mono uppercase tracking-[0.12em] text-[#64748b]">
                  Limite de crédito
                  <select className="h-8 rounded border border-[#2a3045] bg-[#1e2332] px-3 text-[12px] normal-case text-[#e2e8f0]" value={limitFilter} onChange={(e) => setLimitFilter(e.target.value as LimitFilter)}>
                    <option value="all">Todos</option>
                    <option value="0-5000">R$ 0 a R$ 5.000</option>
                    <option value="5000-20000">R$ 5.001 a R$ 20.000</option>
                    <option value="20000+">Acima de R$ 20.000</option>
                  </select>
                </label>
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  className="erp-list-action-btn h-8 px-3 text-[12px]"
                  onClick={() => {
                    setStatusFilter("all");
                    setPersonFilter("all");
                    setUfFilter("all");
                    setLimitFilter("all");
                    setQueryInput("");
                    setQuery("");
                  }}
                  type="button"
                >
                  Limpar filtros
                </button>
              </div>
            </div>
          ) : null}
          <div className="grid grid-cols-[1.1fr_2.2fr_1.2fr_1.2fr_1.2fr_0.7fr] border-b border-[#2a3045] bg-[#1e2332] px-4 py-3 font-mono text-[11px] uppercase tracking-[0.14em] text-[#64748b]">
            <span>Cliente</span><span>Dados</span><span>Data</span><span>Status</span><span>Limite</span><span className="text-right">Acoes</span>
          </div>
          {loading ? <p className="px-4 py-5 text-sm text-[#94a3b8]">Carregando clientes...</p> : pagedFiltered.map((c) => (
            <button className="grid w-full grid-cols-[1.1fr_2.2fr_1.2fr_1.2fr_1.2fr_0.7fr] items-center border-b border-[#2a3045] px-4 py-3 text-left hover:bg-[#1e2332]" key={c.id} onClick={() => openEdit(c)} type="button">
              <div><p className="font-mono text-[13px] font-bold text-[#3b82f6]">#{c.code}</p><p className="font-mono text-[10px] text-[#64748b]">{c.document}</p></div>
              <div><p className="text-[14px] font-semibold text-[#e2e8f0]">{c.name}</p><p className="font-mono text-[10px] text-[#64748b]">{c.fantasyName || "--"}</p></div>
              <div className="font-mono text-[12px] text-[#94a3b8]">{c.customerSince}</div>
              <div><span className={`erp-tag ${c.isActive ? "erp-tag-success" : "erp-tag-danger"}`}>{c.isActive ? "Ativo" : "Inativo"}</span></div>
              <div className="font-mono text-[13px] text-[#e2e8f0]">R$ {c.creditLimit}</div>
              <div className="flex justify-end"><span className="material-symbols-outlined !text-[18px] text-[#64748b]">more_vert</span></div>
            </button>
          ))}
                    {!loading ? (
            <div className="erp-pagination-footer">
              <span>{filtered.length === 0 ? "Mostrando 0-0" : `Mostrando ${startIndex + 1}-${endIndex} de ${filtered.length}`}</span>
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
          ) : null}
        </section>

        {modalOpen ? (
          <div className="fixed inset-0 z-[70] grid place-items-center bg-black/70 p-4">
            <div className="h-[92vh] w-[min(1040px,98vw)] overflow-hidden rounded-md border border-[#2a3045] bg-[#0f1117] shadow-2xl">
              <div className="flex h-full flex-col">
                <div className="flex items-start gap-2 border-b border-[#2a3045] px-5 py-4">
                  <div>
                    <h2 className="text-[16px] font-semibold text-[#e2e8f0]">{form.name || "Novo cliente"}</h2>
                    <p className="mt-1 font-mono text-[11px] text-[#64748b]">{form.code || "CLI-NEW"} · Cliente desde: {form.customerSince} · Total comprado: R$ {form.totalBought}</p>
                  </div>
                  <div className="ml-auto flex gap-2">
                    {mode === "edit" ? <button className="rounded border border-[#991b1b] bg-[#7f1d1d] px-4 py-2 text-sm text-[#fca5a5]" onClick={inactivate} type="button">{deleting ? "Inativando..." : "Inativar"}</button> : null}
                    <button className="rounded border border-[#2a3045] bg-[#1e2332] px-4 py-2 text-sm text-[#94a3b8]" onClick={() => setModalOpen(false)} type="button">Cancelar</button>
                    <button className="rounded border border-[#166534] bg-[#14532d] px-4 py-2 text-sm text-[#86efac]" form="client-form" type="submit">{saving ? "Salvando..." : "Salvar"}</button>
                  </div>
                </div>

                <form className="client-modal flex-1 space-y-3 overflow-y-auto p-4" id="client-form" onSubmit={save}>
                  <section className="rounded-md border border-[#2a3045] bg-[#161a24]"><header className="flex items-center gap-2 border-b border-[#2a3045] bg-[#1e2332] px-4 py-2.5"><span className="rounded bg-[#1e3a5f] px-1.5 py-0.5 font-mono text-[10px] text-[#93c5fd]">01</span><h3 className="text-[13px] font-semibold text-[#e2e8f0]">Identificacao</h3></header>
                    <div className="grid grid-cols-1 gap-3 p-4 xl:grid-cols-6">
                      <label className="grid gap-1 text-xs text-[#64748b] xl:col-span-2"><span className="inline-flex items-center">Tipo {req}</span><select className={inputClass("personType")} value={form.personType} onChange={(e) => setField("personType", e.target.value as PersonType)}><option>Pessoa juridica</option><option>Pessoa fisica</option></select>{fieldErrors.personType ? <span className="text-[11px] text-[#ef4444]">{fieldErrors.personType}</span> : null}</label>
                      <label className="grid gap-1 text-xs text-[#64748b] xl:col-span-2"><span className="inline-flex items-center">{form.personType === "Pessoa fisica" ? "CPF" : "CNPJ"} {req}</span><input className={inputClass("document")} value={form.document} onChange={(e) => setField("document", e.target.value)} />{fieldErrors.document ? <span className="text-[11px] text-[#ef4444]">{fieldErrors.document}</span> : null}</label>
                      <label className="grid gap-1 text-xs text-[#64748b] xl:col-span-2"><span className="inline-flex items-center">Razao social / Nome {req}</span><input className={inputClass("name")} value={form.name} onChange={(e) => setField("name", e.target.value)} />{fieldErrors.name ? <span className="text-[11px] text-[#ef4444]">{fieldErrors.name}</span> : null}</label>
                      <label className="grid gap-1 text-xs text-[#64748b] xl:col-span-2">Nome fantasia<input className="h-10 rounded border border-[#2a3045] bg-[#1e2332] px-3 text-[13px] text-[#e2e8f0]" value={form.fantasyName} onChange={(e) => setField("fantasyName", e.target.value)} /></label>
                      <label className="grid gap-1 text-xs text-[#64748b] xl:col-span-2">Inscricao estadual<input className="h-10 rounded border border-[#2a3045] bg-[#1e2332] px-3 text-[13px] text-[#e2e8f0]" value={form.ie} onChange={(e) => setField("ie", e.target.value)} /></label>
                      <label className="grid gap-1 text-xs text-[#64748b] xl:col-span-2"><span className="inline-flex items-center">Indicador IE {req}</span><select className={inputClass("ieIndicator")} value={form.ieIndicator} onChange={(e) => setField("ieIndicator", e.target.value)}><option>1 - Contribuinte</option><option>2 - Isento</option><option>9 - Nao contribuinte</option></select>{fieldErrors.ieIndicator ? <span className="text-[11px] text-[#ef4444]">{fieldErrors.ieIndicator}</span> : null}</label>
                    </div>
                  </section>

                  <section className="rounded-md border border-[#2a3045] bg-[#161a24]"><header className="flex items-center gap-2 border-b border-[#2a3045] bg-[#1e2332] px-4 py-2.5"><span className="rounded bg-[#1e3a5f] px-1.5 py-0.5 font-mono text-[10px] text-[#93c5fd]">02</span><h3 className="text-[13px] font-semibold text-[#e2e8f0]">Contato</h3></header>
                    <div className="grid grid-cols-1 gap-3 p-4 xl:grid-cols-3">
                      <label className="grid gap-1 text-xs text-[#64748b]"><span className="inline-flex items-center">E-mail {req}</span><input className={inputClass("email")} value={form.email} onChange={(e) => setField("email", e.target.value)} />{fieldErrors.email ? <span className="text-[11px] text-[#ef4444]">{fieldErrors.email}</span> : null}</label>
                      <label className="grid gap-1 text-xs text-[#64748b]"><span className="inline-flex items-center">Telefone / WhatsApp {req}</span><input className={inputClass("phoneWhatsapp")} value={form.phoneWhatsapp} onChange={(e) => setField("phoneWhatsapp", e.target.value)} />{fieldErrors.phoneWhatsapp ? <span className="text-[11px] text-[#ef4444]">{fieldErrors.phoneWhatsapp}</span> : null}</label>
                      <label className="grid gap-1 text-xs text-[#64748b]">Contato responsavel<input className="h-10 rounded border border-[#2a3045] bg-[#1e2332] px-3 text-[13px] text-[#e2e8f0]" value={form.contactResponsible} onChange={(e) => setField("contactResponsible", e.target.value)} /></label>
                    </div>
                  </section>

                  <section className="rounded-md border border-[#2a3045] bg-[#161a24]"><header className="flex items-center gap-2 border-b border-[#2a3045] bg-[#1e2332] px-4 py-2.5"><span className="rounded bg-[#1e3a5f] px-1.5 py-0.5 font-mono text-[10px] text-[#93c5fd]">03</span><h3 className="text-[13px] font-semibold text-[#e2e8f0]">Endereco</h3></header>
                    <div className="grid grid-cols-1 gap-3 p-4 xl:grid-cols-8">
                      <label className="grid gap-1 text-xs text-[#64748b] xl:col-span-2"><span className="inline-flex items-center">CEP {req}</span><input className={inputClass("cep")} value={form.cep} onChange={(e) => setField("cep", e.target.value)} />{fieldErrors.cep ? <span className="text-[11px] text-[#ef4444]">{fieldErrors.cep}</span> : null}</label>
                      <label className="grid gap-1 text-xs text-[#64748b] xl:col-span-4"><span className="inline-flex items-center">Logradouro {req}</span><input className={inputClass("logradouro")} value={form.logradouro} onChange={(e) => setField("logradouro", e.target.value)} />{fieldErrors.logradouro ? <span className="text-[11px] text-[#ef4444]">{fieldErrors.logradouro}</span> : null}</label>
                      <label className="grid gap-1 text-xs text-[#64748b] xl:col-span-2"><span className="inline-flex items-center">Numero {req}</span><input className={inputClass("numero")} value={form.numero} onChange={(e) => setField("numero", e.target.value)} />{fieldErrors.numero ? <span className="text-[11px] text-[#ef4444]">{fieldErrors.numero}</span> : null}</label>
                      <label className="grid gap-1 text-xs text-[#64748b] xl:col-span-2">Complemento<input className="h-10 rounded border border-[#2a3045] bg-[#1e2332] px-3 text-[13px] text-[#e2e8f0]" value={form.complemento} onChange={(e) => setField("complemento", e.target.value)} /></label>
                      <label className="grid gap-1 text-xs text-[#64748b] xl:col-span-2"><span className="inline-flex items-center">Bairro {req}</span><input className={inputClass("bairro")} value={form.bairro} onChange={(e) => setField("bairro", e.target.value)} />{fieldErrors.bairro ? <span className="text-[11px] text-[#ef4444]">{fieldErrors.bairro}</span> : null}</label>
                      <label className="grid gap-1 text-xs text-[#64748b] xl:col-span-2"><span className="inline-flex items-center">Municipio {req}</span><input className={inputClass("municipio")} value={form.municipio} onChange={(e) => setField("municipio", e.target.value)} />{fieldErrors.municipio ? <span className="text-[11px] text-[#ef4444]">{fieldErrors.municipio}</span> : null}</label>
                      <label className="grid gap-1 text-xs text-[#64748b] xl:col-span-2"><span className="inline-flex items-center">UF {req}</span><select className={inputClass("uf")} value={form.uf} onChange={(e) => setField("uf", e.target.value)}><option>SP</option><option>RJ</option><option>MG</option><option>RS</option><option>PR</option><option>SC</option></select>{fieldErrors.uf ? <span className="text-[11px] text-[#ef4444]">{fieldErrors.uf}</span> : null}</label>
                    </div>
                  </section>

                  <section className="rounded-md border border-[#2a3045] bg-[#161a24]"><header className="flex items-center gap-2 border-b border-[#2a3045] bg-[#1e2332] px-4 py-2.5"><span className="rounded bg-[#1e3a5f] px-1.5 py-0.5 font-mono text-[10px] text-[#93c5fd]">04</span><h3 className="text-[13px] font-semibold text-[#e2e8f0]">Condicoes comerciais</h3></header>
                    <div className="grid grid-cols-1 gap-3 p-4 xl:grid-cols-4">
                      <label className="grid gap-1 text-xs text-[#64748b]"><span className="inline-flex items-center">Tabela de preco {req}</span><select className={inputClass("priceTable")} value={form.priceTable} onChange={(e) => setField("priceTable", e.target.value)}><option>Padrao</option><option>Atacado</option><option>Varejo</option></select>{fieldErrors.priceTable ? <span className="text-[11px] text-[#ef4444]">{fieldErrors.priceTable}</span> : null}</label>
                      <label className="grid gap-1 text-xs text-[#64748b]"><span className="inline-flex items-center">Desconto padrao (%) {req}</span><input className={inputClass("defaultDiscount")} value={form.defaultDiscount} onChange={(e) => setField("defaultDiscount", e.target.value)} />{fieldErrors.defaultDiscount ? <span className="text-[11px] text-[#ef4444]">{fieldErrors.defaultDiscount}</span> : null}</label>
                      <label className="grid gap-1 text-xs text-[#64748b]"><span className="inline-flex items-center">Limite de credito {req}</span><input className={inputClass("creditLimit")} value={form.creditLimit} onChange={(e) => setField("creditLimit", e.target.value)} />{fieldErrors.creditLimit ? <span className="text-[11px] text-[#ef4444]">{fieldErrors.creditLimit}</span> : null}</label>
                      <label className="grid gap-1 text-xs text-[#64748b]"><span className="inline-flex items-center">Prazo pagamento {req}</span><select className={inputClass("paymentTerm")} value={form.paymentTerm} onChange={(e) => setField("paymentTerm", e.target.value)}><option>30 dias</option><option>15 dias</option><option>A vista</option><option>30/60</option></select>{fieldErrors.paymentTerm ? <span className="text-[11px] text-[#ef4444]">{fieldErrors.paymentTerm}</span> : null}</label>
                    </div>
                  </section>

                  <section className="rounded-md border border-[#2a3045] bg-[#161a24]"><header className="flex items-center gap-2 border-b border-[#2a3045] bg-[#1e2332] px-4 py-2.5"><span className="rounded bg-[#1e3a5f] px-1.5 py-0.5 font-mono text-[10px] text-[#93c5fd]">05</span><h3 className="text-[13px] font-semibold text-[#e2e8f0]">Historico de compras</h3></header>
                    <div className="p-4">
                      <div className="grid grid-cols-[0.8fr_2.5fr_1fr_1fr_0.8fr] border-b border-[#2a3045] pb-2 font-mono text-[11px] uppercase tracking-[0.12em] text-[#64748b]"><span>#</span><span>Descricao</span><span className="text-right">Data</span><span className="text-right">Valor</span><span className="text-right">Status</span></div>
                      {(editingClient?.purchases ?? []).map((p) => (
                        <div className="grid grid-cols-[0.8fr_2.5fr_1fr_1fr_0.8fr] items-center border-b border-[#2a3045] py-2.5 text-[13px] text-[#e2e8f0]" key={p.id}>
                          <span className="font-mono text-[#64748b]">{p.id}</span><span>{p.description}</span><span className="text-right font-mono text-[#64748b]">{p.date}</span><span className="text-right font-mono text-[#22c55e]">{p.value}</span>
                          <span className="text-right"><span className={`inline-flex h-5 items-center rounded-[2px] px-2 font-mono text-[10px] ${p.status === "Pago" ? "bg-[#14532d] text-[#86efac]" : "bg-[#1e3a5f] text-[#93c5fd]"}`}>{p.status}</span></span>
                        </div>
                      ))}
                    </div>
                  </section>
                  {null}
                </form>
              </div>
            </div>
          </div>
        ) : null}

        <div className="erp-toast-stack">
          {toasts.map((toast) => (
            <div className={`erp-toast ${toast.type === "success" ? "erp-toast-success" : "erp-toast-error"}`} key={toast.id}>
              {toast.message}
            </div>
          ))}
        </div>
        <style jsx global>{`
          .client-modal [class*="text-[11px]"][class*="text-[#ef4444]"] {
            display: none !important;
          }
        `}</style>
      </div>
    </ErpShell>
  );
}

