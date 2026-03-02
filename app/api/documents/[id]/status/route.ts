import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    console.log('[DEBUG-STATUS] Checking document:', id)

    const docId = parseInt(id)
    if (isNaN(docId)) {
      return NextResponse.json({ error: 'Invalid document ID' }, { status: 400 })
    }

    const doc = await prisma.documentIngestion.findUnique({
      where: { id: docId },
    })

    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    const response = {
      id: doc.id,
      filename: doc.filename,
      status: doc.status,
      mimetype: doc.mimetype,
      filesize: doc.filesize,
      hasExtractedText: !!doc.extractedText,
      extractedTextLength: doc.extractedText?.length ?? 0,
      hasAnalysis: !!doc.analysis,
      confidence: doc.confidence,
      errorMessage: doc.errorMessage ?? null,
      createdAt: doc.createdAt,
      processedAt: doc.processedAt ?? null,
      timeSinceCreation: doc.createdAt
        ? Math.round((Date.now() - doc.createdAt.getTime()) / 1000) + 's'
        : null,
    }

    console.log('[DEBUG-STATUS] Document state:', response)

    return NextResponse.json(response)

  } catch (error: any) {
    console.error('[DEBUG-STATUS] Error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
