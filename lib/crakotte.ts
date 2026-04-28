const CRAKOTTE_BASE = "https://app.crakotte.com/api/external/v1"

export interface CrakotteCustomer {
  id: string
  name: string
  email: string | null
  projects: { id: string; name: string }[]
}

export interface CrakotteProject {
  id: string
  name: string
  customer: { id: string; name: string }
}

export interface CrakotteStep {
  id: string
  name: string
}

export interface CrakotteConsultant {
  id: string
  firstName: string
  lastName: string
  email: string
  name: string
}

export interface CrakotteTimeEntry {
  date: string
  time: number
  consultant: { id: string; firstName: string; lastName: string; email: string }
  customer: { id: string; name: string }
  project: { id: string; name: string }
  step: { id: string; name: string }
  entry: { id: string; status: string; month: number; year: number }
}

export interface CrakotteTimeSpentResponse {
  from: string
  to: string
  count: number
  items: CrakotteTimeEntry[]
}

async function crakotteFetch<T>(path: string, apiKey: string): Promise<T> {
  const res = await fetch(`${CRAKOTTE_BASE}${path}`, {
    headers: { "X-API-Key": apiKey },
    next: { revalidate: 0 },
  })
  if (!res.ok) {
    throw new Error(`Crakotte API error ${res.status}: ${await res.text()}`)
  }
  return res.json()
}

export async function fetchCrakotteCustomers(apiKey: string): Promise<CrakotteCustomer[]> {
  return crakotteFetch<CrakotteCustomer[]>("/customers", apiKey)
}

export async function fetchCrakotteProjects(apiKey: string): Promise<CrakotteProject[]> {
  return crakotteFetch<CrakotteProject[]>("/projects", apiKey)
}

export async function fetchCrakotteSteps(apiKey: string): Promise<CrakotteStep[]> {
  return crakotteFetch<CrakotteStep[]>("/steps", apiKey)
}

export async function fetchCrakotteConsultants(apiKey: string): Promise<CrakotteConsultant[]> {
  return crakotteFetch<CrakotteConsultant[]>("/consultants", apiKey)
}

export async function fetchCrakotteTimeSpent(
  apiKey: string,
  from: string,
  to: string,
  params?: { customerId?: string; projectId?: string; consultantId?: string }
): Promise<CrakotteTimeSpentResponse> {
  const qs = new URLSearchParams({ from, to })
  if (params?.customerId) qs.set("customerId", params.customerId)
  if (params?.projectId) qs.set("projectId", params.projectId)
  if (params?.consultantId) qs.set("consultantId", params.consultantId)
  return crakotteFetch<CrakotteTimeSpentResponse>(`/time-spent?${qs}`, apiKey)
}

export async function testCrakotteConnection(apiKey: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await fetchCrakotteConsultants(apiKey)
    return { ok: true }
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}
