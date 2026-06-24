import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const SUBJECT_COLORS = [
  { name: 'Indigo',  hex: '#5B5BD6' },
  { name: 'Teal',   hex: '#0D9488' },
  { name: 'Rose',   hex: '#E11D48' },
  { name: 'Amber',  hex: '#D97706' },
  { name: 'Green',  hex: '#1A9E5F' },
  { name: 'Violet', hex: '#7C3AED' },
  { name: 'Sky',    hex: '#0284C7' },
  { name: 'Orange', hex: '#EA580C' },
]

export function autoShortCode(name: string): string {
  const words = name.trim().split(/\s+/)
  if (words.length >= 2) return words.map(w => w[0]).join('').toUpperCase().slice(0, 4)
  return name.slice(0, 3).toUpperCase()
}

export function attendancePct(attended: number, total: number): number {
  if (!total) return 0
  return Math.round((attended / total) * 100)
}

export function classesNeeded(attended: number, total: number, target: number): number {
  // How many more classes to attend to hit target%
  // attended / (total + x) >= target/100 → x = ceil((target*total - 100*attended) / (100 - target))
  const t = target / 100
  const needed = Math.ceil((t * total - attended) / (1 - t))
  return Math.max(0, needed)
}

export function canMiss(attended: number, total: number, target: number): number {
  // How many more can be missed while staying >= target%
  // (attended) / (total + x) >= target/100 → x = floor((attended - target*total/100) / (target/100))
  const t = target / 100
  const miss = Math.floor((attended - t * total) / t)
  return Math.max(0, miss)
}

export function fmtTime(t: string): string {
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`
}

export const DAY_NAMES = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
