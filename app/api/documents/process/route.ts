import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import Anthropic from '@anthropic-ai/sdk'

// mammoth : types complets disponibles
import mammoth from 'mammoth'

// pdf-parse : chargé LAZILY (pas au niveau module) pour éviter que Next.js
// ne charge @napi-rs/canvas lors de la collecte des pages → DOMMatrix error
function getPdfParse(): (buf: Buffer) => Promise<{ text: string }> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('pdf-parse')
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

const CLAUDE_SYSTEM_PROMPT = `Tu es un assistant expert en analyse de documents pour un outil de gestion de projets.

OBJECTIF :
Analyser le document fourni et extraire toutes les informations pertinentes pour créer :
- Un projet (ou enrichir un projet existant)
- Des étapes avec durées estimées
- Des activités déjà réalisées ou à planifier
- Des contacts/consultants impliqués

INSTRUCTIONS :
1. Identifie le type de document si non spécifié
2. Extrait TOUTES les informations structurées
3. Sois précis sur les dates, durées, budgets
4. Identifie les phases/étapes du projet
5. Détecte les activités passées ou futures
6. Retourne JSON valide strict

FORMAT DE SORTIE (JSON uniquement, pas de markdown) :
{
  "documentType": "devis|presentation|transcript|compte_rendu|email|autre",
  "confidence": 0-100,
  "projet": {
    "nom": "string",
    "client": "string",
    "dateDebut": "YYYY-MM-DD ou null",
    "dateFin": "YYYY-MM-DD ou null",
    "budget": number ou null,
    "description": "string",
    "statut": "PLANIFIE|EN_COURS"
  },
  "etapes": [
    {
      "nom": "string",
      "ordre": number,
      "chargeEstimeeJours": number ou null,
      "dateDebut": "YYYY-MM-DD ou null",
      "dateFin": "YYYY-MM-DD ou null",
      "description": "string"
    }
  ],
  "activites": [
    {
      "date": "YYYY-MM-DD",
      "heures": number,
      "description": "string",
      "consultant": "nom ou email si trouvé",
      "etape": "nom étape associée ou null"
    }
  ],
  "contacts": [
    {
      "nom": "string",
      "email": "string ou null",
      "role": "client|consultant|autre"
    }
  ],
  "metadata": {
    "dateDocument": "YYYY-MM-DD ou null",
    "auteur": "string ou null",
    "resume": "string (2-3 phrases)"
  }
}

RÈGLES IMPORTANTES :
- Si information manquante : mettre null (pas de string vide)
- Dates au format YYYY-MM-DD strict
- Durées en jours (convertir semaines/mois)
- Budget en euros (nombre seulement, pas de symbole)
- Nom étapes : courts et clairs (ex: "Cadrage", "Développement")
- Si transcript : extraire activités mentionnées
- Si devis : focus sur étapes et budget
- Confiance : 90-100 si clair, 50-70 si incertain, <50 si très flou`

