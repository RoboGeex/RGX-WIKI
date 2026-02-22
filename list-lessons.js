// Check all lessons in DB
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const all = await prisma.lesson.findMany({ select: { id: true, slug: true, wikiSlug: true, status: true, publishedAt: true } });
  console.log(JSON.stringify(all, null, 2));
  prisma.$disconnect();
}

check().catch(e => { console.error(e); prisma.$disconnect(); });
