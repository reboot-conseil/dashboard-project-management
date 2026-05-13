"use client"
import { useState } from "react"
import { PendingProjectsSection } from "./PendingProjectsSection"
import { RawDataSection } from "./RawDataSection"

interface PendingProject {
  id: number
  crakotteProjectName: string
  crakotteCustomerName: string
  crakotteProjectId: string
  createdAt: string
  resolvedAt: string | null
  suggestedProjet: { id: number; nom: string } | null
}

export function CrakotteBottomSections({ initialPending }: { initialPending: PendingProject[] }) {
  const [refreshKey, setRefreshKey] = useState(0)

  return (
    <>
      <PendingProjectsSection initial={initialPending} refreshKey={refreshKey} />
      <RawDataSection onProjectLinked={() => setRefreshKey((k) => k + 1)} />
    </>
  )
}
