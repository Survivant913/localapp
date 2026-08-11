import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, FolderKanban, StickyNote, CheckSquare, Settings, LayoutDashboard, Box, Wallet, Calendar as CalendarIcon, X, ChevronRight, Activity, CalendarRange, Target, Users, Book } from 'lucide-react';

export default function GlobalSearch({ data, setView, isOpen, onClose, onToggle }) {
    const [query, setQuery] = useState('');
    const inputRef = useRef(null);

    // Raccourci clavier Ctrl+K / Cmd+K
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                onToggle();
            }
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onToggle, onClose]);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => inputRef.current.focus(), 100);
            setQuery('');
        }
    }, [isOpen]);

    const results = useMemo(() => {
        if (!query.trim()) return [];
        
        const q = query.toLowerCase();
        let res = [];

        // 1. Modules de navigation
        const modules = [
            { id: 'dashboard', title: 'Tableau de bord', type: 'module', icon: <LayoutDashboard size={16}/> },
            { id: 'workspace', title: 'Workspace', type: 'module', icon: <Box size={16}/> },
            { id: 'planning', title: 'Agenda', type: 'module', icon: <CalendarRange size={16}/> },
            { id: 'calendar', title: 'Calendrier Financier', type: 'module', icon: <CalendarIcon size={16}/> },
            { id: 'projects', title: 'Mes Projets', type: 'module', icon: <FolderKanban size={16}/> },
            { id: 'budget', title: 'Budget & Finance', type: 'module', icon: <Wallet size={16}/> },
            { id: 'notes', title: 'Bloc-notes', type: 'module', icon: <StickyNote size={16}/> },
            { id: 'journal', title: 'Carnet', type: 'module', icon: <Book size={16}/> },
            { id: 'todo', title: 'Tâches Rapides', type: 'module', icon: <CheckSquare size={16}/> },
            { id: 'settings', title: 'Paramètres', type: 'module', icon: <Settings size={16}/> },
        ];
        
        modules.forEach(m => {
            if (m.title.toLowerCase().includes(q) || m.id.toLowerCase().includes(q)) {
                res.push({ ...m, score: 100 }); // High priority for modules
            }
        });

        // 2. Projets
        (data.projects || []).forEach(p => {
            if (p.title?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)) {
                res.push({
                    id: 'projects', // Redirection vers le module projects
                    title: p.title,
                    subtitle: 'Projet',
                    type: 'project',
                    icon: <FolderKanban size={16}/>,
                    score: 80
                });
            }
        });

        // 2b. Workspace Projets (Ventures)
        (data.ventures || []).forEach(v => {
            if (v.name?.toLowerCase().includes(q) || v.description?.toLowerCase().includes(q)) {
                res.push({
                    id: 'workspace',
                    title: v.name,
                    subtitle: 'Projet Workspace',
                    type: 'venture',
                    icon: <Box size={16}/>,
                    score: 85
                });
            }
        });

        // 3. Notes (Bloc-notes)
        (data.notes || []).forEach(n => {
            if (n.title?.toLowerCase().includes(q) || n.content?.toLowerCase().includes(q)) {
                res.push({
                    id: 'notes',
                    title: n.title || 'Note sans titre',
                    subtitle: 'Bloc-notes',
                    type: 'note',
                    icon: <StickyNote size={16}/>,
                    score: 60
                });
            }
        });

        // 3b. Carnet (Dossiers)
        (data.journal_folders || []).forEach(f => {
            if (f.name?.toLowerCase().includes(q)) {
                res.push({
                    id: 'journal',
                    title: f.name,
                    subtitle: 'Dossier (Carnet)',
                    type: 'journal_folder',
                    icon: <Book size={16}/>,
                    score: 75
                });
            }
        });

        // 3c. Carnet (Pages)
        (data.journal_pages || []).forEach(p => {
            if (p.title?.toLowerCase().includes(q) || p.content?.toLowerCase().includes(q)) {
                res.push({
                    id: 'journal',
                    title: p.title || 'Page sans titre',
                    subtitle: 'Page (Carnet)',
                    type: 'journal_page',
                    icon: <StickyNote size={16}/>,
                    score: 70
                });
            }
        });

        // 4. Tâches
        (data.todos || []).forEach(t => {
            if (t.text?.toLowerCase().includes(q)) {
                res.push({
                    id: 'todo',
                    title: t.text,
                    subtitle: t.completed ? 'Tâche (Terminée)' : 'Tâche',
                    type: 'task',
                    icon: <CheckSquare size={16}/>,
                    score: 50
                });
            }
        });

        // Tri par pertinence (score)
        return res.sort((a, b) => b.score - a.score).slice(0, 8); // On garde les 8 meilleurs résultats
    }, [query, data]);

    const handleSelect = (item) => {
        setView(item.id);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh] px-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}></div>
            <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl shadow-2xl relative z-10 border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col">
                
                {/* Search Header */}
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-4 bg-slate-50/50 dark:bg-slate-800/30">
                    <Search className="text-slate-400 shrink-0 ml-2" size={24} />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Rechercher projets, notes, tâches ou modules..."
                        className="flex-1 bg-transparent border-none focus:ring-0 text-xl text-slate-800 dark:text-white placeholder-slate-400 font-medium h-12 outline-none"
                    />
                    <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-all mr-1">
                        <X size={20} />
                    </button>
                </div>

                {/* Results Area */}
                <div className="max-h-[60vh] overflow-y-auto custom-scrollbar bg-white dark:bg-slate-900 relative">
                    {query.trim() === '' ? (
                        <div className="p-12 text-center text-slate-400 flex flex-col items-center">
                            <Search size={48} className="opacity-20 mb-4" />
                            <p className="font-medium">Que cherchez-vous aujourd'hui ?</p>
                            <p className="text-sm opacity-60 mt-1">Tapez un mot-clé pour lancer la recherche.</p>
                        </div>
                    ) : results.length === 0 ? (
                        <div className="p-12 text-center text-slate-400">
                            <p className="font-medium">Aucun résultat trouvé pour "{query}"</p>
                        </div>
                    ) : (
                        <div className="p-3 space-y-1">
                            {results.map((item, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleSelect(item)}
                                    className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 group transition-all text-left border border-transparent hover:border-indigo-100 dark:hover:border-indigo-800/50"
                                >
                                    <div className="flex items-center gap-4 min-w-0">
                                        <div className="p-3 bg-slate-100 dark:bg-slate-800 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-800/50 text-slate-500 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 rounded-xl transition-colors shrink-0">
                                            {item.icon}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-bold text-slate-800 dark:text-white text-base group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors truncate">{item.title}</p>
                                            {item.subtitle && <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mt-1 truncate">{item.subtitle}</p>}
                                        </div>
                                    </div>
                                    <ChevronRight size={18} className="text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 transform -translate-x-4 group-hover:translate-x-0 transition-all shrink-0" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                
                {/* Footer Shortcuts hint */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-center items-center gap-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest shrink-0">
                    <span className="flex items-center gap-2"><kbd className="px-2 py-1 bg-slate-200 dark:bg-slate-700 rounded-md text-slate-600 dark:text-slate-300 font-sans shadow-sm border border-slate-300 dark:border-slate-600">ESC</kbd> pour fermer</span>
                    <span className="flex items-center gap-2"><kbd className="px-2 py-1 bg-slate-200 dark:bg-slate-700 rounded-md text-slate-600 dark:text-slate-300 font-sans shadow-sm border border-slate-300 dark:border-slate-600">CTRL+K</kbd> pour rechercher</span>
                </div>
            </div>

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: #cbd5e1;
                    border-radius: 10px;
                }
                :global(.dark) .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: #475569;
                }
            `}</style>
        </div>
    );
}
