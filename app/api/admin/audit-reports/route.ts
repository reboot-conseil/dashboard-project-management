import { NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'
import { requireRole } from '@/lib/auth-guard'

// ── Sécurité minimale ─────────────────────────────────────────────────────────
function checkAdminSecret(request: Request): boolean {
  const secret = process.env.ADMIN_SECRET
  if (!secret) return true
  return request.headers.get('x-admin-secret') === secret
}

// ── Helpers filesystem ────────────────────────────────────────────────────────
async function fileExists(relPath: string): Promise<boolean> {
  try {
    await fs.access(path.join(process.cwd(), relPath))
    return true
  } catch { return false }
}

async function readFileSafe(relPath: string): Promise<string | null> {
  try { return await fs.readFile(path.join(process.cwd(), relPath), 'utf-8') }
  catch { return null }
}

// ── Calcul du score de propreté (0 → 100) ────────────────────────────────────
// Pondérations :
//   • Chaque fichier "à supprimer" encore présent  : -12 pts  (max -48 pour 4 fichiers)
//   • .env.save encore présent (sécurité !)         : -8 pts  supplémentaires
//   • Doublon dans .env                              : -5 pts
//   • Routes legacy encore présentes                : -3 pts chacune (max -18 pour 6)
//   • .env absent du .gitignore                     : -15 pts
function computeCleanlinessScore(state: {
  filesToDelete: { exists: boolean; critical?: boolean }[]
  legacyRoutes: { exists: boolean }[]
  envInGitignore: boolean
  envDuplicates: string[]
}): number {
  let score = 100

  for (const f of state.filesToDelete) {
    if (f.exists) {
      score -= f.critical ? 20 : 12
    }
  }
  score -= state.envDuplicates.length > 0 ? 5 : 0
  score -= state.envInGitignore ? 0 : 15
  const legacyPresent = state.legacyRoutes.filter(r => r.exists).length
  score -= Math.min(legacyPresent * 3, 18)

  return Math.max(0, Math.min(100, Math.round(score)))
}

// ── Route GET ─────────────────────────────────────────────────────────────────
export async function GET(request: Request) {
  const authError = await requireRole(["ADMIN"]);
  if (authError) return authError;
  try {
    if (!checkAdminSecret(request)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const root = process.cwd()

    // ── 1. Lire les markdown ────────────────────────────────────────────────
    const markdownFiles = [
      { key: 'rapport',       filename: 'RAPPORT_AUDIT.md' },
      { key: 'nettoyage',     filename: 'NETTOYAGE_RECOMMANDE.md' },
      { key: 'documentation', filename: 'DOCUMENTATION_COMPLETE_PROJET.md' },
    ]

    const reports: Record<string, {
      filename: string
      content: string | null
      error?: string
      stats?: { lines: number; words: number; size: string }
    }> = {}

    for (const { key, filename } of markdownFiles) {
      const content = await readFileSafe(filename)
      if (content !== null) {
        reports[key] = {
          filename,
          content,
          stats: {
            lines: content.split('\n').length,
            words: content.split(/\s+/).filter(Boolean).length,
            size:  `${(Buffer.byteLength(content, 'utf-8') / 1024).toFixed(1)} KB`,
          },
        }
      } else {
        reports[key] = { filename, content: null, error: `${filename} introuvable` }
      }
    }

    // ── 2. Vérifications live filesystem ─────────────────────────────────────

    // Fichiers à supprimer
    const FILES_TO_DELETE = [
      { path: 'document-ingestion-workflow.json', label: 'Workflow n8n archivé',    severity: 'low',  critical: false },
      { path: '.env.save',                        label: 'Backup .env (secrets !)', severity: 'high', critical: true  },
    ]

    // Uploads de test (cherche tous les fichiers docx dont le nom contient "test")
    const uploadsDir = path.join(root, 'uploads')
    let testUploads: { path: string; label: string; severity: string; critical: boolean }[] = []
    try {
      const files = await fs.readdir(uploadsDir)
      testUploads = files
        .filter(f => f.toLowerCase().includes('test') && (f.endsWith('.docx') || f.endsWith('.pdf') || f.endsWith('.txt')))
        .map(f => ({
          path:     `uploads/${f}`,
          label:    `Upload de test : ${f}`,
          severity: 'low',
          critical: false,
        }))
    } catch { /* uploads/ n'existe pas encore */ }

    const allFilesToDelete = [...FILES_TO_DELETE, ...testUploads]

    const filesToDeleteChecked = await Promise.all(
      allFilesToDelete.map(async (f) => ({ ...f, exists: await fileExists(f.path) }))
    )

    // Routes legacy n8n
    const LEGACY_ROUTES = [
      { path: 'app/api/documents/update-status/route.ts',              label: 'update-status (n8n)' },
      { path: 'app/api/documents/save-text/route.ts',                   label: 'save-text (n8n)' },
      { path: 'app/api/documents/save-analysis/route.ts',               label: 'save-analysis (n8n)' },
      { path: 'app/api/documents/[id]/status/route.ts',                 label: '[id]/status (debug)' },
      { path: 'app/api/admin/teams-config/test-n8n/route.ts',           label: 'test-n8n (admin)' },
      { path: 'app/api/webhooks/n8n/activity-confirmed/route.ts',       label: 'webhook n8n' },
    ]

    const legacyRoutesChecked = await Promise.all(
      LEGACY_ROUTES.map(async (r) => ({ ...r, exists: await fileExists(r.path) }))
    )

    // Vérifications .env / .gitignore
    const gitignoreContent = await readFileSafe('.gitignore')
    const envInGitignore = gitignoreContent
      ? gitignoreContent.split('\n').some(l => /^\.env(\s|$)/.test(l.trim()))
      : false

    const envContent = await readFileSafe('.env')
    let envDuplicates: string[] = []
    if (envContent) {
      const lines = envContent.split('\n').filter(l => l.trim() && !l.startsWith('#'))
      const keys = lines.map(l => l.split('=')[0].trim())
      const seen = new Set<string>()
      keys.forEach(k => { if (seen.has(k)) envDuplicates.push(k); seen.add(k) })
      envDuplicates = [...new Set(envDuplicates)] // dédoublonner la liste elle-même
    }

    // Cache .next
    const nextCacheExists = await fileExists('.next')

    // Script cleanup
    const cleanupScriptExists = await fileExists('scripts/cleanup.sh')

    // ── 3. Score de propreté ──────────────────────────────────────────────────
    const currentState = {
      filesToDelete: filesToDeleteChecked,
      legacyRoutes:  legacyRoutesChecked,
      envInGitignore,
      envDuplicates,
      nextCacheExists,
      cleanupScriptExists,
    }

    const cleanlinessScore = computeCleanlinessScore(currentState)

    // Résumé par catégorie pour l'affichage
    const summary = {
      filesStillPresent:   filesToDeleteChecked.filter(f => f.exists).length,
      filesTotal:          filesToDeleteChecked.length,
      legacyStillPresent:  legacyRoutesChecked.filter(r => r.exists).length,
      legacyTotal:         legacyRoutesChecked.length,
      envOk:               envInGitignore && envDuplicates.length === 0,
      cleanlinessScore,
    }

    return NextResponse.json({
      success: true,
      reports,
      currentState,
      summary,
      cleanupScriptExists,
      timestamp: new Date().toISOString(),
    })

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[AUDIT-REPORTS] Error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
