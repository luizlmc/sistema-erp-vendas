"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Product,
  ProductCreatePayload,
  ProductUpdatePayload,
  createProductRequest,
  deleteProductRequest,
  listProductsRequest,
  updateProductRequest,
} from "@/lib/api";
import { ErpShell } from "@/components/ErpShell";
import { clearSession, getAccessToken } from "@/lib/session";

type SortBy = "recent" | "amount_desc" | "amount_asc" | "name_asc" | "name_desc";
type StatusFilter = "all" | "active" | "inactive";
type StockFilter = "all" | "critical" | "normal";
type PriceFilter = "all" | "0-100" | "100-500" | "500-1000" | "1000+";

type Extras = {
  brand: string;
  category: string;
  categoryId: string;
  unit: string;
  manufacturerRef: string;
  costPrice: string;
  margin: string;
  wholesalePrice: string;
  minPrice: string;
  discountMax: string;
  stockMin: string;
  stockMax: string;
  location: string;
  cest: string;
  extipi: string;
  cbenef: string;
  nve: string;
  indEscala: string;
  cnpjFab: string;
  origin: string;
  itemType: string;
  icmsCst: string;
  cfopInter: string;
  csosn: string;
  icmsModBc: string;
  icmsRedBc: string;
  icms: string;
  ipiCst: string;
  ipiCEnq: string;
  ipiAliq: string;
  pisCst: string;
  pis: string;
  cofinsCst: string;
  cofins: string;
  grossWeight: string;
  netWeight: string;
  notes: string;
};

type FormState = {
  sku: string;
  name: string;
  description: string;
  ncm: string;
  cfop: string;
  gtin: string;
  unitPrice: string;
  stockQty: string;
  isActive: boolean;
  extras: Extras;
};
type ProductFieldErrorKey =
  | "sku"
  | "name"
  | "gtin"
  | "ncm"
  | "cfop"
  | "unitPrice"
  | "stockQty"
  | "extras.unit"
  | "extras.stockMin"
  | "extras.origin"
  | "extras.itemType"
  | "extras.icmsCst"
  | "extras.csosn"
  | "extras.icmsModBc"
  | "extras.icmsRedBc"
  | "extras.icms"
  | "extras.ipiCst"
  | "extras.ipiCEnq"
  | "extras.ipiAliq"
  | "extras.pisCst"
  | "extras.pis"
  | "extras.cofinsCst"
  | "extras.cofins";
type ProductFieldErrors = Partial<Record<ProductFieldErrorKey, string>>;

const EMPTY_EXTRAS: Extras = {
  brand: "",
  category: "Informatica",
  categoryId: "",
  unit: "UN",
  manufacturerRef: "",
  costPrice: "0,00",
  margin: "0,00",
  wholesalePrice: "0,00",
  minPrice: "0,00",
  discountMax: "15,00",
  stockMin: "10",
  stockMax: "50",
  location: "A-12-03",
  cest: "",
  extipi: "",
  cbenef: "",
  nve: "",
  indEscala: "",
  cnpjFab: "",
  origin: "0 - Nacional",
  itemType: "04 - Mercadoria p/ revenda",
  icmsCst: "",
  cfopInter: "6102",
  csosn: "400 - Nao tributado",
  icmsModBc: "3",
  icmsRedBc: "0,00",
  icms: "12,00",
  ipiCst: "",
  ipiCEnq: "",
  ipiAliq: "0,00",
  pisCst: "07 - Oper. isenta",
  pis: "0,65",
  cofinsCst: "07 - Oper. isenta",
  cofins: "3,00",
  grossWeight: "0,000",
  netWeight: "0,000",
  notes: "",
};

const EMPTY_FORM: FormState = {
  sku: "",
  name: "",
  description: "",
  ncm: "",
  cfop: "5102",
  gtin: "SEM GTIN",
  unitPrice: "0,00",
  stockQty: "0",
  isActive: true,
  extras: { ...EMPTY_EXTRAS },
};

const dec = (value: string) => {
  const parsed = Number(String(value || "").replace(/\./g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
};

const brl = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

const dmy = (value?: string | null) => {
  if (!value) return "--/--/----";
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}):(\d{2}))?$/);
  const date = match
    ? new Date(
        Number(match[3]),
        Number(match[2]) - 1,
        Number(match[1]),
        Number(match[4] || "0"),
        Number(match[5] || "0"),
        Number(match[6] || "0"),
      )
    : new Date(value);
  return Number.isNaN(date.getTime()) ? "--/--/----" : date.toLocaleDateString("pt-BR");
};

