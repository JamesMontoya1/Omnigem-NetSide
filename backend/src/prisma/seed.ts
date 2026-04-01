import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const prisma = new PrismaClient();

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randomDateWithinLastDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - randInt(0, days));
  return d;
}
function randomPlate() {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const a = letters.charAt(randInt(0, letters.length - 1));
  const b = letters.charAt(randInt(0, letters.length - 1));
  const c = letters.charAt(randInt(0, letters.length - 1));
  const num = randInt(100, 999);
  return `${a}${b}${c}${num}`;
}
function randomDecimal(min: number, max: number, decimals = 2) {
  const n = Math.random() * (max - min) + min;
  return Number(n.toFixed(decimals));
}

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

  const hashed = await bcrypt.hash(adminPassword, 10);
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { password: hashed, roles: ['ADMIN'] },
    create: { email: adminEmail, password: hashed, roles: ['ADMIN'], name: 'Administrator' },
  });
  console.log(`Seeded admin: ${adminEmail}`);

  // Positions
  const positionNames = ['Motorista', 'Atendente', 'Supervisor', 'Auxiliar', 'Gerente'];
  const positions = [];
  for (const name of positionNames) {
    positions.push(await prisma.position.create({ data: { name, discription: `${name} (seed)` } }));
  }

  // Service types
  const serviceNames = ['Transporte Escolar', 'Viagem Corporativa', 'Frete', 'Evento'];
  const serviceTypes = [];
  for (const s of serviceNames) {
    serviceTypes.push(
      await prisma.serviceType.create({
        data: { name: s, code: (s.substring(0, 3) + randInt(100, 999)).toUpperCase(), description: `${s} (seed)` },
      }),
    );
  }

  // Cities
  const cityNames = ['São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Porto Alegre', 'Curitiba', 'Salvador', 'Fortaleza', 'Brasília'];
  const cities = [];
  for (const c of cityNames) {
    cities.push(await prisma.city.create({ data: { name: c, state: '', country: 'BR' } }));
  }

  // Vehicle expense categories
  const catNames = ['Combustível', 'Manutenção', 'Pedágio', 'Outros'];
  const vcats = [];
  for (const name of catNames) {
    const cat = await prisma.vehicleExpenseCategory.upsert({
      where: { name },
      update: { description: `${name} (seed)` },
      create: { name, description: `${name} (seed)` },
    });
    vcats.push(cat);
  }

  // Vehicles
  const vehicles = [];
  for (let i = 0; i < 5; i++) {
    vehicles.push(
      await prisma.vehicle.create({
        data: {
          plate: randomPlate(),
          model: `Modelo ${randInt(1, 20)}`,
          odometer: randomDecimal(1000, 200000, 0).toString(),
          notes: 'Veículo seed',
        },
      }),
    );
  }

  // Workers
  const firstNames = ['João', 'Maria', 'Ana', 'Carlos', 'Luís', 'Paula', 'Pedro', 'Mariana', 'Rafael', 'Sofia', 'Lucas', 'Gabriela', 'Bruno', 'Isabela', 'Thiago', 'Fernanda'];
  const lastNames = ['Silva', 'Santos', 'Oliveira', 'Souza', 'Pereira', 'Lima', 'Gomes', 'Ribeiro', 'Alves', 'Costa'];
  const workers = [];
  for (let i = 0; i < 20; i++) {
    const name = `${pick(firstNames)} ${pick(lastNames)}`;
    const w = await prisma.worker.create({
      data: {
        name,
        color: '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0'),
        active: Math.random() > 0.05,
        doesShifts: Math.random() > 0.5,
        doesTravel: Math.random() > 0.3,
        dontVacation: Math.random() > 0.9,
        hireDate: randomDateWithinLastDays(3650),
        position: { connect: { id: pick(positions).id } },
      },
    });
    workers.push(w);
  }

  // Users for some workers
  for (let i = 0; i < 8; i++) {
    const w = workers[i];
    const email = `${w.name.split(' ').join('.').toLowerCase()}@example.com`;
    const pwd = await bcrypt.hash('password123', 10);
    try {
      await prisma.user.create({ data: { email, password: pwd, roles: ['GUEST'], name: w.name, worker: { connect: { id: w.id } } } });
    } catch (e) {
      // ignore (unique/email etc.)
    }
  }

  // Vacations
  for (let i = 0; i < 10; i++) {
    const w = pick(workers);
    const startDate = randomDateWithinLastDays(365);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + randInt(5, 15));
    try {
      await prisma.vacation.create({
        data: {
          worker: { connect: { id: w.id } },
          startDate,
          endDate,
          daysUsed: Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
          sold: false,
          active: true,
        },
      });
    } catch (e) {
      // ignore
    }
  }

  // Trips and related tripCities + occasional vehicle expenses
  for (let i = 0; i < 30; i++) {
    const service = pick(serviceTypes);
    const vehicle = pick(vehicles);
    const driver = pick(workers);
    const travelers = [pick(workers)];
    if (Math.random() > 0.6) travelers.push(pick(workers));
    if (Math.random() > 0.9) travelers.push(pick(workers));

    const trip = await prisma.trip.create({
      data: {
        vehicle: { connect: { id: vehicle.id } },
        date: randomDateWithinLastDays(60),
        startTime: `${randInt(6, 17)}:${randInt(0, 59).toString().padStart(2, '0')}`,
        serviceType: { connect: { id: service.id } },
        mealExpense: randomDecimal(0, 200),
        fuelExpense: randomDecimal(0, 500),
        extraExpense: randomDecimal(0, 300),
        kmDriven: randomDecimal(10, 500),
        costPerKm: randomDecimal(0.5, 2.0),
        travelers: { connect: travelers.map((t) => ({ id: t.id })) },
        drivers: { connect: [{ id: driver.id }] },
        note: 'Viagem seed',
        tripCities: {
          create: [
            {
              city: { connect: { id: pick(cities).id } },
              clients: ['Cliente Exemplo'],
              prices: [randomDecimal(100, 1000).toString()],
              information: ['Informação de teste'],
            },
          ],
        },
      },
    });

    if (Math.random() > 0.3) {
      try {
        await prisma.vehicleExpense.create({
          data: {
            vehicle: { connect: { id: vehicle.id } },
            date: trip.date,
            amount: randomDecimal(20, 200),
            currency: 'BRL',
            odometer: randomDecimal(10000, 200000, 0).toString(),
            worker: { connect: { id: pick(workers).id } },
            category: { connect: { id: pick(vcats).id } },
            notes: 'Despesa seed',
          },
        });
      } catch (e) {
        // ignore
      }
    }
  }

  // Rotation
  try {
    await prisma.rotation.create({
      data: {
        name: 'Rodízio Seed',
        weekdays: [1, 2, 3, 4, 5],
        workerIds: workers.slice(0, 6).map((w) => w.id),
        startDate: new Date(),
        notifyUpcoming: true,
      },
    });
  } catch (e) {
    // ignore
  }

  // Assignments
  for (let i = 0; i < 15; i++) {
    const w = pick(workers);
    const date = randomDateWithinLastDays(30);
    try {
      await prisma.assignment.create({ data: { date, worker: { connect: { id: w.id } }, source: 'MANUAL' } });
    } catch (e) {
      // ignore unique constraint or other
    }
  }

  // Time punches (seed) — gera registros de ponto para testes
  // Para X primeiros trabalhadores, cria registros dos últimos N dias
  const punchesData: any[] = [];
  const seedWorkers = workers.slice(0, Math.min(10, workers.length));
  const daysToSeed = 7;

  function minutesToDate(day: Date, minutes: number) {
    return new Date(day.getFullYear(), day.getMonth(), day.getDate(), Math.floor(minutes / 60), minutes % 60, 0);
  }

  for (const w of seedWorkers) {
    for (let d = 0; d < daysToSeed; d++) {
      const base = new Date();
      base.setHours(0, 0, 0, 0);
      base.setDate(base.getDate() - d);

      // pula finais de semana (opcional)
      const dow = base.getDay();
      if (dow === 0 || dow === 6) continue;

      const inMin = 8 * 60 + randInt(-15, 15);
      const breakStartMin = 12 * 60 + randInt(-10, 10);
      const breakEndMin = 13 * 60 + randInt(-10, 10);
      const outMin = 17 * 60 + randInt(-20, 20);

      punchesData.push({ workerId: w.id, occurredAt: minutesToDate(base, inMin), type: 'IN', source: 'MANUAL' });
      punchesData.push({ workerId: w.id, occurredAt: minutesToDate(base, breakStartMin), type: 'BREAK_START', source: 'MANUAL' });
      punchesData.push({ workerId: w.id, occurredAt: minutesToDate(base, breakEndMin), type: 'BREAK_END', source: 'MANUAL' });
      punchesData.push({ workerId: w.id, occurredAt: minutesToDate(base, outMin), type: 'OUT', source: 'MANUAL' });

      // alguns registros de exemplo importados (PontoSimples)
      if (Math.random() > 0.8) {
        const ext = `ps-${w.id}-${d}-${Date.now()}`;
        const psTime = minutesToDate(base, Math.max(6 * 60, inMin - 30));
        punchesData.push({ workerId: w.id, occurredAt: psTime, type: 'IN', source: 'PONTOSIMPLES', externalId: ext });
      }
    }
  }

  if (punchesData.length) {
    try {
      await prisma.timePunch.createMany({ data: punchesData });
      console.log(`Seeded ${punchesData.length} time punches for ${seedWorkers.length} workers`);
    } catch (e) {
      console.error('Error seeding time punches', e);
    }
  }

  console.log('Seeding finished.');
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
