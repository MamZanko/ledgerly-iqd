'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [step, setStep] = useState<'credentials' | 'totp'>('credentials')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (step === 'credentials') {
      if (!username || !password) {
        setError('Please enter your username and password')
        return
      }
      setStep('totp')
      return
    }

    // step === 'totp'
    setLoading(true)
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, code }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Login failed')
        setStep('credentials')
        setCode('')
        setLoading(false)
        return
      }
      router.push('/')
      router.refresh()
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-neutral-200 p-8">
        <h1 className="text-xl font-semibold text-neutral-900 mb-1">Ledgerly</h1>
        <p className="text-sm text-neutral-500 mb-6">
          {step === 'credentials' ? 'Sign in to continue' : 'Enter your 6-digit code'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {step === 'credentials' ? (
            <>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Username</label>
                <input
                  type="text"
                  autoFocus
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  autoComplete="username"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  autoComplete="current-password"
                />
              </div>
            </>
          ) : (
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Authenticator code
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-center tracking-[0.5em] font-mono focus:outline-none focus:ring-2 focus:ring-neutral-900"
                autoComplete="one-time-code"
              />
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading || (step === 'totp' && code.length !== 6)}
            className="w-full bg-neutral-900 text-white rounded-lg py-2 text-sm font-medium hover:bg-neutral-800 transition disabled:opacity-50"
          >
            {loading ? 'Verifying...' : step === 'credentials' ? 'Continue' : 'Sign in'}
          </button>

          {step === 'totp' && (
            <button
              type="button"
              onClick={() => {
                setStep('credentials')
                setCode('')
                setError('')
              }}
              className="w-full text-sm text-neutral-500 hover:text-neutral-700"
            >
              ← Back
            </button>
          )}
        </form>
      </div>
    </div>
  )
}