export default function ProductsPage() {
  const router = useRouter();
  const [items, setItems] = useState<Product[]>([]);
  const [extrasById, setExtrasById] = useState<Record<number, Extras>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [priceFilter, setPriceFilter] = useState<PriceFilter>("all");
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("recent");
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<ProductFieldErrors>({});
  const [kpiReady, setKpiReady] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [toasts, setToasts] = useState<Array<{ id: number; message: string; type: "success" | "error" }>>([]);

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

    let cancel = false;
    setLoading(true);
    setError("");

    listProductsRequest(token, {
      page: 1,
      pageSize: 200,
      q: query,
      sortBy: "name",
      sortDir: "asc",
      isActive: "all",
    })
      .then((response) => {
        if (cancel) return;
        setItems(response.items);
        setExtrasById((current) => {
          const next = { ...current };
          response.items.forEach((product) => {
            if (!next[product.id]) {
              next[product.id] = {
                ...EMPTY_EXTRAS,
                brand: (product.name || "").split(" ")[0] || "",
                category: product.category_name || "Informatica",
                stockMin: product.stock_qty <= 5 ? "10" : "5",
              };
            }
          });
          return next;
        });
      })
      .catch((requestError) => {
        const message = requestError instanceof Error ? requestError.message : "Falha ao carregar produtos.";
        if (message === "unauthorized") {
          clearSession();
          router.replace("/");
          return;
        }
        if (!cancel) {
          setError(message);
          pushToast(message, "error");
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

  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((p) => {
      const category = (extrasById[p.id]?.category || p.category_name || "").trim();
      if (category) set.add(category);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [items, extrasById]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    const base = items.filter((p) => {
      if (statusFilter === "active" && !p.is_active) return false;
      if (statusFilter === "inactive" && p.is_active) return false;

      const min = Number(extrasById[p.id]?.stockMin ?? "10");
      const isCritical = p.is_active && p.stock_qty <= min;
      if (stockFilter === "critical" && !isCritical) return false;
      if (stockFilter === "normal" && isCritical) return false;

      const categoryName = (extrasById[p.id]?.category || p.category_name || "").trim();
      if (categoryFilter !== "all" && categoryName !== categoryFilter) return false;

      if (priceFilter === "0-100" && !(p.unit_price >= 0 && p.unit_price <= 100)) return false;
      if (priceFilter === "100-500" && !(p.unit_price > 100 && p.unit_price <= 500)) return false;
      if (priceFilter === "500-1000" && !(p.unit_price > 500 && p.unit_price <= 1000)) return false;
      if (priceFilter === "1000+" && !(p.unit_price > 1000)) return false;

      if (!q) return true;
      return (
        (p.sku ?? "").toLowerCase().includes(q) ||
        (p.name ?? "").toLowerCase().includes(q) ||
        (p.ncm ?? "").toLowerCase().includes(q) ||
        (p.description ?? "").toLowerCase().includes(q)
      );
    });
    const arr = [...base];
    if (sortBy === "amount_desc") arr.sort((a, b) => b.unit_price - a.unit_price);
    else if (sortBy === "amount_asc") arr.sort((a, b) => a.unit_price - b.unit_price);
    else if (sortBy === "name_asc") arr.sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "", "pt-BR"));
    else if (sortBy === "name_desc") arr.sort((a, b) => (b.name ?? "").localeCompare(a.name ?? "", "pt-BR"));
    else arr.sort((a, b) => b.id - a.id);
    return arr;
  }, [items, extrasById, query, sortBy, statusFilter, stockFilter, categoryFilter, priceFilter]);
  const pageSize = 8;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filtered.length);
  const pagedFiltered = filtered.slice(startIndex, endIndex);

  useEffect(() => {
    setPage(1);
  }, [query, sortBy, statusFilter, stockFilter, categoryFilter, priceFilter]);

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

  const kpi = useMemo(() => {
    const total = items.reduce((acc, p) => acc + Math.max(0, p.stock_qty) * Math.max(0, p.unit_price), 0);
    const active = items.filter((p) => p.is_active).length;
    const avg = items.length ? total / items.length : 0;
    const critical = items.filter((p) => p.is_active && p.stock_qty <= Number(extrasById[p.id]?.stockMin ?? "10")).length;
    return { total, active, avg, critical };
  }, [items, extrasById]);
  const req = <span className="ml-1 align-middle font-mono text-[12px] leading-none text-[#ef4444]">*</span>;

  function clearFieldError(key: ProductFieldErrorKey) {
    setFieldErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm((s) => ({ ...s, [k]: v }));
    clearFieldError(k as ProductFieldErrorKey);
  };
  const xupdate = <K extends keyof Extras>(k: K, v: Extras[K]) => {
    setForm((s) => ({ ...s, extras: { ...s.extras, [k]: v } }));
    clearFieldError(`extras.${k}` as ProductFieldErrorKey);
  };

  function validateForm(values: FormState): ProductFieldErrors {
    const errors: ProductFieldErrors = {};
    if (!values.sku.trim()) errors.sku = "SKU é obrigatório.";
    if (!values.name.trim()) errors.name = "Descrição é obrigatória.";
    if (!values.gtin.trim()) errors.gtin = "GTIN é obrigatório.";
    const ncmDigits = (values.ncm || "").replace(/\D/g, "");
    if (!ncmDigits) errors.ncm = "NCM é obrigatório.";
    else if (ncmDigits.length !== 8) errors.ncm = "NCM deve ter 8 dígitos (ex: 84713012).";
    if ((values.cfop || "").replace(/\D/g, "").length !== 4) errors.cfop = "CFOP deve ter 4 dígitos.";
    if (dec(values.unitPrice) <= 0) errors.unitPrice = "Preço de venda deve ser maior que zero.";
    if (values.stockQty.trim() === "") errors.stockQty = "Estoque atual é obrigatório.";
    if (!values.extras.unit.trim()) errors["extras.unit"] = "Unidade é obrigatória.";
    if (values.extras.stockMin.trim() === "") errors["extras.stockMin"] = "Estoque mínimo é obrigatório.";
    if (!values.extras.origin.trim()) errors["extras.origin"] = "Origem é obrigatória.";
    if (!values.extras.itemType.trim()) errors["extras.itemType"] = "Tipo do item é obrigatório.";
    if (!values.extras.csosn.trim()) errors["extras.csosn"] = "CSOSN/CST é obrigatório.";
    if (values.extras.icms.trim() === "") errors["extras.icms"] = "% ICMS é obrigatório.";
    if (!values.extras.pisCst.trim()) errors["extras.pisCst"] = "CST PIS é obrigatório.";
    if (values.extras.pis.trim() === "") errors["extras.pis"] = "% PIS é obrigatório.";
    if (!values.extras.cofinsCst.trim()) errors["extras.cofinsCst"] = "CST COFINS é obrigatório.";
    if (values.extras.cofins.trim() === "") errors["extras.cofins"] = "% COFINS é obrigatório.";
    return errors;
  }

  function fieldClass(key: ProductFieldErrorKey) {
    return `h-10 w-full rounded border bg-[#1e2332] px-3 text-[13px] text-[#e2e8f0] outline-none ${
      fieldErrors[key] ? "border-[#ef4444] ring-1 ring-[#ef4444]" : "border-[#2a3045]"
    }`;
  }

  function renderFieldError(message?: string) {
    return null;
  }

  function openCreate() {
    setMode("create");
    setEditingId(null);
    setForm({ ...EMPTY_FORM, extras: { ...EMPTY_EXTRAS } });
    setFormError("");
    setFieldErrors({});
    setModalOpen(true);
  }

  function openEdit(product: Product) {
    setMode("edit");
    setEditingId(product.id);
    const extras = extrasById[product.id] || EMPTY_EXTRAS;
    setForm({
      sku: product.sku || "",
      name: product.name || "",
      description: product.description || product.name || "",
      ncm: product.ncm || "",
      cfop: product.cfop || "5102",
      gtin: product.gtin || "SEM GTIN",
      unitPrice: String(product.unit_price || 0).replace(".", ","),
      stockQty: String(product.stock_qty || 0),
      isActive: !!product.is_active,
      extras: {
        ...extras,
        categoryId: product.category_id ? String(product.category_id) : extras.categoryId || "",
        cest: product.cest || extras.cest || "",
        extipi: product.extipi || extras.extipi || "",
        cbenef: product.cbenef || extras.cbenef || "",
        nve: product.nve || extras.nve || "",
        indEscala: product.ind_escala || extras.indEscala || "",
        cnpjFab: product.cnpj_fab || extras.cnpjFab || "",
        origin: product.icms_orig ? `${product.icms_orig} - Nacional` : extras.origin || "0 - Nacional",
        icmsCst: product.icms_cst || extras.icmsCst || "",
        csosn: product.icms_csosn || extras.csosn || "400",
        icmsModBc: product.icms_mod_bc || extras.icmsModBc || "3",
        icmsRedBc: String(product.icms_p_red_bc ?? 0).replace(".", ","),
        icms: String(product.icms_p_icms ?? 0).replace(".", ","),
        ipiCst: product.ipi_cst || extras.ipiCst || "",
        ipiCEnq: product.ipi_c_enq || extras.ipiCEnq || "",
        ipiAliq: String(product.ipi_p_ipi ?? 0).replace(".", ","),
        pisCst: product.pis_cst || extras.pisCst || "49",
        pis: String(product.pis_p_pis ?? 0).replace(".", ","),
        cofinsCst: product.cofins_cst || extras.cofinsCst || "49",
        cofins: String(product.cofins_p_cofins ?? 0).replace(".", ","),
      },
    });
    setFormError("");
    setFieldErrors({});
    setModalOpen(true);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const token = getAccessToken();
    if (!token) return;

    const digitsOnly = (value: string) => (value || "").replace(/\D/g, "");
    const blankToUndefined = (value: string) => (value.trim() === "" ? undefined : value.trim());
    const normalizeCode = (value: string, size: number) => {
      const digits = digitsOnly(value);
      return digits.length === size ? digits : "";
    };
    const ncmDigits = digitsOnly(form.ncm).slice(0, 8);
    const cfopDigits = digitsOnly(form.cfop).slice(0, 4);
    const csosn = normalizeCode(form.extras.csosn, 3);
    const icmsCst = normalizeCode(form.extras.icmsCst, 2);
    const icmsModBc = normalizeCode(form.extras.icmsModBc, 1);
    const ipiCst = normalizeCode(form.extras.ipiCst, 2);
    const ipiCEnq = normalizeCode(form.extras.ipiCEnq, 3);
    const pisCst = normalizeCode(form.extras.pisCst, 2) || "49";
    const cofinsCst = normalizeCode(form.extras.cofinsCst, 2) || "49";
    const categoryIdNumber =
      form.extras.categoryId.trim() !== "" && Number.isFinite(Number(form.extras.categoryId))
        ? Number(form.extras.categoryId)
        : undefined;

    const payload: ProductCreatePayload = {
      sku: form.sku.trim().toUpperCase(),
      name: form.name.trim(),
      description: (form.description || form.name).trim(),
      gtin: (form.gtin.trim() || "SEM GTIN").toUpperCase(),
      ncm: ncmDigits,
      cest: blankToUndefined(digitsOnly(form.extras.cest)),
      cfop: cfopDigits || "5102",
      unit_price: dec(form.unitPrice),
      stock_qty: dec(form.stockQty),
      is_active: form.isActive,
      u_com: form.extras.unit || "UN",
      u_trib: form.extras.unit || "UN",
      extipi: blankToUndefined(digitsOnly(form.extras.extipi)),
      cbenef: blankToUndefined(form.extras.cbenef.trim().toUpperCase()),
      nve: blankToUndefined(form.extras.nve.trim().toUpperCase()),
      ind_escala: blankToUndefined((form.extras.indEscala || "").trim().toUpperCase()),
      cnpj_fab: blankToUndefined(digitsOnly(form.extras.cnpjFab)),
      icms_orig: normalizeCode(form.extras.origin || "0", 1) || "0",
      icms_cst: blankToUndefined(icmsCst),
      icms_csosn: blankToUndefined(csosn),
      icms_mod_bc: blankToUndefined(icmsModBc),
      icms_p_red_bc: dec(form.extras.icmsRedBc),
      icms_p_icms: dec(form.extras.icms),
      ipi_cst: blankToUndefined(ipiCst),
      ipi_c_enq: blankToUndefined(ipiCEnq),
      ipi_p_ipi: dec(form.extras.ipiAliq),
      pis_cst: pisCst,
      pis_p_pis: dec(form.extras.pis),
      cofins_cst: cofinsCst,
      cofins_p_cofins: dec(form.extras.cofins),
      category_id: categoryIdNumber,
    };

    const validationErrors = validateForm(form);
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      setFormError("");
      const firstError = Object.values(validationErrors)[0] || "Corrija os campos obrigatórios destacados.";
      pushToast(firstError, "error");
      return;
    }

    try {
      setSaving(true);
      setFormError("");
      setFieldErrors({});
      if (mode === "create") {
        const created = await createProductRequest(token, payload);
        setExtrasById((current) => ({ ...current, [created.id]: { ...form.extras } }));
        pushToast("Produto criado com sucesso.", "success");
      } else if (editingId) {
        await updateProductRequest(token, editingId, payload as ProductUpdatePayload);
        setExtrasById((current) => ({ ...current, [editingId]: { ...form.extras } }));
        pushToast("Produto atualizado com sucesso.", "success");
      }
      setReload((r) => r + 1);
      setModalOpen(false);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Falha ao salvar.";
      setFormError(message);
      pushToast(message, "error");
    } finally {
      setSaving(false);
    }
  }

  async function inactivate() {
    if (!editingId || deleting) return;
    const token = getAccessToken();
    if (!token) return;
    try {
      setDeleting(true);
      await deleteProductRequest(token, editingId);
      pushToast("Produto inativado com sucesso.", "success");
      setReload((r) => r + 1);
      setModalOpen(false);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Falha ao inativar.";
      setFormError(message);
      pushToast(message, "error");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <ErpShell activeNav="produtos" onLogout={() => { clearSession(); router.replace("/"); }} pageTitle="Cadastro de Produtos" headerRight={<div />}>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#2a3045] px-3 pb-2 mb-3">
          <div className="flex items-center gap-3">
            <h1 className="text-[24px] font-semibold leading-none text-[#e2e8f0]">Produtos</h1>
            <span className="text-[12px] text-[#64748b]">Visão geral do cadastro</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="h-10 rounded-md border border-[#3a4260] bg-[#1e2332] px-3 text-[14px] font-medium text-[#e2e8f0] transition hover:border-[#4b556d] hover:bg-[#242a3b]"
              onClick={() => setReload((r) => r + 1)}
              type="button"
            >
              ↻ Atualizar
            </button>
            <button
              className="h-10 flex items-center gap-2 rounded border border-[#1d4ed8] bg-[#2563eb] px-5 text-[13px] font-semibold text-white hover:bg-[#1d4ed8]"
              onClick={openCreate}
              type="button"
            >
              <span className="material-symbols-outlined">add</span>
              Novo produto
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
          {[
            { t: "VALOR ESTOQUE", v: brl(kpi.total), s: "Valor acumulado em produtos", c: "bg-[#3b82f6]", d: "0ms" },
            { t: "PRODUTOS ATIVOS", v: String(kpi.active), s: "Itens disponiveis para venda", c: "bg-[#22c55e]", d: "60ms" },
            { t: "PRECO MEDIO", v: brl(kpi.avg), s: "Media dos precos atuais", c: "bg-[#f59e0b]", d: "120ms" },
            { t: "ESTOQUE CRITICO", v: String(kpi.critical), s: "Abaixo do minimo definido", c: "bg-[#ef4444]", d: "180ms" },
          ].map((card) => (
            <article
              key={card.t}
              className={`group relative flex min-h-[118px] flex-col items-start justify-between overflow-hidden rounded-md border border-[#2a3045] bg-[#161a24] px-4 py-2.5 text-left transition-all duration-200 ease-out hover:-translate-y-[1px] hover:border-[#3a4260] hover:shadow-[0_8px_18px_rgba(0,0,0,0.24)] ${kpiReady ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"}`}
              style={{ transitionDelay: card.d }}
            >
              <div className={`absolute inset-x-0 top-0 h-[2px] ${card.c}`} />
              <p className="font-mono text-xs font-semibold uppercase tracking-wider text-[#475569]">{card.t}</p>
              <h2 className="mt-1.5 font-mono text-3xl font-bold leading-none text-[#e2e8f0]">{card.v}</h2>
              <p className="mt-1.5 text-[11px] text-[#64748b]">{card.s}</p>
            </article>
          ))}
        </div>

        <section className="rounded-md border border-[#2a3045] bg-[#161a24]">
          <div className="flex flex-wrap items-center gap-2 border-b border-[#2a3045] bg-[#1e2332] px-4 py-2.5">
            <div className="relative min-w-[260px] flex-1">
              <input
                className="h-9 w-full rounded border border-[#2a3045] bg-[#161a24] pl-3 pr-10 text-[13px] text-[#e2e8f0] placeholder:text-[#64748b] outline-none focus:border-[#3b82f6]"
                onChange={(e) => setQueryInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && setQuery(queryInput.trim())}
                placeholder="Buscar por descricao, SKU, NCM..."
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
            <button className="inline-flex h-9 items-center gap-1 rounded border border-[#2a3045] bg-[#cbd5e1] px-3 text-[13px] font-semibold text-[#1f2937] transition hover:bg-[#dbe4ef]" onClick={() => setShowFilters((v) => !v)} type="button"><span className="material-symbols-outlined !text-[16px]">tune</span>Filtros</button>
            <span className="ml-2 font-mono text-[11px] uppercase tracking-[0.14em] text-[#64748b]">ORDENAR:</span>
            <select className="h-9 rounded border border-[#2a3045] bg-[#161a24] px-3 text-[13px] text-[#e2e8f0] outline-none focus:border-[#3b82f6]" onChange={(e) => setSortBy(e.target.value as SortBy)} value={sortBy}>
              <option value="recent">Mais recentes</option>
              <option value="amount_desc">Preco maior</option>
              <option value="amount_asc">Preco menor</option>
              <option value="name_asc">Nome A-Z</option>
              <option value="name_desc">Nome Z-A</option>
            </select>
          </div>
          {showFilters ? (
            <div className="space-y-2 px-4 py-2">
              <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
                <label className="grid gap-1 text-[11px] font-mono uppercase tracking-[0.12em] text-[#64748b]">
                  Status
                  <select className="h-8 rounded border border-[#2a3045] bg-[#1e2332] px-3 text-[12px] normal-case text-[#e2e8f0] outline-none focus:border-[#3b82f6]" onChange={(e) => setStatusFilter(e.target.value as StatusFilter)} value={statusFilter}>
                    <option value="all">Todos</option>
                    <option value="active">Ativos</option>
                    <option value="inactive">Inativos</option>
                  </select>
                </label>
                <label className="grid gap-1 text-[11px] font-mono uppercase tracking-[0.12em] text-[#64748b]">
                  Estoque
                  <select className="h-8 rounded border border-[#2a3045] bg-[#1e2332] px-3 text-[12px] normal-case text-[#e2e8f0] outline-none focus:border-[#3b82f6]" onChange={(e) => setStockFilter(e.target.value as StockFilter)} value={stockFilter}>
                    <option value="all">Todos</option>
                    <option value="critical">Crítico</option>
                    <option value="normal">Normal</option>
                  </select>
                </label>
                <label className="grid gap-1 text-[11px] font-mono uppercase tracking-[0.12em] text-[#64748b]">
                  Categoria
                  <select className="h-8 rounded border border-[#2a3045] bg-[#1e2332] px-3 text-[12px] normal-case text-[#e2e8f0] outline-none focus:border-[#3b82f6]" onChange={(e) => setCategoryFilter(e.target.value)} value={categoryFilter}>
                    <option value="all">Todas</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1 text-[11px] font-mono uppercase tracking-[0.12em] text-[#64748b]">
                  Faixa de preço
                  <select className="h-8 rounded border border-[#2a3045] bg-[#1e2332] px-3 text-[12px] normal-case text-[#e2e8f0] outline-none focus:border-[#3b82f6]" onChange={(e) => setPriceFilter(e.target.value as PriceFilter)} value={priceFilter}>
                    <option value="all">Todas</option>
                    <option value="0-100">R$ 0 a R$ 100</option>
                    <option value="100-500">R$ 101 a R$ 500</option>
                    <option value="500-1000">R$ 501 a R$ 1.000</option>
                    <option value="1000+">Acima de R$ 1.000</option>
                  </select>
                </label>
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  className="rounded border border-[#2a3045] bg-[#1e2332] px-3 py-1.5 text-[12px] text-[#94a3b8] transition hover:border-[#3a4260] hover:text-[#e2e8f0]"
                  onClick={() => {
                    setStatusFilter("all");
                    setStockFilter("all");
                    setCategoryFilter("all");
                    setPriceFilter("all");
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
          <div className="overflow-y-auto">
            <div className="grid grid-cols-[1.15fr_2.2fr_1.35fr_1.15fr_1.25fr_0.7fr] border-b border-[#2a3045] bg-[#1e2332] px-4 py-3 text-left font-mono text-[11px] uppercase tracking-[0.14em] text-[#64748b]">
              <span>Produto</span>
              <span>Descricao</span>
              <span>Data</span>
              <span>Status</span>
              <span>Valor</span>
              <span className="text-right">Acoes</span>
            </div>
            {loading ? (
              <p className="px-4 py-5 text-sm text-[#94a3b8]">Carregando produtos...</p>
            ) : filtered.length === 0 ? (
              <p className="px-4 py-5 text-sm text-[#94a3b8]">Nenhum produto encontrado.</p>
            ) : (
              pagedFiltered.map((p) => {
                const x = extrasById[p.id] || EMPTY_EXTRAS;
                const min = Number(x.stockMin || "10");
                const statusClass = !p.is_active
                  ? "bg-[#7f1d1d] text-[#fca5a5]"
                  : p.stock_qty <= min
                    ? "bg-[#451a03] text-[#fbbf24]"
                    : "bg-[#14532d] text-[#86efac]";

                return (
                  <button
                    className="grid w-full grid-cols-[1.15fr_2.2fr_1.35fr_1.15fr_1.25fr_0.7fr] items-center border-b border-[#2a3045] px-4 py-3 text-left transition hover:bg-[#1e2332]"
                    key={p.id}
                    onClick={() => openEdit(p)}
                    type="button"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-mono text-[13px] font-bold text-[#3b82f6]">#{p.sku || "--"}</p>
                      <p className="mt-0.5 font-mono text-[10px] text-[#64748b]">NCM {p.ncm || "--"}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-semibold text-[#e2e8f0]">{p.name || "Produto sem nome"}</p>
                      <p className="mt-0.5 font-mono text-[10px] text-[#64748b]">{x.category}{x.brand ? ` · ${x.brand}` : ""}</p>
                    </div>
                    <div className="font-mono text-[12px] text-[#94a3b8]">
                      <p>{dmy(p.created_at)}</p>
                      <p className="mt-0.5 text-[10px] text-[#64748b]">{dmy(p.updated_at)}</p>
                    </div>
                    <div>
                      <span className={`inline-flex h-5 items-center rounded-[2px] px-2 font-mono text-[10px] uppercase tracking-[0.08em] ${statusClass}`}>
                        {!p.is_active ? "Inativo" : p.stock_qty <= min ? "Critico" : "Ativo"}
                      </span>
                    </div>
                    <div className="text-left">
                      <p className="font-mono text-[13px] font-semibold text-[#e2e8f0]">{brl(p.unit_price)}</p>
                      <p className={`mt-0.5 font-mono text-[10px] ${p.stock_qty <= min ? "text-[#ef4444]" : "text-[#f59e0b]"}`}>{p.stock_qty} un. (min: {min})</p>
                    </div>
                    <div className="flex justify-end gap-1.5">
                      <span className="material-symbols-outlined !text-[18px] text-[#64748b]">more_vert</span>
                    </div>
                  </button>
                );
              })
            )}
            {!loading ? (
              <div className="flex items-center justify-between border-t border-[#2a3045] px-4 py-2 font-mono text-[12px] text-[#64748b]">
                <span>
                  {filtered.length === 0 ? "Mostrando 0-0" : `Mostrando ${startIndex + 1}-${endIndex}`}
                </span>
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
            ) : null}
          </div>
        </section>

        {modalOpen ? (
          <div className="fixed inset-0 z-[70] grid place-items-center bg-black/45 backdrop-blur-[1px] p-4">
            <div className="h-[92vh] w-[min(1040px,98vw)] overflow-hidden rounded-md border border-[#2a3045] bg-[#0f1117] shadow-2xl">
              <div className="flex h-full flex-col">
                <div className="flex items-start gap-2 border-b border-[#2a3045] px-5 py-4">
                  <div>
                    <h2 className="text-[16px] font-semibold text-[#e2e8f0]">{form.name || (mode === "create" ? "Novo produto" : "Produto")}</h2>
                    <p className="mt-1 font-mono text-[11px] text-[#64748b]">{form.sku || "PRD-NEW"} · Criado: {new Date().toLocaleDateString("pt-BR")} · Ultima venda: 17/03/2026</p>
                  </div>
                  <div className="ml-auto flex gap-2">
                    {mode === "edit" ? <button className="rounded border border-[#991b1b] bg-[#7f1d1d] px-4 py-2 text-sm text-[#fca5a5]" onClick={inactivate} type="button">{deleting ? "Inativando..." : "Inativar"}</button> : null}
                    <button className="rounded border border-[#2a3045] bg-[#1e2332] px-4 py-2 text-sm text-[#94a3b8]" onClick={() => setModalOpen(false)} type="button">Cancelar</button>
                    <button className="rounded border border-[#166534] bg-[#14532d] px-4 py-2 text-sm text-[#86efac]" form="product-form" type="submit">{saving ? "Salvando..." : "Salvar"}</button>
                  </div>
                </div>
                <form className="flex-1 space-y-3 overflow-y-auto p-4" id="product-form" onSubmit={submit}>
                  <section className="rounded-md border border-[#2a3045] bg-[#161a24]">
                    <header className="flex items-center gap-2 border-b border-[#2a3045] bg-[#1e2332] px-4 py-2.5">
                      <span className="rounded bg-[#1e3a5f] px-1.5 py-0.5 font-mono text-[10px] text-[#93c5fd]">01</span>
                      <h3 className="text-[13px] font-semibold text-[#e2e8f0]">Identificacao</h3>
                    </header>
                    <div className="grid grid-cols-1 gap-3 p-4 xl:grid-cols-4">
                      <label className="grid gap-1 text-xs text-[#64748b]">
                        <span className="inline-flex items-center">Codigo interno {req}</span>
                        <input className={fieldClass("sku")} onChange={(e) => update("sku", e.target.value)} value={form.sku} />
                        {renderFieldError(fieldErrors.sku)}
                      </label>
                      <label className="grid gap-1 text-xs text-[#64748b] xl:col-span-2">
                        <span className="inline-flex items-center">Descricao {req}</span>
                        <input className={fieldClass("name")} onChange={(e) => update("name", e.target.value)} value={form.name} />
                        {renderFieldError(fieldErrors.name)}
                      </label>
                      <label className="grid gap-1 text-xs text-[#64748b]">
                        Status
                        <select className="h-10 w-full rounded border border-[#2a3045] bg-[#1e2332] px-3 text-[13px] text-[#e2e8f0]" onChange={(e) => update("isActive", e.target.value === "true")} value={String(form.isActive)}>
                          <option value="true">Ativo</option>
                          <option value="false">Inativo</option>
                        </select>
                      </label>
                      <label className="grid gap-1 text-xs text-[#64748b]">
                        <span className="inline-flex items-center">Codigo de barras (EAN) {req}</span>
                        <input className={fieldClass("gtin")} onChange={(e) => update("gtin", e.target.value)} value={form.gtin} />
                        {renderFieldError(fieldErrors.gtin)}
                      </label>
                      <label className="grid gap-1 text-xs text-[#64748b]">
                        Referencia fabricante
                        <input className="h-10 w-full rounded border border-[#2a3045] bg-[#1e2332] px-3 text-[13px] text-[#e2e8f0]" onChange={(e) => xupdate("manufacturerRef", e.target.value)} value={form.extras.manufacturerRef} />
                      </label>
                      <label className="grid gap-1 text-xs text-[#64748b]">
                        Categoria
                        <select className="h-10 w-full rounded border border-[#2a3045] bg-[#1e2332] px-3 text-[13px] text-[#e2e8f0]" onChange={(e) => xupdate("category", e.target.value)} value={form.extras.category}>
                          <option>Informatica</option>
                          <option>Perifericos</option>
                          <option>Acessorios</option>
                          <option>Cabos</option>
                        </select>
                      </label>
                      <label className="grid gap-1 text-xs text-[#64748b]">
                        Marca
                        <input className="h-10 w-full rounded border border-[#2a3045] bg-[#1e2332] px-3 text-[13px] text-[#e2e8f0]" onChange={(e) => xupdate("brand", e.target.value)} value={form.extras.brand} />
                      </label>
                    </div>
                  </section>

                  <section className="rounded-md border border-[#2a3045] bg-[#161a24]">
                    <header className="flex items-center gap-2 border-b border-[#2a3045] bg-[#1e2332] px-4 py-2.5">
                      <span className="rounded bg-[#1e3a5f] px-1.5 py-0.5 font-mono text-[10px] text-[#93c5fd]">02</span>
                      <h3 className="text-[13px] font-semibold text-[#e2e8f0]">Precos e unidade</h3>
                    </header>
                    <div className="space-y-3 p-4">
                      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[repeat(4,minmax(0,1fr))] [&>*]:min-w-0">
                      <label className="grid gap-1 text-xs text-[#64748b]">
                        <span className="inline-flex items-center">Unidade {req}</span>
                        <select className={fieldClass("extras.unit")} onChange={(e) => xupdate("unit", e.target.value)} value={form.extras.unit}>
                          <option>UN</option>
                          <option>CX</option>
                          <option>KG</option>
                          <option>LT</option>
                        </select>
                        {renderFieldError(fieldErrors["extras.unit"])}
                      </label>
                        <label className="grid gap-1 text-xs text-[#64748b]">
                          Custo (R$)
                          <input className="h-10 w-full rounded border border-[#2a3045] bg-[#1e2332] px-3 text-[13px] text-[#e2e8f0]" onChange={(e) => xupdate("costPrice", e.target.value)} value={form.extras.costPrice} />
                        </label>
                      <label className="grid gap-1 text-xs text-[#64748b]">
                        <span className="inline-flex items-center">Venda (R$) {req}</span>
                        <input className={fieldClass("unitPrice")} onChange={(e) => update("unitPrice", e.target.value)} value={form.unitPrice} />
                        {renderFieldError(fieldErrors.unitPrice)}
                      </label>
                        <label className="grid gap-1 text-xs text-[#64748b]">
                          Margem (%)
                          <input className="h-10 w-full rounded border border-[#2a3045] bg-[#1e2332] px-3 text-[13px] text-[#e2e8f0]" onChange={(e) => xupdate("margin", e.target.value)} value={form.extras.margin} />
                        </label>
                      </div>
                      <div className="border-t border-[#2a3045] pt-3">
                        <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#64748b]">Precos alternativos</p>
                        <div className="mt-2 grid grid-cols-1 gap-3 xl:grid-cols-3">
                          <label className="grid gap-1 text-xs text-[#64748b]">
                            Preco atacado
                            <input className="h-10 w-full rounded border border-[#2a3045] bg-[#1e2332] px-3 text-[13px] text-[#e2e8f0]" onChange={(e) => xupdate("wholesalePrice", e.target.value)} value={form.extras.wholesalePrice} />
                          </label>
                          <label className="grid gap-1 text-xs text-[#64748b]">
                            Preco minimo
                            <input className="h-10 w-full rounded border border-[#2a3045] bg-[#1e2332] px-3 text-[13px] text-[#e2e8f0]" onChange={(e) => xupdate("minPrice", e.target.value)} value={form.extras.minPrice} />
                          </label>
                          <label className="grid gap-1 text-xs text-[#64748b]">
                            Desconto max. (%)
                            <input className="h-10 w-full rounded border border-[#2a3045] bg-[#1e2332] px-3 text-[13px] text-[#e2e8f0]" onChange={(e) => xupdate("discountMax", e.target.value)} value={form.extras.discountMax} />
                          </label>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="rounded-md border border-[#2a3045] bg-[#161a24]">
                    <header className="flex items-center gap-2 border-b border-[#2a3045] bg-[#1e2332] px-4 py-2.5">
                      <span className="rounded bg-[#1e3a5f] px-1.5 py-0.5 font-mono text-[10px] text-[#93c5fd]">03</span>
                      <h3 className="text-[13px] font-semibold text-[#e2e8f0]">Estoque</h3>
                    </header>
                    <div className="space-y-3 p-4">
                      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[repeat(4,minmax(0,1fr))] [&>*]:min-w-0">
                      <label className="grid gap-1 text-xs text-[#64748b]">
                        <span className="inline-flex items-center">Estoque atual {req}</span>
                        <input className={fieldClass("stockQty")} onChange={(e) => update("stockQty", e.target.value)} value={form.stockQty} />
                        {renderFieldError(fieldErrors.stockQty)}
                      </label>
                      <label className="grid gap-1 text-xs text-[#64748b]">
                        <span className="inline-flex items-center">Estoque minimo {req}</span>
                        <input className={fieldClass("extras.stockMin")} onChange={(e) => xupdate("stockMin", e.target.value)} value={form.extras.stockMin} />
                        {renderFieldError(fieldErrors["extras.stockMin"])}
                      </label>
                        <label className="grid gap-1 text-xs text-[#64748b]">
                          Estoque maximo
                          <input className="h-10 w-full rounded border border-[#2a3045] bg-[#1e2332] px-3 text-[13px] text-[#e2e8f0]" onChange={(e) => xupdate("stockMax", e.target.value)} value={form.extras.stockMax} />
                        </label>
                        <label className="grid gap-1 text-xs text-[#64748b]">
                          Localizacao
                          <input className="h-10 w-full rounded border border-[#2a3045] bg-[#1e2332] px-3 text-[13px] text-[#e2e8f0]" onChange={(e) => xupdate("location", e.target.value)} value={form.extras.location} />
                        </label>
                      </div>
                      {dec(form.stockQty) <= dec(form.extras.stockMin) ? (
                        <div className="rounded border border-[#dc2626] bg-[#2d1518] px-3 py-2 text-[13px] text-[#ef4444]">
                          ● CRITICO - Estoque abaixo do minimo. Repor imediatamente.
                        </div>
                      ) : null}
                    </div>
                  </section>

                  <section className="rounded-md border border-[#2a3045] bg-[#161a24]">
                    <header className="flex items-center gap-2 border-b border-[#2a3045] bg-[#1e2332] px-4 py-2.5">
                      <span className="rounded bg-[#1e3a5f] px-1.5 py-0.5 font-mono text-[10px] text-[#93c5fd]">04</span>
                      <h3 className="text-[13px] font-semibold text-[#e2e8f0]">Dados fiscais</h3>
                    </header>
                    <div className="space-y-3 p-4">
                      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[repeat(5,minmax(0,1fr))] [&>*]:min-w-0">
                      <label className="grid gap-1 text-xs text-[#64748b]">
                        <span className="inline-flex items-center">NCM {req}</span>
                        <input className={fieldClass("ncm")} onChange={(e) => update("ncm", e.target.value.replace(/\D/g, "").slice(0, 8))} value={form.ncm} />
                        {renderFieldError(fieldErrors.ncm)}
                      </label>
                        <label className="grid gap-1 text-xs text-[#64748b]">
                          CEST
                          <input className="h-10 w-full rounded border border-[#2a3045] bg-[#1e2332] px-3 text-[13px] text-[#e2e8f0]" onChange={(e) => xupdate("cest", e.target.value.replace(/\D/g, "").slice(0, 7))} value={form.extras.cest} />
                        </label>
                        <label className="grid gap-1 text-xs text-[#64748b]">
                          EXTIPI
                          <input className="h-10 w-full rounded border border-[#2a3045] bg-[#1e2332] px-3 text-[13px] text-[#e2e8f0]" onChange={(e) => xupdate("extipi", e.target.value.replace(/\D/g, "").slice(0, 3))} value={form.extras.extipi} />
                        </label>
                      <label className="grid gap-1 text-xs text-[#64748b]">
                        <span className="inline-flex items-center">Origem {req}</span>
                        <select className={fieldClass("extras.origin")} onChange={(e) => xupdate("origin", e.target.value)} value={form.extras.origin}>
                          <option>0 - Nacional</option>
                          <option>1 - Estrangeira</option>
                        </select>
                        {renderFieldError(fieldErrors["extras.origin"])}
                      </label>
                      <label className="grid gap-1 text-xs text-[#64748b]">
                        <span className="inline-flex items-center">Tipo do item {req}</span>
                        <select className={fieldClass("extras.itemType")} onChange={(e) => xupdate("itemType", e.target.value)} value={form.extras.itemType}>
                          <option>04 - Mercadoria p/ revenda</option>
                          <option>00 - Mercadoria p/ revenda</option>
                          <option>09 - Servico</option>
                        </select>
                        {renderFieldError(fieldErrors["extras.itemType"])}
                      </label>
                      </div>
                      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[repeat(5,minmax(0,1fr))] [&>*]:min-w-0">
                      <label className="grid gap-1 text-xs text-[#64748b]">
                        <span className="inline-flex items-center">CFOP saida (mesmo estado) {req}</span>
                        <input className={fieldClass("cfop")} onChange={(e) => update("cfop", e.target.value.replace(/\D/g, "").slice(0, 4))} value={form.cfop} />
                        {renderFieldError(fieldErrors.cfop)}
                      </label>
                        <label className="grid gap-1 text-xs text-[#64748b]">
                          CFOP saida (outro estado)
                          <input className="h-10 w-full rounded border border-[#2a3045] bg-[#1e2332] px-3 text-[13px] text-[#e2e8f0]" onChange={(e) => xupdate("cfopInter", e.target.value.replace(/\D/g, "").slice(0, 4))} value={form.extras.cfopInter} />
                        </label>
                      <label className="grid gap-1 text-xs text-[#64748b]">
                        ICMS CST
                        <select className={fieldClass("extras.icmsCst")} onChange={(e) => xupdate("icmsCst", e.target.value)} value={form.extras.icmsCst}>
                          <option value="">--</option>
                          <option value="00">00</option>
                          <option value="10">10</option>
                          <option value="20">20</option>
                          <option value="40">40</option>
                          <option value="41">41</option>
                          <option value="60">60</option>
                        </select>
                        {renderFieldError(fieldErrors["extras.icmsCst"])}
                      </label>
                      <label className="grid gap-1 text-xs text-[#64748b]">
                        <span className="inline-flex items-center">CSOSN / CST {req}</span>
                        <select className={fieldClass("extras.csosn")} onChange={(e) => xupdate("csosn", e.target.value)} value={form.extras.csosn}>
                          <option>400 - Nao tributado</option>
                          <option>101 - Trib. com credito</option>
                          <option>102 - Trib. sem credito</option>
                        </select>
                        {renderFieldError(fieldErrors["extras.csosn"])}
                      </label>
                      <label className="grid gap-1 text-xs text-[#64748b]">
                        Mod. BC
                        <select className={fieldClass("extras.icmsModBc")} onChange={(e) => xupdate("icmsModBc", e.target.value)} value={form.extras.icmsModBc}>
                          <option value="0">0</option>
                          <option value="1">1</option>
                          <option value="2">2</option>
                          <option value="3">3</option>
                        </select>
                        {renderFieldError(fieldErrors["extras.icmsModBc"])}
                      </label>
                      </div>
                      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[repeat(4,minmax(0,1fr))] [&>*]:min-w-0">
                      <label className="grid gap-1 text-xs text-[#64748b] xl:col-span-2">
                        % Red. BC
                        <input className={fieldClass("extras.icmsRedBc")} onChange={(e) => xupdate("icmsRedBc", e.target.value)} value={form.extras.icmsRedBc} />
                        {renderFieldError(fieldErrors["extras.icmsRedBc"])}
                      </label>
                      <label className="grid gap-1 text-xs text-[#64748b] xl:col-span-2">
                        <span className="inline-flex items-center">% ICMS {req}</span>
                        <input className={fieldClass("extras.icms")} onChange={(e) => xupdate("icms", e.target.value)} value={form.extras.icms} />
                        {renderFieldError(fieldErrors["extras.icms"])}
                      </label>
                      </div>
                      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[repeat(4,minmax(0,1fr))] [&>*]:min-w-0">
                        <label className="grid gap-1 text-xs text-[#64748b]">
                          IPI CST
                          <input className={fieldClass("extras.ipiCst")} onChange={(e) => xupdate("ipiCst", e.target.value)} value={form.extras.ipiCst} />
                          {renderFieldError(fieldErrors["extras.ipiCst"])}
                        </label>
                        <label className="grid gap-1 text-xs text-[#64748b]">
                          IPI cEnq
                          <input className={fieldClass("extras.ipiCEnq")} onChange={(e) => xupdate("ipiCEnq", e.target.value)} value={form.extras.ipiCEnq} />
                          {renderFieldError(fieldErrors["extras.ipiCEnq"])}
                        </label>
                        <label className="grid gap-1 text-xs text-[#64748b]">
                          % IPI
                          <input className={fieldClass("extras.ipiAliq")} onChange={(e) => xupdate("ipiAliq", e.target.value)} value={form.extras.ipiAliq} />
                          {renderFieldError(fieldErrors["extras.ipiAliq"])}
                        </label>
                        <label className="grid gap-1 text-xs text-[#64748b]">
                          cBenef
                          <input className="h-10 w-full rounded border border-[#2a3045] bg-[#1e2332] px-3 text-[13px] text-[#e2e8f0]" onChange={(e) => xupdate("cbenef", e.target.value)} value={form.extras.cbenef} />
                        </label>
                      </div>
                      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[repeat(4,minmax(0,1fr))] [&>*]:min-w-0">
                        <label className="grid gap-1 text-xs text-[#64748b]">
                          NVE
                          <input className="h-10 w-full rounded border border-[#2a3045] bg-[#1e2332] px-3 text-[13px] text-[#e2e8f0]" onChange={(e) => xupdate("nve", e.target.value)} value={form.extras.nve} />
                        </label>
                        <label className="grid gap-1 text-xs text-[#64748b]">
                          Ind. escala
                          <select className="h-10 w-full rounded border border-[#2a3045] bg-[#1e2332] px-3 text-[13px] text-[#e2e8f0]" onChange={(e) => xupdate("indEscala", e.target.value)} value={form.extras.indEscala}>
                            <option value="">--</option>
                            <option value="S">S</option>
                            <option value="N">N</option>
                          </select>
                        </label>
                        <label className="grid gap-1 text-xs text-[#64748b] xl:col-span-2">
                          CNPJ fabricante
                          <input className="h-10 w-full rounded border border-[#2a3045] bg-[#1e2332] px-3 text-[13px] text-[#e2e8f0]" onChange={(e) => xupdate("cnpjFab", e.target.value.replace(/\D/g, "").slice(0, 14))} value={form.extras.cnpjFab} />
                        </label>
                      </div>
                      <div className="border-t border-[#2a3045] pt-3">
                        <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#64748b]">PIS / COFINS</p>
                        <div className="mt-2 grid grid-cols-1 gap-3 xl:grid-cols-4">
                          <label className="grid gap-1 text-xs text-[#64748b]">
                            <span className="inline-flex items-center">CST PIS {req}</span>
                            <select className={fieldClass("extras.pisCst")} onChange={(e) => xupdate("pisCst", e.target.value)} value={form.extras.pisCst}>
                              <option>07 - Oper. isenta</option>
                              <option>49 - Outras operacoes</option>
                            </select>
                            {renderFieldError(fieldErrors["extras.pisCst"])}
                          </label>
                          <label className="grid gap-1 text-xs text-[#64748b]">
                            <span className="inline-flex items-center">% PIS {req}</span>
                            <input className={fieldClass("extras.pis")} onChange={(e) => xupdate("pis", e.target.value)} value={form.extras.pis} />
                            {renderFieldError(fieldErrors["extras.pis"])}
                          </label>
                          <label className="grid gap-1 text-xs text-[#64748b]">
                            <span className="inline-flex items-center">CST COFINS {req}</span>
                            <select className={fieldClass("extras.cofinsCst")} onChange={(e) => xupdate("cofinsCst", e.target.value)} value={form.extras.cofinsCst}>
                              <option>07 - Oper. isenta</option>
                              <option>49 - Outras operacoes</option>
                            </select>
                            {renderFieldError(fieldErrors["extras.cofinsCst"])}
                          </label>
                          <label className="grid gap-1 text-xs text-[#64748b]">
                            <span className="inline-flex items-center">% COFINS {req}</span>
                            <input className={fieldClass("extras.cofins")} onChange={(e) => xupdate("cofins", e.target.value)} value={form.extras.cofins} />
                            {renderFieldError(fieldErrors["extras.cofins"])}
                          </label>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="rounded-md border border-[#2a3045] bg-[#161a24]">
                    <header className="flex items-center gap-2 border-b border-[#2a3045] bg-[#1e2332] px-4 py-2.5">
                      <span className="rounded bg-[#1e3a5f] px-1.5 py-0.5 font-mono text-[10px] text-[#93c5fd]">05</span>
                      <h3 className="text-[13px] font-semibold text-[#e2e8f0]">Informacoes complementares</h3>
                    </header>
                    <div className="grid grid-cols-1 gap-3 p-4 xl:grid-cols-2">
                      <label className="grid gap-1 text-xs text-[#64748b]">
                        Peso bruto (kg)
                        <input className="h-10 rounded border border-[#2a3045] bg-[#1e2332] px-3 text-[13px] text-[#e2e8f0]" onChange={(e) => xupdate("grossWeight", e.target.value)} value={form.extras.grossWeight} />
                      </label>
                      <label className="grid gap-1 text-xs text-[#64748b]">
                        Peso liquido (kg)
                        <input className="h-10 rounded border border-[#2a3045] bg-[#1e2332] px-3 text-[13px] text-[#e2e8f0]" onChange={(e) => xupdate("netWeight", e.target.value)} value={form.extras.netWeight} />
                      </label>
                      <label className="grid gap-1 text-xs text-[#64748b] xl:col-span-2">
                        Observacoes internas
                        <textarea className="min-h-[86px] rounded border border-[#2a3045] bg-[#1e2332] px-3 py-2 text-[13px] text-[#e2e8f0]" onChange={(e) => xupdate("notes", e.target.value)} value={form.extras.notes} />
                      </label>
                    </div>
                  </section>
                  {null}
                </form>
              </div>
            </div>
          </div>
        ) : null}

        <div className="pointer-events-none fixed right-5 top-5 z-[95] flex w-[380px] max-w-[calc(100vw-24px)] flex-col gap-2.5">
          {toasts.map((toast) => (
            <div className={`pointer-events-auto rounded-md border px-4 py-3 text-[14px] shadow-[0_12px_30px_rgba(0,0,0,0.35)] transition-all duration-300 ${toast.type === "success" ? "border-[#166534] bg-[#123127] text-[#86efac]" : "border-[#7f1d1d] bg-[#2d1518] text-[#fca5a5]"}`} key={toast.id}>
              {toast.message}
            </div>
          ))}
        </div>
      </div>
    </ErpShell>
  );
}
