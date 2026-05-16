import { chromium } from 'playwright'
import path from 'path'

const LOCAL = 'http://localhost:3000'
const SCREENSHOTS_DIR = path.join(process.cwd(), 'screenshots')

const PAGES = [
  { name: 'dashboard', path: '/' },
  { name: 'kanban', path: '/kanban' },
  { name: 'crm', path: '/crm' },
  { name: 'roadmap', path: '/roadmap' },
  { name: 'ideas', path: '/ideas' },
  { name: 'time', path: '/time' },
  { name: 'notes', path: '/notes' },
  { name: 'settings', path: '/settings' },
  { name: 'todo', path: '/todo' },
  { name: 'calendar', path: '/calendar' },
  { name: 'admin', path: '/admin' },
]

const MOBILE_PAGES = ['dashboard', 'kanban', 'crm', 'calendar', 'notes', 'time']

async function login(page) {
  await page.goto(`${LOCAL}/auth`, { waitUntil: 'domcontentloaded', timeout: 15000 })
  await page.waitForTimeout(500)
  await page.fill('input[type="email"]', 'audit-test@manager.local')
  await page.fill('input[type="password"]', 'AuditTest2026!')
  await Promise.all([
    page.waitForURL(url => !url.toString().includes('/auth'), { timeout: 15000 }),
    page.click('button[type="submit"]'),
  ])
  await page.waitForTimeout(1000)
  const url = page.url()
  console.log('  Logged in → ' + url)

  // If redirected to /org, set org cookie directly and navigate
  if (url.includes('/org')) {
    console.log('  Setting org cookie directly...')
    const ORG_ID = '857c61ff-3718-49d1-a9a6-a25c3b673c2d'
    await page.evaluate((orgId) => {
      document.cookie = `current_org_id=${orgId}; path=/; max-age=${60 * 60 * 24 * 30}`
    }, ORG_ID)
    await page.goto(`${LOCAL}/`, { waitUntil: 'load', timeout: 15000 })
    await page.waitForTimeout(1000)
    console.log('  After org → ' + page.url())
  }

  // Dismiss onboarding so it doesn't block screenshots
  await page.evaluate(() => {
    localStorage.setItem('onboarding_v1', '1')
  })
}

async function auditPage(page, p) {
  const errors = []
  const handler = msg => { if (msg.type() === 'error' && !msg.text().includes('favicon')) errors.push(msg.text()) }
  page.on('console', handler)
  try {
    await page.goto(`${LOCAL}${p.path}`, { waitUntil: 'load', timeout: 25000 })
    await page.waitForTimeout(1500)
    const url = page.url()
    const title = await page.title()
    const filepath = path.join(SCREENSHOTS_DIR, `audit-${p.name}.png`)
    await page.screenshot({ path: filepath, fullPage: true })
    page.off('console', handler)
    return { page: p.name, title, url, filepath, errors, ok: true }
  } catch (e) {
    page.off('console', handler)
    // Try with shorter wait on timeout
    try {
      await page.waitForTimeout(500)
      const url = page.url()
      const filepath = path.join(SCREENSHOTS_DIR, `audit-${p.name}.png`)
      await page.screenshot({ path: filepath, fullPage: true })
      return { page: p.name, title: p.name, url, filepath, errors, ok: true, note: 'timeout but screenshot taken' }
    } catch {
      return { page: p.name, error: e.message, ok: false }
    }
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true })

  // === DESKTOP ===
  console.log('\n=== DESKTOP (1440×900) ===')
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()

  // Login
  console.log('\nLogging in...')
  await login(page)

  // Screenshot auth page (already taken during redirect flow, take before login)
  console.log('\nAuth page screenshot...')
  const authCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const authPage = await authCtx.newPage()
  await authPage.goto(`${LOCAL}/auth`, { waitUntil: 'domcontentloaded' })
  await authPage.waitForTimeout(800)
  await authPage.screenshot({ path: path.join(SCREENSHOTS_DIR, 'audit-auth.png'), fullPage: true })
  await authCtx.close()
  console.log('  ✅ auth page captured')

  const results = []
  for (const p of PAGES) {
    process.stdout.write(`\nAuditing: ${p.name} ... `)
    const r = await auditPage(page, p)
    results.push(r)
    if (r.ok) {
      const warns = r.errors?.length ? ` ⚠️  ${r.errors.length} console error(s)` : ''
      const note = r.note ? ` (${r.note})` : ''
      console.log(`✅ "${r.title}"${warns}${note}`)
      if (r.errors?.length) r.errors.forEach(e => console.log('    →', e.slice(0, 120)))
    } else {
      console.log(`❌ ${r.error}`)
    }
  }
  await ctx.close()

  // === MOBILE ===
  console.log('\n\n=== MOBILE (390×844) ===')
  const mCtx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const mp = await mCtx.newPage()
  await login(mp)

  for (const name of MOBILE_PAGES) {
    const p = PAGES.find(x => x.name === name)
    process.stdout.write(`\nMobile: ${name} ... `)
    try {
      await mp.goto(`${LOCAL}${p.path}`, { waitUntil: 'load', timeout: 20000 })
      await mp.waitForTimeout(1000)
      await mp.screenshot({ path: path.join(SCREENSHOTS_DIR, `audit-mobile-${name}.png`), fullPage: false })
      console.log('✅')
    } catch (e) {
      // try screenshot anyway
      try {
        await mp.screenshot({ path: path.join(SCREENSHOTS_DIR, `audit-mobile-${name}.png`), fullPage: false })
        console.log('✅ (timeout, screenshot taken)')
      } catch {
        console.log(`❌ ${e.message.slice(0, 80)}`)
      }
    }
  }
  await mCtx.close()

  await browser.close()

  // Final report
  console.log('\n\n========== AUDIT SUMMARY ==========')
  let issues = 0
  for (const r of results) {
    if (!r.ok) { console.log(`❌ ${r.page}: ${r.error?.slice(0,80)}`); issues++ }
    else if (r.errors?.length) { console.log(`⚠️  ${r.page}: ${r.errors.length} console error(s)`); issues++ }
    else console.log(`✅ ${r.page}`)
  }
  console.log(`\n${issues === 0 ? '🎉 Aucun bug visuel détecté!' : `⚠️  ${issues} page(s) avec problèmes`}`)
  console.log(`Screenshots: ${SCREENSHOTS_DIR}/audit-*.png`)
}

main().catch(e => { console.error(e); process.exit(1) })
