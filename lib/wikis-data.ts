import { Wiki } from './types';

export const wikis: Wiki[] = [
    {
        slug: 'student-kit',
        "displayName": "Student Kit",
        "grade": "All Levels",
        "picture": "/images/robogeex-logo.png",
        domains: ['robogeex.com', 'www.robogeex.com', 'student-kit.robogeex.com'],
        defaultLocale: 'en',
        defaultLessonSlug: 'getting-started',
        resourcesUrl: '/resources',
        createdAt: new Date('2025-01-01T00:00:00.000Z'),
        isLocked: true,
        accessCode: 'f47ac10b'
    }
];
