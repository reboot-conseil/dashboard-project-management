import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import LoginPage from '@/app/(auth)/login/page'

vi.mock('next-auth/react', () => ({
  signIn: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: () => null }),
  useRouter: () => ({ push: vi.fn() }),
}))

describe('LoginPage', () => {
  it('affiche le formulaire email et mot de passe', () => {
    render(<LoginPage />)
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/mot de passe/i)).toBeInTheDocument()
  })

  it('affiche un bouton de connexion', () => {
    render(<LoginPage />)
    expect(screen.getByRole('button', { name: /se connecter/i })).toBeInTheDocument()
  })

  it('appelle signIn au submit avec les credentials', async () => {
    const { signIn } = await import('next-auth/react')
    render(<LoginPage />)
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'admin@company.com' } })
    fireEvent.change(screen.getByLabelText(/mot de passe/i), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: /se connecter/i }))
    expect(signIn).toHaveBeenCalledWith('credentials', expect.objectContaining({
      email: 'admin@company.com',
      password: 'password123',
      redirect: false,
    }))
  })
})
