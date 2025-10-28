import { NextRequest } from "next/server";


const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";


function joinUrl(base: string, pathParts: string[]) {
    const baseTrim = base.replace(/\/$/, "");
    const suffix = pathParts.join("/").replace(/^\//, "");
    return `${baseTrim}/${suffix}`;
}


export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
    if (!API_BASE) return new Response("API base not set", { status: 500 });
    const target = new URL(joinUrl(API_BASE, params.path));
    // preserve search params
    req.nextUrl.searchParams.forEach((v, k) => target.searchParams.set(k, v));


    const res = await fetch(target.toString(), { cache: "no-store" });
    const text = await res.text();
    return new Response(text, { status: res.status, headers: { "content-type": res.headers.get("content-type") ?? "application/json" } });
}


export async function POST(req: NextRequest, { params }: { params: { path: string[] } }) {
    if (!API_BASE) return new Response("API base not set", { status: 500 });
    const target = joinUrl(API_BASE, params.path);
    const body = await req.text();


    const res = await fetch(target, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
    });
    const text = await res.text();
    return new Response(text, { status: res.status, headers: { "content-type": res.headers.get("content-type") ?? "application/json" } });
}