'use client'

import { useEffect } from 'react'

export function SplashScreen() {
  useEffect(() => {
    const el = document.getElementById('app-splash')
    if (!el) return
    // Small delay so the real page has a moment to paint before we fade out
    const timer = setTimeout(() => {
      el.style.transition = 'opacity 0.35s ease'
      el.style.opacity = '0'
      el.addEventListener('transitionend', () => el.remove(), { once: true })
    }, 300)
    return () => clearTimeout(timer)
  }, [])

  return null
}
