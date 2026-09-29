import { NextResponse } from 'next/server';

export const json = (body, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
export const fail = (status, error, extra = {}) => json({ error, ...extra }, status);
