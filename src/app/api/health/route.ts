import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { applySecurityHeaders } from '@/lib/security-headers';

export async function GET() {
  try {
    // Quick DB liveness check
    await prisma.$queryRaw`SELECT 1`;

    const res = NextResponse.json({
      status: 'ok',
      service: 'rbt-portal-unificado',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
    return applySecurityHeaders(res);
  } catch (error) {
    const res = NextResponse.json(
      {
        status: 'degraded',
        service: 'rbt-portal-unificado',
        database: 'disconnected',
        error: String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
    return applySecurityHeaders(res);
  }
}
