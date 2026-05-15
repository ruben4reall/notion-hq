// Web Audio API — no external files needed

let ctx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!ctx) ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
  return ctx
}

function playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume = 0.15) {
  try {
    const ac = getCtx()
    const osc = ac.createOscillator()
    const gain = ac.createGain()
    osc.connect(gain)
    gain.connect(ac.destination)
    osc.type = type
    osc.frequency.setValueAtTime(frequency, ac.currentTime)
    gain.gain.setValueAtTime(volume, ac.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration)
    osc.start(ac.currentTime)
    osc.stop(ac.currentTime + duration)
  } catch {}
}

// Connexion utilisateur — son doux "bienvenue" (2 notes montantes)
export function playLoginSound() {
  playTone(440, 0.12, 'sine', 0.12)
  setTimeout(() => playTone(660, 0.18, 'sine', 0.10), 130)
}

// Nouvelle notification — "ping" subtil
export function playNotifSound() {
  playTone(880, 0.08, 'sine', 0.08)
  setTimeout(() => playTone(1100, 0.12, 'sine', 0.06), 80)
}

// Utilisateur qui se connecte (présence) — son différent, plus doux
export function playPresenceSound() {
  playTone(523, 0.1, 'triangle', 0.07)
  setTimeout(() => playTone(659, 0.14, 'triangle', 0.05), 110)
}
