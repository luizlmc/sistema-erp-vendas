"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loginRequest } from "@/lib/api";
import { getAccessToken, saveSession } from "@/lib/session";

export default function Home() {
  const router = useRouter();
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
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_0%_0%,rgba(17,131,133,0.2),transparent_40%),radial-gradient(circle_at_100%_100%,rgba(245,179,90,0.22),transparent_45%),#edf3f2] p-6">
        <div className="flex flex-col items-center gap-3 rounded-[20px] border border-[#d7e2e0] bg-white/90 p-8 shadow-[0_18px_45px_rgba(28,53,57,0.12)]">
          <span className="h-10 w-10 animate-spin rounded-full border-2 border-[#c5d6d3] border-t-[#118385]" />
          <span className="text-[#4a5d61]">Carregando...</span>
        </div>
      </div>
    ) : (
    <div className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_0%_0%,rgba(17,131,133,0.2),transparent_40%),radial-gradient(circle_at_100%_100%,rgba(245,179,90,0.22),transparent_45%),#edf3f2] p-6">
      <main className="w-full max-w-[480px] rounded-[20px] border border-[#d7e2e0] bg-white/90 p-7 shadow-[0_18px_45px_rgba(28,53,57,0.12)]">
        <h1 className="mb-2 text-[2rem] font-semibold leading-none text-[#1f2d2f]">Sistema ERP</h1>
        <p className="mb-6 text-[#4a5d61]">Acesse o painel administrativo de vendas.</p>

        <form className="grid gap-3.5" onSubmit={onSubmit}>
          <label className="grid gap-1.5 text-[0.9rem] text-[#335054]" htmlFor="login">
            Login
            <input
              autoComplete="username"
              className="h-[46px] rounded-xl border border-[#c5d6d3] bg-[#f8fbfb] px-3.5 text-base text-[#173438] outline-none focus:border-[#118385] focus:ring-2 focus:ring-[#118385]/30"
              id="login"
              name="login"
              onChange={(event) => setLogin(event.target.value)}
              value={login}
            />
          </label>

          <label className="grid gap-1.5 text-[0.9rem] text-[#335054]" htmlFor="password">
            Senha
            <input
              autoComplete="current-password"
              className="h-[46px] rounded-xl border border-[#c5d6d3] bg-[#f8fbfb] px-3.5 text-base text-[#173438] outline-none focus:border-[#118385] focus:ring-2 focus:ring-[#118385]/30"
              id="password"
              name="password"
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              value={password}
            />
          </label>

          <button
            className="mt-2 h-12 cursor-pointer rounded-[13px] bg-gradient-to-br from-[#0f7b7d] to-[#16686e] text-base font-bold text-white disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Entrando..." : "Entrar"}
          </button>
        </form>

        {error ? (
          <p className="mt-3 rounded-[10px] border border-[#f1c3c3] bg-[#ffeaea] px-3 py-2.5 text-[#9a1e1e]">
            {error}
          </p>
        ) : null}
      </main>
    </div>
    )
  );
}
