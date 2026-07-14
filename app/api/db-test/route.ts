
import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma-multi";
import { isDebugAuthorized } from "@/lib/debug-guard";

// This is a special test route to diagnose database connection issues.
// Access it at /api/db-test after deploying.

export const dynamic = "force-dynamic";

function getDbEnvDebug(wiki?: string) {
  const normalizedWiki = wiki?.trim()
  const suffix = normalizedWiki?.toUpperCase().replace(/[^A-Z0-9_]/g, "_")
  const envKey = suffix ? `DATABASE_URL_${suffix}` : undefined
  const directEnvKey = envKey ? `${envKey}_DIRECT` : undefined
  const hasWikiUrl = envKey ? Boolean(process.env[envKey]) : false
  const hasWikiDirectUrl = directEnvKey ? Boolean(process.env[directEnvKey]) : false
  const selectedSource = hasWikiDirectUrl
    ? directEnvKey
    : hasWikiUrl
      ? envKey
      : process.env.USE_SHARED_DB === "true"
        ? "shared/default"
        : "default"

  return {
    useDb: process.env.USE_DB,
    useSharedDb: process.env.USE_SHARED_DB,
    envKey,
    directEnvKey,
    hasWikiUrl,
    hasWikiDirectUrl,
    hasDefaultUrl: Boolean(process.env.DATABASE_URL || process.env.DATABASE_URL_DEFAULT || process.env.DATABASE_URL_HUB),
    selectedSource,
  }
}

export async function GET(req: Request) {
  if (!isDebugAuthorized(req)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const wiki = new URL(req.url).searchParams.get("wiki")?.trim() || undefined;
  const dbEnv = getDbEnvDebug(wiki);

  try {
    const prisma = getPrisma(wiki);

    // A simple, raw query to test the connection without relying on a specific model.
    // This sends a minimal "ping" to the database.
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({
      status: "success",
      message: "Database connection successful!",
      wiki: wiki || "default",
      dbEnv,
    });
  } catch (error: any) {
    console.error("DB Connection Test Error:", error);
    
    // Return a detailed error response
    return NextResponse.json(
      {
        status: "error",
        message: "Database connection failed.",
        wiki: wiki || "default",
        dbEnv,
        errorMessage: error.message,
        // Prisma often wraps the original error, providing more detail
        errorCode: error.code,
        errorStack: error.stack,
      },
      { status: 500 }
    );
  }
}
