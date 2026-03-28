"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ErpShell } from "@/components/ErpShell";
import { clearSession, getAccessToken } from "@/lib/session";
import {
  ClientApiItem,
  Product,
  createOrderRequest,
  emitOrderFiscalRequest,
  invoiceOrderRequest,
  listClientsRequest,
  listProductsRequest,
} from "@/lib/api";

type PaymentType = "Dinheiro" | "Credito" | "Debito" | "Pix";
type CartItem = { id: number; qty: number };
const ACTIVE_CLIENTS_QUERY_KEY = ["catalog", "clients", "active"] as const;
const ACTIVE_PRODUCTS_QUERY_KEY = ["catalog", "products", "active"] as const;

const money = (v: number) =>
  `R$ ${Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
const dec = (v: string) => Number(String(v || "0").replace(/\./g, "").replace(",", ".")) || 0;

function getEmoji(name: string) {
  const n = name.toLowerCase();
  if (n.includes("notebook")) return "💻";
  if (n.includes("monitor")) return "🖥️";
  if (n.includes("teclado")) return "⌨️";
  if (n.includes("mouse")) return "🖱️";
  if (n.includes("ssd")) return "💾";
  if (n.includes("cabo")) return "🔌";
  if (n.includes("hub")) return "🔗";
  if (n.includes("webcam")) return "📷";
  if (n.includes("headset")) return "🎧";
  return "📦";
}

function getCategory(name: string) {
  const n = name.toLowerCase();
  if (n.includes("notebook") || n.includes("monitor") || n.includes("ssd")) return "Informatica";
  if (n.includes("teclado") || n.includes("mouse") || n.includes("webcam")) return "Perifericos";
  if (n.includes("headset") || n.includes("hub")) return "Acessorios";
  if (n.includes("cabo")) return "Cabos";
  return "Outros";
}

export default function PdvPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<ClientApiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [category, setCategory] = useState("Todos");
  const [clientName, setClientName] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [payment, setPayment] = useState<PaymentType>("Dinheiro");
  const [received, setReceived] = useState("0,00");
  const [saleNumber, setSaleNumber] = useState(5522);
  const [finishing, setFinishing] = useState(false);
  const [toasts, setToasts] = useState<Array<{ id: number; msg: string; type: "success" | "error" }>>([]);

  function notify(msg: string, type: "success" | "error") {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((s) => [...s, { id, msg, type }]);
    window.setTimeout(() => setToasts((s) => s.filter((i) => i.id !== id)), 3200);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), 400);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace("/");
      return;
    }
    let cancel = false;
    setLoading(true);

    Promise.all([
      queryClient.fetchQuery({
        queryKey: [...ACTIVE_PRODUCTS_QUERY_KEY, token],
        queryFn: () =>
          listProductsRequest(token, {
            page: 1,
            pageSize: 120,
            sortBy: "name",
            sortDir: "asc",
            isActive: "true",
          }),
        staleTime: 90_000,
      }),
      queryClient.fetchQuery({
        queryKey: [...ACTIVE_CLIENTS_QUERY_KEY, token],
        queryFn: () =>
          listClientsRequest(token, {
            page: 1,
            pageSize: 120,
            sortBy: "name",
            sortDir: "asc",
            isActive: "true",
          }),
        staleTime: 90_000,
      }),
    ])
      .then(([productsRes, clientsRes]) => {
        if (cancel) return;
        setProducts(productsRes.items.filter((p) => p.is_active));
        setClients(clientsRes.items.filter((c) => c.is_active));
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : "Falha ao carregar dados do PDV.";
        if (message === "unauthorized") {
          clearSession();
          router.replace("/");
          return;
        }
        if (!cancel) notify(message, "error");
      })
      .finally(() => {
        if (!cancel) setLoading(false);
      });
    return () => {
      cancel = true;
    };
  }, [router, queryClient]);

  const categories = useMemo(() => {
    const set = new Set<string>(["Todos"]);
    products.forEach((p) => set.add(getCategory(p.name || "")));
    return Array.from(set);
  }, [products]);

  const visibleProducts = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    return products.filter((p) => {
      const cat = getCategory(p.name || "");
      if (category !== "Todos" && cat !== category) return false;
      if (!q) return true;
      return (
        (p.name || "").toLowerCase().includes(q) ||
        (p.sku || "").toLowerCase().includes(q) ||
        (p.gtin || "").includes(q)
      );
    });
  }, [products, debouncedQuery, category]);

  const cartLines = useMemo(
    () =>
      cart
        .map((item) => ({ product: products.find((p) => p.id === item.id), qty: item.qty }))
        .filter((line): line is { product: Product; qty: number } => !!line.product),
    [cart, products],
  );

  const subtotal = useMemo(
    () => cartLines.reduce((acc, line) => acc + line.product.unit_price * line.qty, 0),
    [cartLines],
  );
  const total = subtotal;
  const change = Math.max(0, dec(received) - total);

  function addToCart(product: Product) {
    if (product.stock_qty <= 0) {
      notify("Produto sem estoque.", "error");
      return;
    }
    setCart((prev) => {
      const hit = prev.find((i) => i.id === product.id);
      if (hit) return prev.map((i) => (i.id === product.id ? { ...i, qty: i.qty + 1 } : i));
      return [...prev, { id: product.id, qty: 1 }];
    });
  }

  function changeQty(id: number, delta: number) {
    setCart((prev) =>
      prev
        .map((i) => (i.id === id ? { ...i, qty: i.qty + delta } : i))
        .filter((i) => i.qty > 0),
    );
  }

  function clearCart() {
    setCart([]);
    setReceived("0,00");
  }

  async function reloadProducts() {
    const token = getAccessToken();
    if (!token) return;
    const res = await queryClient.fetchQuery({
      queryKey: [...ACTIVE_PRODUCTS_QUERY_KEY, token],
      queryFn: () =>
        listProductsRequest(token, {
          page: 1,
          pageSize: 120,
          sortBy: "name",
          sortDir: "asc",
          isActive: "true",
        }),
      staleTime: 30_000,
    });
    setProducts(res.items.filter((p) => p.is_active));
  }

  async function finishSale() {
    if (!cartLines.length) {
      notify("Carrinho vazio.", "error");
      return;
    }
    if (payment === "Dinheiro" && dec(received) < total) {
      notify("Valor recebido menor que o total.", "error");
      return;
    }

    const token = getAccessToken();
    if (!token) {
      clearSession();
      router.replace("/");
      return;
    }

    const pickedClient =
      clients.find((c) => c.name.toLowerCase() === clientName.trim().toLowerCase()) ||
      clients.find((c) => c.name.toLowerCase().includes(clientName.trim().toLowerCase())) ||
      clients[0];

    if (!pickedClient) {
      notify("Nenhum cliente ativo disponível para registrar a venda.", "error");
      return;
    }

    try {
      setFinishing(true);
      const created = await createOrderRequest(token, {
        client_id: pickedClient.id,
        notes: `Venda PDV comum #${saleNumber} - pagamento: ${payment}`,
        items: cartLines.map((line) => ({
          product_id: line.product.id,
          quantity: line.qty,
        })),
      });
      await reloadProducts();
      notify(`Venda #${saleNumber} registrada (pedido ${created.id}).`, "success");
      setSaleNumber((v) => v + 1);
      clearCart();
      setClientName("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha ao finalizar venda.";
      if (message === "unauthorized") {
        clearSession();
        router.replace("/");
        return;
      }
      notify(message, "error");
    } finally {
      setFinishing(false);
    }
  }

  async function finishSaleAsFiscal(mode: "NFE" | "NFCE") {
    if (!cartLines.length) {
      notify("Carrinho vazio.", "error");
      return;
    }
    if (payment === "Dinheiro" && dec(received) < total) {
      notify("Valor recebido menor que o total.", "error");
      return;
    }

    const token = getAccessToken();
    if (!token) {
      clearSession();
      router.replace("/");
      return;
    }

    const pickedClient =
      clients.find((c) => c.name.toLowerCase() === clientName.trim().toLowerCase()) ||
      clients.find((c) => c.name.toLowerCase().includes(clientName.trim().toLowerCase())) ||
      clients[0];

    if (!pickedClient) {
      notify("Nenhum cliente ativo disponível para registrar a venda.", "error");
      return;
    }

    try {
      setFinishing(true);
      const created = await createOrderRequest(token, {
        client_id: pickedClient.id,
        notes: `Venda PDV fiscal (${mode}) #${saleNumber} - pagamento: ${payment}`,
        items: cartLines.map((line) => ({
          product_id: line.product.id,
          quantity: line.qty,
        })),
      });
      await invoiceOrderRequest(token, created.id);
      await emitOrderFiscalRequest(token, created.id, { series: "001" });
      await reloadProducts();
      notify(`Venda #${saleNumber} finalizada e emitida no fiscal.`, "success");
      setSaleNumber((v) => v + 1);
      clearCart();
      setClientName("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha ao finalizar venda fiscal.";
      if (message === "unauthorized") {
        clearSession();
        router.replace("/");
        return;
      }
      notify(message, "error");
    } finally {
      setFinishing(false);
    }
  }

  return (
    <ErpShell
      activeNav="pdv"
      pageTitle="PDV / Vendas"
      onLogout={() => {
        clearSession();
        router.replace("/");
      }}
    >
      <div className="grid h-full min-h-0 max-h-full grid-cols-[minmax(0,1fr)_360px] gap-2 overflow-hidden">
        <section className="flex h-full min-h-0 flex-col rounded-md border border-[#2a3045] bg-[#161a24]">
          <div className="border-b border-[#2a3045] p-2.5">
            <input
              className="h-10 w-full rounded border border-[#2a3045] bg-[#1e2332] px-3 text-[14px] text-[#e2e8f0] placeholder:text-[#64748b] outline-none focus:border-[#3b82f6]"
              placeholder="Buscar produto ou codigo de barras..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="mt-2 flex gap-1.5 overflow-x-auto">
              {categories.map((cat) => (
                <button
                  key={cat}
                  className={`h-7 rounded-full border px-3 text-[12px] ${
                    category === cat
                      ? "border-[#3b82f6] bg-[#2563eb] text-white"
                      : "border-[#2a3045] bg-[#1e2332] text-[#94a3b8] hover:text-[#e2e8f0]"
                  }`}
                  onClick={() => setCategory(cat)}
                  type="button"
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid min-h-0 flex-1 grid-cols-[repeat(auto-fill,minmax(160px,1fr))] content-start gap-2 overflow-y-auto p-2.5">
            {loading ? <p className="col-span-full p-4 text-sm text-[#94a3b8]">Carregando produtos...</p> : null}
            {!loading && !visibleProducts.length ? (
              <p className="col-span-full p-4 text-sm text-[#94a3b8]">Nenhum produto encontrado.</p>
            ) : null}
            {!loading
              ? visibleProducts.map((p) => (
                  <button
                    key={p.id}
                    className="rounded-md border border-[#2a3045] bg-[#161a24] p-3 text-left transition hover:border-[#3b82f6] hover:bg-[#1e2332]"
                    onClick={() => addToCart(p)}
                    type="button"
                  >
                    <div className="mb-2 text-center text-[24px]">{getEmoji(p.name || "")}</div>
                    <p className="line-clamp-2 min-h-[42px] text-[13px] font-semibold text-[#e2e8f0]">{p.name}</p>
                    <p className="mt-1 font-mono text-[11px] text-[#64748b]">{p.sku}</p>
                    <p className="mt-2 font-mono text-[24px] text-[#22c55e]">{money(p.unit_price)}</p>
                    <p
                      className={`mt-1 font-mono text-[11px] ${
                        p.stock_qty <= 5 ? "text-[#f59e0b]" : "text-[#64748b]"
                      }`}
                    >
                      {p.stock_qty} un.
                    </p>
                  </button>
                ))
              : null}
          </div>
        </section>

        <section className="flex h-full min-h-0 flex-col rounded-md border border-[#2a3045] bg-[#161a24]">
          <div className="flex items-center border-b border-[#2a3045] px-3 py-2.5">
            <h2 className="text-[18px] font-semibold text-[#e2e8f0]">Venda</h2>
            <span className="ml-auto rounded bg-[#1e3a5f] px-2 py-1 font-mono text-[11px] text-[#93c5fd]">
              N° {saleNumber}
            </span>
            <button className="ml-2 text-[12px] text-[#64748b] hover:text-[#e2e8f0]" onClick={clearCart} type="button">
              Limpar
            </button>
          </div>

          <div className="border-b border-[#2a3045] p-3">
            <input
              className="h-9 w-full rounded border border-[#2a3045] bg-[#1e2332] px-3 text-[13px] text-[#e2e8f0] placeholder:text-[#64748b]"
              placeholder="Cliente (opcional - F3 para buscar)"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
            />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {!cartLines.length ? (
              <p className="p-8 text-center font-mono text-[16px] text-[#475569]">
                Nenhum item.
                <br />
                Clique em um produto para adicionar.
              </p>
            ) : null}
            {cartLines.map((line) => (
              <div key={line.product.id} className="flex items-start gap-2 border-b border-[#2a3045] px-3 py-2">
                <div className="pt-1 text-xl">{getEmoji(line.product.name || "")}</div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-[#e2e8f0]">{line.product.name}</p>
                  <p className="font-mono text-[10px] text-[#64748b]">{line.product.sku}</p>
                  <div className="mt-1 flex items-center gap-1">
                    <button className="h-6 w-6 rounded border border-[#2a3045] text-[#94a3b8]" onClick={() => changeQty(line.product.id, -1)} type="button">-</button>
                    <span className="w-6 text-center font-mono text-[12px] text-[#e2e8f0]">{line.qty}</span>
                    <button className="h-6 w-6 rounded border border-[#2a3045] text-[#94a3b8]" onClick={() => changeQty(line.product.id, 1)} type="button">+</button>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-mono text-[11px] text-[#94a3b8]">{money(line.product.unit_price)}</p>
                  <p className="font-mono text-[13px] text-[#22c55e]">{money(line.product.unit_price * line.qty)}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-[#2a3045] bg-[#1e2332] px-4 py-3">
            <div className="flex justify-between text-[14px] text-[#94a3b8]"><span>Subtotal</span><span>{money(subtotal)}</span></div>
            <div className="mt-1 flex justify-between text-[14px] text-[#f59e0b]"><span>Desconto</span><span>{money(0)}</span></div>
            <div className="mt-1 flex justify-between text-[14px] text-[#94a3b8]"><span>Frete</span><span>{money(0)}</span></div>
            <div className="mt-2 flex justify-between border-t border-[#2a3045] pt-2 text-[32px] font-semibold text-[#22c55e]">
              <span>Total</span>
              <span>{money(total)}</span>
            </div>
          </div>

          <div className="border-t border-[#2a3045] p-3">
            <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.12em] text-[#64748b]">Pagamento</p>
            <div className="grid grid-cols-2 gap-1.5">
              {(["Dinheiro", "Credito", "Debito", "Pix"] as PaymentType[]).map((p) => (
                <button
                  key={p}
                  className={`h-8 rounded border text-[13px] ${
                    payment === p
                      ? "border-[#3b82f6] bg-[#24497a] text-[#e2e8f0]"
                      : "border-[#2a3045] bg-[#1e2332] text-[#94a3b8]"
                  }`}
                  onClick={() => setPayment(p)}
                  type="button"
                >
                  {p}
                </button>
              ))}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-[13px] text-[#94a3b8]">Recebido</span>
              <input
                className="h-8 flex-1 rounded border border-[#2a3045] bg-[#1e2332] px-3 font-mono text-[14px] text-[#e2e8f0]"
                value={received}
                onChange={(e) => setReceived(e.target.value)}
              />
            </div>
            <p className="mt-1 text-right font-mono text-[14px] text-[#f59e0b]">Troco: {money(change)}</p>
            <button
              className="mt-2 h-10 w-full rounded border border-[#16a34a] bg-[#22c55e] text-[14px] font-semibold text-white hover:brightness-110 disabled:opacity-60"
              disabled={finishing}
              onClick={finishSale}
              type="button"
            >
              {finishing ? "FINALIZANDO..." : "▶ FINALIZAR VENDA"}
            </button>
            <div className="mt-1.5 grid grid-cols-4 gap-1.5">
              <button className="h-7 rounded border border-[#2a3045] bg-[#1e2332] font-mono text-[11px] text-[#94a3b8]" onClick={() => finishSaleAsFiscal("NFCE")} type="button">NFC-e</button>
              <button className="h-7 rounded border border-[#2a3045] bg-[#1e2332] font-mono text-[11px] text-[#94a3b8]" onClick={() => finishSaleAsFiscal("NFE")} type="button">NF-e</button>
              <button className="h-7 rounded border border-[#2a3045] bg-[#1e2332] font-mono text-[11px] text-[#94a3b8]" type="button">Suspender</button>
              <button className="h-7 rounded border border-[#2a3045] bg-[#1e2332] font-mono text-[11px] text-[#fca5a5]" onClick={clearCart} type="button">Cancelar</button>
            </div>
          </div>
        </section>

        <div className="erp-toast-stack">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`erp-toast ${t.type === "success" ? "erp-toast-success" : "erp-toast-error"}`}
            >
              {t.msg}
            </div>
          ))}
        </div>
      </div>
    </ErpShell>
  );
}
