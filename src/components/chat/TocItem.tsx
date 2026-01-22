// src/components/chat/TocItem.tsx
import { useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { TocNode } from '../../types/api';

export const TocItem = ({ node }: { node: TocNode }) => {
    const [isOpen, setIsOpen] = useState(false);
    const hasChildren = node.children && node.children.length > 0;

    return (
        <div className="ml-2">
            <div 
                className="flex items-center gap-2 py-1 px-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded cursor-pointer text-sm text-gray-700 dark:text-gray-300"
                onClick={() => hasChildren && setIsOpen(!isOpen)}
                title={node.title}
            >
                {hasChildren ? (
                    isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />
                ) : <div className="w-3.5" />} 
                
                <span className="truncate">{node.title}</span>
            </div>
            {isOpen && hasChildren && (
                <div className="border-l border-gray-200 dark:border-slate-700 ml-2">
                    {node.children.map(child => <TocItem key={child.id} node={child} />)}
                </div>
            )}
        </div>
    );
};