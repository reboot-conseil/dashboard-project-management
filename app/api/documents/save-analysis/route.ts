import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { documentId, analysis, status } = body

    console.log('[SAVE-ANALYSIS] Request:', {
      documentId,
      status,
      documentType: analysis?.documentType,
      confidence: analysis?.confidence,
    })

    if (!documentId || !analysis) {
      console.warn('[SAVE-ANALYSIS] Missing params:', { documentId, hasAnalysis: !!analysis })
      return NextResponse.json(
        { error: 'Missing documentId or analysis' },
        { status: 400 }
      )
    }

    const confidence =
      typeof analysis.confidence === 'number' ? analysis.confidence : null

    const updated = await prisma.documentIngestion.update({
      where: { id: parseInt(documentId) },
      data: {
        analysis,
        confidence,
        status: status || 'PENDING_REVIEW',
      },
    })

    console.log(
      '[SAVE-ANALYSIS] Success: document', updated.id,
      '— type:', analysis.documentType,
      '— confidence:', confidence, '%',
      '— status:', updated.status
    )

    return NextResponse.json({
      success: true,
      documentId: updated.id,
      status: updated.status,
      confidence,
    })

  } catch (error: any) {
    console.error('[SAVE-ANALYSIS] Error:', error?.message ?? error)
    return NextResponse.json(
      { error: 'Failed to save analysis' },
      { status: 500 }
    )
  }
}
