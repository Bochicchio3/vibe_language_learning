import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, GripHorizontal } from 'lucide-react';
import ChatView from './ChatView';

export default function ChatWidget({ isOpen: controlledIsOpen, setIsOpen: controlledSetIsOpen, initialMessage }) {
    const [localIsOpen, setLocalIsOpen] = useState(false);
    const [dimensions, setDimensions] = useState({ width: 384, height: 500 }); // 384px = w-96
    const isResizingRef = useRef(false);

    // Use controlled state if provided, otherwise local state
    const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : localIsOpen;
    const setIsOpen = controlledSetIsOpen || setLocalIsOpen;

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isResizingRef.current) return;

            setDimensions(prev => ({
                width: Math.max(300, Math.min(prev.width - e.movementX, 800)),
                height: Math.max(400, Math.min(prev.height - e.movementY, 900))
            }));
        };

        const handleMouseUp = () => {
            isResizingRef.current = false;
            document.body.style.cursor = 'default';
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, []);

    const startResizing = (e) => {
        e.preventDefault();
        isResizingRef.current = true;
        document.body.style.cursor = 'nwse-resize';
    };

    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end">
            {/* Chat Popup */}
            {isOpen && (
                <div
                    className="mb-4 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-10 duration-300 flex flex-col relative"
                    style={{ width: `${dimensions.width}px`, height: `${dimensions.height}px` }}
                >
                    {/* Resize Handle */}
                    <div
                        className="absolute top-0 left-0 w-6 h-6 cursor-nwse-resize z-50 flex items-start justify-start p-1 opacity-0 hover:opacity-100 transition-opacity"
                        onMouseDown={startResizing}
                    >
                        <div className="w-2 h-2 bg-slate-300 rounded-br"></div>
                    </div>

                    <div className="bg-indigo-600 text-white p-3 flex justify-between items-center shadow-sm z-10 cursor-move" title="Drag to resize from top-left corner">
                        <span className="font-bold flex items-center gap-2">
                            <MessageCircle size={18} />
                            AI Assistant
                        </span>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-1 hover:bg-indigo-700 rounded-full transition"
                        >
                            <X size={18} />
                        </button>
                    </div>
                    <div className="flex-grow overflow-hidden">
                        <ChatView isWidget={true} initialMessage={initialMessage} />
                    </div>
                </div>
            )}

            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`p-4 rounded-full shadow-lg transition-all duration-300 ${isOpen
                    ? 'bg-slate-200 text-slate-600 rotate-90'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:scale-110'
                    }`}
            >
                {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
            </button>
        </div>
    );
}
