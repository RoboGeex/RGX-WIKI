// Script to force-mark a lesson as published by slug
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function publish(slug) {
  const updated = await prisma.lesson.updateMany({
    where: { OR: [{ id: slug }, { slug: slug }] },
    data: { status: 'published', publishedAt: new Date() }
  });
  console.log('Updated:', updated);
  prisma.$disconnect();
}

publish('clicky-the-robot-lesson-2').catch(e => { console.error(e); prisma.$disconnect(); });
