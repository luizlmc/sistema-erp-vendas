"use client";

import Link from "next/link";
import { ReactNode, useEffect, useState } from "react";
import { useThemeMode } from "@/components/ThemeProvider";

type ErpShellProps = {
  pageTitle: string;
  activeNav: "dashboard" | "produtos" | "empresas" | "clientes" | "pdv" | "vendas" | "receber" | "fiscal";
  onLogout: () => void;
  children: ReactNode;
  headerRight?: ReactNode;
};

type NavItem = {
  id: ErpShellProps["activeNav"];
  label: string;
  href: string;
  icon?: string;
  badge?: string;
};

const SIDEBAR_SECTIONS: Array<{ title: string; items: NavItem[] }> = [
  {
    title: "Visao geral",
    items: [
      { id: "dashboard", label: "Dashboard", href: "/dashboard", icon: "dashboard" },
      { id: "dashboard", label: "Relatorios", href: "#", icon: "bar_chart" },
      { id: "dashboard", label: "Metas", href: "#", icon: "flag" },
    ],
  },
  {
    title: "Cadastros",
    items: [
      { id: "empresas", label: "Empresas", href: "/companies", icon: "business_center" },
      { id: "produtos", label: "Produtos", href: "/products", icon: "inventory_2" },
      { id: "clientes", label: "Clientes", href: "/clients", icon: "person" },
    ],
  },
  {
    title: "Operacao",
    items: [
      { id: "pdv", label: "PDV", href: "/pdv", icon: "point_of_sale" },
      { id: "vendas", label: "Venda", href: "/sales", icon: "receipt_long" },
      { id: "receber", label: "Receber", href: "/receivables", icon: "payments" },
      { id: "fiscal", label: "Modulo Fiscal", href: "/fiscal", icon: "description" },
    ],
  },
];

