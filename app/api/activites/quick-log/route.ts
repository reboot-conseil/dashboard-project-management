import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const quickLogSchema = z.object({
  projetId: z.number().int('projetId doit être un entier'),
  consultantId: z.number().int('consultantId doit être un entier'),
  etapeId: z.number().int().nullable().optional(),
  heures: z
    .number()
    .min(0.5, 'Minimum 0.5h')
    .max(24, 'Maximum 24h par activité'),
  description: z.string().optional().default(''),
  date: z.string().min(1, 'La date est requise'),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    console.log('[QUICK LOG] Body reçu:', JSON.stringify(body, null, 2))

    // Validation Zod
    const data = quickLogSchema.parse(body)

    // Vérifier consultant
    const consultant = await prisma.consultant.findUnique({
      where: { id: data.consultantId },
      select: { id: true, nom: true },
    })
    if (!consultant) {
      console.error('[QUICK LOG] Consultant introuvable:', data.consultantId)
      return NextResponse.json({ error: 'Consultant introuvable' }, { status: 404 })
    }

    // Vérifier projet + récupérer webhook Teams
    const projet = await prisma.projet.findUnique({
      where: { id: data.projetId },
      select: {
        id: true,
        nom: true,
        teamsConfig: { select: { webhookUrl: true } },
      },
    })
    if (!projet) {
      console.error('[QUICK LOG] Projet introuvable:', data.projetId)
      return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 })
    }

    // Vérifier étape si fournie
    if (data.etapeId) {
      const etape = await prisma.etape.findFirst({
        where: { id: data.etapeId, projetId: data.projetId },
      })
      if (!etape) {
        return NextResponse.json(
          { error: 'Étape introuvable pour ce projet' },
          { status: 404 }
        )
      }
    }

    console.log('[QUICK LOG] Création activité:', {
      consultantId: data.consultantId,
      projetId: data.projetId,
      etapeId: data.etapeId ?? null,
      heures: data.heures,
      date: data.date,
    })

    // Créer l'activité
    const activite = await prisma.activite.create({
      data: {
        consultantId: data.consultantId,
        projetId: data.projetId,
        etapeId: data.etapeId ?? null,
        heures: data.heures,
        description: data.description || '',
        date: new Date(data.date),
        facturable: true,
      },
      include: {
        consultant: { select: { nom: true } },
        projet: { select: { nom: true } },
        etape: { select: { nom: true } },
      },
    })

    console.log('[QUICK LOG] ✅ Activité créée, ID:', activite.id)

    // Notification Teams (non-bloquante — la requête ne fail pas si Teams fail)
    const webhookUrl = projet.teamsConfig?.webhookUrl
    if (webhookUrl) {
      console.log('[QUICK LOG] Envoi notification Teams...')
      fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `✅ **${consultant.nom}** a loggé **${data.heures}h** sur **${projet.nom}**${activite.etape ? ` — ${activite.etape.nom}` : ''}${data.description ? `\n> ${data.description}` : ''}`,
        }),
      })
        .then(() => console.log('[QUICK LOG] Notification Teams envoyée'))
        .catch((err) => console.error('[QUICK LOG] Erreur notification Teams:', err))
    }

    return NextResponse.json(
      {
        success: true,
        activite: {
          id: activite.id,
          consultant: activite.consultant.nom,
          projet: activite.projet?.nom ?? null,
          etape: activite.etape?.nom || null,
          heures: Number(activite.heures),
          description: activite.description,
          date: activite.date,
        },
      },
      { status: 201 }
    )
  } catch (error: any) {
    if (error?.name === 'ZodError') {
      console.error('[QUICK LOG] Validation échouée:', error.issues)
      return NextResponse.json(
        { error: error.issues[0]?.message || 'Données invalides' },
        { status: 400 }
      )
    }
    console.error('[QUICK LOG] Erreur:', error.message, error.stack)
    return NextResponse.json(
      {
        error: 'Erreur serveur',
        details:
          process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    )
  }
}
