"use client";

import { useRef, useState, useEffect } from "react";
import { 
    Bold, Italic, Heading2, Heading3, Quote, List, Link as LinkIcon, 
    Underline, Maximize2, Minimize2, Smile, Eye, Edit3, Type,
    Hash, AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';

interface MarkdownEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    rows?: number;
    category?: string;
}

const CHARACTER_LIMITS: Record<string, number> = {
    flash: 500,
    cronica: 5000,
    entrevista: 5000,
    analisis: 5000,
};

export function MarkdownEditor({ value, onChange, placeholder, rows = 12, category = 'cronica' }: MarkdownEditorProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    const limit = CHARACTER_LIMITS[category] || 5000;
    const progress = Math.min((value.length / limit) * 100, 100);
    const isOverLimit = value.length > limit;

    const applyFormat = (type: string, payload?: string) => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selection = value.substring(start, end);

        let before = value.substring(0, start);
        let after = value.substring(end);
        let newValue = value;
        let newCursorPos = start;

        switch (type) {
            case 'bold':
                if (selection) {
                    newValue = `${before}**${selection}**${after}`;
                    newCursorPos = end + 2;
                } else {
                    newValue = `${before}****${after}`;
                    newCursorPos = start + 2;
                }
                break;
            case 'italic':
                if (selection) {
                    newValue = `${before}*${selection}*${after}`;
                    newCursorPos = end + 1;
                } else {
                    newValue = `${before}**${after}`;
                    newCursorPos = start + 1;
                }
                break;
            case 'underline':
                if (selection) {
                    newValue = `${before}<u>${selection}</u>${after}`;
                    newCursorPos = end + 7;
                } else {
                    newValue = `${before}<u></u>${after}`;
                    newCursorPos = start + 3;
                }
                break;
            case 'h2':
                newValue = `${before}\n## ${selection || 'Título'}\n${after}`;
                newCursorPos = selection ? end + 5 : start + 4;
                break;
            case 'h3':
                newValue = `${before}\n### ${selection || 'Subtítulo'}\n${after}`;
                newCursorPos = selection ? end + 6 : start + 5;
                break;
            case 'quote':
                newValue = `${before}\n> ${selection || 'Cita'}\n${after}`;
                newCursorPos = selection ? end + 4 : start + 3;
                break;
            case 'list':
                newValue = `${before}\n- ${selection || 'Elemento'}\n${after}`;
                newCursorPos = selection ? end + 4 : start + 3;
                break;
            case 'link':
                newValue = `${before}[${selection || 'texto'}](url)${after}`;
                newCursorPos = selection ? end + 7 : start + 1;
                break;
            case 'emoji':
                newValue = `${before}${payload}${after}`;
                newCursorPos = start + (payload?.length || 0);
                break;
        }

        onChange(newValue);
        
        // Return focus immediately
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(newCursorPos, newCursorPos);
        }, 10);
    };

    const renderPreview = (text: string) => {
        if (!text) return <p className="text-white/20 italic">No hay nada que mostrar...</p>;
        
        const paragraphs = text.split(/\n\n+/).filter(Boolean);
        return (
            <div className="prose prose-invert max-w-none">
                {paragraphs.map((p, i) => {
                    let formatted = p
                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                        .replace(/\*(.*?)\*/g, '<em>$1</em>')
                        .replace(/<u>(.*?)<\/u>/g, '<span class="underline decoration-violet-500/50 decoration-2 underline-offset-4">$1</span>')
                        .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" class="text-violet-400 underline">$1</a>');

                    if (p.startsWith('### ')) return <h3 key={i} className="text-xl font-bold text-white mt-6 mb-4">{p.replace('### ', '')}</h3>;
                    if (p.startsWith('## ')) return <h2 key={i} className="text-2xl font-black text-white mt-8 mb-4 border-l-4 border-red-500 pl-4">{p.replace('## ', '')}</h2>;
                    if (p.startsWith('> ')) return <blockquote key={i} className="border-l-4 border-violet-500 bg-white/5 p-4 rounded-r-xl italic my-6">{p.replace('> ', '')}</blockquote>;
                    if (p.startsWith('- ')) {
                        const items = p.split('\n');
                        return (
                            <ul key={i} className="list-disc pl-5 space-y-2 mb-6">
                                {items.map((item, idx) => <li key={idx} dangerouslySetInnerHTML={{ __html: item.replace('- ', '') }} />)}
                            </ul>
                        );
                    }

                    return <p key={i} className="text-white/80 leading-relaxed mb-6" dangerouslySetInnerHTML={{ __html: formatted }} />;
                })}
            </div>
        );
    };

    const ToolbarButton = ({ icon: Icon, onClick, title, active = false }: any) => (
        <button
            type="button"
            onMouseDown={(e) => {
                e.preventDefault(); // CRITICAL: Stop focus from leaving textarea
                onClick();
            }}
            title={title}
            className={cn(
                "p-2 rounded-xl transition-all duration-300 relative group",
                active ? "bg-white/10 text-white shadow-lg" : "text-white/30 hover:bg-white/5 hover:text-white"
            )}
        >
            <Icon size={18} className="group-hover:scale-110 transition-transform" />
            <span className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-zinc-900 border border-white/10 rounded text-[10px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                {title}
            </span>
        </button>
    );

    return (
        <div 
            className={cn(
                "relative flex flex-col w-full bg-black/40 backdrop-blur-3xl border transition-all duration-700 rounded-[2rem] overflow-hidden group/editor",
                isExpanded ? "fixed inset-4 z-[100] m-0 shadow-[0_0_100px_rgba(0,0,0,0.8)]" : "shadow-2xl",
                isFocused ? "border-violet-500/40 ring-4 ring-violet-500/5" : "border-white/5 hover:border-white/10",
                isOverLimit && "border-red-500/40 ring-4 ring-red-500/5"
            )}
        >
            {/* Header Tabs & Actions */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.03] bg-white/[0.01]">
                <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-2xl border border-white/5 backdrop-blur-xl">
                    <button
                        type="button"
                        onClick={() => setActiveTab('edit')}
                        className={cn(
                            "flex items-center gap-2 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all",
                            activeTab === 'edit' ? "bg-white/10 text-white shadow-lg" : "text-white/20 hover:text-white/40"
                        )}
                    >
                        <Edit3 size={14} /> Editar
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('preview')}
                        className={cn(
                            "flex items-center gap-2 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all",
                            activeTab === 'preview' ? "bg-white/10 text-white shadow-lg" : "text-white/20 hover:text-white/40"
                        )}
                    >
                        <Eye size={14} /> Vista Previa
                    </button>
                </div>

                <div className="flex items-center gap-3">
                    {category === 'flash' && (
                        <div className="mr-4 flex items-center gap-3 bg-black/30 px-3 py-2 rounded-full border border-white/5">
                            <div className="relative w-5 h-5">
                                <svg className="w-full h-full -rotate-90">
                                    <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2.5" fill="transparent" className="text-white/5" />
                                    <circle 
                                        cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2.5" fill="transparent"
                                        strokeDasharray={2 * Math.PI * 8}
                                        strokeDashoffset={2 * Math.PI * 8 * (1 - progress / 100)}
                                        className={cn(
                                            "transition-all duration-500",
                                            isOverLimit ? "text-red-500" : progress > 90 ? "text-amber-500" : "text-violet-500"
                                        )}
                                    />
                                </svg>
                            </div>
                            <span className={cn("text-[10px] font-mono font-black", isOverLimit ? "text-red-500" : "text-white/30")}>
                                {limit - value.length}
                            </span>
                        </div>
                    )}
                    <button
                        type="button"
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/20 hover:text-white transition-all border border-white/5"
                    >
                        {isExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                    </button>
                </div>
            </div>

            {/* Toolbar */}
            {activeTab === 'edit' && (
                <div className="relative">
                    <div className="flex items-center gap-1 px-6 py-3 bg-white/[0.01]">
                        <div className="flex items-center gap-0.5">
                            <ToolbarButton icon={Bold} onClick={() => applyFormat('bold')} title="Negrita (Cmd+B)" />
                            <ToolbarButton icon={Italic} onClick={() => applyFormat('italic')} title="Cursiva (Cmd+I)" />
                            <ToolbarButton icon={Underline} onClick={() => applyFormat('underline')} title="Subrayado" />
                        </div>
                        <div className="w-[1px] h-4 bg-white/5 mx-2" />
                        <div className="flex items-center gap-0.5">
                            <ToolbarButton icon={Heading2} onClick={() => applyFormat('h2')} title="Título principal" />
                            <ToolbarButton icon={Heading3} onClick={() => applyFormat('h3')} title="Subtítulo" />
                        </div>
                        <div className="w-[1px] h-4 bg-white/5 mx-2" />
                        <div className="flex items-center gap-0.5">
                            <ToolbarButton icon={Quote} onClick={() => applyFormat('quote')} title="Cita" />
                            <ToolbarButton icon={List} onClick={() => applyFormat('list')} title="Lista" />
                            <ToolbarButton icon={LinkIcon} onClick={() => applyFormat('link')} title="Enlace" />
                        </div>
                        <div className="w-[1px] h-4 bg-white/5 mx-2" />
                        
                        <div className="relative">
                            <ToolbarButton 
                                icon={Smile} 
                                onClick={() => setShowEmojiPicker(!showEmojiPicker)} 
                                title="Insertar Emoji" 
                                active={showEmojiPicker}
                            />
                            {showEmojiPicker && (
                                <div className="absolute top-12 left-0 z-[110] shadow-2xl animate-in fade-in slide-in-from-top-2">
                                    <div className="fixed inset-0" onMouseDown={() => setShowEmojiPicker(false)} />
                                    <div className="relative">
                                        <Picker 
                                            data={data} 
                                            onEmojiSelect={(emoji: any) => {
                                                applyFormat('emoji', emoji.native);
                                                setShowEmojiPicker(false);
                                            }}
                                            theme="dark"
                                            set="native"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    {/* Perfect Separator Line */}
                    <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-white/5 to-transparent" />
                </div>
            )}

            {/* Viewport (Editor or Preview) */}
            <div className={cn("relative flex-1 bg-gradient-to-b from-transparent to-black/10", isExpanded ? "h-full" : "")}>
                {activeTab === 'edit' ? (
                    <textarea
                        ref={textareaRef}
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={placeholder}
                        rows={isExpanded ? 30 : rows}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        className={cn(
                            "w-full bg-transparent p-8 text-base leading-relaxed text-slate-200 placeholder:text-white/5 focus:outline-none resize-none transition-all font-medium selection:bg-violet-500/30",
                            isExpanded ? "h-[70vh] text-xl px-16 py-12" : ""
                        )}
                        onKeyDown={(e) => {
                            if ((e.metaKey || e.ctrlKey) && e.key === 'b') { e.preventDefault(); applyFormat('bold'); }
                            if ((e.metaKey || e.ctrlKey) && e.key === 'i') { e.preventDefault(); applyFormat('italic'); }
                        }}
                    />
                ) : (
                    <div className={cn(
                        "p-8 overflow-y-auto animate-in fade-in duration-500",
                        isExpanded ? "h-[80vh] px-16 py-12" : `min-h-[${rows * 24}px]`
                    )}>
                        {renderPreview(value)}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="px-8 py-4 flex items-center justify-between border-t border-white/[0.03] bg-black/20 text-[10px] font-black uppercase tracking-[0.2em] text-white/10">
                <div className="flex items-center gap-8">
                    <span className="flex items-center gap-2"><Type size={12} className="text-white/5" /> {value.length} Letras</span>
                    <span className="flex items-center gap-2"><Hash size={12} className="text-white/5" /> {value.split(/\s+/).filter(Boolean).length} palabras</span>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-white/10 font-black">NUEVO EDITOR</span>
                    <div className={cn(
                        "w-1.5 h-1.5 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(139,92,246,0.3)]",
                        isFocused ? "bg-violet-500 scale-125" : "bg-white/10"
                    )} />
                </div>
            </div>
        </div>
    );
}
