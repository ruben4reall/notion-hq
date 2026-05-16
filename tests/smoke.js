#!/usr/bin/env node
// Structural smoke tests — verifies critical files and config are in place.
// Run with: npm test

const fs   = require('fs')
const path = require('path')
const assert = require('assert')

const root = path.join(__dirname, '..')

function check(relPath, label) {
  const full = path.join(root, relPath)
  assert(fs.existsSync(full), `Missing: ${relPath} (${label})`)
  console.log(`  ✓  ${label}`)
}

console.log('\nSmoke tests — project structure\n')

// Core Next.js
check('next.config.mjs',          'Next.js config')
check('middleware.ts',             'Auth middleware')
check('app/layout.tsx',           'Root layout')
check('app/page.tsx',             'Dashboard page')

// Pages
check('app/kanban/page.tsx',      'Kanban page')
check('app/crm/page.tsx',         'CRM page')
check('app/calendar/page.tsx',    'Calendar page')
check('app/roadmap/page.tsx',     'Roadmap page')
check('app/ideas/page.tsx',       'Ideas page')
check('app/time/page.tsx',        'Time tracker page')
check('app/notes/page.tsx',       'Notes page')
check('app/settings/page.tsx',    'Settings page')
check('app/auth/page.tsx',        'Auth page')
check('app/org/page.tsx',         'Org selector page')
check('app/todo/page.tsx',        'Todo page')
check('app/todo/error.tsx',       'Todo error boundary')

// API routes
check('app/api/kpis/route.ts',           'KPIs API')
check('app/api/tasks/route.ts',          'Tasks API')
check('app/api/crm/route.ts',            'CRM API')
check('app/api/ideas/route.ts',          'Ideas API')
check('app/api/time/route.ts',           'Time API')
check('app/api/notes/route.ts',          'Notes API')
check('app/api/infra/route.ts',          'Infra API')
check('app/api/todo/todoist/route.ts',   'Todoist proxy API')

// Lib
check('lib/db.ts',                'DB client')
check('lib/auth.ts',              'Auth helpers')
check('context/AuthContext.tsx',  'Auth context')

// Components
check('components/InfraWidget.tsx',      'Infra widget')
check('components/IdeasView.tsx',        'Ideas view')
check('components/Onboarding.tsx',       'Onboarding tour')
check('components/OnboardingWatcher.tsx','Onboarding watcher')

// Migrations
check('migrations/008_infra_metrics.sql', 'Migration 008')

console.log('\n✅  All smoke tests passed\n')
