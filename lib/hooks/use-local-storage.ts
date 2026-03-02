"use client"

import { useState, useEffect, useCallback, useRef } from "react"

export function useLocalStorage<T>(
  key: string,
  defaultValue: T
): [T, (value: T) => void, () => void] {
  const [value, setValue] = useState<T>(defaultValue)
  const [hydrated, setHydrated] = useState(false)
  const defaultRef = useRef(defaultValue)
  const removedRef = useRef(false)

  // Read from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(key)
      if (saved !== null) {
        setValue(JSON.parse(saved) as T)
      }
    } catch {
      // JSON parse error — keep defaultValue
    }
    setHydrated(true)
  }, [key])

  // Write to localStorage when value changes (only after hydration)
  useEffect(() => {
    if (!hydrated) return
    // Skip write-back when remove() just cleared the key
    if (removedRef.current) {
      removedRef.current = false
      return
    }
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // Ignore quota/private mode errors
    }
  }, [key, value, hydrated])

  const set = useCallback((newValue: T) => {
    setValue(newValue)
  }, [])

  const remove = useCallback(() => {
    removedRef.current = true
    try {
      localStorage.removeItem(key)
    } catch {
      // ignore
    }
    setValue(defaultRef.current)
  }, [key])

  return [value, set, remove]
}
