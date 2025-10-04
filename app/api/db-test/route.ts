
import { NextResponse } from "next/server";

// This is a special test route to diagnose database connection issues.
// Access it at /api/db-test after deploying.

export const dynamic = "force-dynamic";

export async function GET() {
  let prisma;

  try {
    // Dynamically import prisma to ensure it's fresh for the test
    const prismaModule = await import("@/lib/prisma");
    prisma = prismaModule.prisma;

    if (!prisma) {
      throw new Error("Prisma client failed to initialize from @/lib/prisma.");
    }

    // A simple, raw query to test the connection without relying on a specific model.
    // This sends a minimal "ping" to the database.
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({
      status: "success",
      message: "Database connection successful!",
    });
  } catch (error: any) {
    console.error("DB Connection Test Error:", error);
    
    // Return a detailed error response
    return NextResponse.json(
      {
        status: "error",
        message: "Database connection failed.",
        errorMessage: error.message,
        // Prisma often wraps the original error, providing more detail
        errorCode: error.code,
        errorStack: error.stack,
      },
      { status: 500 }
    );
  }
}
