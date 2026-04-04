import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const lessonKey = '3d-design-using-tinkercad'
const slug = lessonKey
const wikiSlug = 'student-kit'

const lessonData = {
  id: `test-${lessonKey}-${Date.now()}`,
  lessonKey,
  order: 4,
  slug,
  wikiSlug,
  title_en: 'test',
  title_ar: 'اختبار التصميم الثلاثي الأبعاد باستخدام TinkerCAD',
  coverImage: 'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=1200&q=80',
  status: 'published',
  publishedAt: new Date(),
  duration_min: 45,
  difficulty: 'Intermediate',
  prerequisites_en: [
    'Computer or tablet with a browser',
    'Familiarity with basic geometric shapes',
  ],
  prerequisites_ar: [
    'حاسوب أو جهاز لوحي مع متصفح',
    'معرفة أساسية بالأشكال الهندسية',
  ],
  materials: [
    'TinkerCAD account',
    'Internet access',
    'Headphones or speakers',
  ],
  body: [
    {
      type: 'heading',
      level: 1,
      en: 'test',
      ar: 'اختبار التصميم الثلاثي الأبعاد باستخدام TinkerCAD',
    },
    {
      type: 'paragraph',
      en: 'This practice lesson pulls together every block type so we can verify how content renders inside the wiki.',
      ar: 'يجمع درس الاختبار هذا كل نوع من المحتوى حتى نتحقق من كيفية عرض المحتوى داخل الويكي.',
    },
    {
      type: 'callout',
      variant: 'tip',
      en: 'TinkerCAD saves your assemblies automatically; just refresh the wiki to double-check embeds.',
      ar: 'يحفظ TinkerCAD التجميعات تلقائيًا؛ فقط حدّث الويكي للتأكد من تضمينات الوسائط.',
    },
    {
      type: 'image',
      image: 'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=1200&q=80',
      width: '100%',
      align: 'center',
      layoutMode: 'fit',
      caption_en: 'TinkerCAD workspace with a rover prototype.',
      caption_ar: 'مساحة عمل TinkerCAD مع نموذج أولي لروفر.',
    },
    {
      type: 'horizontalRule',
    },
    {
      type: 'youtube',
      url: 'https://www.youtube.com/watch?v=Gef4KAoMxlA',
      title_en: 'Intro to TinkerCAD 3D Design',
      title_ar: 'مقدمة في تصميم TinkerCAD ثلاثي الأبعاد',
      width: '100%',
      align: 'center',
      layoutMode: '16:9',
    },
    {
      type: 'video',
      url: 'https://player.vimeo.com/video/239593183',
      provider: 'vimeo',
      caption_en: 'Assembly walkthrough recorded in Cairo lab.',
      caption_ar: 'جولة تجميع تم تسجيلها في مختبر القاهرة.',
      width: '100%',
      align: 'center',
      layoutMode: '16:9',
    },
    {
      type: 'imageSlider',
      images: [
        'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1502767089025-6572583495b0?auto=format&fit=crop&w=900&q=80',
      ],
    },
    {
      type: 'columns',
      count: 2,
      content: [
        {
          type: 'paragraph',
          en: 'Column A: Sketch a base platform. Use the ruler and snap tools to keep dimensions accurate.',
          ar: 'العمود أ: ارسم منصة أساسية. استخدم أدوات المسطرة والتثبيت لضمان أبعاد دقيقة.',
        },
        {
          type: 'paragraph',
          en: 'Column B: Stack bushes, gears, and sensors to build a rover ready for printing.',
          ar: 'العمود ب: رتب الأجزاء، التروس، وأجهزة الاستشعار لبناء روفر جاهز للطباعة.',
        },
      ],
    },
    {
      type: 'tagBlock',
      title_en: 'You will learn about:',
      title_ar: 'سوف تتعلم عن:',
      items_en: ['Extrusion', 'Boolean operations', 'Alignment guides', 'Workplane management', 'Group editing'],
      items_ar: ['البثق', 'عمليات بوليان', 'أدلة المحاذاة', 'إدارة المستويات', 'تحرير المجموعات'],
    },
    {
      type: 'step',
      title_en: 'Step 1 — Prep your space',
      title_ar: 'الخطوة 1 — جهز مساحتك',
      en: 'Open TinkerCAD, create a new design, and drop a box that is 60 mm wide.',
      ar: 'افتح TinkerCAD، أنشئ تصميمًا جديدًا، وضع صندوقًا بعرض 60 مم.',
      image: 'https://images.unsplash.com/photo-1484704849700-f032a568e944?auto=format&fit=crop&w=800&q=80',
    },
    {
      type: 'step',
      title_en: 'Step 2 — Add structure',
      title_ar: 'الخطوة 2 — أضف الهيكل',
      en: 'Use cylinders and wedges to shape wheels, then align them with the ruler before grouping.',
      ar: 'استخدم الأسطوانات والأسافين لتشكيل العجلات، ثم قم بمحاذاتها باستخدام المسطرة قبل التجميع.',
      image: 'https://images.unsplash.com/photo-1523475472560-d2df97ec485c?auto=format&fit=crop&w=800&q=80',
    },
    {
      type: 'step',
      title_en: 'Step 3 — Polish and export',
      title_ar: 'الخطوة 3 — صقل وصدّر',
      en: "Check the model with 'Fit view', then export as STL for slicing.",
      ar: 'تحقق من النموذج باستخدام "توفيق العرض"، ثم صدّره كـ STL للتقطيع.',
    },
    {
      type: 'codeTabs',
      arduino: '// Example Arduino sketch\nvoid setup() {\n  pinMode(LED_BUILTIN, OUTPUT);\n}\nvoid loop() {\n  digitalWrite(LED_BUILTIN, HIGH);\n  delay(500);\n  digitalWrite(LED_BUILTIN, LOW);\n  delay(500);\n}',
      makecodeUrl: 'https://makecode.microbit.org/#editor',
    },
    {
      type: 'paragraph',
      en: 'Finish this lesson by saving your TinkerCAD link in the resources tab so the production team can review it.',
      ar: 'اختم هذا الدرس بحفظ رابط TinkerCAD في علامة الموارد حتى تتمكن فرق الإنتاج من مراجعته.',
    },
  ],
}

if (process.argv.includes('--print-body') || process.argv.includes('--print-body-escaped')) {
  const jsonString = JSON.stringify(lessonData.body)
  const escaped = process.argv.includes('--print-body-escaped')
    ? jsonString.replace(/\\/g, '\\\\').replace(/'/g, "''")
    : jsonString.replace(/'/g, "''")
  console.log(escaped)
  process.exit(0)
}

async function main() {
  const existing = await prisma.lesson.findFirst({
    where: {
      wikiSlug,
      slug,
    },
  })

  if (existing) {
    console.log(`Lesson ${slug} already exists (ID: ${existing.id}). Skipping insert.`)
    return
  }

  const created = await prisma.lesson.create({
    data: lessonData,
  })

  console.log('Created lesson:', created.id)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
