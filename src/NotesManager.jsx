import { useState, useEffect } from 'react';
import { Save, Plus, X, Trash2, Pin, Palette, Link as LinkIcon, StickyNote, CornerDownRight } from 'lucide-react';

export default function NotesManager({ data, updateData }) {
    // --- ETATS ---
    const [mainNote, setMainNote] = useState(data.mainNote || '');
    const [newNoteTitle, setNewNoteTitle] = useState('');
    const [newNoteContent, setNewNoteContent] = useState('');
    const [newNoteColor, setNewNoteColor] = useState('bg-yellow-100');
    const [linkedProjectId, setLinkedProjectId] = useState('');
    const [isSavingMain, setIsSavingMain] = useState(false);

    // Débogage des données
    const notes = Array.isArray(data.notes) ? data.notes : [];
    const projects = Array.isArray(data.projects) ? data.projects : [];

    // --- ACTIONS ---

    // Sauvegarde auto du brouillon principal (Debounce)
    useEffect(() => {
        const timer = setTimeout(() => {
            if (mainNote !== data.mainNote) {
                setIsSavingMain(true);
                updateData({ ...data, mainNote });
                setTimeout(() => setIsSavingMain(false), 1000);
            }
        }, 1000);
        return () => clearTimeout(timer);
    }, [mainNote]);

    const handleCreateNote = () => {
        if (!newNoteTitle.trim() && !newNoteContent.trim()) return;

        const newNote = {
            id: Date.now(),
            title: newNoteTitle || 'Note sans titre',
            content: newNoteContent,
            color: newNoteColor,
            isPinned: false,
            linkedProjectId: linkedProjectId || null,
            created_at: new Date().toISOString()
        };

        updateData({ ...data, notes: [newNote, ...notes] });
        
        // Reset
        setNewNoteTitle('');
        setNewNoteContent('');
        setNewNoteColor('bg-yellow-100');
        setLinkedProjectId('');
    };

    const deleteNote = (id) => {
        if(window.confirm('Supprimer cette note ?')) {
            updateData({ ...data, notes: notes.filter(n => n.id !== id) }, { table: 'notes', id });
        }
    };

    const togglePin = (id) => {
        const updatedNotes = notes.map(n => n.id === id ? { ...n, isPinned: !n.isPinned } : n);
        updateData({ ...data, notes: updatedNotes });
    };

    // Couleurs disponibles (Pastel)
    const colors = [
        { bg: 'bg-yellow-100', border: 'border-yellow-200' },
        { bg: 'bg-blue-100', border: 'border-blue-200' },
        { bg: 'bg-green-100', border: 'border-green-200' },
        { bg: 'bg-red-100', border: 'border-red-200' },
        { bg: 'bg-purple-100', border: 'border-purple-200' },
        { bg: 'bg-gray-100', border: 'border-gray-200' },
    ];

    // Tri : Épinglées en premier
    const sortedNotes = [...notes].sort((a, b) => (b.isPinned === a.isPinned) ? 0 : b.isPinned ? 1 : -1);

    return (
        <div className="fade-in pb-24 md:pb-20 p-4 md:p-6 max-w-7xl mx-auto">
            
            <div className="flex flex-col lg:flex-row gap-6 md:gap-8 items-start">
                
                {/* COLONNE GAUCHE : NOTE PRINCIPALE (SCRATCHPAD) */}
                <div className="w-full lg:w-1/3 space-y-4 lg:sticky lg:top-6">
                    <div className="flex justify-between items-center px-1">
                        <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                            <StickyNote size={20} className="text-yellow-500"/> Note Principale
                        </h3>
                        {isSavingMain && <span className="text-xs text-gray-400 animate-pulse">Sauvegarde...</span>}
                    </div>
                    
                    <div className="relative group">
                        <textarea 
                            value={mainNote}
                            onChange={(e) => setMainNote(e.target.value)}
                            className="w-full h-[200px] md:h-[500px] lg:h-[calc(100vh-140px)] p-4 md:p-6 bg-yellow-50 dark:bg-yellow-900/10 text-gray-800 dark:text-yellow-100 border border-yellow-200 dark:border-yellow-900/30 rounded-2xl focus:ring-2 focus:ring-yellow-400 focus:border-transparent outline-none resize-none shadow-sm text-sm leading-relaxed"
                            placeholder="Zone de brouillon rapide... Écrivez ici tout ce qui vous passe par la tête."
                        ></textarea>
                        <div className="hidden md:block absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="bg-yellow-200 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200 text-[10px] px-2 py-1 rounded-full font-bold">
                                TOUJOURS LÀ
                            </div>
                        </div>
                    </div>
                </div>

                {/* COLONNE DROITE : NOUVELLE NOTE + LISTE (EXPANDED) */}
                <div className="w-full lg:w-2/3 space-y-6 md:space-y-8">
                    
                    {/* FORMULAIRE DE CRÉATION */}
                    <div className="bg-white dark:bg-slate-800 p-4 md:p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700">
                        <h3 className="font-bold text-gray-800 dark:text-white mb-4">Nouvelle Note</h3>
                        
                        <div className="space-y-3">
                            <div className="flex flex-col md:flex-row gap-2">
                                <input 
                                    type="text" 
                                    placeholder="Titre" 
                                    value={newNoteTitle}
                                    onChange={(e) => setNewNoteTitle(e.target.value)}
                                    className="w-full md:flex-1 px-4 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 dark:text-white text-sm"
                                />
                                <div className="flex gap-1 items-center justify-center md:justify-start bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-2 py-2 md:py-0">
                                    {colors.map((c, i) => (
                                        <button 
                                            key={i}
                                            onClick={() => setNewNoteColor(c.bg)}
                                            className={`w-6 h-6 md:w-5 md:h-5 rounded-full border ${c.border} ${c.bg} ${newNoteColor === c.bg ? 'ring-2 ring-offset-1 ring-gray-400 dark:ring-offset-slate-800 scale-110' : ''} transition-transform`}
                                        />
                                    ))}
                                </div>
                            </div>

                            <textarea 
                                placeholder="Contenu de la note..." 
                                value={newNoteContent}
                                onChange={(e) => setNewNoteContent(e.target.value)}
                                className="w-full h-32 md:h-24 px-4 py-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 resize-none dark:text-white text-sm"
                            ></textarea>

                            <div className="flex flex-col md:flex-row justify-between items-center gap-3 pt-2">
                                {/* Sélecteur de projet discret */}
                                <div className="relative w-full md:flex-1 md:max-w-xs">
                                    <select 
                                        value={linkedProjectId} 
                                        onChange={(e) => setLinkedProjectId(e.target.value)} 
                                        className="w-full px-2 py-2 bg-gray-50 dark:bg-slate-900 md:bg-transparent border border-gray-200 dark:border-slate-700 md:border-none rounded-lg text-xs md:text-gray-500 md:dark:text-gray-400 outline-none cursor-pointer hover:text-blue-500 transition-colors appearance-none"
                                    >
                                        <option value="">-- Lier à un projet (Optionnel) --</option>
                                        {projects.map(p => <option key={p.id} value={p.id}>Projet : {p.title}</option>)}
                                    </select>
                                    <CornerDownRight size={12} className="absolute right-2 md:right-0 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none"/>
                                </div>

                                <button 
                                    onClick={handleCreateNote}
                                    className="w-full md:w-auto px-6 py-2 bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-gray-200 dark:text-black text-white text-sm font-bold rounded-xl transition-transform active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <Plus size={16}/> Ajouter
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* GRILLE DES NOTES (LIBRE ET FLUIDE) */}
                    {sortedNotes.length === 0 ? (
                        <div className="text-center py-12 text-gray-400 dark:text-slate-600">
                            <p>Aucune note pour le moment.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 auto-rows-min">
                            {sortedNotes.map(note => {
                                const project = projects.find(p => String(p.id) === String(note.linkedProjectId));
                                const darkColorMap = {
                                    'bg-yellow-100': 'dark:bg-yellow-900/40 dark:border-yellow-800',
                                    'bg-blue-100': 'dark:bg-blue-900/40 dark:border-blue-800',
                                    'bg-green-100': 'dark:bg-green-900/40 dark:border-green-800',
                                    'bg-red-100': 'dark:bg-red-900/40 dark:border-red-800',
                                    'bg-purple-100': 'dark:bg-purple-900/40 dark:border-purple-800',
                                    'bg-gray-100': 'dark:bg-slate-700 dark:border-slate-600',
                                };
                                const darkClasses = darkColorMap[note.color] || 'dark:bg-slate-700';

                                return (
                                    <div key={note.id} className={`p-5 rounded-2xl border border-transparent shadow-sm hover:shadow-md transition-all relative group ${note.color} ${darkClasses}`}>
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-bold text-gray-900 dark:text-gray-100 text-sm line-clamp-1 flex-1 pr-2">{note.title}</h4>
                                            <div className={`flex gap-1 transition-opacity ${note.isPinned ? 'opacity-100' : 'opacity-100 md:opacity-0 md:group-hover:opacity-100'}`}>
                                                <button onClick={() => togglePin(note.id)} className={`p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 ${note.isPinned ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500'}`}>
                                                    <Pin size={14} className={note.isPinned ? "fill-current" : ""}/>
                                                </button>
                                                <button onClick={() => deleteNote(note.id)} className={`p-1 rounded hover:bg-red-500/20 text-gray-500 hover:text-red-600 dark:text-gray-400 ${note.isPinned ? 'opacity-100 md:opacity-0 md:group-hover:opacity-100' : ''}`}>
                                                    <Trash2 size={14}/>
                                                </button>
                                            </div>
                                        </div>
                                        
                                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words leading-relaxed">
                                            {note.content}
                                        </p>
                                        
                                        {project && (
                                            <div className="mt-3 pt-3 border-t border-black/5 dark:border-white/10 flex items-center gap-1.5">
                                                <LinkIcon size={10} className="text-gray-500 dark:text-gray-400"/>
                                                <span className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400 tracking-wider truncate">
                                                    {project.title}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}