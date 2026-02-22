const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const result = await prisma.lesson.findFirst({
    orderBy: { updatedAt: 'desc' }
  });
  if(result) {
    const vids = result.body.filter(b => b && (b.type === 'video' || b.type === 'youtube'));
    console.log(JSON.stringify(vids, null, 2));
  } else {
    console.log('empty');
  }
  prisma.$disconnect();
}

check().catch(console.error);
