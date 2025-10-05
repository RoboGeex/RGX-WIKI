import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

const Navbar: React.FC = () => {
    return (
        <nav className="bg-gray-800 p-4">
            <div className="container mx-auto flex justify-between items-center">
                <Link href="/" className="text-white text-lg font-bold">
                    <Image 
                        src="/images/robogeex-logo.png" 
                        alt="RoboGeex Academy" 
                        width={184} 
                        height={64} 
                        priority 
                        className="h-12 w-auto"
                    />
                </Link>
                <div className="flex items-center">
                    <input
                        type="text"
                        placeholder="Search..."
                        className="p-2 rounded-md border border-gray-300"
                    />
                    <button className="ml-4 text-white">Toggle Language</button>
                    <button className="ml-4 text-white">Toggle Theme</button>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;