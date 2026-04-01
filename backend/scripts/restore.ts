import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'
import * as util from 'util'

const prisma = new PrismaClient()

async function main() {
  const arg = process.argv[2]
  const modeArg = process.argv.includes('--replace') ? 'replace' : 'merge'
  const backupsDir = path.resolve(__dirname, '../../backups')

  let backupPath: string | undefined = arg
  if (!backupPath) {
    if (!fs.existsSync(backupsDir)) throw new Error(`Pasta de backups não encontrada: ${backupsDir}`)
    const files = fs.readdirSync(backupsDir).filter((f) => f.endsWith('.json')).sort()
    if (files.length === 0) throw new Error('Nenhum arquivo de backup encontrado na pasta backups')
    backupPath = path.join(backupsDir, files[files.length - 1])
    console.log('Usando último backup encontrado:', backupPath)
  }

  const raw = fs.readFileSync(backupPath, 'utf8')
  const parsed = JSON.parse(raw)
  const data = parsed.data ?? parsed

  const mapping: Record<string, string> = {
    positions: 'position',
    serviceTypes: 'serviceType',
    cities: 'city',
    vehicleExpenseCategories: 'vehicleExpenseCategory',
    vehicles: 'vehicle',
    users: 'user',
    workers: 'worker',
    holidays: 'holiday',
    recurringPatterns: 'recurringPattern',
    assignments: 'assignment',
    rotations: 'rotation',
    vacations: 'vacation',
    speds: 'sped',
    tripCities: 'tripCity',
    trips: 'trip',
    vehicleExpenses: 'vehicleExpense',
    appSettings: 'appSetting',
  }

  const restoreOrder = [
    'positions',
    'serviceTypes',
    'cities',
    'vehicleExpenseCategories',
    'vehicles',
    'workers',
    'users',
    'recurringPatterns',
    'assignments',
    'vacations',
    'rotations',
    'trips',
    'tripCities',
    'vehicleExpenses',
    'speds',
    'holidays',
    'appSettings',
  ]

  const allowedFields: Record<string, string[]> = {
    position: ['id', 'name', 'discription', 'createdAt'],
    serviceType: ['id', 'name', 'code', 'description', 'createdAt'],
    city: ['id', 'name', 'state', 'country', 'createdAt'],
    vehicleExpenseCategory: ['id', 'name', 'description', 'createdAt'],
    vehicle: ['id', 'plate', 'model', 'odometer', 'nextOilChange', 'lastAlignment', 'odometerAtLastAlignment', 'lastMaintenance', 'notes', 'createdAt'],
    worker: ['id', 'name', 'color', 'active', 'doesShifts', 'doesTravel', 'dontVacation', 'hireDate', 'terminationDate', 'positionId', 'createdAt'],
    user: ['id', 'email', 'password', 'roles', 'name', 'workerId', 'createdAt'],
    holiday: ['id', 'date', 'name', 'recurring', 'createdAt'],
    recurringPattern: ['id', 'workerId', 'weekdays', 'weekInterval', 'weekOffset', 'startDate', 'endDate', 'note', 'createdAt'],
    assignment: ['id', 'date', 'workerId', 'source', 'note', 'createdAt'],
    rotation: ['id', 'name', 'weekdays', 'workerIds', 'startDate', 'endDate', 'notifyUpcoming', 'createdAt'],
    vacation: ['id', 'workerId', 'startDate', 'endDate', 'daysUsed', 'sold', 'active', 'note', 'request', 'createdAt'],
    sped: ['id', 'company', 'note', 'bankAccountStatus', 'accountingSheetStatus', 'icmsIpi', 'pisCofins', 'regime', 'contactAttempts', 'lastSent', 'reference', 'sendingEmails', 'accessContact', 'createdAt', 'updatedAt'],
    trip: ['id', 'vehicleId', 'odometer', 'nextOilChange', 'lastAlignment', 'odometerAtLastAlignment', 'lastMaintenance', 'date', 'startTime', 'endDate', 'serviceTypeId', 'mealExpense', 'fuelExpense', 'fuelInfo', 'extraExpense', 'extraInfo', 'kmDriven', 'costPerKm', 'profitPerKm', 'avgConsumption', 'remainingAutonomy', 'note', 'completed', 'createdAt', 'updatedAt'],
    tripCity: ['id', 'tripId', 'cityId', 'clients', 'prices', 'information', 'notes', 'createdAt'],
    vehicleExpense: ['id', 'vehicleId', 'date', 'categoryId', 'amount', 'currency', 'odometer', 'workerId', 'receiptUrl', 'notes', 'createdAt'],
    appSetting: ['id', 'key', 'value', 'createdAt', 'updatedAt'],
  }

  const dateFields: Record<string, string[]> = {
    position: ['createdAt'],
    serviceType: ['createdAt'],
    city: ['createdAt'],
    vehicleExpenseCategory: ['createdAt'],
    vehicle: ['nextOilChange', 'lastAlignment', 'lastMaintenance', 'createdAt'],
    worker: ['hireDate', 'terminationDate', 'createdAt'],
    user: ['createdAt'],
    holiday: ['date', 'createdAt'],
    recurringPattern: ['startDate', 'endDate', 'createdAt'],
    assignment: ['date', 'createdAt'],
    rotation: ['startDate', 'endDate', 'createdAt'],
    vacation: ['startDate', 'endDate', 'createdAt'],
    sped: ['lastSent', 'createdAt', 'updatedAt'],
    trip: ['date', 'endDate', 'createdAt', 'updatedAt', 'nextOilChange', 'lastAlignment', 'lastMaintenance'],
    tripCity: ['createdAt'],
    vehicleExpense: ['date', 'createdAt'],
    appSetting: ['createdAt', 'updatedAt'],
  }

  function sanitize(item: any, allowed: string[]) {
    const out: any = {}
    for (const k of allowed) {
      if (item[k] !== undefined) out[k] = item[k]
    }
    return out
  }

  function convertDates(obj: any, fields?: string[]) {
    if (!fields) return
    for (const f of fields) {
      if (obj[f] !== undefined && obj[f] !== null) {
        obj[f] = new Date(obj[f])
      }
    }
  }

  for (const key of restoreOrder) {
    const arr = data[key]
    if (!arr || !Array.isArray(arr) || arr.length === 0) continue

    const modelName = mapping[key]
    if (!modelName) {
      console.warn(`Modelo não mapeado para chave: ${key}`)
      continue
    }

    console.log(`Restaurando ${arr.length} registros em ${modelName}...`)

    for (const item of arr) {
      if (!item) continue
      const allowed = allowedFields[modelName] || Object.keys(item)
      const sanitized = sanitize(item, allowed)
      convertDates(sanitized, dateFields[modelName])

      // special handling for trips: keep travelerIds/driverIds for later
      let travelerIds: number[] = []
      let driverIds: number[] = []
      if (key === 'trips') {
        travelerIds = item.travelerIds || (item.travelers ? item.travelers.map((t: any) => t.id) : [])
        driverIds = item.driverIds || (item.drivers ? item.drivers.map((d: any) => d.id) : [])
      }

      const clientAny = prisma as any
      const model = clientAny[modelName]
      if (!model) {
        console.error(`Prisma model não encontrado: ${modelName}`)
        continue
      }

      try {
        if (sanitized.id !== undefined && sanitized.id !== null) {
          await model.upsert({
            where: { id: sanitized.id },
            update: sanitized,
            create: sanitized,
          })
        } else {
          await model.create({ data: sanitized })
        }
      } catch (e) {
        console.error(`Erro ao restaurar ${modelName} id=${sanitized.id}:`, e)
        try {
          // fallback try create without id
          const dataNoId = { ...sanitized }
          delete dataNoId.id
          await model.create({ data: dataNoId })
        } catch (e2) {
          console.error(`Falha no create fallback para ${modelName} id=${sanitized.id}:`, e2)
        }
      }

      // restore many-to-many connections for trips
      if (key === 'trips' && (travelerIds.length > 0 || driverIds.length > 0)) {
        try {
          await prisma.trip.update({
            where: { id: sanitized.id },
            data: {
              travelers: travelerIds.length > 0 ? { set: travelerIds.map((id) => ({ id })) } : undefined,
              drivers: driverIds.length > 0 ? { set: driverIds.map((id) => ({ id })) } : undefined,
            } as any,
          })
        } catch (e) {
          console.error(`Erro ao conectar relations para trip id=${sanitized.id}:`, e)
        }
      }
    }
  }

  console.log('Restauração concluída.')
}

async function writeErrorLog(err: any, prefix = 'restore') {
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
    console.log('Restore concluído com sucesso.')
    process.exit(0)
  } catch (err) {
    await writeErrorLog(err, 'restore')
    console.error('Erro ao restaurar backup:', err)
    try {
      await prisma.$disconnect()
    } catch (_) {}
    process.exit(1)
  }
}

run()
