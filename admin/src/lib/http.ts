import { NextResponse } from 'next/server';

/** Small helpers so every route returns a consistent JSON envelope. */

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, ...data }, init);
}

export function fail(status: number, error: string) {
  return NextResponse.json({ ok: false, error }, { status });
}

/** Parse a JSON body, returning null on empty/invalid instead of throwing. */
export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}
