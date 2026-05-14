import { PrismaClient } from '@prisma/client'

const url = 'mysql://uiauakfrdg0w6:Robo593geeks@34.174.89.42:3306/dbx0py8h6qux9h'

console.log('Testing Prisma query engine connection...')
const prisma = new PrismaClient({ datasources: { db: { url } } })

try {
  const result = await prisma.$queryRaw`SELECT 1 as ok`
  console.log('SUCCESS:', result)
} catch (e) {
  console.error('FAILED:', e.message)
} finally {
  await prisma.$disconnect()
}
