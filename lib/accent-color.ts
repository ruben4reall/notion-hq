export interface AccentTheme {
  id: string
  label: string
  color: string
  rgb: string
}

export const ACCENTS: AccentTheme[] = [
  { id: 'violet',  label: 'Violet',  color: '#7c6af5', rgb: '124, 106, 245' },
  { id: 'blue',    label: 'Bleu',    color: '#3b82f6', rgb: '59, 130, 246'  },
  { id: 'indigo',  label: 'Indigo',  color: '#6366f1', rgb: '99, 102, 241'  },
  { id: 'teal',    label: 'Teal',    color: '#0d9488', rgb: '13, 148, 136'  },
  { id: 'green',   label: 'Vert',    color: '#059669', rgb: '5, 150, 105'   },
  { id: 'rose',    label: 'Rose',    color: '#e11d48', rgb: '225, 29, 72'   },
  { id: 'orange',  label: 'Orange',  color: '#ea580c', rgb: '234, 88, 12'   },
  { id: 'pink',    label: 'Pink',    color: '#db2777', rgb: '219, 39, 119'  },
]

export function applyAccent(id: string) {
  const theme = ACCENTS.find(a => a.id === id) ?? ACCENTS[0]
  const root = document.documentElement
  root.style.setProperty('--accent', theme.color)
  root.style.setProperty('--accent-rgb', theme.rgb)
  root.style.setProperty('--accent-bg', `rgba(${theme.rgb}, 0.11)`)
  root.style.setProperty('--accent-glow', `rgba(${theme.rgb}, 0.22)`)
}

export function initAccent() {
  if (typeof window === 'undefined') return
  const stored = localStorage.getItem('accent-color') ?? 'violet'
  applyAccent(stored)
}

export function saveAccent(id: string) {
  localStorage.setItem('accent-color', id)
  applyAccent(id)
}

export function getCurrentAccentId(): string {
  if (typeof window === 'undefined') return 'violet'
  return localStorage.getItem('accent-color') ?? 'violet'
}
