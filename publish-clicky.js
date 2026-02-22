// Force publish ALL lessons in the Clicky DB
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: { db: { url: 'mysql://uiauakfrdg0w6:Robo593geeks@34.174.89.42:3306/dblvy8oygqboag' } }
});

async function publishAll() {
  const result = await prisma.lesson.updateMany({
    where: { wikiSlug: 'clicky' },
    data: { status: 'published', publishedAt: new Date() }
  });
  console.log('Published lessons:', result.count);
  prisma.$disconnect();
}

publishAll().catch(e => { console.error(e.message); prisma.$disconnect(); });
