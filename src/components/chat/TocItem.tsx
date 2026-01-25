import { useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { TocNode } from '../../types/api';

/**
 * Recursive component for rendering a tree-structured table of contents (ToC).
 * 
 * Displays expandable hierarchical paper structure nodes with the ability to:
 * - Toggle collapse/expand sections via chevron icons
 * - Display child sections in an indented tree structure
 * - Show truncated titles with full text in tooltip
 * 
 * This component is self-recursive, rendering child nodes within a bordered container
 * when expanded, creating a hierarchical visual structure.
 * 
 * @component
 * @param {Object} props - Component props
 * @param {TocNode} props.node - The table of contents node data structure
 * @returns {React.ReactElement} The rendered ToC item with optional children
 */
export const TocItem = ({ node }: { node: TocNode }) => {
    // ===== State Management =====
    /** Whether this ToC item is expanded to show child nodes */
    const [isOpen, setIsOpen] = useState(false);
    
    // ===== Derived State =====
    /** Whether this node has child sections to expand/collapse */
    const hasChildren = node.children && node.children.length > 0;

    return (
        <div className="ml-2">
            {/* ToC Item Row - clickable to expand/collapse if children exist */}
            <div 
                className="flex items-center gap-2 py-1 px-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded cursor-pointer text-sm text-gray-700 dark:text-gray-300"
                onClick={() => hasChildren && setIsOpen(!isOpen)}
                title={node.title}
            >
                {/* Chevron icon - rotates to indicate expanded/collapsed state */}
                {hasChildren ? (
                    isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />
                ) : <div className="w-3.5" />} {/* Placeholder spacer for leaf nodes */}
                
                {/* Node title with text truncation and full text in tooltip */}
                <span className="truncate">{node.title}</span>
            </div>
            
            {/* Child nodes container - renders recursively when expanded */}
            {isOpen && hasChildren && (
                <div className="border-l border-gray-200 dark:border-slate-700 ml-2">
                    {node.children.map(child => <TocItem key={child.id} node={child} />)}
                </div>
            )}
        </div>
    );
};