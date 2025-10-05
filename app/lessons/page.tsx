import React from 'react';
import LessonMetaCard from '@/components/lesson-meta-card';
import { Lesson } from '@/lib/types';

const lessons: Lesson[] = [
  {
    id: '1',
    order: 1,
    slug: 'introduction-to-arduino',
    title_en: 'Introduction to Arduino',
    title_ar: 'مقدمة في الأردوينو',
    duration_min: 30,
    difficulty: 'Beginner',
    prerequisites_en: [],
    prerequisites_ar: [],
    materials: [],
    body: [],
  },
  {
    id: '2',
    order: 2,
    slug: 'building-a-simple-led-circuit',
    title_en: 'Building a Simple LED Circuit',
    title_ar: 'بناء دائرة LED بسيطة',
    duration_min: 45,
    difficulty: 'Beginner',
    prerequisites_en: ['Introduction to Arduino'],
    prerequisites_ar: ['مقدمة في الأردوينو'],
    materials: [],
    body: [],
  },
  {
    id: '3',
    order: 3,
    slug: 'sensor-integration',
    title_en: 'Sensor Integration',
    title_ar: 'تكامل أجهزة الاستشعار',
    duration_min: 60,
    difficulty: 'Intermediate',
    prerequisites_en: ['Building a Simple LED Circuit'],
    prerequisites_ar: ['بناء دائرة LED بسيطة'],
    materials: [],
    body: [],
  },
];

const LessonsPage = () => {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Lessons</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {lessons.map((lesson) => (
          <LessonMetaCard
            key={lesson.id}
            lesson={lesson}
            locale="en"
          />
        ))}
      </div>
    </div>
  );
};

export default LessonsPage;
