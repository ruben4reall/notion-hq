/**
 * Toggle maintenance mode via Vercel API.
 * Usage:
 *   node scripts/maintenance.mjs on   → activate + redeploy
 *   node scripts/maintenance.mjs off  → deactivate + redeploy
 *   node scripts/maintenance.mjs status → show current state
 */

const TOKEN      = process.env.VERCEL_TOKEN      || (await import('fs')).default.readFileSync('.env.local','utf8').match(/VERCEL_TOKEN=(.+)/)?.[1]?.trim()
const PROJECT_ID = process.env.VERCEL_PROJECT_ID || (await import('fs')).default.readFileSync('.env.local','utf8').match(/VERCEL_PROJECT_ID=(.+)/)?.[1]?.trim()
const TEAM_ID    = 'team_yZnxscSVvwaqa2C9Gehn7BCC'

const h = { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }
const base = `https://api.vercel.com`

async function getEnvId() {
  const r = await fetch(`${base}/v10/projects/${PROJECT_ID}/env?teamId=${TEAM_ID}`, { headers: h })
  const d = await r.json()
  return (d.envs || []).find(e => e.key === 'MAINTENANCE')
}

async function triggerRedeploy() {
  // Get latest production deployment to redeploy from same commit
  const r = await fetch(`${base}/v6/deployments?projectId=${PROJECT_ID}&teamId=${TEAM_ID}&limit=1&target=production`, { headers: h })
  const d = await r.json()
  const last = d.deployments?.[0]
  if (!last) { console.error('No previous deployment found'); return }

  const body = {
    name: last.name,
    gitSource: last.meta?.githubCommitSha ? {
      type: 'github',
      repo: last.meta.githubRepo,
      ref:  last.meta.githubCommitRef || 'main',
      sha:  last.meta.githubCommitSha,
    } : undefined,
    target: 'production',
  }
  const dr = await fetch(`${base}/v13/deployments?teamId=${TEAM_ID}&forceNew=1`, {
    method: 'POST', headers: h, body: JSON.stringify(body),
  })
  const dd = await dr.json()
  return dd.id
}

const cmd = process.argv[2]

if (cmd === 'on') {
  const existing = await getEnvId()
  if (existing) {
    // Update
    await fetch(`${base}/v10/projects/${PROJECT_ID}/env/${existing.id}?teamId=${TEAM_ID}`, {
      method: 'PATCH', headers: h,
      body: JSON.stringify({ value: '1' }),
    })
    console.log('✅ MAINTENANCE updated to 1')
  } else {
    // Create
    await fetch(`${base}/v10/projects/${PROJECT_ID}/env?teamId=${TEAM_ID}`, {
      method: 'POST', headers: h,
      body: JSON.stringify({ key: 'MAINTENANCE', value: '1', target: ['production'], type: 'plain' }),
    })
    console.log('✅ MAINTENANCE=1 created')
  }
  const id = await triggerRedeploy()
  console.log(`🚀 Redeploy triggered: ${id}`)
  console.log('⏳ Maintenance active dans ~30-60s')

} else if (cmd === 'off') {
  const existing = await getEnvId()
  if (existing) {
    await fetch(`${base}/v10/projects/${PROJECT_ID}/env/${existing.id}?teamId=${TEAM_ID}`, {
      method: 'DELETE', headers: h,
    })
    console.log('✅ MAINTENANCE supprimée')
  } else {
    console.log('ℹ️  Variable MAINTENANCE absente, rien à faire')
  }
  const id = await triggerRedeploy()
  console.log(`🚀 Redeploy triggered: ${id}`)
  console.log('⏳ Site de retour dans ~30-60s')

} else if (cmd === 'status') {
  const existing = await getEnvId()
  if (existing?.value === '1') {
    console.log('🔴 MAINTENANCE: ON')
  } else {
    console.log('🟢 MAINTENANCE: OFF')
  }

} else {
  console.log('Usage: node scripts/maintenance.mjs [on|off|status]')
}
