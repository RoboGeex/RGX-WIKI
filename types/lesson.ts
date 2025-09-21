export interface Lesson {
  id: string;
  title: string;
  summary: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
}

export interface Module {
  id: string;
  title: string;
  lessons: Lesson[];
}

export interface LessonMetadata {
  title: string;
  description: string;
  author: string;
  date: string;
  duration: number; // in minutes
}