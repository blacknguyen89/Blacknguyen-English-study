import { NextResponse } from "next/server";

function sbHeaders() {
  return {
    apikey: process.env.SUPABASE_ANON_KEY,
    Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY}`,
    "Content-Type": "application/json",
  };
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");
  if (!key) return NextResponse.json({ error: "missing key" }, { status: 400 });

  try {
    const res = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/kv_store?key=eq.${encodeURIComponent(key)}&select=value`,
      { headers: sbHeaders() }
    );
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json({ value: null });
    }
    return NextResponse.json({ value: data[0].value });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request) {
  const { key, value } = await request.json();
  if (!key) return NextResponse.json({ error: "missing key" }, { status: 400 });

  try {
    const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1/kv_store`, {
      method: "POST",
      headers: { ...sbHeaders(), Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify({ key, value, updated_at: new Date().toISOString() }),
    });
    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ error: errText }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");
  if (!key) return NextResponse.json({ error: "missing key" }, { status: 400 });

  try {
    await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/kv_store?key=eq.${encodeURIComponent(key)}`,
      { method: "DELETE", headers: sbHeaders() }
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
