#!/usr/bin/env node
const path = require('path')

process.env.TS_NODE_TRANSPILE_ONLY = '1'

try {
  require('ts-node/register')
} catch (e) {
  console.error('ts-node not found. Please install it (npm i -D ts-node) or run via npx ts-node.')
  console.error(e && e.stack ? e.stack : e)
  process.exit(2)
}

const which = process.argv[2]
let scriptPath
if (!which) {
  console.error('Usage: node scripts/run-ts-once.js <backup|restore|path/to/script.ts>')
  process.exit(2)
}

if (which === 'backup') {
  scriptPath = path.join(__dirname, 'backup.ts')
  // remove the helper arg so the TS script uses its default behavior (no arg)
  process.argv[2] = undefined
} else if (which === 'restore') {
  scriptPath = path.join(__dirname, 'restore.ts')
  // remove the helper arg so the TS script uses its default behavior (backup path from backups/)
  process.argv[2] = undefined
} else if (which === 'counts') {
  scriptPath = path.join(__dirname, 'counts.ts')
  process.argv[2] = undefined
} else scriptPath = which

require(scriptPath)
