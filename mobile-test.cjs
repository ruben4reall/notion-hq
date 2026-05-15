const { chromium, devices } = require('playwright')
const fs = require('fs')

const BASE = 'http://localhost:3333'
const OUT = '/tmp/mobile-screenshots'
fs.mkdirSync(OUT, { recursive: true })
const iphone = devices['iPhone 14']

async function shot(page, name) {
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false })
  console.log(`✓ ${name}`)
}

;(async () => {
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ ...iphone, locale: 'fr-FR' })
  const page = await ctx.newPage()

  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  await page.locator('input').nth(0).fill('Ruben.Catalao')
  await page.locator('input').nth(1).fill('vCAH&PxTzb2iVzy')
  await page.locator('button[type="submit"]').click()
  await page.waitForTimeout(3500)
  if (page.url().includes('/login')) { console.log('Login failed'); await browser.close(); return }

  // Streak modal
  await page.waitForTimeout(1500)
  await shot(page, '01-streak-modal')

  // Close streak
  try { await page.locator('button:has-text("Continuer")').click({ timeout: 2000 }) } catch {}
  await page.waitForTimeout(500)

  // Skip onboarding
  await page.evaluate(() => localStorage.setItem('onboarding_v1', '1'))
  // Close onboarding modal if open (click backdrop or Passer)
  try { await page.locator('button:has-text("Passer")').click({ timeout: 1500 }) } catch {}
  await page.waitForTimeout(400)
  await shot(page, '02-dashboard')

  // Profile menu with streak badge
  try {
    await page.locator('header button').last().click()
    await page.waitForTimeout(500)
    await shot(page, '03-profile-streak-badge')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
  } catch {}

  // BottomNav active states
  await shot(page, '04-dashboard-bottom-nav')
  await page.goto(`${BASE}/kanban`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  await shot(page, '05-kanban-bottom-nav')

  // Presence bottom sheet (tap avatars in TopNav)
  const presenceTrigger = page.locator('header button').nth(-2)
  try {
    await presenceTrigger.click({ timeout: 2000 })
    await page.waitForTimeout(600)
    await shot(page, '06-presence-bottom-sheet')
    await page.locator('body').click({ position: { x: 200, y: 100 } })
    await page.waitForTimeout(300)
  } catch {}

  // Notes
  await page.goto(`${BASE}/notes`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(600)
  await shot(page, '07-notes-list')

  // Create note + share button
  try {
    // Mobile: use the + button in the mobile header
    await page.locator('button').filter({ has: page.locator('path[d*="M12 5v14"]') }).first().click()
    await page.waitForTimeout(800)
    await shot(page, '08-note-editor')
    await page.locator('button:has-text("Partager")').click({ timeout: 2000 })
    await page.waitForTimeout(400)
    await shot(page, '09-share-picker')
  } catch (e) { console.log('Note share:', e.message) }

  // Timer
  await page.goto(`${BASE}/time`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  try { await page.locator('button:has-text("Arrêter")').click({ force: true, timeout: 1500 }) } catch {}
  await page.waitForTimeout(800)
  try {
    await page.locator('button:has-text("Démarrer")').click({ force: true, timeout: 2000 })
    await page.waitForTimeout(2500)
    await shot(page, '10-timer-running')
    await page.goto(`${BASE}/kanban`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(600)
    await shot(page, '11-kanban-with-timer-bar')
    await page.goto(`${BASE}/time`, { waitUntil: 'networkidle' })
    try { await page.locator('button:has-text("Arrêter")').click({ force: true, timeout: 2000 }) } catch {}
  } catch (e) { console.log('Timer:', e.message) }

  await browser.close()
  console.log(`\nDone → ${OUT}`)
})()