export async function POST(request: Request) {
  console.log("═══════════════════════════════════════════════════");
  console.log("[PROCESS] ===== PROCESSING STARTED =====");
  console.log("[PROCESS] Time:", new Date().toISOString());
  console.log("═══════════════════════════════════════════════════");

  let documentId: number | null = null

  try {
    const body = await request.json()
    console.log('[PROCESS] Request body:', body)

    documentId = body.documentId
    console.log('[PROCESS] Document ID:', documentId)

    if (!documentId) {
      console.error('[PROCESS] ❌ Missing documentId in body')
      return NextResponse.json({ error: 'Missing documentId' }, { status: 400 })
    }

    // ── 1. Récupérer le document ───────────────────────────────
    const doc = await prisma.documentIngestion.findUnique({
      where: { id: documentId },
    })

    if (!doc) {
      console.error('[PROCESS] ❌ Document not found:', documentId)
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    console.log('[PROCESS] Document found:', {
      id: doc.id,
      filename: doc.filename,
      filepath: doc.filepath,
      mimetype: doc.mimetype,
      status: doc.status,
    })

    // ── 2. Status → EXTRACTING ─────────────────────────────────
    await prisma.documentIngestion.update({
      where: { id: documentId },
      data: { status: 'EXTRACTING' },
    })
    console.log('[PROCESS] Status → EXTRACTING')

    // ── 3. Extraction texte ────────────────────────────────────
    let extractedText = ''
    console.log('[PROCESS] Starting text extraction...')

    try {
      const fileResponse = await fetch(doc.filepath)
      if (!fileResponse.ok) throw new Error(`Failed to fetch file: ${fileResponse.status}`)
      const fileBuffer = Buffer.from(await fileResponse.arrayBuffer())
      console.log('[PROCESS] File fetched:', fileBuffer.length, 'bytes')

      if (doc.mimetype === 'application/pdf') {
        console.log('[PROCESS] Extracting PDF...')
        const pdfParse = getPdfParse()
        const data = await pdfParse(fileBuffer)
        extractedText = data.text

      } else if (
        doc.mimetype ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ) {
        console.log('[PROCESS] Extracting DOCX...')
        const result = await mammoth.extractRawText({ buffer: fileBuffer })
        extractedText = result.value

      } else if (doc.mimetype === 'text/plain') {
        console.log('[PROCESS] Extracting TXT...')
        extractedText = fileBuffer.toString('utf-8')

      } else {
        throw new Error('Unsupported file type: ' + doc.mimetype)
      }

      // Tronquer à 50k chars
      if (extractedText.length > 50000) {
        console.log('[PROCESS] Text truncated from', extractedText.length, 'to 50000 chars')
        extractedText = extractedText.substring(0, 50000) + '\n\n[...texte tronqué]'
      }

      if (extractedText.trim().length === 0) {
        throw new Error('Extracted text is empty')
      }

      console.log('[PROCESS] ✅ Text extracted:', {
        length: extractedText.length,
        preview: extractedText.substring(0, 200).replace(/\n/g, ' '),
      })

      // Sauvegarder le texte extrait
      await prisma.documentIngestion.update({
        where: { id: documentId },
        data: { extractedText },
      })
      console.log('[PROCESS] Extracted text saved to DB')

    } catch (err: any) {
      console.error("═══════════════════════════════════════════════════");
      console.error('[PROCESS] ❌ EXTRACTION ERROR:', err.message)
      console.error('[PROCESS] Stack:', err.stack)
      console.error("═══════════════════════════════════════════════════");
      await prisma.documentIngestion.update({
        where: { id: documentId },
        data: {
          status: 'ERROR',
          errorMessage: 'Extraction failed: ' + err.message,
        },
      })
      return NextResponse.json({ error: 'Extraction failed', details: err.message }, { status: 500 })
    }

    // ── 4. Status → ANALYZING ──────────────────────────────────
    await prisma.documentIngestion.update({
      where: { id: documentId },
      data: { status: 'ANALYZING' },
    })
    console.log('[PROCESS] Status → ANALYZING')

    // ── 5. Analyse Claude ──────────────────────────────────────
    try {
      console.log('[PROCESS] Calling Claude API (claude-sonnet-4-20250514)...')
      console.log('[PROCESS] API Key present:', !!process.env.ANTHROPIC_API_KEY)
      console.log('[PROCESS] API Key prefix:', process.env.ANTHROPIC_API_KEY?.substring(0, 10) + '...')
      console.log('[PROCESS] Text length sent to Claude:', extractedText.length)

      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        system: CLAUDE_SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `Analyse ce document :\n\n${extractedText}`,
          },
        ],
      })

      console.log('[PROCESS] ✅ Claude response received')
      console.log('[PROCESS] Stop reason:', message.stop_reason)
      console.log('[PROCESS] Usage:', message.usage)

      const responseText =
        message.content[0].type === 'text' ? message.content[0].text : ''

      console.log('[PROCESS] Response preview:', responseText.substring(0, 300))

      // Nettoyer les backticks markdown si présents
      const cleanJson = responseText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim()

      console.log('[PROCESS] Parsing JSON...')
      const analysis = JSON.parse(cleanJson)

      if (!analysis.documentType || analysis.confidence === undefined || !analysis.projet) {
        throw new Error('Invalid analysis structure from Claude')
      }

      console.log('[PROCESS] ✅ Analysis parsed:', {
        type: analysis.documentType,
        confidence: analysis.confidence,
        projectName: analysis.projet?.nom,
        etapesCount: analysis.etapes?.length ?? 0,
        activitesCount: analysis.activites?.length ?? 0,
        contactsCount: analysis.contacts?.length ?? 0,
      })

      // ── 6. Sauvegarder l'analyse ───────────────────────────
      await prisma.documentIngestion.update({
        where: { id: documentId },
        data: {
          analysis: analysis as any,
          confidence: analysis.confidence,
          status: 'PENDING_REVIEW',
          processedAt: new Date(),
        },
      })

      console.log('[PROCESS] ✅ Analysis saved to DB')
      console.log('[PROCESS] ✅ Processing completed successfully!')
      console.log("═══════════════════════════════════════════════════");

      return NextResponse.json({
        success: true,
        documentId,
        confidence: analysis.confidence,
        documentType: analysis.documentType,
        status: 'PENDING_REVIEW',
      })

    } catch (err: any) {
      console.error("═══════════════════════════════════════════════════");
      console.error('[PROCESS] ❌ ANALYSIS ERROR:', err.message)
      console.error('[PROCESS] Stack:', err.stack)
      console.error("═══════════════════════════════════════════════════");
      await prisma.documentIngestion.update({
        where: { id: documentId },
        data: {
          status: 'ERROR',
          errorMessage: 'Analysis failed: ' + err.message,
        },
      })
      return NextResponse.json({ error: 'Analysis failed', details: err.message }, { status: 500 })
    }

  } catch (err: any) {
    console.error("═══════════════════════════════════════════════════");
    console.error('[PROCESS] ❌ GENERAL ERROR:', err.message)
    console.error('[PROCESS] Stack:', err.stack)
    console.error("═══════════════════════════════════════════════════");
    if (documentId) {
      await prisma.documentIngestion.update({
        where: { id: documentId },
        data: {
          status: 'ERROR',
          errorMessage: 'Processing error: ' + err.message,
        },
      }).catch(() => {})
    }
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
