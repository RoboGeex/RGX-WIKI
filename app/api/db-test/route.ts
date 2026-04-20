
import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma-multi";

// This is a special test route to diagnose database connection issues.
// Access it at /api/db-test after deploying.

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const wiki = new URL(req.url).searchParams.get("wiki")?.trim() || undefined;
    const prisma = getPrisma(wiki);

    // A simple, raw query to test the connection without relying on a specific model.
    // This sends a minimal "ping" to the database.
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({
      status: "success",
      message: "Database connection successful!",
      wiki: wiki || "default",
    });
  } catch (error: any) {
    console.error("DB Connection Test Error:", error);
    const wiki = new URL(req.url).searchParams.get("wiki")?.trim() || undefined;
    
    // Return a detailed error response
    return NextResponse.json(
      {
        status: "error",
        message: "Database connection failed.",
        wiki: wiki || "default",
        errorMessage: error.message,
        // Prisma often wraps the original error, providing more detail
        errorCode: error.code,
        errorStack: error.stack,
      },
      { status: 500 }
    );
  }
}
