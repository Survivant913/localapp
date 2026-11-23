import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, FolderKanban, StickyNote, CheckSquare, Settings, LayoutDashboard, Box, Wallet, Calendar as CalendarIcon, X, ChevronRight, Activity, CalendarRange, Target, Users, Book, MessageSquare } from 'lucide-react';

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

    const hasJournalAccess = (itemId, isPage = false) => {
        let currFolderId = itemId;
        if (isPage) {
            const page = (data.journal_pages || []).find(p => String(p.id) === String(itemId));
            if (!page) return false;
            currFolderId = page.folder_id;
        }
        let currFolder = (data.journal_folders || []).find(f => String(f.id) === String(currFolderId));
        let safety = 0;
        while (currFolder && safety < 10) {
            if (currFolder.user_id === data.profile?.id) return true;
            const isShared = (data.journal_shares || []).some(s => 
                String(s.folder_id) === String(currFolder.id) && 
                s.user_email?.toLowerCase() === data.profile?.email?.toLowerCase()
            );
            if (isShared) return true;
            currFolder = (data.journal_folders || []).find(f => String(f.id) === String(currFolder.parent_id));
            safety++;
        }
        return false;
    };

    const results = useMemo(() => {
        if (!query.trim()) return [];
        
        const q = query.toLowerCase();
        let res = [];

        // 1. Modules de navigation
        const modules = [
            { id: 'dashboard', title: 'Tableau de bord', type: 'module', icon: <LayoutDashboard size={16}/> },
            { id: 'workspace', title: 'Workspace', type: 'module', icon: <Box size={16}/> },
            { id: 'chat', title: 'Messages', type: 'module', icon: <MessageSquare size={16}/> },
            { id: 'planning', title: 'Agenda', type: 'module', icon: <CalendarRange size={16}/> },
            { id: 'calendar', title: 'Calendrier Financier', type: 'module', icon: <CalendarIcon size={16}/> },
            { id: 'projects', title: 'Mes Projets', type: 'module', icon: <FolderKanban size={16}/> },
            { id: 'goals', title: 'Objectifs', type: 'module', icon: <Target size={16}/> },
            { id: 'habits', title: 'Suivi Habitudes', type: 'module', icon: <Activity size={16}/> },
            { id: 'budget', title: 'Budget & Finance', type: 'module', icon: <Wallet size={16}/> },
            { id: 'clients', title: 'Gestion Client', type: 'module', icon: <Users size={16}/> },
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
        const myEmail = data?.profile?.email?.toLowerCase();
        const myId = data?.profile?.id;
        const myShares = new Set((data?.venture_shares || [])
            .filter(s => s.user_email?.toLowerCase() === myEmail)
            .map(s => s.venture_id));

        (data.ventures || []).forEach(v => {
            if (v.user_id !== myId && !myShares.has(v.id)) return;
            if (v.title?.toLowerCase().includes(q) || v.description?.toLowerCase().includes(q)) {
                res.push({
                    id: 'workspace',
                    itemId: v.id,
                    title: v.title,
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
            if (!hasJournalAccess(f.id, false)) return;
            if (f.name?.toLowerCase().includes(q)) {
                res.push({
                    id: 'journal',
                    itemId: f.id,
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
            if (!hasJournalAccess(p.id, true)) return;
            if (p.title?.toLowerCase().includes(q) || p.content?.toLowerCase().includes(q)) {
                res.push({
                    id: 'journal',
                    itemId: p.id,
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

        // 5. Objectifs (Goals)
        (data.goals || []).forEach(g => {
            if (g.title?.toLowerCase().includes(q) || g.description?.toLowerCase().includes(q)) {
                res.push({
                    id: 'goals',
                    title: g.title,
                    subtitle: 'Objectif',
                    type: 'goal',
                    icon: <Target size={16}/>,
                    score: 75
                });
            }
        });

        // 6. Habitudes (Habits)
        (data.habits || []).forEach(h => {
            if (h.name?.toLowerCase().includes(q)) {
                res.push({
                    id: 'habits',
                    title: h.name,
                    subtitle: 'Habitude',
                    type: 'habit',
                    icon: <Activity size={16}/>,
                    score: 75
                });
            }
        });

        // 7. Clients
        (data.clients || []).forEach(c => {
            if (c.name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q) || c.company?.toLowerCase().includes(q)) {
                res.push({
                    id: 'clients',
                    title: c.name || c.company,
                    subtitle: 'Client',
                    type: 'client',
                    icon: <Users size={16}/>,
                    score: 75
                });
            }
        });

        // 8. Factures & Devis
        (data.invoices || []).forEach(i => {
            if (i.client_name?.toLowerCase().includes(q) || i.invoice_number?.toLowerCase().includes(q)) {
                res.push({
                    id: 'clients',
                    title: `Facture ${i.invoice_number}`,
                    subtitle: i.client_name,
                    type: 'invoice',
                    icon: <Wallet size={16}/>,
                    score: 65
                });
            }
        });
        
        (data.quotes || []).forEach(quote => {
            if (quote.client_name?.toLowerCase().includes(q) || quote.quote_number?.toLowerCase().includes(q)) {
                res.push({
                    id: 'clients',
                    title: `Devis ${quote.quote_number}`,
                    subtitle: quote.client_name,
                    type: 'quote',
                    icon: <StickyNote size={16}/>,
                    score: 65
                });
            }
        });

        // Tri par pertinence (score)
        return res.sort((a, b) => b.score - a.score).slice(0, 8); // On garde les 8 meilleurs résultats
    }, [query, data]);

    const handleSelect = (item) => {
        if (item.type === 'venture' || item.type === 'journal_folder' || item.type === 'journal_page') {
            localStorage.setItem('pendingDeepLink', JSON.stringify({ type: item.type, itemId: item.itemId, timestamp: Date.now() }));
        }
        
        setView(item.id);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh] px-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose}></div>
            <div className="bg-white dark:bg-[#111113] rounded-2xl w-full max-w-2xl shadow-2xl relative z-10 border border-zinc-200 dark:border-zinc-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col">
                
                {/* Search Header */}
                <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-4 bg-zinc-50 dark:bg-[#09090b]">
                    <Search className="text-zinc-500 shrink-0 ml-2" size={20} />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Rechercher projets, notes, tâches ou modules..."
                        className="flex-1 bg-transparent border-none focus:ring-0 text-lg text-zinc-900 dark:text-white placeholder-zinc-500 font-medium h-10 outline-none"
                    />
                    <button onClick={onClose} className="p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg transition-all mr-1">
                        <X size={18} />
                    </button>
                </div>

                {/* Results Area */}
                <div className="max-h-[60vh] overflow-y-auto custom-scrollbar bg-white dark:bg-[#111113] relative">
                    {query.trim() === '' ? (
                        <div className="p-12 text-center text-zinc-500 flex flex-col items-center">
                            <Search size={40} className="opacity-20 mb-4" />
                            <p className="font-medium text-zinc-300">Que cherchez-vous aujourd'hui ?</p>
                            <p className="text-xs opacity-60 mt-1">Tapez un mot-clé pour lancer la recherche.</p>
                        </div>
                    ) : results.length === 0 ? (
                        <div className="p-12 text-center text-zinc-500">
                            <p className="font-medium">Aucun résultat trouvé pour "{query}"</p>
                        </div>
                    ) : (
                        <div className="p-2.5 space-y-1">
                            {results.map((item, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleSelect(item)}
                                    className="w-full flex items-center justify-between p-3.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900 group transition-all text-left border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800"
                                >
                                    <div className="flex items-center gap-3.5 min-w-0">
                                        <div className="p-2.5 bg-zinc-100 dark:bg-zinc-900 group-hover:bg-zinc-900 dark:group-hover:bg-white text-zinc-500 dark:text-zinc-400 group-hover:text-white dark:group-hover:text-[#09090b] rounded-lg transition-colors shrink-0 border border-zinc-200 dark:border-zinc-800">
                                            {item.icon}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-semibold text-zinc-900 dark:text-white text-sm transition-colors truncate">{item.title}</p>
                                            {item.subtitle && <p className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 mt-0.5 truncate">{item.subtitle}</p>}
                                        </div>
                                    </div>
                                    <ChevronRight size={16} className="text-zinc-400 dark:text-zinc-600 opacity-0 group-hover:opacity-100 transform -translate-x-2 group-hover:translate-x-0 transition-all shrink-0" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                
                {/* Footer Shortcuts hint */}
                <div className="p-3 bg-zinc-50 dark:bg-[#09090b] border-t border-zinc-200 dark:border-zinc-800 flex justify-center items-center gap-6 text-[10px] font-mono text-zinc-500 uppercase tracking-widest shrink-0">
                    <span className="flex items-center gap-2"><kbd className="px-2 py-0.5 bg-zinc-200 dark:bg-zinc-900 rounded text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-800">ESC</kbd> pour fermer</span>
                    <span className="flex items-center gap-2"><kbd className="px-2 py-0.5 bg-zinc-200 dark:bg-zinc-900 rounded text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-800">CTRL+K</kbd> pour rechercher</span>
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
                    background-color: #d4d4d8;
                    border-radius: 9999px;
                }
                :global(.dark) .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: #27272a;
                }
            `}</style>
        </div>
    );
}
