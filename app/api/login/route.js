import { NextResponse } from "next/server";

export async function POST(request) {
  const { pin } = await request.json();

  if (pin && pin === process.env.APP_PIN) {
    const res = NextResponse.json({ ok: true });
    res.cookies.set("app_pin", pin, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
    return res;
  }

  return NextResponse.json({ ok: false }, { status: 401 });
}
