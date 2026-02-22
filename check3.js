const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const result = await prisma.lesson.findMany();
  const vids = result.flatMap(l => l.body).filter(b => b && (b.type === 'video' || b.type === 'youtube'));
  console.log(JSON.stringify(vids, null, 2));
  prisma.$disconnect();
}

check().catch(console.error);
