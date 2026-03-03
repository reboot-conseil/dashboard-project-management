import { describe, it, expect } from 'vitest'
import { getRedirectPath } from '@/lib/middleware-utils'

describe('getRedirectPath', () => {
  it('redirige vers /login si pas de session', () => {
    expect(getRedirectPath(null, '/dashboard')).toBe('/login')
  })

  it('redirige vers / si CONSULTANT tente /consultants', () => {
    expect(getRedirectPath({ role: 'CONSULTANT' }, '/consultants')).toBe('/')
  })

  it('redirige vers / si CONSULTANT tente /executive', () => {
    expect(getRedirectPath({ role: 'CONSULTANT' }, '/executive')).toBe('/')
  })

  it('redirige vers / si PM tente /admin/users', () => {
    expect(getRedirectPath({ role: 'PM' }, '/admin/users')).toBe('/')
  })

  it('redirige vers / si CONSULTANT tente /admin/users', () => {
    expect(getRedirectPath({ role: 'CONSULTANT' }, '/admin/users')).toBe('/')
  })

  it('retourne null si ADMIN accède à tout', () => {
    expect(getRedirectPath({ role: 'ADMIN' }, '/consultants')).toBeNull()
    expect(getRedirectPath({ role: 'ADMIN' }, '/admin/users')).toBeNull()
  })

  it('retourne null si PM accède aux pages autorisées', () => {
    expect(getRedirectPath({ role: 'PM' }, '/consultants')).toBeNull()
    expect(getRedirectPath({ role: 'PM' }, '/executive')).toBeNull()
  })

  it('redirige vers / si déjà connecté et tente /login', () => {
    expect(getRedirectPath({ role: 'PM' }, '/login')).toBe('/')
  })
})
