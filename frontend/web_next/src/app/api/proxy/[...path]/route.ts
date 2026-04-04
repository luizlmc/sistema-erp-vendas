import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const configuredBase =
  process.env.API_BASE_URL?.trim() ||
  process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
  "http://127.0.0.1:9000";

const API_BASES = Array.from(
  new Set(
    [
      configuredBase.replace(/\/$/, ""),
      configuredBase.includes("127.0.0.1")
        ? configuredBase.replace("127.0.0.1", "localhost")
        : configuredBase.includes("localhost")
          ? configuredBase.replace("localhost", "127.0.0.1")
          : "",
      "http://127.0.0.1:9000",
      "http://localhost:9000",
    ].filter(Boolean),
  ),
);

function mountTarget(pathSegments: string[] | undefined, search: string): string {
  const path = `/${(pathSegments ?? []).join("/")}`.replace(/\/{2,}/g, "/");
  return `${path}${search ?? ""}`;
}

async function proxyRequest(req: NextRequest, params: { path?: string[] }) {
  const targetPath = mountTarget(params.path, req.nextUrl.search);
  const method = req.method.toUpperCase();
  const rawBody = method === "GET" || method === "HEAD" ? undefined : await req.text();

  let lastError: unknown;
  for (const base of API_BASES) {
    try {
      const upstream = await fetch(`${base}${targetPath}`, {
        method,
        headers: {
          "Content-Type": req.headers.get("content-type") ?? "application/json",
          Authorization: req.headers.get("authorization") ?? "",
          Accept: req.headers.get("accept") ?? "application/json",
          "X-Correlation-Id": req.headers.get("x-correlation-id") ?? "",
        },
        body: rawBody,
        cache: "no-store",
      });

      const contentType = upstream.headers.get("content-type") ?? "application/json";
      const payload = await upstream.arrayBuffer();
      return new NextResponse(payload, {
        status: upstream.status,
        headers: { "content-type": contentType },
      });
    } catch (error) {
      lastError = error;
    }
  }

  const message =
    lastError instanceof Error && lastError.message
      ? lastError.message
      : "Falha de rede ao conectar no backend.";
  return NextResponse.json(
    {
      status: "error",
      code: "backend_unavailable",
      message: `API indisponivel via proxy. Bases testadas: ${API_BASES.join(", ")}. ${message}`,
    },
    { status: 503 },
  );
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  return proxyRequest(req, await params);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  return proxyRequest(req, await params);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  return proxyRequest(req, await params);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  return proxyRequest(req, await params);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  return proxyRequest(req, await params);
}

export async function OPTIONS(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  return proxyRequest(req, await params);
}
