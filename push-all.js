const fs = require('fs');
const { execSync } = require('child_process');

try {
  const envContent = fs.readFileSync('.env.local', 'utf-8');
  const lines = envContent.split('\n');

  let urls = [];
  for (const line of lines) {
    if (line.trim().startsWith('DATABASE_URL')) {
      const match = line.match(/DATABASE_URL[^=]*="(.*)"/);
      if (match && match[1]) {
        urls.push(match[1]);
      }
    }
  }

  // Remove duplicates just in case
  urls = [...new Set(urls)];

  console.log(`Found ${urls.length} unique databases. Pushing schema to all...`);

  for (const url of urls) {
    console.log(`\nPushing to: ${url}`);
    try {
      execSync('npx prisma db push --skip-generate', {
        env: { ...process.env, DATABASE_URL: url },
        stdio: 'inherit'
      });
      console.log('✅ Success');
    } catch (e) {
      console.error('❌ Failed for ' + url);
    }
  }
} catch (e) {
  console.error('Error:', e);
}
