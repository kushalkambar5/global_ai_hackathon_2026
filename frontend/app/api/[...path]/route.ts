import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import NextAuth from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

export const dynamic = "force-dynamic";

const authHandler = NextAuth(authOptions);

export async function GET(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const resolvedParams = await params;
  return handleProxy(req, resolvedParams.path);
}

export async function POST(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const resolvedParams = await params;
  return handleProxy(req, resolvedParams.path);
}

export async function PUT(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const resolvedParams = await params;
  return handleProxy(req, resolvedParams.path);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const resolvedParams = await params;
  return handleProxy(req, resolvedParams.path);
}

async function handleProxy(req: Request, pathSegments: string[]) {
  // If auth route is intercepted here, delegate directly to NextAuth handler
  if (pathSegments.length > 0 && pathSegments[0] === "auth") {
    return authHandler(req as any, { params: Promise.resolve({ nextauth: pathSegments.slice(1) }) } as any);
  }

  const session = await getServerSession(authOptions).catch(() => null);
  const path = pathSegments.join("/");
  const parsedUrl = new URL(req.url);
  
  const customBackendUrl = req.headers.get("x-custom-backend-url");

  // Route all requests (including models/ and chatbot/) directly through the Express backend API (port 5000)
  const backendUrl = customBackendUrl || process.env.BACKEND_URL || "http://localhost:5000";
  const backendTargetUrl = `${backendUrl}/api/${path}${parsedUrl.search}`;

  // Capture the original content-type BEFORE filtering headers
  const reqContentType = req.headers.get("content-type") || "";

  const headers = new Headers();
  // Copy relevant headers from the client request, excluding headers that will be rebuilt or cause mismatches
  // content-type is excluded here because multipart needs its boundary auto-set by fetch,
  // and for JSON we set it explicitly below
  const excludedHeaders = [
    "host",
    "connection",
    "content-length",
    "content-type",
    "x-custom-backend-url",
    "x-custom-models-url",
    "expect",
    "keep-alive",
    "transfer-encoding",
    "te",
    "upgrade"
  ];
  req.headers.forEach((value, key) => {
    if (!excludedHeaders.includes(key.toLowerCase())) {
      headers.set(key, value);
    }
  });

  // Re-add content-type for JSON. For multipart, we forward the ORIGINAL header
  // (including the exact boundary string) further below alongside the raw body stream.
  if (reqContentType.includes("application/json")) {
    headers.set("content-type", "application/json");
  }

  // Always set ngrok skip warning header
  headers.set("ngrok-skip-browser-warning", "true");

  // Inject session info if user is logged in
  if (session?.user?.id) {
    headers.set("x-user-id", session.user.id);
    headers.set("x-user-role", session.user.role || "");
  }

  try {
    const fetchOptions: RequestInit = {
      method: req.method,
      headers: headers,
      cache: "no-store",
    };

    if (req.method === "POST" || req.method === "PUT") {
      if (reqContentType.includes("multipart/form-data")) {
        // Stream the raw body directly to the backend WITHOUT parsing it.
        // Parsing (req.formData()) then re-serializing loses the exact boundary string
        // and can corrupt file blobs, causing FastAPI to return 422 "file field required".
        // Forwarding the original content-type (with boundary) is required for the backend to parse it.
        headers.set("content-type", reqContentType);
        fetchOptions.body = req.body;
        (fetchOptions as any).duplex = "half"; // required by Node.js fetch for streaming bodies
      } else {
        const bodyText = await req.text();
        fetchOptions.body = bodyText;
      }
    }

    const res = await fetch(backendTargetUrl, fetchOptions);

    const responseHeaders = new Headers();
    res.headers.forEach((value, key) => {
      // Filter out transfer encodings or content lengths to prevent proxy mismatch errors
      if (key.toLowerCase() !== "content-encoding" && key.toLowerCase() !== "content-length") {
        responseHeaders.set(key, value);
      }
    });

    return new NextResponse(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: responseHeaders,
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`Proxy error for ${path}:`, err);
    return NextResponse.json({ message: "Proxy error", error: errorMsg }, { status: 502 });
  }
}
