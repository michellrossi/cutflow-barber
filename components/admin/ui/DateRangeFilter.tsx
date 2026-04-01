import React, { useState } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';

export const DateRangeFilter: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedFilter, setSelectedFilter] = useState('30 dias');

    const filters = ['30 dias', 'Este mês', 'Mês passado', 'Semestre', 'Personalizado'];

    return (
        <div className="relative">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:border-orange-500 transition-colors"
            >
                <Calendar size={16} className="text-slate-400" />
                {selectedFilter}
                <ChevronDown size={16} className="text-slate-400" />
            </button>
            {isOpen && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-10 p-2">
                    {filters.map(filter => (
                        <button 
                            key={filter}
                            onClick={() => {
                                setSelectedFilter(filter);
                                setIsOpen(false);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-md"
                        >
                            {filter}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};
