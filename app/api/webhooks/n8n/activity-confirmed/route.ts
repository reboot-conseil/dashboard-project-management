import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const WEBHOOK_SECRET = process.env.N8N_WEBHOOK_SECRET

export async function POST(req: NextRequest) {
  try {
    // Vérification sécurité
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${WEBHOOK_SECRET}`) {
      console.error('[WEBHOOK] Auth failed:', authHeader)
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const body = await req.json()
    console.log('[WEBHOOK] Body reçu:', JSON.stringify(body, null, 2))

    const {
      consultantId,
      projetId,
      etapeId,
      heures,
      description,
      date,
      facturable = true
    } = body

    // Validation
    if (!consultantId || !projetId || !heures || !date) {
      console.error('[WEBHOOK] Données manquantes:', { consultantId, projetId, heures, date })
      return NextResponse.json(
        { error: 'Données manquantes: consultantId, projetId, heures et date sont requis' },
        { status: 400 }
      )
    }

    // Vérifier consultant existe
    console.log('[WEBHOOK] Recherche consultant ID:', consultantId)
    const consultant = await prisma.consultant.findUnique({
      where: { id: parseInt(consultantId) }
    })

    if (!consultant) {
      console.error('[WEBHOOK] Consultant non trouvé:', consultantId)
      return NextResponse.json(
        { error: 'Consultant introuvable' },
        { status: 404 }
      )
    }

    // Vérifier projet existe
    console.log('[WEBHOOK] Recherche projet ID:', projetId)
    const projet = await prisma.projet.findUnique({
      where: { id: parseInt(projetId) }
    })

    if (!projet) {
      console.error('[WEBHOOK] Projet non trouvé:', projetId)
      return NextResponse.json(
        { error: 'Projet introuvable' },
        { status: 404 }
      )
    }

    // Créer activité
    console.log('[WEBHOOK] Création activité avec:', {
      consultantId: parseInt(consultantId),
      projetId: parseInt(projetId),
      etapeId: etapeId ? parseInt(etapeId) : null,
      heures: parseFloat(heures),
      description: description || '',
      date: new Date(date),
      facturable
    })

    const activite = await prisma.activite.create({
      data: {
        consultantId: parseInt(consultantId),
        projetId: parseInt(projetId),
        etapeId: etapeId ? parseInt(etapeId) : null,
        heures: parseFloat(heures),
        description: description || '',
        date: new Date(date),
        facturable: facturable === true || facturable === 'true'
      },
      include: {
        consultant: {
          select: { nom: true }
        },
        projet: {
          select: { nom: true }
        },
        etape: {
          select: { nom: true }
        }
      }
    })

    console.log('[WEBHOOK] Activité créée avec succès:', activite.id)

    return NextResponse.json({
      success: true,
      activite: {
        id: activite.id,
        consultant: activite.consultant.nom,
        projet: activite.projet?.nom,
        etape: activite.etape?.nom || null,
        heures: activite.heures,
        description: activite.description,
        date: activite.date
      }
    })

  } catch (error: any) {
    console.error('[WEBHOOK] ERREUR DÉTAILLÉE:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      meta: error.meta
    })

    return NextResponse.json(
      {
        error: 'Erreur serveur',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}
