import { useState, useEffect } from 'react';
import { Save, Plus, X, Trash2, Pin, Palette, Link as LinkIcon, StickyNote, CornerDownRight, Edit2, Check } from 'lucide-react';

export default function NotesManager({ data, updateData }) {
    // --- ETATS ---
    const [mainNote, setMainNote] = useState(data.mainNote || '');
    
    // États du formulaire (Création / Édition)
    const [newNoteTitle, setNewNoteTitle] = useState('');
    const [newNoteContent, setNewNoteContent] = useState('');
    const [newNoteColor, setNewNoteColor] = useState('bg-yellow-100');
    const [linkedProjectId, setLinkedProjectId] = useState('');
    
    const [isSavingMain, setIsSavingMain] = useState(false);
    const [editingNoteId, setEditingNoteId] = useState(null); // ID de la note en cours d'édition

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

    const handleCreateOrUpdateNote = () => {
        if (!newNoteTitle.trim() && !newNoteContent.trim()) return;

        if (editingNoteId) {
            // MODE ÉDITION
            const updatedNotes = notes.map(n => n.id === editingNoteId ? {
                ...n,
                title: newNoteTitle || 'Note sans titre',
                content: newNoteContent,
                color: newNoteColor,
                linkedProjectId: linkedProjectId || null,
                updated_at: new Date().toISOString()
            } : n);
            updateData({ ...data, notes: updatedNotes });
            setEditingNoteId(null); // Sortir du mode édition
        } else {
            // MODE CRÉATION
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
        }
        
        // Reset Formulaire
        setNewNoteTitle('');
        setNewNoteContent('');
        setNewNoteColor('bg-yellow-100');
        setLinkedProjectId('');
    };

    const startEditing = (note) => {
        setEditingNoteId(note.id);
        setNewNoteTitle(note.title);
        setNewNoteContent(note.content);
        setNewNoteColor(note.color);
        setLinkedProjectId(note.linkedProjectId || '');
        // Scroll vers le formulaire pour ergonomie sur mobile
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const cancelEditing = () => {
        setEditingNoteId(null);
        setNewNoteTitle('');
        setNewNoteContent('');
        setNewNoteColor('bg-yellow-100');
        setLinkedProjectId('');
    };

    const deleteNote = (id) => {
        if(window.confirm('Supprimer cette note ?')) {
            updateData({ ...data, notes: notes.filter(n => n.id !== id) }, { table: 'notes', id });
            if (editingNoteId === id) cancelEditing();
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

    const inputClass = "w-full px-4 py-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 dark:text-white text-sm transition-all";

    return (
        // MODIF : max-w-full pour prendre toute la largeur
        <div className="fade-in pb-24 md:pb-20 p-6 md:p-10 w-full max-w-[1920px] mx-auto">
            
            <div className="flex flex-col xl:flex-row gap-8 items-start h-full">
                
                {/* COLONNE GAUCHE : NOTE PRINCIPALE (SCRATCHPAD) */}
                <div className="w-full xl:w-1/3 space-y-4 xl:sticky xl:top-6 h-full">
                    <div className="flex justify-between items-center px-2">
                        <h3 className="font-black text-xl text-gray-800 dark:text-white flex items-center gap-3 uppercase tracking-wide">
                            <StickyNote size={24} className="text-yellow-500 fill-yellow-500/20"/> Brouillon Rapide
                        </h3>
                        {isSavingMain && <span className="text-xs font-bold text-gray-400 animate-pulse bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded-md">Sauvegarde...</span>}
                    </div>
                    
                    <div className="relative group h-full">
                        <textarea 
                            value={mainNote}
                            onChange={(e) => setMainNote(e.target.value)}
                            className="w-full h-[300px] md:h-[500px] xl:h-[calc(100vh-180px)] p-8 bg-yellow-50 dark:bg-yellow-900/10 text-gray-800 dark:text-yellow-100 border-2 border-yellow-100 dark:border-yellow-900/30 rounded-[2rem] focus:ring-4 focus:ring-yellow-100 dark:focus:ring-yellow-900/20 focus:border-yellow-300 outline-none resize-none shadow-sm text-base leading-relaxed transition-all"
                            placeholder="Zone de réflexion libre... Écrivez ici tout ce qui vous passe par la tête."
                        ></textarea>
                        <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            <div className="bg-yellow-200/80 dark:bg-yellow-900/80 backdrop-blur-sm text-yellow-900 dark:text-yellow-100 text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest shadow-sm">
                                Auto-Save
                            </div>
                        </div>
                    </div>
                </div>

                {/* COLONNE DROITE : FORMULAIRE + GRILLE NOTES */}
                <div className="w-full xl:w-2/3 space-y-10">
                    
                    {/* FORMULAIRE DE CRÉATION / ÉDITION */}
                    <div className={`bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-xl border border-gray-100 dark:border-slate-700 transition-all ${editingNoteId ? 'ring-2 ring-blue-500/30 bg-blue-50/30 dark:bg-blue-900/10' : ''}`}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                                {editingNoteId ? <Edit2 size={20} className="text-blue-600"/> : <Plus size={24} className="text-slate-900 dark:text-white"/>}
                                {editingNoteId ? 'Modifier la note' : 'Nouvelle Note'}
                            </h3>
                            {editingNoteId && (
                                <button onClick={cancelEditing} className="text-sm font-bold text-red-500 hover:text-red-600 flex items-center gap-1 bg-red-50 dark:bg-red-900/10 px-3 py-1.5 rounded-xl hover:bg-red-100 transition-colors">
                                    <X size={16}/> Annuler
                                </button>
                            )}
                        </div>
                        
                        <div className="space-y-4">
                            <div className="flex flex-col md:flex-row gap-4">
                                <input 
                                    type="text" 
                                    placeholder="Titre de la note..." 
                                    value={newNoteTitle}
                                    onChange={(e) => setNewNoteTitle(e.target.value)}
                                    className={`${inputClass} text-lg font-bold md:flex-1`}
                                />
                                <div className="flex gap-2 items-center justify-center md:justify-start bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2">
                                    {colors.map((c, i) => (
                                        <button 
                                            key={i}
                                            onClick={() => setNewNoteColor(c.bg)}
                                            className={`w-6 h-6 rounded-full border-2 ${c.border} ${c.bg} ${newNoteColor === c.bg ? 'ring-2 ring-offset-2 ring-gray-400 dark:ring-offset-slate-900 scale-110' : 'hover:scale-110'} transition-transform shadow-sm`}
                                        />
                                    ))}
                                </div>
                            </div>

                            <textarea 
                                placeholder="Écrivez votre contenu ici..." 
                                value={newNoteContent}
                                onChange={(e) => setNewNoteContent(e.target.value)}
                                className={`${inputClass} h-40 resize-none leading-relaxed text-base`}
                            ></textarea>

                            <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-2">
                                {/* Sélecteur de projet */}
                                <div className="relative w-full md:flex-1 md:max-w-sm">
                                    <select 
                                        value={linkedProjectId} 
                                        onChange={(e) => setLinkedProjectId(e.target.value)} 
                                        className={`${inputClass} appearance-none cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 font-medium`}
                                    >
                                        <option value="">-- Lier à un projet (Optionnel) --</option>
                                        {projects.map(p => <option key={p.id} value={p.id}>📂 {p.title}</option>)}
                                    </select>
                                    <CornerDownRight size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
                                </div>

                                <button 
                                    onClick={handleCreateOrUpdateNote}
                                    className={`w-full md:w-auto px-8 py-3 text-white text-sm font-bold rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg ${editingNoteId ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/30' : 'bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-gray-200 dark:text-black shadow-slate-900/30'}`}
                                >
                                    {editingNoteId ? <><Check size={18}/> Mettre à jour</> : <><Plus size={18}/> Créer la note</>}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* GRILLE DES NOTES */}
                    {sortedNotes.length === 0 ? (
                        <div className="text-center py-20 bg-gray-50 dark:bg-slate-900 rounded-[2.5rem] border-2 border-dashed border-gray-200 dark:border-slate-800">
                            <StickyNote size={48} className="mx-auto text-gray-300 dark:text-slate-700 mb-4"/>
                            <p className="text-gray-400 dark:text-slate-600 font-medium">Aucune note pour le moment.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6 auto-rows-min">
                            {sortedNotes.map(note => {
                                const project = projects.find(p => String(p.id) === String(note.linkedProjectId));
                                const darkColorMap = {
                                    'bg-yellow-100': 'dark:bg-yellow-900/20 dark:border-yellow-800/50',
                                    'bg-blue-100': 'dark:bg-blue-900/20 dark:border-blue-800/50',
                                    'bg-green-100': 'dark:bg-green-900/20 dark:border-green-800/50',
                                    'bg-red-100': 'dark:bg-red-900/20 dark:border-red-800/50',
                                    'bg-purple-100': 'dark:bg-purple-900/20 dark:border-purple-800/50',
                                    'bg-gray-100': 'dark:bg-slate-800 dark:border-slate-700',
                                };
                                const darkClasses = darkColorMap[note.color] || 'dark:bg-slate-800';

                                return (
                                    <div 
                                        key={note.id} 
                                        className={`p-6 rounded-[2rem] border border-transparent shadow-sm hover:shadow-xl transition-all relative group cursor-pointer hover:-translate-y-1 ${note.color} ${darkClasses}`}
                                        onClick={() => startEditing(note)} // MODIF : Clic pour éditer
                                    >
                                        <div className="flex justify-between items-start mb-4">
                                            <h4 className="font-bold text-gray-900 dark:text-gray-100 text-lg line-clamp-1 flex-1 pr-4">{note.title}</h4>
                                            
                                            {/* Actions visibles au survol */}
                                            <div className="flex gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity bg-white/50 dark:bg-black/20 p-1 rounded-lg backdrop-blur-sm">
                                                <button 
                                                    onClick={(e) => {e.stopPropagation(); togglePin(note.id);}} 
                                                    className={`p-1.5 rounded-md hover:bg-white dark:hover:bg-slate-700 transition-colors ${note.isPinned ? 'text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-700' : 'text-gray-500 dark:text-gray-400'}`}
                                                    title={note.isPinned ? "Détacher" : "Épingler"}
                                                >
                                                    <Pin size={16} className={note.isPinned ? "fill-current" : ""}/>
                                                </button>
                                                <button 
                                                    onClick={(e) => {e.stopPropagation(); deleteNote(note.id);}} 
                                                    className="p-1.5 rounded-md hover:bg-red-500 hover:text-white text-gray-500 dark:text-gray-400 transition-colors"
                                                    title="Supprimer"
                                                >
                                                    <Trash2 size={16}/>
                                                </button>
                                            </div>
                                        </div>
                                        
                                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words leading-relaxed min-h-[4rem]">
                                            {note.content}
                                        </p>
                                        
                                        {project && (
                                            <div className="mt-6 pt-4 border-t border-black/5 dark:border-white/5 flex items-center gap-2 text-gray-500 dark:text-gray-400">
                                                <LinkIcon size={12}/>
                                                <span className="text-[10px] uppercase font-black tracking-widest truncate max-w-[200px]">
                                                    {project.title}
                                                </span>
                                            </div>
                                        )}
                                        
                                        <div className="absolute top-4 right-4 text-gray-400 opacity-20 pointer-events-none group-hover:opacity-10 transition-opacity">
                                            <Edit2 size={80} />
                                        </div>
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