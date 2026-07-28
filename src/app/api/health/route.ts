import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/sqlite";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Liveness/readiness probe for container orchestrators.
 *
 * Deliberately touches the database: a process that is listening but cannot
 * reach its own storage is not ready, and reporting it healthy would hide the
 * actual fault behind a green tick. Returns no user data and needs no auth.
 */
export async function GET() {
  try {
    getDb().prepare("SELECT 1 AS ok").get();
    return NextResponse.json({
      status: "ok",
      app: "uruz",
      time: new Date().toISOString(),
    });
  } catch (err) {
    console.error("health check failed:", err);
    return NextResponse.json(
      { status: "error", app: "uruz", detail: "database_unavailable" },
      { status: 503 },
    );
  }
}
