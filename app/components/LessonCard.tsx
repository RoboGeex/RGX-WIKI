import React from 'react';
import Link from 'next/link';

interface LessonCardProps {
    title: string;
    summary: string;
    id: string;
}

const LessonCard: React.FC<LessonCardProps> = ({ title, summary, id }) => {
    return (
        <div className="bg-white shadow-md rounded-lg p-4 hover:shadow-lg transition-shadow duration-300">
            <h3 className="text-xl font-semibold mb-2">{title}</h3>
            <p className="text-gray-700 mb-4">{summary}</p>
            <Link href={`/lessons/${id}`} className="text-primary hover:opacity-90">
                Read More
            </Link>
        </div>
    );
};

export default LessonCard;
