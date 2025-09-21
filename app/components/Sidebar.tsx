import React from 'react';

const Sidebar: React.FC = () => {
    const modules = [
        { id: 1, title: 'Module 1', lessons: [{ id: '1', title: 'Lesson 1' }, { id: '2', title: 'Lesson 2' }] },
        { id: 2, title: 'Module 2', lessons: [{ id: '3', title: 'Lesson 3' }, { id: '4', title: 'Lesson 4' }] },
    ];

    return (
        <div className="w-64 bg-gray-800 text-white h-full p-4">
            <h2 className="text-lg font-bold mb-4">Modules</h2>
            <ul>
                {modules.map(module => (
                    <li key={module.id} className="mb-2">
                        <div className="font-semibold">{module.title}</div>
                        <ul className="ml-4">
                            {module.lessons.map(lesson => (
                                <li key={lesson.id} className="hover:text-gray-400">
                                    <a href={`/lessons/${lesson.id}`}>{lesson.title}</a>
                                </li>
                            ))}
                        </ul>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default Sidebar;