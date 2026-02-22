// Check the Clicky DB specifically
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: { db: { url: 'mysql://uiauakfrdg0w6:Robo593geeks@34.174.89.42:3306/dblvy8oygqboag' } }
});

async function check() {
  const all = await prisma.lesson.findMany({
    select: { id: true, slug: true, wikiSlug: true, status: true, publishedAt: true, title_en: true }
  });
  console.log('Total lessons in Clicky DB:', all.length);
  console.log(JSON.stringify(all, null, 2));
  prisma.$disconnect();
}

check().catch(e => { console.error(e.message); prisma.$disconnect(); });
