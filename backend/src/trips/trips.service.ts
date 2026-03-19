import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { SettingsService } from '../settings/settings.service'

@Injectable()
export class TripsService {
  constructor(private prisma: PrismaService, private settings: SettingsService) {}

  async list(filter?: { startDate?: string; endDate?: string }) {
    const where: any = {}
    if (filter?.startDate || filter?.endDate) {
      where.date = {}
      if (filter.startDate) where.date.gte = new Date(filter.startDate)
      if (filter.endDate) where.date.lte = new Date(filter.endDate)
    }
    return this.prisma.trip.findMany({
      where,
      include: { tripCities: { include: { city: true } }, vehicle: true, travelers: true, drivers: true, serviceType: true },
      orderBy: { date: 'desc' },
    } as any)
  }

  async get(id: number) {
    return this.prisma.trip.findUnique({ where: { id }, include: { tripCities: { include: { city: true } }, vehicle: true, travelers: true, drivers: true, serviceType: true } } as any)
  }

  async create(data: any) {
    const payload: any = { ...data }
    if (!payload.serviceTypeId) throw new Error('serviceTypeId is required')
    const st = await this.prisma.serviceType.findUnique({ where: { id: Number(payload.serviceTypeId) } })
    if (!st) throw new Error('serviceTypeId not found')
    if (payload.date) payload.date = new Date(payload.date)
    if (payload.endDate) payload.endDate = new Date(payload.endDate)
    if (payload.mealExpense == null) {
      const def = await this.settings.getDefaultMealExpense()
      payload.mealExpense = def
    }
    if (payload.fuelExpense != null) {
      payload.fuelExpense = Number(payload.fuelExpense)
    }
    const vehicleFields = ['odometer', 'nextOilChange', 'lastAlignment', 'odometerAtLastAlignment', 'lastMaintenance']
    const vehiclePayload: any = {}
    for (const f of vehicleFields) {
      if (payload[f] != null) {
        if (f === 'lastAlignment' || f === 'lastMaintenance' || f === 'nextOilChange') vehiclePayload[f] = new Date(payload[f])
        else vehiclePayload[f] = Number(payload[f])
      }
    }
    const citiesPayload: any[] = []
    if (payload.cities && Array.isArray(payload.cities)) {
      for (const c of payload.cities) {
        const clients = Array.isArray(c.clients) ? c.clients : []
        citiesPayload.push({ cityId: c.cityId, clients, notes: c.notes })
      }
      delete payload.cities
    } else if (payload.cityId) {
      let clientsArr: any[] = []
      if (payload.clients && Array.isArray(payload.clients)) clientsArr = payload.clients
      else if (payload.client) clientsArr = [{ name: payload.client, price: payload.price ?? 0, info: payload.informationPrice ?? '' }]
      citiesPayload.push({ cityId: payload.cityId, clients: clientsArr, notes: payload.notesExtraExpense ?? null })
      delete payload.cityId
      delete payload.client
      delete payload.price
      delete payload.informationPrice
      delete payload.notesExtraExpense
    }
    if (payload.travelerIds) {
      const travelerIds = payload.travelerIds.map((id: any) => Number(id))
      const travelersCount = await this.prisma.worker.count({ where: { id: { in: travelerIds } } })
      if (travelersCount !== travelerIds.length) throw new Error('One or more travelerIds not found')
      payload.travelers = { connect: travelerIds.map((id: number) => ({ id })) }
      delete payload.travelerIds
    }
    if (payload.driverIds) {
      const driverIds = payload.driverIds.map((id: any) => Number(id))
      const driversCount = await this.prisma.worker.count({ where: { id: { in: driverIds } } })
      if (driversCount !== driverIds.length) throw new Error('One or more driverIds not found')
      payload.drivers = { connect: driverIds.map((id: number) => ({ id })) }
      delete payload.driverIds
    }
    const tripCreateData: any = { ...payload }
    if (citiesPayload.length) {
      tripCreateData.tripCities = {
        create: citiesPayload.map(c => ({
          city: { connect: { id: c.cityId } },
          clients: c.clients.map((x: any) => x.name ?? ''),
          prices: c.clients.map((x: any) => (x.price != null ? x.price : 0)),
          information: c.clients.map((x: any) => x.info ?? ''),
          notes: c.notes ?? null,
        })),
      }
    }

    try {
      const created = await this.prisma.trip.create({ data: tripCreateData, include: { tripCities: { include: { city: true } }, vehicle: true, travelers: true, drivers: true, serviceType: true } } as any)
      if (created.vehicleId && Object.keys(vehiclePayload).length) {
        try {
          if (created.completed) {
            const latestCompleted = await this.prisma.trip.findFirst({ where: { vehicleId: created.vehicleId, completed: true }, orderBy: { endDate: 'desc' } })
            if (latestCompleted && latestCompleted.id === created.id) {
              await this.prisma.vehicle.update({ where: { id: created.vehicleId }, data: vehiclePayload })
              return await this.prisma.trip.findUnique({ where: { id: created.id }, include: { tripCities: { include: { city: true } }, vehicle: true, travelers: true, drivers: true, serviceType: true } } as any)
            }
          }
          return created
        } catch (err: any) {
          throw new Error(`Trip created but failed updating vehicle: ${err?.message || String(err)}`)
        }
      }
      return created
    } catch (err: any) {
      throw new Error(`Error creating trip: ${err?.message || String(err)}`)
    }
  }

