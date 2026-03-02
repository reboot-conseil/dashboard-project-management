import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { startOfWeek, startOfMonth } from 'date-fns'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const projetIdParam = searchParams.get('projetId')
    const consultantIdParam = searchParams.get('consultantId')

    console.log('[TEAMS STATS] projetId:', projetIdParam, '| consultantId:', consultantIdParam)

    if (!projetIdParam) {
      return NextResponse.json({ error: 'projetId requis' }, { status: 400 })
    }

    const projetId = parseInt(projetIdParam)
    if (isNaN(projetId)) {
      return NextResponse.json({ error: 'projetId invalide' }, { status: 400 })
    }

    const consultantId = consultantIdParam ? parseInt(consultantIdParam) : null

    // Infos projet
    const projet = await prisma.projet.findUnique({
      where: { id: projetId },
      select: {
        id: true,
        nom: true,
        client: true,
        statut: true,
        couleur: true,
        dateDebut: true,
        dateFin: true,
      },
    })

    if (!projet) {
      console.error('[TEAMS STATS] Projet introuvable:', projetId)
      return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 })
    }

    const now = new Date()
    // Semaine commence le lundi (ISO)
    const debutSemaine = startOfWeek(now, { weekStartsOn: 1 })
    const debutMois = startOfMonth(now)

    // Toutes les agrégations en parallèle
    const [
      aggSemaine,
      aggMois,
      aggTotal,
      aggFacturable,
      aggPerso,
      activitesRecentes,
      etapes,
    ] = await Promise.all([
      // Heures cette semaine (tout le projet)
      prisma.activite.aggregate({
        where: { projetId, date: { gte: debutSemaine } },
        _sum: { heures: true },
      }),
      // Heures ce mois (tout le projet)
      prisma.activite.aggregate({
        where: { projetId, date: { gte: debutMois } },
        _sum: { heures: true },
      }),
      // Heures totales (tout le projet)
      prisma.activite.aggregate({
        where: { projetId },
        _sum: { heures: true },
      }),
      // Heures facturables (tout le projet)
      prisma.activite.aggregate({
        where: { projetId, facturable: true },
        _sum: { heures: true },
      }),
      // Heures du consultant cette semaine (perso)
      consultantId
        ? prisma.activite.aggregate({
            where: { projetId, consultantId, date: { gte: debutSemaine } },
            _sum: { heures: true },
          })
        : Promise.resolve({ _sum: { heures: null } }),
      // 5 dernières activités
      prisma.activite.findMany({
        where: { projetId },
        include: {
          consultant: { select: { id: true, nom: true, couleur: true } },
          etape: { select: { id: true, nom: true } },
        },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        take: 5,
      }),
      // Étapes du projet
      prisma.etape.findMany({
        where: { projetId },
        select: { id: true, nom: true, ordre: true, statut: true },
        orderBy: { ordre: 'asc' },
      }),
    ])

    const heuresTotal = Number(aggTotal._sum.heures ?? 0)
    const heuresFacturables = Number(aggFacturable._sum.heures ?? 0)
    const pctFacturable =
      heuresTotal > 0 ? Math.round((heuresFacturables / heuresTotal) * 100) : 0

    console.log('[TEAMS STATS] Réponse OK — heuresTotal:', heuresTotal, '| activités:', activitesRecentes.length)

    return NextResponse.json({
      projet,
      stats: {
        heuresSemaine: Number(aggSemaine._sum.heures ?? 0),
        heuresMois: Number(aggMois._sum.heures ?? 0),
        heuresTotal,
        pctFacturable,
        heuresPerso: Number(aggPerso._sum.heures ?? 0),
      },
      activitesRecentes: activitesRecentes.map((a) => ({
        id: a.id,
        date: a.date,
        heures: Number(a.heures),
        description: a.description,
        facturable: a.facturable,
        consultant: a.consultant,
        etape: a.etape,
      })),
      etapes,
    })
  } catch (error: any) {
    console.error('[TEAMS STATS] Erreur:', error.message)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
