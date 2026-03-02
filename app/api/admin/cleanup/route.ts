import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'

const execAsync = promisify(exec)

// ── Sécurité minimale ─────────────────────────────────────────────────────────
// Cette app n'a pas de système d'authentification.
// En production, remplacer par NextAuth + vérification de rôle admin.
// Pour l'instant : protégé par ADMIN_SECRET en variable d'environnement.
function checkAdminSecret(request: Request): boolean {
  const secret = process.env.ADMIN_SECRET
  if (!secret) return true // Si pas configuré → accès libre (dev local)
  const header = request.headers.get('x-admin-secret')
  return header === secret
}

// Modes autorisés (whitelist stricte pour éviter les injections)
const VALID_MODES = ['dry-run', 'execute'] as const
type CleanupMode = typeof VALID_MODES[number]

export async function POST(request: Request) {
  try {
    if (!checkAdminSecret(request)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const body = await request.json()
    const { mode } = body as { mode?: CleanupMode }

    if (!mode || !VALID_MODES.includes(mode)) {
      return NextResponse.json(
        { error: `Mode invalide. Valeurs acceptées : ${VALID_MODES.join(', ')}` },
        { status: 400 }
      )
    }

    console.log(`[CLEANUP] Mode: ${mode}`)

    // ── Construire la commande (chemin fixe — pas d'interpolation user) ────────
    const scriptPath = path.join(process.cwd(), 'scripts', 'cleanup.sh')

    // --web : désactive sleep 5 + prompts interactifs + ANSI codes
    const args = mode === 'execute' ? '--execute --web' : '--web'
    const command = `bash "${scriptPath}" ${args}`

    console.log(`[CLEANUP] Executing: bash scripts/cleanup.sh ${args}`)

    // ── Exécuter le script ─────────────────────────────────────────────────────
    const { stdout, stderr } = await execAsync(command, {
      cwd: process.cwd(),
      timeout: 30_000,          // 30s max
      maxBuffer: 10 * 1024 * 1024, // 10 MB buffer
    })

    console.log('[CLEANUP] Script completed successfully')

    return NextResponse.json({
      success: true,
      mode,
      output: stdout,
      errors: stderr || null,
      timestamp: new Date().toISOString(),
    })

  } catch (error: unknown) {
    const err = error as { message?: string; stdout?: string; stderr?: string; code?: number }
    console.error('[CLEANUP] Error:', err.message)

    // execAsync rejette aussi quand le script retourne code > 0
    // On retourne quand même l'output (peut contenir des infos utiles)
    return NextResponse.json({
      success: false,
      error: err.message ?? 'Erreur inconnue',
      output: err.stdout ?? '',
      errors: err.stderr ?? err.message ?? '',
      timestamp: new Date().toISOString(),
    }, { status: 500 })
  }
}

// ── GET : statut du script (existe ? exécutable ?) ────────────────────────────
export async function GET() {
  const { promises: fs } = await import('fs')
  const scriptPath = path.join(process.cwd(), 'scripts', 'cleanup.sh')
  try {
    await fs.access(scriptPath)
    return NextResponse.json({ exists: true, path: 'scripts/cleanup.sh' })
  } catch {
    return NextResponse.json({ exists: false, path: 'scripts/cleanup.sh' }, { status: 404 })
  }
}
