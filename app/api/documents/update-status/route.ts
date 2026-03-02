import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const VALID_STATUSES = [
  'UPLOADING', 'EXTRACTING', 'ANALYZING',
  'PENDING_REVIEW', 'PROCESSED', 'REJECTED', 'ERROR',
]

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { documentId, status, errorMessage } = body

    console.log('[UPDATE-STATUS] Request:', { documentId, status, errorMessage })

    if (!documentId || !status) {
      console.warn('[UPDATE-STATUS] Missing params:', { documentId, status })
      return NextResponse.json(
        { error: 'Missing documentId or status' },
        { status: 400 }
      )
    }

    if (!VALID_STATUSES.includes(status)) {
      console.warn('[UPDATE-STATUS] Invalid status:', status)
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      )
    }

    const updated = await prisma.documentIngestion.update({
      where: { id: parseInt(documentId) },
      data: {
        status,
        ...(errorMessage && { errorMessage }),
      },
    })

    console.log('[UPDATE-STATUS] Success:', updated.id, '→', updated.status)

    return NextResponse.json({
      success: true,
      documentId: updated.id,
      status: updated.status,
    })

  } catch (error: any) {
    console.error('[UPDATE-STATUS] Error:', error?.message ?? error)
    return NextResponse.json(
      { error: 'Failed to update status' },
      { status: 500 }
    )
  }
}
