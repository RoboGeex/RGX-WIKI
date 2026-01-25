
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({
    STORE_MEDIA_IN_DB: process.env.STORE_MEDIA_IN_DB,
    UPLOAD_STRATEGY: process.env.UPLOAD_STRATEGY,
    NODE_ENV: process.env.NODE_ENV,
    TEST: 'Working'
  })
}
