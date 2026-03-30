import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'
import * as util from 'util'

const prisma = new PrismaClient()

async function main() {
  const arg = process.argv[2]
  const outDir = path.resolve(__dirname, '../../backups')
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const filePath = arg ?? path.join(outDir, `backup-${timestamp}.json`)

  console.log('Gerando backup...')

  const positions = await prisma.position.findMany()
  const serviceTypes = await prisma.serviceType.findMany()
  const cities = await prisma.city.findMany()
  const vehicleExpenseCategories = await prisma.vehicleExpenseCategory.findMany()
  const vehicles = await prisma.vehicle.findMany()
  const users = await prisma.user.findMany()
  const workers = await prisma.worker.findMany()
  const holidays = await prisma.holiday.findMany()
  const recurringPatterns = await prisma.recurringPattern.findMany()
  const assignments = await prisma.assignment.findMany()
  const rotations = await prisma.rotation.findMany()
  const vacations = await prisma.vacation.findMany()
  const speds = await prisma.sped.findMany()
  const vehicleExpenses = await prisma.vehicleExpense.findMany()
  const appSettings = await prisma.appSetting.findMany()
  const tripCities = await prisma.tripCity.findMany()
  const tripsRaw = await prisma.trip.findMany({
    include: {
      travelers: { select: { id: true } },
      drivers: { select: { id: true } },
    },
  })

  const trips = tripsRaw.map((t) => {
    const tr: any = { ...t }
    tr.travelerIds = (t.travelers || []).map((w: any) => w.id)
    tr.driverIds = (t.drivers || []).map((w: any) => w.id)
    delete tr.travelers
    delete tr.drivers
    return tr
  })

  const data = {
    positions,
    serviceTypes,
    cities,
    vehicleExpenseCategories,
    vehicles,
    users,
    workers,
    holidays,
    recurringPatterns,
    assignments,
    rotations,
    vacations,
    speds,
    vehicleExpenses,
    appSettings,
    tripCities,
    trips,
  }

  const meta = {
    backupVersion: 2,
    createdAt: new Date().toISOString(),
    counts: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, Array.isArray(v) ? (v as any).length : 0])),
  }

  fs.writeFileSync(filePath, JSON.stringify({ meta, data }, null, 2), 'utf8')
  console.log('Backup salvo em:', filePath)
}

async function writeErrorLog(err: any, prefix = 'backup') {
  try {
    const logsDir = path.resolve(__dirname, '../../backups/logs')
    if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true })
    const ts = new Date().toISOString().replace(/[:.]/g, '-')
    const file = path.join(logsDir, `${prefix}-error-${ts}.log`)
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
    console.log('Backup concluído com sucesso.')
    process.exit(0)
  } catch (err) {
    await writeErrorLog(err, 'backup')
    console.error('Erro ao gerar backup:', err)
    try {
      await prisma.$disconnect()
    } catch (_) {}
    process.exit(1)
  }
}

run()
