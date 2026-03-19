import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class VehicleExpensesService {
  constructor(private prisma: PrismaService) {}

  async list(vehicleId?: number) {
    const where = vehicleId ? { vehicleId } : {}
    return this.prisma.vehicleExpense.findMany({ where, orderBy: { date: 'desc' }, include: { worker: true, category: true } })
  }

  async get(id: number) {
    return this.prisma.vehicleExpense.findUnique({ where: { id }, include: { worker: true, category: true } })
  }

  async create(data: any) {
    if (data.workerId == null || data.workerId === '') {
      throw new BadRequestException('workerId is required')
    }
    const wid = Number(data.workerId)
    if (isNaN(wid)) throw new BadRequestException('workerId must be a number')
    const worker = await this.prisma.worker.findUnique({ where: { id: wid } })
    if (!worker) throw new NotFoundException('Worker not found')

    const payload: any = { ...data, workerId: wid }
    if (payload.amount != null) payload.amount = payload.amount === '' ? 0 : Number(payload.amount)
    if (payload.odometer != null) payload.odometer = payload.odometer === '' ? null : Number(payload.odometer)
    if (payload.date) payload.date = new Date(payload.date)
    if (payload.category && typeof payload.category === 'string' && payload.category.trim() !== '') {
      const name = payload.category.trim()
      let cat = await this.prisma.vehicleExpenseCategory.findUnique({ where: { name } })
      if (!cat) cat = await this.prisma.vehicleExpenseCategory.create({ data: { name } })
      payload.categoryId = cat.id
      delete payload.category
    } else if (payload.categoryId) {
      const cid = Number(payload.categoryId)
      if (isNaN(cid)) throw new BadRequestException('categoryId must be a number')
      const cat = await this.prisma.vehicleExpenseCategory.findUnique({ where: { id: cid } })
      if (!cat) throw new NotFoundException('Category not found')
      payload.categoryId = cid
    }
    return this.prisma.vehicleExpense.create({ data: payload, include: { worker: true, category: true } })
  }

  async update(id: number, data: any) {
    if (data.workerId == null || data.workerId === '') {
      throw new BadRequestException('workerId is required')
    }
    const wid = Number(data.workerId)
    if (isNaN(wid)) throw new BadRequestException('workerId must be a number')
    const worker = await this.prisma.worker.findUnique({ where: { id: wid } })
    if (!worker) throw new NotFoundException('Worker not found')

    const payload: any = { ...data, workerId: wid }
    if (payload.amount != null) payload.amount = payload.amount === '' ? 0 : Number(payload.amount)
    if (payload.odometer != null) payload.odometer = payload.odometer === '' ? null : Number(payload.odometer)
    if (payload.date) payload.date = new Date(payload.date)
    if (payload.category && typeof payload.category === 'string' && payload.category.trim() !== '') {
      const name = payload.category.trim()
      let cat = await this.prisma.vehicleExpenseCategory.findUnique({ where: { name } })
      if (!cat) cat = await this.prisma.vehicleExpenseCategory.create({ data: { name } })
      payload.categoryId = cat.id
      delete payload.category
    } else if (payload.categoryId !== undefined) {
      if (payload.categoryId == null || payload.categoryId === '') {
        payload.categoryId = null
      } else {
        const cid = Number(payload.categoryId)
        if (isNaN(cid)) throw new BadRequestException('categoryId must be a number')
        const cat = await this.prisma.vehicleExpenseCategory.findUnique({ where: { id: cid } })
        if (!cat) throw new NotFoundException('Category not found')
        payload.categoryId = cid
      }
    }
    return this.prisma.vehicleExpense.update({ where: { id }, data: payload, include: { worker: true, category: true } })
  }

  remove(id: number) {
    return this.prisma.vehicleExpense.delete({ where: { id } })
  }
}
