import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

// Standalone script to ensure "Getting Started" lesson exists in all wikis.
// We'll use a simple deterministic ID or timestamp to avoid 'uuid' dependency.

async function main() {
    const wikisPath = path.join(process.cwd(), 'data', 'wikis.json');
    if (!fs.existsSync(wikisPath)) {
        console.error(`Wikis data file not found at ${wikisPath}`);
        process.exit(1);
    }

    const wikis = JSON.parse(fs.readFileSync(wikisPath, 'utf-8'));
    console.log(`Found ${wikis.length} wikis in data/wikis.json`);

    for (const wiki of wikis) {
        const wikiSlug = wiki.slug;
        console.log(`\nProcessing Wiki: ${wikiSlug}...`);

        // Get DB URL for this wiki
        const upper = wikiSlug.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
        const envKey = `DATABASE_URL_${upper}`;
        const url = process.env[envKey] || process.env.DATABASE_URL_DEFAULT || process.env.DATABASE_URL;

        if (!url) {
            console.error(`  [ERROR] No DB URL found for wiki ${wikiSlug}. Skipping.`);
            continue;
        }

        const prisma = new PrismaClient({
            datasources: { db: { url } },
        });

        try {
            // Check if getting-started exists
            const existing = await prisma.lesson.findUnique({
                where: {
                    wikiSlug_slug: {
                        wikiSlug: wikiSlug,
                        slug: 'getting-started'
                    }
                }
            });

            if (existing) {
                console.log(`  [INFO] "getting-started" already exists for wiki ${wikiSlug}. Skipping.`);
            } else {
                console.log(`  [ACTION] Creating "getting-started" lesson for wiki ${wikiSlug}...`);

                // Use a simple ID based on wikiSlug and slug
                const uniqueId = `gs-${wikiSlug}-${Date.now()}`;

                await prisma.lesson.create({
                    data: {
                        id: uniqueId,
                        slug: 'getting-started',
                        wikiSlug: wikiSlug,
                        title_en: 'Getting Started',
                        title_ar: 'البدء',
                        order: 1,
                        status: 'published',
                        duration_min: 5,
                        difficulty: 'beginner',
                        prerequisites_en: [],
                        prerequisites_ar: [],
                        materials: [],
                        body: {
                            type: 'doc',
                            content: [
                                {
                                    type: 'paragraph',
                                    content: [
                                        {
                                            type: 'text',
                                            text: 'Welcome to your first lesson!'
                                        }
                                    ]
                                }
                            ]
                        }
                    }
                });
                console.log(`  [SUCCESS] Created "getting-started" lesson with ID: ${uniqueId}`);
            }
        } catch (error) {
            console.error(`  [ERROR] Failed to process wiki ${wikiSlug}:`, error);
        } finally {
            await prisma.$disconnect();
        }
    }

    console.log('\nFinished check.');
}

main().catch(console.error);
