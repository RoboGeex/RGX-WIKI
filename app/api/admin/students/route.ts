import { NextResponse } from 'next/server'
import { AuthError } from '@/lib/auth'
import { requireAdminAccess } from '@/lib/admin-auth'
import { getAdminStudentsList } from '@/lib/admin-students'

export async function GET(request: Request) {
  try {
    await requireAdminAccess()

    // Default: active enrollments only. ?includeFormer=1 also returns students
    // whose enrollments were revoked (link disabled) or removed, so their data
    // stays findable after a teacher turns off an invite link.
    const { searchParams } = new URL(request.url)
    const includeFormer = searchParams.get('includeFormer') === '1'

    const students = await getAdminStudentsList(includeFormer)
    return NextResponse.json({ students })
  } catch (e: any) {
    const status = e instanceof AuthError ? e.status : 500
    return NextResponse.json({ error: e?.message || 'Failed' }, { status })
  }
}
