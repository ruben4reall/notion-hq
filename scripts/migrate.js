#!/usr/bin/env node
// Automatic migration runner — runs on every deploy via GitHub Actions.
// Reads all migrations/*.sql files in order, tracks which have been applied,
// and only runs new ones. Safe to run multiple times.

const { Client } = require('pg')
const fs = require('fs')
const path = require('path')

async function migrate() {
  const connectionString = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL
  if (!connectionString) {
    console.error('❌  No POSTGRES_URL_NON_POOLING env var found.')
    process.exit(1)
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  })

  await client.connect()
  console.log('✅  Connected to database')

  // Create migrations tracking table
  await client.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id         SERIAL PRIMARY KEY,
      name       TEXT UNIQUE NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  // Fetch already-applied migrations
  const { rows } = await client.query('SELECT name FROM _migrations ORDER BY name')
  const applied = new Set(rows.map(r => r.name))

  // Read migration files sorted
  const migrationsDir = path.join(__dirname, '..', 'migrations')
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort()

  let ran = 0
  for (const file of files) {
    if (applied.has(file)) {
      console.log(`  ✓  ${file} (déjà appliqué)`)
      continue
    }

    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8')
    console.log(`  →  ${file} en cours…`)
    try {
      await client.query(sql)
      await client.query('INSERT INTO _migrations (name) VALUES ($1)', [file])
      console.log(`  ✅  ${file} appliqué`)
      ran++
    } catch (err) {
      console.error(`  ❌  ${file} a échoué:`, err.message)
      await client.end()
      process.exit(1)
    }
  }

  await client.end()
  console.log(ran === 0 ? '\n✅  Base de données à jour (rien à migrer)' : `\n✅  ${ran} migration(s) appliquée(s)`)
}

migrate().catch(err => {
  console.error('Migration crash:', err)
  process.exit(1)
})
