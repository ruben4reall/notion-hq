#!/usr/bin/env node
/**
 * Détecte les chaînes françaises hardcodées dans les fichiers TSX.
 * Usage : node scripts/check-i18n.js
 *         npm run check-i18n
 */

const fs = require('fs')
const path = require('path')

// Patterns qui indiquent du texte français non traduit dans le JSX
const PATTERNS = [
  // Caractères accentués entre balises JSX ou dans des strings JS
  { re: />[^<{]*[àâáãäåæçèéêëìíîïñòóôõöùúûüýÿÀÂÁÃÄÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜÝŸ][^<{]*</g, label: 'Texte avec accent entre balises JSX' },
  // Chaînes littérales avec accents dans les props
  { re: /(?:label|hint|placeholder|title|message|text)=["'][^"']*[àâáãäåæçèéêëìíîïñòóôõöùúûüýÿÀÂÁÃÄÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜÝŸ][^"']*["']/g, label: 'Prop avec texte accentué' },
  // Strings JS avec accents assignées à text/message/label
  { re: /(?:text|msg|label|title|message)\s*[:=]\s*["'][^"']*[àâáãäåæçèéêëìíîïñòóôõöùúûüýÿÀÂÁÃÄÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜÝŸ][^"']*["']/g, label: 'Variable texte avec accent' },
]

// Dossiers à scanner
const SCAN_DIRS = ['app', 'components']

// Fichiers à ignorer
const IGNORE_PATHS = [
  'lib/i18n.ts',
  'node_modules',
  '.next',
  'scripts',
]

function shouldIgnore(filePath) {
  return IGNORE_PATHS.some(p => filePath.includes(p))
}

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8')
  const lines = content.split('\n')
  const issues = []

  for (const { re, label } of PATTERNS) {
    re.lastIndex = 0
    let m
    while ((m = re.exec(content)) !== null) {
      // Trouver le numéro de ligne
      const lineNum = content.slice(0, m.index).split('\n').length
      const lineText = lines[lineNum - 1]?.trim()

      // Ignorer les commentaires
      if (lineText?.startsWith('//') || lineText?.startsWith('*') || lineText?.startsWith('/*')) continue
      // Ignorer les imports
      if (lineText?.startsWith('import')) continue

      issues.push({ line: lineNum, label, match: m[0].slice(0, 80) })
    }
  }

  return issues
}

function walkDir(dir) {
  const files = []
  if (!fs.existsSync(dir)) return files

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (shouldIgnore(full)) continue
    if (entry.isDirectory()) files.push(...walkDir(full))
    else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) files.push(full)
  }
  return files
}

const root = path.resolve(__dirname, '..')
let totalIssues = 0

for (const dir of SCAN_DIRS) {
  const files = walkDir(path.join(root, dir))
  for (const file of files) {
    const rel = path.relative(root, file)
    if (shouldIgnore(rel)) continue

    const issues = scanFile(file)
    if (issues.length > 0) {
      console.log(`\n\x1b[33m${rel}\x1b[0m`)
      for (const { line, label, match } of issues) {
        console.log(`  \x1b[90mL${line}\x1b[0m  [${label}]`)
        console.log(`       \x1b[31m${match}\x1b[0m`)
        totalIssues++
      }
    }
  }
}

if (totalIssues === 0) {
  console.log('\x1b[32m✓ Aucune chaîne française hardcodée détectée.\x1b[0m')
  process.exit(0)
} else {
  console.log(`\n\x1b[31m${totalIssues} occurrence(s) à corriger — remplace par t('cle') depuis useLanguage().\x1b[0m`)
  process.exit(1)
}
