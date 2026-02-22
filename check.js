async function check() {
  try {
    const wikis = ['student-kit', 'robotics-kit', 'developer-kit', 'rookie-kit'];
    for (const w of wikis) {
      const res = await fetch('http://localhost:3000/api/lessons?wiki=' + w);
      if (!res.ok) continue;
      const db = await res.json();
      if(!Array.isArray(db)) continue;
      const videos = db.flatMap(l => l.body).filter(b => b && (b.type === 'video' || b.type === 'youtube'));
      if (videos.length > 0) {
        console.log(`\nIn ${w}:`);
        console.log(JSON.stringify(videos, null, 2));
      }
    }
  } catch(e) { console.error(e); }
}

check();
