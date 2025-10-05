import React from 'react';
import LessonMetaCard from '@/components/lesson-meta-card';

const lessons = [
  {
    id: '1',
    title: 'Introduction to Arduino',
    summary: 'Learn the basics of Arduino programming and hardware.',
  },
  {
    id: '2',
    title: 'Building a Simple LED Circuit',
    summary: 'Step-by-step guide to creating a simple LED circuit.',
  },
  {
    id: '3',
    title: 'Sensor Integration',
    summary: 'Integrate various sensors with Arduino for data collection.',
  },
  // Add more lessons as needed
];

const LessonsPage = () => {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Lessons</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {lessons.map((lesson) => (
          <LessonMetaCard
            key={lesson.id}
            id={lesson.id}
            title={lesson.title}
            summary={lesson.summary}
          />
        ))}
      </div>
    </div>
  );
};

export default LessonsPage;
