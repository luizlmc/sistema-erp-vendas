"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ErpShell } from "@/components/ErpShell";
import { clearSession, getAccessToken } from "@/lib/session";
import {
  CompanyApiItem,
  CompanyCreatePayload,
  CompanyUpdatePayload,
  createCompanyRequest,
  deleteCompanyRequest,
  listCompaniesRequest,
  updateCompanyRequest,
} from "@/lib/api";

type StatusFilter = "all" | "active" | "inactive";
type RegimeFilter = "all" | "SN" | "LP" | "LR";
type SortBy = "recent" | "name_asc" | "name_desc";
type FieldErrors = Partial<Record<"code" | "cnpj" | "legalName" | "taxRegime" | "crt", string>>;
type StatusDates = { inactivatedAt?: string; reactivatedAt?: string };

type FormState = {
  code: string;
  cnpj: string;
  legalName: string;
  tradeName: string;
  porte: string;
  stateRegistration: string;
  cnae: string;
  taxRegime: "SN" | "LP" | "LR";
  crt: string;
  icmsRate: string;
  issRate: string;
  cep: string;
  street: string;
  number: string;
  district: string;
  city: string;
  uf: string;
  certPassword: string;
  certStatus: "valid" | "invalid";
  certDueDate: string;
  fiscalContact: string;
  fiscalEmail: string;
  phone: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  inactivatedAt: string;
  reactivatedAt: string;
};

const EMPTY_FORM: FormState = {
  code: "",
  cnpj: "",
  legalName: "",
  tradeName: "",
  porte: "LTDA",
  stateRegistration: "",
  cnae: "",
  taxRegime: "SN",
  crt: "1 - Simples Nacional",
  icmsRate: "12,00",
  issRate: "5,00",
  cep: "",
  street: "",
  number: "",
  district: "",
  city: "",
  uf: "SP",
  certPassword: "",
  certStatus: "invalid",
  certDueDate: "",
  fiscalContact: "",
  fiscalEmail: "",
  phone: "",
  isActive: true,
  createdAt: "",
  updatedAt: "",
  inactivatedAt: "",
  reactivatedAt: "",
};

const brl = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
const dmy = (value?: string | null, withTime = false) => {
  if (!value) return "--/--/----";
  const raw = String(value).trim();
  if (!raw) return "--/--/----";
  const normalized = raw.includes(" ") && !raw.includes("T") ? raw.replace(" ", "T") : raw;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return "--/--/----";
  const datePart = date.toLocaleDateString("pt-BR");
  if (!withTime) return datePart;
  const timePart = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `${datePart} ${timePart}`;
};

function toForm(company: CompanyApiItem, dates: StatusDates): FormState {
  return {
    code: company.code || "",
    cnpj: company.cnpj || "",
    legalName: company.legal_name || "",
    tradeName: company.trade_name || "",
    porte: company.porte || "LTDA",
    stateRegistration: company.state_registration || "",
    cnae: company.cnae || "",
    taxRegime: company.tax_regime || "SN",
    crt: company.crt || "",
    icmsRate: String(company.icms_rate ?? 12).replace(".", ","),
    issRate: String(company.iss_rate ?? 5).replace(".", ","),
    cep: company.cep || "",
    street: company.street || "",
    number: company.number || "",
    district: company.district || "",
    city: company.city || "",
    uf: company.uf || "SP",
    certPassword: company.cert_password || "",
    certStatus: company.cert_status || "invalid",
    certDueDate: company.cert_due_date || "",
    fiscalContact: company.fiscal_contact || "",
    fiscalEmail: company.fiscal_email || "",
    phone: company.phone || "",
    isActive: company.is_active,
    createdAt: dmy(company.created_at, true),
    updatedAt: dmy(company.updated_at, true),
    inactivatedAt: dates.inactivatedAt ? dmy(dates.inactivatedAt, true) : "",
    reactivatedAt: dates.reactivatedAt ? dmy(dates.reactivatedAt, true) : "",
  };
}

