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

// Connexion — arpège majeur 7 montant + reverb synthétique
export function playLoginSound() {
  try {
    const ac = getCtx()
    const now = ac.currentTime

    // Reverb via convolver (impulse synthétique)
    const reverb = ac.createConvolver()
    const irLen = ac.sampleRate * 0.6
    const ir = ac.createBuffer(2, irLen, ac.sampleRate)
    for (let c = 0; c < 2; c++) {
      const ch = ir.getChannelData(c)
      for (let i = 0; i < irLen; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / irLen, 2)
    }
    reverb.buffer = ir

    const masterGain = ac.createGain()
    masterGain.gain.setValueAtTime(0.7, now)
    reverb.connect(masterGain)
    masterGain.connect(ac.destination)

    // Do5 - Mi5 - Sol5 - Si5 - Do6  (Cmaj7 arpège)
    const notes = [523.25, 659.25, 783.99, 987.77, 1046.50]
    const delays = [0, 0.07, 0.14, 0.21, 0.30]
    const vols   = [0.18, 0.16, 0.14, 0.13, 0.22]

    notes.forEach((freq, i) => {
      const t = now + delays[i]
      const osc = ac.createOscillator()
      const gain = ac.createGain()
      osc.connect(gain)
      gain.connect(reverb)
      // Léger détune pour chaleur
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, t)
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(vols[i], t + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55)
      osc.start(t)
      osc.stop(t + 0.6)

      // Harmonique douce (octave -1, triangle, très discret)
      if (i < 3) {
        const harm = ac.createOscillator()
        const hgain = ac.createGain()
        harm.connect(hgain)
        hgain.connect(reverb)
        harm.type = 'triangle'
        harm.frequency.setValueAtTime(freq / 2, t)
        hgain.gain.setValueAtTime(0, t)
        hgain.gain.linearRampToValueAtTime(0.04, t + 0.02)
        hgain.gain.exponentialRampToValueAtTime(0.001, t + 0.4)
        harm.start(t)
        harm.stop(t + 0.45)
      }
    })
  } catch {}
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
