import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    console.log('[TEAMS ACTION] ===== NOUVELLE ACTION =====')

    const body = await req.json()
    console.log('[TEAMS ACTION] Body complet:', JSON.stringify(body, null, 2))

    // Teams peut envoyer différents formats selon le type d'action
    // On essaie plusieurs chemins pour extraire les données
    const actionData = body.data || body
    const action = actionData.action || body.action

    console.log('[TEAMS ACTION] Action détectée:', action)
    console.log('[TEAMS ACTION] Données:', JSON.stringify(actionData, null, 2))

    // ANNULATION
    if (action === 'cancel') {
      console.log('[TEAMS ACTION] ❌ Activité annulée par utilisateur')

      // Envoyer message d'annulation dans Teams si URL disponible
      if (actionData.incomingWebhookUrl) {
        try {
          await fetch(actionData.incomingWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: '❌ Enregistrement de l\'activité annulé'
            })
          })
          console.log('[TEAMS ACTION] Message annulation envoyé à Teams')
        } catch (error) {
          console.error('[TEAMS ACTION] Erreur envoi message Teams:', error)
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Activité annulée'
      })
    }

    // CONFIRMATION
    if (action === 'confirm') {
      console.log('[TEAMS ACTION] ✅ Création activité demandée')

      const {
        consultantId,
        projetId,
        etapeId,
        heures,
        description,
        date,
        incomingWebhookUrl
      } = actionData

      // Validation
      if (!consultantId || !projetId || !heures || !date) {
        console.error('[TEAMS ACTION] ❌ Données manquantes:', {
          consultantId,
          projetId,
          heures,
          date
        })
        return NextResponse.json(
          { error: 'Données manquantes: consultantId, projetId, heures et date requis' },
          { status: 400 }
        )
      }

      console.log('[TEAMS ACTION] Données validées, création activité...')

      // Créer activité en base de données
      const activite = await prisma.activite.create({
        data: {
          consultantId: parseInt(consultantId),
          projetId: parseInt(projetId),
          etapeId: etapeId && etapeId !== 'null' ? parseInt(etapeId) : null,
          heures: parseFloat(heures),
          description: description || '',
          date: new Date(date),
          facturable: true
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

      console.log('[TEAMS ACTION] ✅ Activité créée avec ID:', activite.id)

      // Envoyer confirmation dans Teams avec Adaptive Card
      if (incomingWebhookUrl) {
        console.log('[TEAMS ACTION] Envoi confirmation dans Teams...')

        try {
          const confirmMessage = {
            type: 'message',
            attachments: [{
              contentType: 'application/vnd.microsoft.card.adaptive',
              content: {
                type: 'AdaptiveCard',
                version: '1.4',
                body: [
                  {
                    type: 'Container',
                    style: 'good',
                    items: [
                      {
                        type: 'TextBlock',
                        text: '✅ Activité enregistrée',
                        weight: 'Bolder',
                        size: 'Large',
                        color: 'Good'
                      }
                    ]
                  },
                  {
                    type: 'FactSet',
                    facts: [
                      {
                        title: 'Consultant',
                        value: activite.consultant.nom
                      },
                      {
                        title: 'Projet',
                        value: activite.projet.nom
                      },
                      {
                        title: 'Étape',
                        value: activite.etape?.nom || 'Aucune'
                      },
                      {
                        title: 'Heures',
                        value: `${activite.heures}h`
                      },
                      {
                        title: 'Description',
                        value: activite.description || '-'
                      },
                      {
                        title: 'Date',
                        value: new Date(activite.date).toLocaleDateString('fr-FR')
                      }
                    ]
                  }
                ]
              }
            }]
          }

          await fetch(incomingWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(confirmMessage)
          })

          console.log('[TEAMS ACTION] ✅ Message confirmation envoyé à Teams')
        } catch (error) {
          console.error('[TEAMS ACTION] ❌ Erreur envoi confirmation Teams:', error)
        }
      }

      return NextResponse.json({
        success: true,
        activite: {
          id: activite.id,
          consultant: activite.consultant.nom,
          projet: activite.projet.nom,
          etape: activite.etape?.nom || null,
          heures: activite.heures,
          description: activite.description,
          date: activite.date
        }
      })
    }

    // Action inconnue
    console.warn('[TEAMS ACTION] ⚠️ Action inconnue:', action)
    return NextResponse.json({
      success: true,
      message: 'Action non reconnue mais acceptée'
    })

  } catch (error: any) {
    console.error('[TEAMS ACTION] ❌ ERREUR CRITIQUE:', error.message)
    console.error('[TEAMS ACTION] Stack:', error.stack)

    return NextResponse.json(
      {
        error: 'Erreur serveur',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}
