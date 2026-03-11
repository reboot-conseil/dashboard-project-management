// lib/email.ts

export async function sendWelcomeEmail(nom: string, email: string, password: string): Promise<void> {
  const tenantId = process.env.MICROSOFT_TENANT_ID
  const clientId = process.env.MICROSOFT_CLIENT_ID
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET
  const from = process.env.EMAIL_FROM
  const appUrl = process.env.APP_URL ?? "https://192.168.1.63"

  // Si les variables ne sont pas configurées, on skip silencieusement
  if (!tenantId || !clientId || !clientSecret || !from) {
    console.warn("[email] Variables Microsoft non configurées — email de bienvenue non envoyé")
    return
  }

  // 1. Obtenir un access token (client credentials)
  const tokenRes = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
        scope: "https://graph.microsoft.com/.default",
      }).toString(),
    }
  )

  if (!tokenRes.ok) {
    const err = await tokenRes.text().catch(() => "unknown")
    throw new Error(`[email] Impossible d'obtenir le token Microsoft: ${err}`)
  }

  const { access_token } = await tokenRes.json() as { access_token: string }

  // 2. Envoyer via Microsoft Graph
  const mailRes = await fetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(from)}/sendMail`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          subject: "Votre accès PM Dashboard — Reboot Conseil",
          body: {
            contentType: "HTML",
            content: `
              <p>Bonjour <strong>${nom}</strong>,</p>
              <p>Votre accès à la plateforme <strong>PM Dashboard</strong> de Reboot Conseil a été créé.</p>
              <table cellpadding="8" style="border-collapse:collapse;margin:16px 0">
                <tr><td style="font-weight:bold;padding-right:16px">URL</td><td><a href="${appUrl}">${appUrl}</a></td></tr>
                <tr><td style="font-weight:bold;padding-right:16px">Email</td><td>${email}</td></tr>
                <tr><td style="font-weight:bold;padding-right:16px">Mot de passe</td><td>${password}</td></tr>
              </table>
              <p>Nous vous recommandons de changer votre mot de passe après votre première connexion.</p>
              <p>Cordialement,<br>L'équipe Reboot Conseil</p>
            `.trim(),
          },
          toRecipients: [{ emailAddress: { address: email } }],
        },
        saveToSentItems: false,
      }),
    }
  )

  if (!mailRes.ok) {
    const err = await mailRes.json().catch(() => ({}))
    throw new Error(`[email] Graph API error: ${JSON.stringify(err)}`)
  }
}
