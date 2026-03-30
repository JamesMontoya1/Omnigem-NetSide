import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'
import * as util from 'util'

const prisma = new PrismaClient()

async function main() {
  const models = [
    'position',
    'serviceType',
    'city',
    'vehicleExpenseCategory',
    'vehicle',
    'user',
    'worker',
    'holiday',
    'recurringPattern',
    'assignment',
    'rotation',
    'vacation',
    'sped',
    'tripCity',
    'trip',
    'vehicleExpense',
    'appSetting',
  ]

  const clientAny = prisma as any
  const results: Record<string, number | string> = {}

  for (const m of models) {
    try {
      if (clientAny[m] && typeof clientAny[m].count === 'function') {
        results[m] = await clientAny[m].count()
      } else {
        results[m] = 'model-not-found'
      }
    } catch (err: any) {
      results[m] = `error: ${err && err.message ? err.message : String(err)}`
    }
  }

  console.log('Registros por modelo:')
  for (const [k, v] of Object.entries(results)) {
    console.log(`${k}: ${v}`)
  }

  const logsDir = path.resolve(__dirname, '../../backups/logs')
  if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true })
  const ts = new Date().toISOString().replace(/[:.]/g, '-')
  const file = path.join(logsDir, `counts-${ts}.json`)
  fs.writeFileSync(file, JSON.stringify({ time: new Date().toISOString(), counts: results }, null, 2), 'utf8')
  console.log('Contagem salva em:', file)
}

async function writeErrorLog(err: any) {
  try {
    const logsDir = path.resolve(__dirname, '../../backups/logs')
    if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true })
    const ts = new Date().toISOString().replace(/[:.]/g, '-')
    const file = path.join(logsDir, `counts-error-${ts}.log`)
    const content = [
      `time: ${new Date().toISOString()}`,
      `args: ${JSON.stringify(process.argv)}`,
      `errorMessage: ${err && err.message ? err.message : String(err)}`,
      `stack:\n${err && err.stack ? err.stack : util.inspect(err, { depth: null })}`,
      `fullObject:\n${util.inspect(err, { depth: null })}`,
    ].join('\n\n')
    fs.writeFileSync(file, content, 'utf8')
    console.error('Erro log gravado em:', file)
  } catch (e) {
    console.error('Falha ao gravar log de erro:', e)
  }
}

async function run() {
  try {
    await main()
    await prisma.$disconnect()
    console.log('Contagem concluída com sucesso.')
    process.exit(0)
  } catch (err) {
    await writeErrorLog(err)
    console.error('Erro ao contar registros:', err)
    try {
      await prisma.$disconnect()
    } catch (_) {}
    process.exit(1)
  }
}

run()
