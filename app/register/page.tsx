'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password !== confirm) return setError('Passwords do not match.')
    if (password.length < 8) return setError('Password must be at least 8 characters.')
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
    })
    if (error) { setError(error.message); setLoading(false); return }
    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <main className="min-h-screen bg-[#FAFAFA] flex items-center justify-center px-4">
        <div className="w-full max-w-[360px] text-center">
          <div className="bg-white border border-[#EBEBEB] rounded-[10px] p-8">
            <div className="w-10 h-10 bg-[rgba(26,158,95,0.1)] rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-[18px]">✓</span>
            </div>
            <h2 className="text-[17px] font-[500] text-[#111111] mb-2">Check your inbox</h2>
            <p className="text-[13px] text-[#6B6B6B]">
              We sent a confirmation link to <strong className="text-[#111111]">{email}</strong>. Click it to activate your account.
            </p>
          </div>
          <p className="mt-5 text-[13px] text-[#6B6B6B]">
            Already confirmed?{' '}
            <Link href="/login" className="text-[#5B5BD6] hover:underline">Sign in</Link>
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#FAFAFA] flex items-center justify-center px-4">
      <div className="w-full max-w-[360px]">
        <div className="mb-8">
          <p className="text-[13px] font-[500] text-[#5B5BD6] mb-6">AttendEase</p>
          <h1 className="text-[22px] font-[500] text-[#111111]">Create account</h1>
          <p className="text-[14px] text-[#6B6B6B] mt-1">Track your attendance across all subjects.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white border border-[#EBEBEB] rounded-[10px] p-6 space-y-4">
          <Input label="Email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
          <Input label="Password" type="password" autoComplete="new-password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 8 characters" />
          <Input label="Confirm password" type="password" autoComplete="new-password" required value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="••••••••" />
          {error && (
            <p className="text-[12px] text-[#DC2626] bg-[rgba(220,38,38,0.06)] border border-[rgba(220,38,38,0.15)] rounded-[6px] px-3 py-2">
              {error}
            </p>
          )}
          <Button type="submit" disabled={loading} className="w-full mt-1">
            {loading ? 'Creating account…' : 'Create account'}
          </Button>
        </form>

        <p className="mt-5 text-center text-[13px] text-[#6B6B6B]">
          Already have an account?{' '}
          <Link href="/login" className="text-[#5B5BD6] hover:underline">Sign in</Link>
        </p>
      </div>
    </main>
  )
}