function Sidebar({
  activeNav,
  onNavigate,
  isLight,
}: {
  activeNav: ErpShellProps["activeNav"];
  onNavigate?: () => void;
  isLight: boolean;
}) {
  return (
    <aside
      className={`h-full w-full overflow-y-auto border-r ${
        isLight ? "border-[#d1d9e6] bg-[#ffffff]" : "border-[#2a3045] bg-[#161a24]"
      }`}
    >
      <div className="p-3 pb-2">
        {SIDEBAR_SECTIONS.map((section) => (
          <section className="pb-4" key={section.title}>
            <p
              className={`px-2 pb-2 font-mono text-[10px] uppercase tracking-[0.22em] ${
                isLight ? "text-[#94a3b8]" : "text-[#475569]"
              }`}
            >
              {section.title}
            </p>
            {section.items.map((item, index) => {
              const isPrimaryDashboard = section.title === "Visao geral" && index === 0;
              const isActive = item.id === activeNav && (section.title !== "Visao geral" || isPrimaryDashboard);
              return (
                <Link
                  className={`mb-1 flex items-center gap-2 rounded-[4px] border px-2.5 py-2 text-[13px] transition ${
                    isActive
                      ? isLight
                        ? "border-[#3b82f6] bg-[#dbeafe] text-[#0f172a]"
                        : "border-[#3b82f6] bg-[#1e3a5f] text-[#e2e8f0]"
                      : isLight
                        ? "border-transparent text-[#475569] hover:bg-[#eef1f7] hover:text-[#0f172a]"
                        : "border-transparent text-[#94a3b8] hover:bg-[#1e2332] hover:text-[#e2e8f0]"
                  }`}
                  href={item.href}
                  key={`${section.title}-${item.label}`}
                  onClick={onNavigate}
                >
                  {item.icon ? (
                    <span
                      className={`material-symbols-outlined !text-[18px] ${
                        isActive ? "text-[#3b82f6]" : isLight ? "text-[#64748b]" : "text-[#94a3b8]"
                      }`}
                    >
                      {item.icon}
                    </span>
                  ) : (
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        isActive ? "bg-[#3b82f6]" : isLight ? "bg-[#94a3b8]" : "bg-[#475569]"
                      }`}
                    />
                  )}
                  <span>{item.label}</span>
                  {item.badge ? (
                    <span className="ml-auto inline-flex min-w-[18px] items-center justify-center rounded-full bg-[#991b1b] px-1.5 py-0.5 font-mono text-[10px] leading-none text-[#fca5a5]">
                      {item.badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </section>
        ))}
      </div>
    </aside>
  );
}

export function ErpShell({ activeNav, children }: ErpShellProps) {
  const [clock, setClock] = useState("");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [pageBootLoading, setPageBootLoading] = useState(true);
  const { isLight, toggleTheme } = useThemeMode();
  const resolvedIsLight = isLight;

  useEffect(() => {
    function tick() {
      setClock(
        new Date().toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      );
    }
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setPageBootLoading(true);
    const timer = window.setTimeout(() => setPageBootLoading(false), 280);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div
      suppressHydrationWarning
      className={`h-screen overflow-hidden ${resolvedIsLight ? "theme-light" : "theme-dark"} ${
        resolvedIsLight ? "bg-[#f4f6fb] text-[#0f172a]" : "bg-[#0f1117] text-[#e2e8f0]"
      } erp-shell`}
    >
      <header
        className={`fixed left-0 right-0 top-0 z-40 flex h-[52px] items-center gap-3 border-b px-4 ${
          resolvedIsLight ? "border-[#d1d9e6] bg-[#ffffff]" : "border-[#2a3045] bg-[#161a24]"
        }`}
      >
        <button
          className={`inline-flex h-8 w-8 items-center justify-center rounded border lg:hidden ${
            resolvedIsLight
              ? "border-[#d1d9e6] bg-[#eef1f7] text-[#475569]"
              : "border-[#2a3045] bg-[#1e2332] text-[#94a3b8]"
          }`}
          onClick={() => setMobileMenu(true)}
          type="button"
        >
          <span className="material-symbols-outlined !text-[18px]">menu</span>
        </button>
        <span className="font-mono text-[15px] font-semibold tracking-[0.16em] text-[#3b82f6]">
          ZENSOFT
        </span>
        <div className={`h-5 w-px ${resolvedIsLight ? "bg-[#d1d9e6]" : "bg-[#2a3045]"}`} />
        <div className="ml-auto flex items-center gap-2">
          <button
            className={`inline-flex h-8 w-8 items-center justify-center rounded border transition ${
              resolvedIsLight
                ? "border-[#d1d9e6] bg-[#eef1f7] text-[#475569] hover:border-[#b0bcce] hover:text-[#0f172a]"
                : "border-[#2a3045] bg-[#1e2332] text-[#94a3b8] hover:border-[#3a4260] hover:text-[#e2e8f0]"
            }`}
            onClick={toggleTheme}
            title={resolvedIsLight ? "Ativar tema escuro" : "Ativar tema claro"}
            type="button"
          >
            <span className="material-symbols-outlined !text-[18px]" suppressHydrationWarning>
              {resolvedIsLight ? "dark_mode" : "light_mode"}
            </span>
          </button>
          <button
            className={`inline-flex h-8 w-8 items-center justify-center rounded border transition ${
              resolvedIsLight
                ? "border-[#d1d9e6] bg-[#eef1f7] text-[#475569] hover:border-[#b0bcce] hover:text-[#0f172a]"
                : "border-[#2a3045] bg-[#1e2332] text-[#94a3b8] hover:border-[#3a4260] hover:text-[#e2e8f0]"
            }`}
            title="Configuracoes do sistema"
            type="button"
          >
            <span className="material-symbols-outlined !text-[18px]">settings</span>
          </button>
        </div>
      </header>

      <div className="flex h-full pt-[52px] pb-[44px]">
        <div className="fixed bottom-[44px] left-0 top-[52px] hidden w-[220px] lg:block">
          <Sidebar activeNav={activeNav} isLight={resolvedIsLight} />
        </div>
        <main
          className={`relative h-[calc(100vh-96px)] flex-1 overflow-y-auto p-4 lg:ml-[220px] lg:p-5 ${
            resolvedIsLight ? "bg-[#f4f6fb]" : "bg-transparent"
          }`}
        >
          {pageBootLoading ? (
            <div className="absolute inset-0 z-20 p-4 lg:p-5">
              <div
                className={`flex h-full w-full items-center justify-center rounded-md border ${
                  resolvedIsLight ? "border-[#d1d9e6] bg-[#ffffff]" : "border-[#2a3045] bg-[#161a24]"
                }`}
              >
                <div className="flex flex-col items-center gap-3">
                  <span
                    className={`h-10 w-10 animate-spin rounded-full border-2 border-t-[#3b82f6] ${
                      resolvedIsLight ? "border-[#d1d9e6]" : "border-[#2a3045]"
                    }`}
                  />
                  <span className={`text-sm ${resolvedIsLight ? "text-[#475569]" : "text-[#94a3b8]"}`}>
                    Carregando...
                  </span>
                </div>
              </div>
            </div>
          ) : null}
          {children}
        </main>
      </div>

      <footer
        className={`fixed bottom-0 left-0 right-0 z-30 flex h-[44px] items-center gap-3 border-t px-6 ${
          resolvedIsLight ? "border-[#d1d9e6] bg-[#ffffff]" : "border-[#2a3045] bg-[#161a24]"
        }`}
      >
        <span className="h-2 w-2 rounded-full bg-[#22c55e]" />
        <span className={`font-mono text-[12px] ${resolvedIsLight ? "text-[#475569]" : "text-[#94a3b8]"}`}>
          Sistema operacional · Empresa ativa:{" "}
          <strong className={`font-semibold ${resolvedIsLight ? "text-[#0f172a]" : "text-[#e2e8f0]"}`}>
            Tech Distribuidora LTDA
          </strong>
        </span>
        <span className={`ml-auto font-mono text-[11px] ${resolvedIsLight ? "text-[#94a3b8]" : "text-[#475569]"}`}>
          Atualizado: {clock}
        </span>
      </footer>

      {mobileMenu ? (
        <div className="fixed inset-0 z-50 bg-black/60 lg:hidden" onClick={() => setMobileMenu(false)}>
          <div className="h-full w-[320px]" onClick={(event) => event.stopPropagation()}>
            <Sidebar activeNav={activeNav} isLight={resolvedIsLight} onNavigate={() => setMobileMenu(false)} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
