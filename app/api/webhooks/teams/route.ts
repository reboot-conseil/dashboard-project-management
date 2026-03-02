import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

const TEAMS_WEBHOOK_SECRET = 'nveUCCUSTppJqhg13/a0QDYrPDzInLSNqz9fN+Aj9CI='
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || 'https://n8n.spoton-ai.fr/webhook/teams-dashboard'

export async function POST(req: NextRequest) {
  try {
    console.log('[TEAMS WEBHOOK] Requête reçue')

    // 1. Récupérer le body comme buffer (pour vérification HMAC)
    const bodyBuffer = await req.arrayBuffer()
    const bodyString = Buffer.from(bodyBuffer).toString('utf-8')
    const body = JSON.parse(bodyString)

    console.log('[TEAMS WEBHOOK] Body:', JSON.stringify(body, null, 2))

    // 2. Récupérer la signature Teams
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('HMAC ')) {
      console.error('[TEAMS WEBHOOK] Pas de signature HMAC')
      return NextResponse.json(
        { error: 'Missing HMAC signature' },
        { status: 401 }
      )
    }

    const receivedSignature = authHeader.replace('HMAC ', '')

    // 3. Calculer la signature attendue
    const hmac = crypto.createHmac('sha256', Buffer.from(TEAMS_WEBHOOK_SECRET, 'base64'))
    hmac.update(Buffer.from(bodyString, 'utf-8'))
    const calculatedSignature = hmac.digest('base64')

    // 4. Vérifier la signature
    if (receivedSignature !== calculatedSignature) {
      console.error('[TEAMS WEBHOOK] Signature invalide')
      console.error('Reçue:', receivedSignature)
      console.error('Calculée:', calculatedSignature)
      return NextResponse.json(
        { error: 'Invalid HMAC signature' },
        { status: 401 }
      )
    }

    console.log('[TEAMS WEBHOOK] Signature valide ✅')

    // 5. Forward à N8N
    console.log('[TEAMS WEBHOOK] Forward vers N8N:', N8N_WEBHOOK_URL)

    const n8nResponse = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })

    console.log('[TEAMS WEBHOOK] Réponse N8N:', n8nResponse.status)

    if (!n8nResponse.ok) {
      const errorText = await n8nResponse.text()
      console.error('[TEAMS WEBHOOK] Erreur N8N:', errorText)
    }

    // 6. Retourner succès à Teams
    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('[TEAMS WEBHOOK] Erreur:', error.message)
    console.error(error.stack)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
