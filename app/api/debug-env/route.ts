
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({
    USE_DB: process.env.USE_DB,
    USE_SHARED_DB: process.env.USE_SHARED_DB,
    SHARED_DATABASE_MODE: process.env.SHARED_DATABASE_MODE,
    DISABLE_WIKI_DB_ROUTING: process.env.DISABLE_WIKI_DB_ROUTING,
    STORE_MEDIA_IN_DB: process.env.STORE_MEDIA_IN_DB,
    UPLOAD_STRATEGY: process.env.UPLOAD_STRATEGY,
    HAS_DATABASE_URL: Boolean(process.env.DATABASE_URL || process.env.DATABASE_URL_DEFAULT || process.env.DATABASE_URL_HUB),
    NODE_ENV: process.env.NODE_ENV,
    TEST: 'Working'
  })
}
