"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loginRequest } from "@/lib/api";
import { getAccessToken, saveSession } from "@/lib/session";
import { useThemeMode } from "@/components/ThemeProvider";

export default function Home() {
  const router = useRouter();
  const { isLight, toggleTheme } = useThemeMode();
  const [login, setLogin] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pageBootLoading, setPageBootLoading] = useState(true);

  useEffect(() => {
    if (getAccessToken()) router.replace("/dashboard");
  }, [router]);

  useEffect(() => {
    const timer = window.setTimeout(() => setPageBootLoading(false), 280);
    return () => window.clearTimeout(timer);
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    setError("");
    setIsSubmitting(true);
    try {
      const result = await loginRequest(login.trim(), password);
      saveSession(result.access_token, result.refresh_token, result.name, result.login);
      router.replace("/dashboard");
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : "Nao foi possivel autenticar.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    pageBootLoading ? (
      <div
        className={`flex min-h-screen items-center justify-center p-6 ${
          isLight
            ? "bg-[radial-gradient(circle_at_0%_0%,rgba(37,99,235,0.13),transparent_40%),radial-gradient(circle_at_100%_100%,rgba(20,83,45,0.13),transparent_45%),#eef3f8]"
            : "bg-[radial-gradient(circle_at_0%_0%,rgba(59,130,246,0.16),transparent_45%),radial-gradient(circle_at_100%_100%,rgba(34,197,94,0.12),transparent_50%),#0f1117]"
        }`}
      >
        <div
          className={`flex flex-col items-center gap-3 rounded-2xl border px-8 py-7 ${
            isLight
              ? "border-[#d1d9e6] bg-white/90 shadow-[0_20px_50px_rgba(15,23,42,0.10)]"
              : "border-[#2a3045] bg-[#161a24]/95 shadow-[0_20px_50px_rgba(0,0,0,0.45)]"
          }`}
        >
          <span className={`h-10 w-10 animate-spin rounded-full border-2 border-t-[#3b82f6] ${isLight ? "border-[#cbd5e1]" : "border-[#2a3045]"}`} />
          <span className={isLight ? "text-[#475569]" : "text-[#94a3b8]"}>Carregando...</span>
        </div>
      </div>
    ) : (
      <div
        className={`relative grid min-h-screen place-items-center p-6 ${
          isLight
            ? "bg-[radial-gradient(circle_at_0%_0%,rgba(37,99,235,0.14),transparent_42%),radial-gradient(circle_at_100%_100%,rgba(16,185,129,0.12),transparent_45%),#eef3f8]"
            : "bg-[radial-gradient(circle_at_0%_0%,rgba(59,130,246,0.20),transparent_45%),radial-gradient(circle_at_100%_100%,rgba(34,197,94,0.12),transparent_50%),#0f1117]"
        }`}
      >
        <button
          className={`absolute right-6 top-6 inline-flex h-9 w-9 items-center justify-center rounded-lg border transition ${
            isLight
              ? "border-[#d1d9e6] bg-[#ffffff] text-[#475569] hover:border-[#b0bcce] hover:text-[#0f172a]"
              : "border-[#2a3045] bg-[#161a24] text-[#94a3b8] hover:border-[#3a4260] hover:text-[#e2e8f0]"
          }`}
          onClick={toggleTheme}
          title={isLight ? "Ativar tema escuro" : "Ativar tema claro"}
          type="button"
        >
          <span className="material-symbols-outlined !text-[18px]">{isLight ? "dark_mode" : "light_mode"}</span>
        </button>

        <main
          className={`w-full max-w-[460px] rounded-2xl border p-7 backdrop-blur-sm ${
            isLight
              ? "border-[#d1d9e6] bg-white/92 shadow-[0_24px_60px_rgba(15,23,42,0.12)]"
              : "border-[#2a3045] bg-[#161a24]/92 shadow-[0_24px_60px_rgba(0,0,0,0.5)]"
          }`}
        >
          <div className="mb-6">
            <p className={`mb-2 font-mono text-[11px] uppercase tracking-[0.18em] ${isLight ? "text-[#64748b]" : "text-[#475569]"}`}>
              ZENSOFT ERP
            </p>
            <h1 className={`text-[2rem] font-semibold leading-none ${isLight ? "text-[#0f172a]" : "text-[#e2e8f0]"}`}>
              Acessar sistema
            </h1>
            <p className={`mt-2 text-[14px] ${isLight ? "text-[#475569]" : "text-[#94a3b8]"}`}>
              Entre com suas credenciais para continuar.
            </p>
          </div>

          <form className="grid gap-3.5" onSubmit={onSubmit}>
            <label className="grid gap-1.5" htmlFor="login">
              <span className={`text-[13px] ${isLight ? "text-[#334155]" : "text-[#94a3b8]"}`}>Login</span>
              <input
                autoComplete="username"
                className={`h-11 rounded-xl border px-3.5 text-[15px] outline-none transition ${
                  isLight
                    ? "border-[#d1d9e6] bg-[#f8fafc] text-[#0f172a] placeholder:text-[#94a3b8] focus:border-[#3b82f6]"
                    : "border-[#2a3045] bg-[#1e2332] text-[#e2e8f0] placeholder:text-[#64748b] focus:border-[#3b82f6]"
                }`}
                id="login"
                name="login"
                onChange={(event) => setLogin(event.target.value)}
                placeholder="Seu usuario"
                value={login}
              />
            </label>

            <label className="grid gap-1.5" htmlFor="password">
              <span className={`text-[13px] ${isLight ? "text-[#334155]" : "text-[#94a3b8]"}`}>Senha</span>
              <input
                autoComplete="current-password"
                className={`h-11 rounded-xl border px-3.5 text-[15px] outline-none transition ${
                  isLight
                    ? "border-[#d1d9e6] bg-[#f8fafc] text-[#0f172a] placeholder:text-[#94a3b8] focus:border-[#3b82f6]"
                    : "border-[#2a3045] bg-[#1e2332] text-[#e2e8f0] placeholder:text-[#64748b] focus:border-[#3b82f6]"
                }`}
                id="password"
                name="password"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                type="password"
                value={password}
              />
            </label>

            <button
              className="mt-2 h-11 cursor-pointer rounded-xl border border-[#1d4ed8] bg-[#2563eb] text-[15px] font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? "Entrando..." : "Entrar"}
            </button>
          </form>

          {error ? (
            <p
              className={`mt-3 rounded-lg border px-3 py-2.5 text-[14px] ${
                isLight
                  ? "border-[#fca5a5] bg-[#fee2e2] text-[#991b1b]"
                  : "border-[#7f1d1d] bg-[#2d1518] text-[#fca5a5]"
              }`}
            >
              {error}
            </p>
          ) : null}
        </main>
      </div>
    )
  );
}