  async update(id: number, data: any) {
    const payload: any = { ...data }
    if (payload.date) payload.date = new Date(payload.date)
    if (payload.endDate) payload.endDate = new Date(payload.endDate)
    const vehicleFields = ['odometer', 'nextOilChange', 'lastAlignment', 'odometerAtLastAlignment', 'lastMaintenance']
    const vehiclePayload: any = {}
    for (const f of vehicleFields) {
      if (payload[f] != null) {
        if (f === 'lastAlignment' || f === 'lastMaintenance' || f === 'nextOilChange') vehiclePayload[f] = new Date(payload[f])
        else vehiclePayload[f] = Number(payload[f])
      }
    }
    const citiesPayload: any[] = []
    if (payload.cities && Array.isArray(payload.cities)) {
      for (const c of payload.cities) {
        const clients = Array.isArray(c.clients) ? c.clients : []
        citiesPayload.push({ cityId: c.cityId, clients, notes: c.notes })
      }
      delete payload.cities
    } else if (payload.cityId) {
      let clientsArr: any[] = []
      if (payload.clients && Array.isArray(payload.clients)) clientsArr = payload.clients
      else if (payload.client) clientsArr = [{ name: payload.client, price: payload.price ?? 0, info: payload.informationPrice ?? '' }]
      citiesPayload.push({ cityId: payload.cityId, clients: clientsArr, notes: payload.notesExtraExpense ?? null })
      delete payload.cityId
      delete payload.client
      delete payload.price
      delete payload.informationPrice
      delete payload.notesExtraExpense
    }
    if (payload.travelerIds) {
      payload.travelers = { set: payload.travelerIds.map((id: number) => ({ id })) }
      delete payload.travelerIds
    }
    if (payload.driverIds) {
      payload.drivers = { set: payload.driverIds.map((id: number) => ({ id })) }
      delete payload.driverIds
    }
    if (citiesPayload.length) {
      await this.prisma.tripCity.deleteMany({ where: { tripId: id } })
      const tripCitiesCreates = citiesPayload.map(c => ({
        tripId: id,
        cityId: c.cityId,
        clients: c.clients.map((x: any) => x.name ?? ''),
        prices: c.clients.map((x: any) => (x.price != null ? x.price : 0)),
        information: c.clients.map((x: any) => x.info ?? ''),
        notes: c.notes ?? null,
      }))
      for (const tc of tripCitiesCreates) {
        await this.prisma.tripCity.create({ data: tc })
      }
    }

    if (payload.fuelExpense != null) {
      payload.fuelExpense = Number(payload.fuelExpense)
    }

    const updated = await this.prisma.trip.update({ where: { id }, data: payload, include: { tripCities: { include: { city: true } }, vehicle: true, travelers: true, drivers: true, serviceType: true } } as any)

    const vehicleIdToUpdate = payload.vehicleId ?? updated.vehicleId
    if (vehicleIdToUpdate && Object.keys(vehiclePayload).length) {
      try {
        // Only update vehicle master fields when the trip is completed and
        // this trip is the most recent completed trip for that vehicle.
        if (updated.completed) {
          const latestCompleted = await this.prisma.trip.findFirst({ where: { vehicleId: Number(vehicleIdToUpdate), completed: true }, orderBy: { endDate: 'desc' } })
          if (latestCompleted && latestCompleted.id === updated.id) {
            await this.prisma.vehicle.update({ where: { id: Number(vehicleIdToUpdate) }, data: vehiclePayload })
            return await this.prisma.trip.findUnique({ where: { id: updated.id }, include: { tripCities: { include: { city: true } }, vehicle: true, travelers: true, drivers: true, serviceType: true } } as any)
          }
        }
        // If not allowed to update master vehicle, just return updated trip
        return updated
      } catch (err: any) {
        throw new Error(`Trip updated but failed updating vehicle: ${err?.message || String(err)}`)
      }
    }

    return updated
  }

  async complete(id: number) {
    return this.prisma.trip.update({
      where: { id },
      data: { completed: true, endDate: new Date() },
      include: { city: true, vehicle: true, travelers: true, drivers: true, serviceType: true },
    } as any)
  }

  async remove(id: number) {
    return this.prisma.$transaction(async prisma => {
      await prisma.tripCity.deleteMany({ where: { tripId: id } })
      return prisma.trip.delete({ where: { id } })
    })
  }
}