export default function CompaniesPage() {
  const router = useRouter();
  const [items, setItems] = useState<CompanyApiItem[]>([]);
  const [statusDates, setStatusDates] = useState<Record<number, StatusDates>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [regimeFilter, setRegimeFilter] = useState<RegimeFilter>("all");
  const [sortBy, setSortBy] = useState<SortBy>("recent");
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [error, setError] = useState("");
  const [kpiReady, setKpiReady] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [snapshot, setSnapshot] = useState<FormState | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const [toasts, setToasts] = useState<Array<{ id: number; message: string; type: "success" | "error" }>>([]);

  function toast(message: string, type: "success" | "error") {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((current) => [...current, { id, message, type }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((t) => t.id !== id));
    }, 3800);
  }

  function update<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field as keyof FieldErrors]: undefined }));
  }

  function resetToSnapshot() {
    if (!snapshot) return;
    setForm(snapshot);
    setFieldErrors({});
    toast("Edicao revertida para o ultimo estado salvo.", "success");
  }

  function openCreate() {
    setMode("create");
    setEditingId(null);
    const now = dmy(new Date().toISOString(), true);
    setForm({ ...EMPTY_FORM, code: `EMP-${String(Date.now()).slice(-4)}`, createdAt: now });
    setSnapshot(null);
    setFieldErrors({});
    setModalOpen(true);
  }

  function openEdit(company: CompanyApiItem) {
    const mapped = toForm(company, statusDates[company.id] || {});
    setMode("edit");
    setEditingId(company.id);
    setForm(mapped);
    setSnapshot(mapped);
    setFieldErrors({});
    setModalOpen(true);
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
    listCompaniesRequest(token, {
      page: 1,
      pageSize: 200,
      q: query,
      sortBy: "legal_name",
      sortDir: "asc",
      isActive: "all",
      taxRegime: "all",
    })
      .then((response) => {
        if (cancel) return;
        setItems(response.items);
      })
      .catch((requestError) => {
        const message = requestError instanceof Error ? requestError.message : "Falha ao carregar empresas.";
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

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    const base = items.filter((company) => {
      if (statusFilter === "active" && !company.is_active) return false;
      if (statusFilter === "inactive" && company.is_active) return false;
      if (regimeFilter !== "all" && company.tax_regime !== regimeFilter) return false;
      if (!q) return true;
      return (
        (company.legal_name || "").toLowerCase().includes(q) ||
        (company.trade_name || "").toLowerCase().includes(q) ||
        (company.cnpj || "").toLowerCase().includes(q) ||
        (company.code || "").toLowerCase().includes(q)
      );
    });
    const arr = [...base];
    if (sortBy === "name_asc") arr.sort((a, b) => (a.legal_name || "").localeCompare(b.legal_name || "", "pt-BR"));
    else if (sortBy === "name_desc") arr.sort((a, b) => (b.legal_name || "").localeCompare(a.legal_name || "", "pt-BR"));
    else arr.sort((a, b) => b.id - a.id);
    return arr;
  }, [items, query, sortBy, statusFilter, regimeFilter]);

  const kpis = useMemo(() => {
    const active = items.filter((company) => company.is_active).length;
    const inactive = items.length - active;
    const sn = items.filter((company) => company.tax_regime === "SN").length;
    const est = items.reduce((acc, item) => acc + (item.icms_rate || 0), 0) * 100;
    return { active, inactive, sn, est };
  }, [items]);

  const pageSize = 8;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const paged = filtered.slice(start, start + pageSize);
  const end = filtered.length === 0 ? 0 : Math.min(filtered.length, start + pageSize);

  function validate() {
    const next: FieldErrors = {};
    if (!form.code.trim()) next.code = "Obrigatorio";
    if (!form.cnpj.trim()) next.cnpj = "Obrigatorio";
    if (!form.legalName.trim()) next.legalName = "Obrigatorio";
    if (!form.taxRegime.trim()) next.taxRegime = "Obrigatorio";
    if (!form.crt.trim()) next.crt = "Obrigatorio";
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!validate()) {
      toast("Preencha os campos obrigatorios destacados.", "error");
      return;
    }
    const token = getAccessToken();
    if (!token) {
      clearSession();
      router.replace("/");
      return;
    }
    const payload: CompanyCreatePayload = {
      code: form.code.trim(),
      cnpj: form.cnpj.trim(),
      legal_name: form.legalName.trim(),
      trade_name: form.tradeName.trim(),
      porte: form.porte.trim(),
      state_registration: form.stateRegistration.trim(),
      cnae: form.cnae.trim(),
      tax_regime: form.taxRegime,
      crt: form.crt.trim(),
      icms_rate: Number(form.icmsRate.replace(",", ".")) || 0,
      iss_rate: Number(form.issRate.replace(",", ".")) || 0,
      cep: form.cep.trim(),
      street: form.street.trim(),
      number: form.number.trim(),
      district: form.district.trim(),
      city: form.city.trim(),
      uf: form.uf.trim(),
      cert_password: form.certPassword.trim(),
      cert_status: form.certStatus,
      cert_due_date: form.certDueDate.trim() || undefined,
      fiscal_contact: form.fiscalContact.trim(),
      fiscal_email: form.fiscalEmail.trim(),
      phone: form.phone.trim(),
      is_active: form.isActive,
    };
    setSaving(true);
    try {
      if (mode === "create") {
        await createCompanyRequest(token, payload);
        toast("Empresa criada com sucesso.", "success");
      } else if (editingId) {
        const updatePayload: CompanyUpdatePayload = { ...payload };
        await updateCompanyRequest(token, editingId, updatePayload);
        toast("Empresa atualizada com sucesso.", "success");
      }
      setModalOpen(false);
      setReload((current) => current + 1);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Falha ao salvar empresa.";
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

  async function toggleActive(company: CompanyApiItem) {
    const token = getAccessToken();
    if (!token) {
      clearSession();
      router.replace("/");
      return;
    }
    setTogglingId(company.id);
    try {
      await deleteCompanyRequest(token, company.id);
      const nowIso = new Date().toISOString();
      setStatusDates((current) => {
        const base = current[company.id] || {};
        return {
          ...current,
          [company.id]: company.is_active ? { ...base, inactivatedAt: nowIso } : { ...base, reactivatedAt: nowIso },
        };
      });
      toast(company.is_active ? "Empresa inativada com sucesso." : "Empresa reativada com sucesso.", "success");
      setReload((current) => current + 1);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Falha ao atualizar status da empresa.";
      if (message === "unauthorized") {
        clearSession();
        router.replace("/");
        return;
      }
      toast(message, "error");
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <ErpShell activeNav="empresas" onLogout={() => {}} pageTitle="Empresas">
      {loading ? (
        <section className="flex h-full min-h-full w-full items-center justify-center rounded-md border border-[#2a3045] bg-[#161a24] p-6">
          <div className="flex flex-col items-center gap-3">
            <span className="h-10 w-10 animate-spin rounded-full border-2 border-[#2a3045] border-t-[#3b82f6]" />
            <span className="text-sm text-[#94a3b8]">Carregando empresas...</span>
          </div>
        </section>
      ) : (
        <div className="space-y-3">
        <header className="erp-page-header">
          <div>
            <h1 className="erp-page-title">Empresas</h1>
            <p className="erp-page-subtitle mt-1">Cadastro, manutencao e situacao fiscal das empresas emissoras</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button className="erp-btn erp-btn-secondary" onClick={() => setReload((current) => current + 1)} type="button">Atualizar</button>
            <button className="erp-btn erp-btn-primary" onClick={openCreate} type="button">
              <span className="erp-icon-plus">add</span>
              Nova empresa
            </button>
          </div>
        </header>
        <section className="grid grid-cols-1 gap-2 md:grid-cols-4">
          {[
            { t: "EMPRESAS ATIVAS", v: String(kpis.active), s: "Com emissao habilitada", c: "bg-[#3b82f6]", d: "0ms" },
            { t: "EMPRESAS INATIVAS", v: String(kpis.inactive), s: "Sem emissao fiscal", c: "bg-[#ef4444]", d: "60ms" },
            { t: "SIMPLES NACIONAL", v: String(kpis.sn), s: "Regime tributario SN", c: "bg-[#22c55e]", d: "120ms" },
            { t: "ICMS ESTIMADO", v: brl(kpis.est), s: "Media consolidada", c: "bg-[#f59e0b]", d: "180ms" },
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

        <section className="rounded-md border border-[#2a3045] bg-[#161a24]">
          <div className="flex flex-wrap items-center gap-2 border-b border-[#2a3045] bg-[#1e2332] p-3">
            <div className="erp-list-search-wrap min-w-[260px]">
              <input
                className="erp-list-search-input pl-10"
                onChange={(event) => setQueryInput(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && setQuery(queryInput.trim())}
                placeholder="Buscar empresa, CNPJ, codigo..."
                value={queryInput}
              />
              <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-[#64748b]">search</span>
              <button className="erp-list-search-btn" onClick={() => setQuery(queryInput.trim())} type="button">
                <span className="material-symbols-outlined !text-[18px]">search</span>
              </button>
            </div>
            <button className={`erp-filter-btn ${showFilters ? "erp-filter-btn-on" : "erp-filter-btn-off"}`} onClick={() => setShowFilters((current) => !current)} type="button"><span className="material-symbols-outlined !text-[16px]">tune</span>Filtros</button>
            <label className="erp-sort-label inline-flex h-9 items-center gap-2">
              ORDENAR POR:
              <select className="erp-list-sort-select" onChange={(event) => setSortBy(event.target.value as SortBy)} value={sortBy}>
                <option value="recent">Mais recente</option>
                <option value="name_asc">Nome (A-Z)</option>
                <option value="name_desc">Nome (Z-A)</option>
              </select>
            </label>
          </div>

          {showFilters ? (
            <div className="grid gap-3 border-b border-[#2a3045] bg-[#161a24] p-3 md:grid-cols-3">
              <label className="grid gap-1 text-xs text-[#64748b]">
                Status
                <select className="h-10 rounded border border-[#2a3045] bg-[#1e2332] px-3 text-[13px] text-[#e2e8f0]" onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} value={statusFilter}>
                  <option value="all">Todos</option>
                  <option value="active">Ativas</option>
                  <option value="inactive">Inativas</option>
                </select>
              </label>
              <label className="grid gap-1 text-xs text-[#64748b]">
                Regime
                <select className="h-10 rounded border border-[#2a3045] bg-[#1e2332] px-3 text-[13px] text-[#e2e8f0]" onChange={(event) => setRegimeFilter(event.target.value as RegimeFilter)} value={regimeFilter}>
                  <option value="all">Todos</option>
                  <option value="SN">Simples Nacional</option>
                  <option value="LP">Lucro Presumido</option>
                  <option value="LR">Lucro Real</option>
                </select>
              </label>
              <div className="flex items-end">
                <button className="erp-list-action-btn h-10 px-3 text-[13px]" onClick={() => {
                  setStatusFilter("all");
                  setRegimeFilter("all");
                  setSortBy("recent");
                  setQueryInput("");
                  setQuery("");
                }} type="button">Limpar filtros</button>
              </div>
            </div>
          ) : null}

          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead className="bg-[#1e2332]">
                <tr className="text-left font-mono text-[11px] tracking-[0.16em] text-[#64748b]">
                  <th className="px-4 py-3">CODIGO</th>
                  <th className="px-4 py-3">EMPRESA</th>
                  <th className="px-4 py-3">CNPJ</th>
                  <th className="px-4 py-3">REGIME</th>
                  <th className="px-4 py-3">STATUS</th>
                  <th className="px-4 py-3">CRIACAO</th>
                  <th className="px-4 py-3 text-right">ACOES</th>
                </tr>
              </thead>
              <tbody>
                {paged.length === 0 ? (
                  <tr><td className="px-4 py-6 text-sm text-[#64748b]" colSpan={7}>Nenhuma empresa encontrada.</td></tr>
                ) : (
                  paged.map((company) => (
                    <tr key={company.id} className="cursor-pointer border-t border-[#2a3045] text-[14px] text-[#e2e8f0] transition hover:bg-[#1e2332]" onClick={() => openEdit(company)}>
                      <td className="px-4 py-3 font-mono text-[#93c5fd]">{company.code}</td>
                      <td className="px-4 py-3"><div className="font-semibold">{company.legal_name}</div><div className="text-xs text-[#64748b]">{company.trade_name || "Sem fantasia"}</div></td>
                      <td className="px-4 py-3 font-mono text-[#94a3b8]">{company.cnpj}</td>
                      <td className="px-4 py-3">{company.tax_regime}</td>
                      <td className="px-4 py-3"><span className={`erp-tag ${company.is_active ? "erp-tag-success" : "erp-tag-danger"}`}>{company.is_active ? "Ativa" : "Inativa"}</span></td>
                      <td className="px-4 py-3 font-mono text-[12px] text-[#64748b]">{dmy(company.created_at)}</td>
                      <td className="px-4 py-3"><div className="flex justify-end gap-2">
                        <button className="erp-list-action-btn" onClick={(event) => { event.stopPropagation(); openEdit(company); }} type="button">Abrir</button>
                        <button className="erp-list-action-btn" onClick={(event) => { event.stopPropagation(); openEdit(company); }} type="button">Editar</button>
                        <button className={`erp-list-action-btn ${company.is_active ? "border-[#991b1b] bg-[#7f1d1d] text-[#fca5a5] hover:border-[#b91c1c] hover:bg-[#8f2222]" : "border-[#166534] bg-[#14532d] text-[#86efac] hover:border-[#15803d] hover:bg-[#166534]"}`} disabled={togglingId === company.id} onClick={(event) => { event.stopPropagation(); void toggleActive(company); }} type="button">{togglingId === company.id ? "..." : company.is_active ? "Inativar" : "Reativar"}</button>
                      </div></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="erp-pagination-footer">
            <span>{filtered.length === 0 ? "Mostrando 0-0" : `Mostrando ${start + 1}-${end} de ${filtered.length}`}</span>
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

      {modalOpen ? (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-black/45 p-4 backdrop-blur-[1px]">
          <div className="h-[92vh] w-[min(1100px,98vw)] overflow-hidden rounded-md border border-[#2a3045] bg-[#0f1117] shadow-2xl">
            <div className="flex h-full flex-col">
              <div className="flex items-start gap-2 border-b border-[#2a3045] px-5 py-4">
                <div>
                  <h2 className="text-[16px] font-semibold text-[#e2e8f0]">{mode === "create" ? "Nova empresa" : form.legalName || "Empresa"}</h2>
                  <p className="mt-1 font-mono text-[11px] text-[#64748b]">CNPJ: {form.cnpj || "--"} · Regime: {form.taxRegime}</p>
                </div>
                <div className="ml-auto flex gap-2">
                  {mode === "edit" && snapshot ? <button className="rounded border border-[#2a3045] bg-[#1e2332] px-4 py-2 text-sm text-[#94a3b8]" onClick={resetToSnapshot} type="button">Cancelar edicao</button> : null}
                  <button className="rounded border border-[#2a3045] bg-[#1e2332] px-4 py-2 text-sm text-[#94a3b8]" onClick={() => setModalOpen(false)} type="button">Fechar</button>
                  <button className="rounded border border-[#166534] bg-[#14532d] px-4 py-2 text-sm text-[#86efac]" form="company-form" type="submit">{saving ? "Salvando..." : "Salvar"}</button>
                </div>
              </div>
              <form className="flex-1 space-y-3 overflow-y-auto p-4" id="company-form" onSubmit={save}>
                <section className="rounded-md border border-[#2a3045] bg-[#161a24]"><header className="flex items-center gap-2 border-b border-[#2a3045] bg-[#1e2332] px-4 py-2.5"><span className="rounded bg-[#1e3a5f] px-1.5 py-0.5 font-mono text-[10px] text-[#93c5fd]">01</span><h3 className="text-[13px] font-semibold text-[#e2e8f0]">Dados gerais</h3></header><div className="grid grid-cols-1 gap-3 p-4 xl:grid-cols-4">
                  <label className="grid gap-1 text-xs text-[#64748b]">Codigo *<input className={`h-10 rounded border px-3 text-[13px] ${fieldErrors.code ? "border-[#ef4444] bg-[#2d1518] text-[#fca5a5]" : "border-[#2a3045] bg-[#1e2332] text-[#e2e8f0]"}`} onChange={(event) => update("code", event.target.value)} value={form.code} /></label>
                  <label className="grid gap-1 text-xs text-[#64748b] xl:col-span-2">Razao social *<input className={`h-10 rounded border px-3 text-[13px] ${fieldErrors.legalName ? "border-[#ef4444] bg-[#2d1518] text-[#fca5a5]" : "border-[#2a3045] bg-[#1e2332] text-[#e2e8f0]"}`} onChange={(event) => update("legalName", event.target.value)} value={form.legalName} /></label>
                  <label className="grid gap-1 text-xs text-[#64748b]">Porte<select className="h-10 rounded border border-[#2a3045] bg-[#1e2332] px-3 text-[13px] text-[#e2e8f0]" onChange={(event) => update("porte", event.target.value)} value={form.porte}><option>ME</option><option>EPP</option><option>LTDA</option><option>S.A.</option></select></label>
                  <label className="grid gap-1 text-xs text-[#64748b]">CNPJ *<input className={`h-10 rounded border px-3 text-[13px] ${fieldErrors.cnpj ? "border-[#ef4444] bg-[#2d1518] text-[#fca5a5]" : "border-[#2a3045] bg-[#1e2332] text-[#e2e8f0]"}`} onChange={(event) => update("cnpj", event.target.value)} value={form.cnpj} /></label>
                  <label className="grid gap-1 text-xs text-[#64748b]">Nome fantasia<input className="h-10 rounded border border-[#2a3045] bg-[#1e2332] px-3 text-[13px] text-[#e2e8f0]" onChange={(event) => update("tradeName", event.target.value)} value={form.tradeName} /></label>
                  <label className="grid gap-1 text-xs text-[#64748b]">Inscricao estadual<input className="h-10 rounded border border-[#2a3045] bg-[#1e2332] px-3 text-[13px] text-[#e2e8f0]" onChange={(event) => update("stateRegistration", event.target.value)} value={form.stateRegistration} /></label>
                  <label className="grid gap-1 text-xs text-[#64748b]">CNAE<input className="h-10 rounded border border-[#2a3045] bg-[#1e2332] px-3 text-[13px] text-[#e2e8f0]" onChange={(event) => update("cnae", event.target.value)} value={form.cnae} /></label>
                </div></section>
                <section className="rounded-md border border-[#2a3045] bg-[#161a24]"><header className="flex items-center gap-2 border-b border-[#2a3045] bg-[#1e2332] px-4 py-2.5"><span className="rounded bg-[#1e3a5f] px-1.5 py-0.5 font-mono text-[10px] text-[#93c5fd]">02</span><h3 className="text-[13px] font-semibold text-[#e2e8f0]">Regime e aliquotas</h3></header><div className="grid grid-cols-1 gap-3 p-4 xl:grid-cols-4">
                  <label className="grid gap-1 text-xs text-[#64748b]">Regime *<select className={`h-10 rounded border px-3 text-[13px] ${fieldErrors.taxRegime ? "border-[#ef4444] bg-[#2d1518] text-[#fca5a5]" : "border-[#2a3045] bg-[#1e2332] text-[#e2e8f0]"}`} onChange={(event) => update("taxRegime", event.target.value as FormState["taxRegime"])} value={form.taxRegime}><option value="SN">Simples Nacional</option><option value="LP">Lucro Presumido</option><option value="LR">Lucro Real</option></select></label>
                  <label className="grid gap-1 text-xs text-[#64748b]">CRT *<input className={`h-10 rounded border px-3 text-[13px] ${fieldErrors.crt ? "border-[#ef4444] bg-[#2d1518] text-[#fca5a5]" : "border-[#2a3045] bg-[#1e2332] text-[#e2e8f0]"}`} onChange={(event) => update("crt", event.target.value)} value={form.crt} /></label>
                  <label className="grid gap-1 text-xs text-[#64748b]">% ICMS padrao<input className="h-10 rounded border border-[#2a3045] bg-[#1e2332] px-3 text-[13px] text-[#e2e8f0]" onChange={(event) => update("icmsRate", event.target.value)} value={form.icmsRate} /></label>
                  <label className="grid gap-1 text-xs text-[#64748b]">% ISS<input className="h-10 rounded border border-[#2a3045] bg-[#1e2332] px-3 text-[13px] text-[#e2e8f0]" onChange={(event) => update("issRate", event.target.value)} value={form.issRate} /></label>
                </div></section>
                <section className="rounded-md border border-[#2a3045] bg-[#161a24]"><header className="flex items-center gap-2 border-b border-[#2a3045] bg-[#1e2332] px-4 py-2.5"><span className="rounded bg-[#1e3a5f] px-1.5 py-0.5 font-mono text-[10px] text-[#93c5fd]">03</span><h3 className="text-[13px] font-semibold text-[#e2e8f0]">Endereco</h3></header><div className="grid grid-cols-1 gap-3 p-4 xl:grid-cols-4">
                  <label className="grid gap-1 text-xs text-[#64748b]">CEP<input className="h-10 rounded border border-[#2a3045] bg-[#1e2332] px-3 text-[13px] text-[#e2e8f0]" onChange={(event) => update("cep", event.target.value)} value={form.cep} /></label>
                  <label className="grid gap-1 text-xs text-[#64748b] xl:col-span-2">Logradouro<input className="h-10 rounded border border-[#2a3045] bg-[#1e2332] px-3 text-[13px] text-[#e2e8f0]" onChange={(event) => update("street", event.target.value)} value={form.street} /></label>
                  <label className="grid gap-1 text-xs text-[#64748b]">Numero<input className="h-10 rounded border border-[#2a3045] bg-[#1e2332] px-3 text-[13px] text-[#e2e8f0]" onChange={(event) => update("number", event.target.value)} value={form.number} /></label>
                  <label className="grid gap-1 text-xs text-[#64748b]">Bairro<input className="h-10 rounded border border-[#2a3045] bg-[#1e2332] px-3 text-[13px] text-[#e2e8f0]" onChange={(event) => update("district", event.target.value)} value={form.district} /></label>
                  <label className="grid gap-1 text-xs text-[#64748b]">Municipio<input className="h-10 rounded border border-[#2a3045] bg-[#1e2332] px-3 text-[13px] text-[#e2e8f0]" onChange={(event) => update("city", event.target.value)} value={form.city} /></label>
                  <label className="grid gap-1 text-xs text-[#64748b]">UF<input className="h-10 rounded border border-[#2a3045] bg-[#1e2332] px-3 text-[13px] text-[#e2e8f0]" onChange={(event) => update("uf", event.target.value)} value={form.uf} /></label>
                </div></section>
                <section className="rounded-md border border-[#2a3045] bg-[#161a24]"><header className="flex items-center gap-2 border-b border-[#2a3045] bg-[#1e2332] px-4 py-2.5"><span className="rounded bg-[#1e3a5f] px-1.5 py-0.5 font-mono text-[10px] text-[#93c5fd]">04</span><h3 className="text-[13px] font-semibold text-[#e2e8f0]">Contato e certificado</h3></header><div className="grid grid-cols-1 gap-3 p-4 xl:grid-cols-3">
                  <label className="grid gap-1 text-xs text-[#64748b]">Responsavel fiscal<input className="h-10 rounded border border-[#2a3045] bg-[#1e2332] px-3 text-[13px] text-[#e2e8f0]" onChange={(event) => update("fiscalContact", event.target.value)} value={form.fiscalContact} /></label>
                  <label className="grid gap-1 text-xs text-[#64748b]">E-mail fiscal<input className="h-10 rounded border border-[#2a3045] bg-[#1e2332] px-3 text-[13px] text-[#e2e8f0]" onChange={(event) => update("fiscalEmail", event.target.value)} value={form.fiscalEmail} /></label>
                  <label className="grid gap-1 text-xs text-[#64748b]">Telefone<input className="h-10 rounded border border-[#2a3045] bg-[#1e2332] px-3 text-[13px] text-[#e2e8f0]" onChange={(event) => update("phone", event.target.value)} value={form.phone} /></label>
                  <label className="grid gap-1 text-xs text-[#64748b]">Senha certificado<input className="h-10 rounded border border-[#2a3045] bg-[#1e2332] px-3 text-[13px] text-[#e2e8f0]" onChange={(event) => update("certPassword", event.target.value)} type="password" value={form.certPassword} /></label>
                  <label className="grid gap-1 text-xs text-[#64748b]">Status certificado<select className="h-10 rounded border border-[#2a3045] bg-[#1e2332] px-3 text-[13px] text-[#e2e8f0]" onChange={(event) => update("certStatus", event.target.value as FormState["certStatus"])} value={form.certStatus}><option value="valid">Valido</option><option value="invalid">Invalido</option></select></label>
                  <label className="grid gap-1 text-xs text-[#64748b]">Vencimento certificado<input className="h-10 rounded border border-[#2a3045] bg-[#1e2332] px-3 text-[13px] text-[#e2e8f0]" onChange={(event) => update("certDueDate", event.target.value)} placeholder="dd/mm/aaaa" value={form.certDueDate} /></label>
                </div></section>
                <section className="rounded-md border border-[#2a3045] bg-[#161a24]"><header className="flex items-center gap-2 border-b border-[#2a3045] bg-[#1e2332] px-4 py-2.5"><span className="rounded bg-[#1e3a5f] px-1.5 py-0.5 font-mono text-[10px] text-[#93c5fd]">05</span><h3 className="text-[13px] font-semibold text-[#e2e8f0]">Controle de datas e status</h3></header><div className="grid grid-cols-1 gap-3 p-4 xl:grid-cols-4">
                  <div className="rounded border border-[#2a3045] bg-[#1e2332] px-3 py-2"><p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#64748b]">Criacao</p><p className="mt-1 text-[13px] text-[#e2e8f0]">{form.createdAt || "--/--/----"}</p></div>
                  <div className="rounded border border-[#2a3045] bg-[#1e2332] px-3 py-2"><p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#64748b]">Ultima atualizacao</p><p className="mt-1 text-[13px] text-[#e2e8f0]">{form.updatedAt || "--/--/----"}</p></div>
                  <div className="rounded border border-[#2a3045] bg-[#1e2332] px-3 py-2"><p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#64748b]">Inativacao</p><p className="mt-1 text-[13px] text-[#e2e8f0]">{form.inactivatedAt || "--/--/----"}</p></div>
                  <div className="rounded border border-[#2a3045] bg-[#1e2332] px-3 py-2"><p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#64748b]">Reativacao</p><p className="mt-1 text-[13px] text-[#e2e8f0]">{form.reactivatedAt || "--/--/----"}</p></div>
                </div></section>
              </form>
            </div>
          </div>
        </div>
      ) : null}

      <div className="fixed right-5 top-5 z-[90] flex w-[340px] flex-col gap-2">
        {toasts.map((item) => (
          <div key={item.id} className={`rounded border px-4 py-3 text-sm shadow-lg ${item.type === "success" ? "border-[#166534] bg-[#14532d] text-[#dcfce7]" : "border-[#991b1b] bg-[#7f1d1d] text-[#fee2e2]"}`}>
            {item.message}
          </div>
        ))}
      </div>

      {error ? <div className="mt-3 rounded border border-[#991b1b] bg-[#7f1d1d] px-3 py-2 text-sm text-[#fee2e2]">{error}</div> : null}
    </ErpShell>
  );
}

