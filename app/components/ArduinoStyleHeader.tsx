import React from 'react';

const ArduinoStyleHeader: React.FC<{ title: string }> = ({ title }) => {
    return (
        <header className="bg-primary text-primary-foreground rounded-lg shadow-lg p-4 mb-6">
            <h1 className="text-3xl font-bold">{title}</h1>
        </header>
    );
};

export default ArduinoStyleHeader;
