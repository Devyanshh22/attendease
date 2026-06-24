'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false); return }
    router.push('/dashboard/today')
    router.refresh()
  }

  return (
    <main className="min-h-screen bg-[#FAFAFA] flex items-center justify-center px-4">
      <div className="w-full max-w-[360px]">
        <div className="mb-8">
          <p className="text-[13px] font-[500] text-[#5B5BD6] mb-6">AttendEase</p>
          <h1 className="text-[22px] font-[500] text-[#111111]">Sign in</h1>
          <p className="text-[14px] text-[#6B6B6B] mt-1">Welcome back. Enter your details to continue.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white border border-[#EBEBEB] rounded-[10px] p-6 space-y-4">
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
          <Input
            label="Password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
          />
          {error && (
            <p className="text-[12px] text-[#DC2626] bg-[rgba(220,38,38,0.06)] border border-[rgba(220,38,38,0.15)] rounded-[6px] px-3 py-2">
              {error}
            </p>
          )}
          <Button type="submit" disabled={loading} className="w-full mt-1">
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>

        <p className="mt-5 text-center text-[13px] text-[#6B6B6B]">
          No account?{' '}
          <Link href="/register" className="text-[#5B5BD6] hover:underline">Create one</Link>
        </p>
      </div>
    </main>
  )
}
