import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { documentId, extractedText } = body

    console.log('[SAVE-TEXT] Request:', {
      documentId,
      textLength: (extractedText ?? '').length,
    })

    if (!documentId) {
      console.warn('[SAVE-TEXT] Missing documentId')
      return NextResponse.json(
        { error: 'Missing documentId' },
        { status: 400 }
      )
    }

    const updated = await prisma.documentIngestion.update({
      where: { id: parseInt(documentId) },
      data: {
        extractedText: extractedText ?? '',
      },
    })

    console.log('[SAVE-TEXT] Success: document', updated.id, '—', (extractedText ?? '').length, 'chars saved')

    return NextResponse.json({
      success: true,
      documentId: updated.id,
    })

  } catch (error: any) {
    console.error('[SAVE-TEXT] Error:', error?.message ?? error)
    return NextResponse.json(
      { error: 'Failed to save extracted text' },
      { status: 500 }
    )
  }
}
