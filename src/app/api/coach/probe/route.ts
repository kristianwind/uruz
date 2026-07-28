import { NextResponse } from "next/server";
import { getContext } from "@/lib/auth/session";
import { probeAI, getAIConfig } from "@/lib/ai/provider";

export const runtime = "nodejs";

/**
 * Check that the configured model is reachable. Admin-only: the response
 * reveals which provider and model the installation uses.
 */
export async function GET() {
  const ctx = await getContext();
  if (!ctx || ctx.user.role !== "admin") {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }
  const config = getAIConfig();
  const result = await probeAI(config);
  return NextResponse.json({
    ...result,
    baseUrl: config.baseUrl, // never the key
  });
}
