import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

async function main() {
  const arg = process.argv[2]
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
  const data = JSON.parse(raw)

  const mapping: Record<string, string> = {
    users: 'user',
    workers: 'worker',
    holidays: 'holiday',
    recurringPatterns: 'recurringPattern',
    assignments: 'assignment',
    rotations: 'rotation',
    vacations: 'vacation',
    speds: 'sped',
    trips: 'trip',
  }

  const restoreOrder = [
    'users',
    'workers',
    'holidays',
    'recurringPatterns',
    'rotations',
    'assignments',
    'vacations',
    'speds',
    'trips',
  ]

  async function upsertItem(modelName: string, item: any) {
    const clientAny = prisma as any
    const model = clientAny[modelName]
    if (!model) throw new Error(`Modelo Prisma não encontrado: ${modelName}`)

    if (item == null) return

    if (item.id !== undefined && item.id !== null) {
      try {
        await model.upsert({
          where: { id: item.id },
          update: item,
          create: item,
        })
      } catch (e) {
        console.error(`Erro ao upsert ${modelName} id=${item.id}:`, e)
      }
    } else {
      try {
        await model.create({ data: item })
      } catch (e) {
        console.error(`Erro ao create ${modelName}:`, e)
      }
    }
  }

  for (const key of restoreOrder) {
    const arr = data[key]
    if (!arr || !Array.isArray(arr) || arr.length === 0) continue

    const modelName = mapping[key]
    console.log(`Restaurando ${arr.length} registros em ${modelName}...`)

    for (const item of arr) {
      await upsertItem(modelName, item)
    }
  }

  console.log('Restauração concluída.')
}

main()
  .catch((e) => {
    console.error('Erro ao restaurar backup:', e)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
