const fs = require('fs');
const { execSync } = require('child_process');

const envContent = fs.readFileSync('.env.local', 'utf-8');
const urls = [...new Set(
  (envContent.match(/DATABASE_URL[^=]*="([^"]+)"/g) || [])
    .map(m => m.match(/"([^"]+)"/)?.[1])
    .filter(Boolean)
)];

console.log(`Found ${urls.length} databases. Clearing all stale locks...`);

for (const url of urls) {
  const dbName = url.split('/').pop();
  try {
    execSync('npx prisma db execute --stdin', {
      input: 'UPDATE Lesson SET activeEditorId = NULL, lockedUntil = NULL;',
      env: { ...process.env, DATABASE_URL: url },
      stdio: ['pipe', 'inherit', 'inherit']
    });
    console.log(`✅ Cleared locks in ${dbName}`);
  } catch (e) {
    console.log(`⏭️  Skipped ${dbName} (no Lesson table or error)`);
  }
}

console.log('\nDone! All locks cleared.');
