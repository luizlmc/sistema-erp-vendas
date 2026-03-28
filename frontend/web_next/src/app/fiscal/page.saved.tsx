"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardSummary, dashboardSummaryRequest } from "@/lib/api";
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

export default function FiscalPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [kpiReady, setKpiReady] = useState(false);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace("/");
      return;
    }

    dashboardSummaryRequest(token)
      .then((payload) => {
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
  }, [loading, summary?.recent_orders.length]);

  const totals = useMemo(() => {
    if (!summary) return { emitted: 0, taxes: 0, errors: 0, authorized: 0 };
    const emitted = summary.recent_orders.length;
    const taxes = summary.recent_orders.reduce((acc, item) => acc + item.total_amount * 0.18, 0);
    const errors = summary.kpis.fiscal_rejected ?? 0;
    const authorized = summary.kpis.fiscal_authorized ?? 0;
    return { emitted, taxes, errors, authorized };
  }, [summary]);

  const fiscalRows = useMemo(() => {
    if (!summary) return [];
    const docs = [
      "12.345.678/0001-99",
      "987.654.321-00",
      "55.111.222/0001-33",
      "111.222.333-44",
      "33.444.555/0001-66",
      "77.888.999/0001-11",
    ];
    return summary.recent_orders.slice(0, 6).map((order, index) => {
      const model = index === 1 ? "NFC-e 65" : "NF-e 55";
      const status = mapFiscalStatus(order.status);
      const actions =
        status === "Autorizada"
          ? model === "NF-e 55"
            ? ["XML", "DANFE", "CC", "Canc."]
            : ["XML", "Cupom", "Canc."]
          : status === "Pendente"
            ? ["Consultar", "Reenviar"]
            : status.startsWith("Erro")
              ? ["Ver log", "Corrigir"]
              : status.startsWith("Canc")
                ? ["Ver CC"]
                : ["XML"];
      return {
        id: order.id,
        numero: String(order.id).padStart(6, "0"),
        modelo: model,
        serie: "001",
        emissao: new Date(order.created_at).toLocaleDateString("pt-BR"),
        destinatario: order.client_name,
        doc: docs[index % docs.length],
        valor: formatCurrency(order.total_amount),
        status,
        actions,
      };
    });
  }, [summary]);

  function handleLogout() {
    clearSession();
    router.replace("/");
  }

  return (
    <ErpShell activeNav="fiscal" onLogout={handleLogout} pageTitle="Modulo Fiscal" headerRight={<div />}>
      {loading ? (
        <section className="rounded-md border border-[#2a3045] bg-[#161a24] p-6 text-center text-[#94a3b8]">
          Carregando painel fiscal...
        </section>
      ) : error ? (
        <section className="rounded-md border border-[#7f1d1d] bg-[#2d1518] p-6 text-center text-[#fca5a5]">
          {error}
        </section>
      ) : summary ? (
        <div className="space-y-3">
          <section className="grid grid-cols-1 gap-2 md:grid-cols-4">
            {[
              { t: "NOTAS EMITIDAS (MES)", v: totals.emitted.toLocaleString("pt-BR"), s: "+12% em relacao ao mes anterior", c: "bg-[#3b82f6]", x: "0ms" },
              { t: "IMPOSTOS A RECOLHER", v: formatCurrency(totals.taxes), s: "Acompanhamento em tempo real", c: "bg-[#22c55e]", x: "60ms" },
              { t: "ERROS DE TRANSMISSAO", v: String(totals.errors), s: "Acao imediata requerida", c: "bg-[#ef4444]", x: "120ms" },
              { t: "AUTORIZADAS", v: String(totals.authorized), s: "SEFAZ online", c: "bg-[#f59e0b]", x: "180ms" },
            ].map((card) => (
              <article className={`relative flex min-h-[168px] flex-col justify-between overflow-hidden rounded-md border border-[#2a3045] bg-[#161a24] px-4 py-4 transition-all duration-200 ease-out ${kpiReady ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"}`} key={card.t} style={{ transitionDelay: card.x }}>
                <div className={`absolute inset-x-0 top-0 h-[2px] ${card.c}`} />
                <p className="font-mono text-xs uppercase tracking-wider text-[#475569]">{card.t}</p>
                <h3 className="font-mono text-3xl font-bold text-[#e2e8f0]">{card.v}</h3>
                <p className="text-[11px] text-[#64748b]">{card.s}</p>
              </article>
            ))}
          </section>

          <section className="flex flex-wrap items-center justify-between gap-4 py-4">
            <div className="flex flex-wrap items-center gap-3">
              <button className="flex items-center gap-2 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 px-6 py-2.5 font-semibold text-white shadow-lg shadow-blue-900/20 transition active:scale-95">
                <span className="material-symbols-outlined">add</span>
                Emitir NF-e
              </button>
              <button className="flex items-center gap-2 rounded-lg border border-[#2a3045] bg-[#1e2332] px-6 py-2.5 font-semibold text-[#e2e8f0] transition hover:border-[#3a4260]">
                <span className="material-symbols-outlined">rss_feed</span>
                Consultar status SEFAZ
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button className="rounded border border-[#2a3045] bg-[#1e2332] p-2.5 text-[#94a3b8] transition hover:border-[#3a4260] hover:text-[#e2e8f0]">
                <span className="material-symbols-outlined">download</span>
              </button>
              <button className="rounded border border-[#2a3045] bg-[#1e2332] px-4 py-2.5 text-[13px] font-medium text-[#e2e8f0] transition hover:border-[#3a4260]">
                Exportar XML
              </button>
            </div>
          </section>

          <section className="rounded-md border border-[#2a3045] bg-[#161a24]">
            <div className="grid grid-cols-1 gap-3 border-b border-[#2a3045] bg-[#1e2332] px-4 py-3 md:grid-cols-4">
              <label className="grid gap-1 font-mono text-[11px] uppercase tracking-[0.12em] text-[#64748b]">
                Empresa emissora
                <select className="h-9 rounded border border-[#2a3045] bg-[#161a24] px-3 text-[13px] text-[#e2e8f0]">
                  <option>Todas as empresas</option>
                  <option>Atelier Matriz</option>
                  <option>Atelier Filial SP</option>
                </select>
              </label>
              <label className="grid gap-1 font-mono text-[11px] uppercase tracking-[0.12em] text-[#64748b]">
                Tipo de documento
                <select className="h-9 rounded border border-[#2a3045] bg-[#161a24] px-3 text-[13px] text-[#e2e8f0]">
                  <option>Todos</option>
                  <option>NF-e</option>
                  <option>NFC-e</option>
                </select>
              </label>
              <label className="grid gap-1 font-mono text-[11px] uppercase tracking-[0.12em] text-[#64748b]">
                Periodo
                <input className="h-9 rounded border border-[#2a3045] bg-[#161a24] px-3 text-[13px] text-[#e2e8f0]" type="date" />
              </label>
              <div className="flex items-end">
                <button className="h-9 w-full rounded border border-[#2a3045] bg-[#161a24] px-3 text-[13px] text-[#94a3b8] transition hover:border-[#3a4260] hover:text-[#e2e8f0]">
                  Limpar filtros
                </button>
              </div>
            </div>

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
                  {fiscalRows.map((order) => (
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
                        <span className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.08em] ${statusPill(order.status)}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          {order.actions.map((action) => (
                            <button className="rounded border border-[#2a3045] bg-[#161a24] px-2.5 py-1 font-mono text-[11px] text-[#64748b] transition hover:border-[#3a4260] hover:text-[#e2e8f0]" key={`${order.numero}-${action}`}>
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
            <div className="flex items-center justify-between border-t border-[#2a3045] px-4 py-3 font-mono text-[12px] text-[#64748b]">
              <span>342 notas no mes · Mostrando 1-{fiscalRows.length}</span>
              <span>← 1 2 3 ... 57 →</span>
            </div>
          </section>
        </div>
      ) : null}
    </ErpShell>
  );
}
