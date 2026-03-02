"use client"

import { useState, useEffect, useCallback } from "react"

export function useAlertCount(): { count: number; loading: boolean } {
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const fetchCount = useCallback(async () => {
    try {
      const res = await fetch("/api/alertes")
      if (res.ok) {
        const data = await res.json()
        setCount(Array.isArray(data) ? data.length : 0)
      }
    } catch {
      // silently ignore network errors
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCount()
    const interval = setInterval(fetchCount, 60_000)
    return () => clearInterval(interval)
  }, [fetchCount])

  return { count, loading }
}
