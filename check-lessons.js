const { PrismaClient } = require('@prisma/client');

async function check() {
  // Default DB for developers
  const defaultUrl = "mysql://uiauakfrdg0w6:Robo593geeks@34.174.89.42:3306/dbx0py8h6qux9h";
  const prismaDefault = new PrismaClient({ datasources: { db: { url: defaultUrl } } });
  
  // 3D Design DB for lessons
  const wikiUrl = "mysql://uiauakfrdg0w6:Robo593geeks@34.174.89.42:3306/dbfqg0hydahzl6";
  const prismaWiki = new PrismaClient({ datasources: { db: { url: wikiUrl } } });

  try {
    const lesson = await prismaWiki.lesson.findUnique({
      where: { id: "getting-started" },
      select: { id: true, activeEditorId: true, lockedUntil: true }
    });
    console.log("Lesson Lock Status:", JSON.stringify(lesson, null, 2));

    const developers = await prismaDefault.developer.findMany({
      select: { id: true, name: true, email: true, role: true }
    });
    console.log("Developers found in default DB:", JSON.stringify(developers, null, 2));

    if (lesson && lesson.activeEditorId) {
      const editorId = parseInt(lesson.activeEditorId);
      const editor = developers.find(d => d.id === editorId);
      console.log("Current Lock Owner Info:", JSON.stringify(editor, null, 2));
    }

  } catch (err) {
    console.error(err);
  } finally {
    await prismaDefault.$disconnect();
    await prismaWiki.$disconnect();
  }
}

check();
