import { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Book, Folder, FileText, ChevronRight, ChevronDown, Plus, 
  Search, Trash2, Edit2, Bold, Italic, List, CheckSquare, 
  Heading, Quote, Save, MoreHorizontal, FolderPlus, FilePlus,
  ArrowLeft, LayoutGrid, Underline, Strikethrough, Type, AlignLeft
} from 'lucide-react';

export default function JournalManager({ data, updateData }) {
    // --- ÉTATS ---
    const [activeNotebookId, setActiveNotebookId] = useState(null);
    const [activePageId, setActivePageId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedFolders, setExpandedFolders] = useState({});
    const [isSaving, setIsSaving] = useState(false);
    
    // États Création
    const [isCreating, setIsCreating] = useState(false); 
    const [newName, setNewName] = useState('');
    const [targetParentId, setTargetParentId] = useState(null);

    // Refs
    const editorRef = useRef(null);
    const titleRef = useRef(null);

    // --- DONNÉES SÉCURISÉES ---
    const folders = Array.isArray(data.journal_folders) ? data.journal_folders : [];
    const pages = Array.isArray(data.journal_pages) ? data.journal_pages : [];

    const notebooks = folders.filter(f => !f.parent_id);

    // --- EFFET CRITIQUE : CHARGEMENT DU CONTENU (FIX PAGE BLANCHE/SAUT) ---
    // On ne met à jour le HTML de l'éditeur QUE si on change de page.
    // On ne le fait PAS à chaque frappe, sinon le curseur saute ou le texte s'efface.
    useEffect(() => {
        if (activePageId && editorRef.current) {
            const page = pages.find(p => p.id === activePageId);
            if (page) {
                editorRef.current.innerHTML = page.content || '';
                if(titleRef.current) titleRef.current.value = page.title || '';
            }
        }
    }, [activePageId]); // Dépendance uniquement sur l'ID, pas sur le contenu !

    // --- ARBORESCENCE ---
    const structure = useMemo(() => {
        if (!activeNotebookId) return [];
        const buildNode = (folderId) => {
            const subFolders = folders.filter(f => String(f.parent_id) === String(folderId));
            const folderPages = pages.filter(p => String(p.folder_id) === String(folderId));
            return subFolders.map(sub => ({
                ...sub, type: 'folder',
                children: [...buildNode(sub.id), ...folderPages.map(p => ({...p, type: 'page'}))]
            }));
        };
        const rootPages = pages.filter(p => String(p.folder_id) === String(activeNotebookId));
        return [...buildNode(activeNotebookId), ...rootPages.map(p => ({...p, type: 'page'}))];
    }, [folders, pages, activeNotebookId]);

    // --- ACTIONS ---
    const createItem = () => {
        if (!newName.trim()) return;
        if (isCreating === 'notebook') {
            const newFolder = { id: Date.now(), name: newName, parent_id: null, created_at: new Date().toISOString() };
            updateData({ ...data, journal_folders: [...folders, newFolder] });
        } else if (isCreating === 'folder') {
            const newFolder = { id: Date.now(), name: newName, parent_id: targetParentId, created_at: new Date().toISOString() };
            updateData({ ...data, journal_folders: [...folders, newFolder] });
            setExpandedFolders(prev => ({ ...prev, [targetParentId]: true }));
        }
        setNewName('');
        setIsCreating(false);
    };

    const createPage = (folderId) => {
        const newPage = { id: Date.now(), folder_id: folderId, title: '', content: '', updated_at: new Date().toISOString() };
        updateData({ ...data, journal_pages: [...pages, newPage] });
        setActivePageId(newPage.id);
        if (folderId) setExpandedFolders(prev => ({ ...prev, [folderId]: true }));
        setTimeout(() => titleRef.current?.focus(), 100);
    };

    const deleteItem = (item) => {
        if (!window.confirm(`Supprimer "${item.title || item.name}" ?`)) return;
        if (item.type === 'folder' || !item.folder_id) {
            const updatedFolders = folders.filter(f => f.id !== item.id);
            const updatedPages = pages.filter(p => p.folder_id !== item.id);
            updateData({ ...data, journal_folders: updatedFolders, journal_pages: updatedPages }, { table: 'journal_folders', id: item.id });
            if (activeNotebookId === item.id) setActiveNotebookId(null);
        } else {
            const updatedPages = pages.filter(p => p.id !== item.id);
            updateData({ ...data, journal_pages: updatedPages }, { table: 'journal_pages', id: item.id });
            if (activePageId === item.id) setActivePageId(null);
        }
    };

    const saveContent = () => {
        if (!activePageId) return;
        setIsSaving(true);
        // On lit directement le DOM pour avoir la dernière version brute
        const content = editorRef.current.innerHTML;
        const title = titleRef.current.value;
        const updatedPages = pages.map(p => p.id === activePageId ? { ...p, title, content, updated_at: new Date().toISOString() } : p);
        updateData({ ...data, journal_pages: updatedPages });
        setTimeout(() => setIsSaving(false), 800);
    };

    // --- ÉDITEUR RICHE (RÉPARÉ) ---
    const execCmd = (e, command, value = null) => {
        e.preventDefault(); // Empêche le bouton de voler le focus
        document.execCommand(command, false, value);
        // Force le focus retour sur l'éditeur pour continuer à écrire
        if(editorRef.current) editorRef.current.focus();
    };

    const ToolbarButton = ({ icon: Icon, cmd, val, title }) => (
        <button 
            onMouseDown={(e) => execCmd(e, cmd, val)} 
            className="p-2 rounded hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-300 transition-colors"
            title={title}
        >
            <Icon size={18}/>
        </button>
    );

    const activePageData = pages.find(p => p.id === activePageId);

    // --- ARBRE ---
    const renderTree = (nodes, depth = 0) => {
        return nodes.map(node => {
            if (searchQuery && node.type === 'page' && !node.title.toLowerCase().includes(searchQuery.toLowerCase())) return null;
            
            if (node.type === 'folder') {
                const isOpen = expandedFolders[node.id] || searchQuery.length > 0;
                const hasChildren = node.children && node.children.length > 0;
                return (
                    <div key={node.id} className="select-none text-sm">
                        <div 
                            className={`flex items-center justify-between px-3 py-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer group`}
                            style={{ paddingLeft: `${depth * 12 + 12}px` }}
                            onClick={() => setExpandedFolders(prev => ({ ...prev, [node.id]: !prev[node.id] }))}
                        >
                            <div className="flex items-center gap-2 overflow-hidden text-gray-700 dark:text-gray-200">
                                {hasChildren ? (isOpen ? <ChevronDown size={14}/> : <ChevronRight size={14}/>) : <span className="w-3.5"></span>}
                                <Folder size={16} className="text-blue-500 shrink-0 fill-blue-500/20"/>
                                <span className="truncate">{node.name}</span>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={(e) => { e.stopPropagation(); createPage(node.id); }} className="p-1 hover:text-green-500"><FilePlus size={14}/></button>
                                <button onClick={(e) => { e.stopPropagation(); setTargetParentId(node.id); setIsCreating('folder'); }} className="p-1 hover:text-blue-500"><FolderPlus size={14}/></button>
                                <button onClick={(e) => { e.stopPropagation(); deleteItem(node); }} className="p-1 hover:text-red-500"><Trash2 size={14}/></button>
                            </div>
                        </div>
                        {isOpen && node.children && <div className="border-l border-gray-200 dark:border-slate-800 ml-4">{renderTree(node.children, depth + 1)}</div>}
                    </div>
                );
            }
            return (
                <div 
                    key={node.id} 
                    onClick={() => setActivePageId(node.id)}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer group mb-0.5 text-sm ${activePageId === node.id ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-200 font-medium' : 'hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-gray-400'}`}
                    style={{ paddingLeft: `${depth * 12 + 28}px` }}
                >
                    <div className="flex items-center gap-2 overflow-hidden">
                        <FileText size={14} className="shrink-0"/>
                        <span className={`truncate ${!node.title ? 'italic opacity-50' : ''}`}>{node.title || 'Sans titre'}</span>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); deleteItem(node); }} className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500"><Trash2 size={12}/></button>
                </div>
            );
        });
    };

    if (!activeNotebookId) {
        return (
            <div className="fade-in p-6 max-w-7xl mx-auto pb-24">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                            <Book className="text-blue-600"/> Ma Bibliothèque
                        </h2>
                        <p className="text-gray-500 dark:text-slate-400 mt-1">Gérez vos carnets, notes et documentations.</p>
                    </div>
                    <button 
                        onClick={() => { setIsCreating('notebook'); setNewName(''); }}
                        className="flex items-center gap-2 px-6 py-3 bg-slate-900 dark:bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:opacity-90 transition-transform active:scale-95"
                    >
                        <Plus size={20}/> Nouveau Carnet
                    </button>
                </div>

                {isCreating === 'notebook' && (
                    <div className="mb-8 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-slate-700 animate-in slide-in-from-top-4">
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Nom du carnet</label>
                        <div className="flex gap-4">
                            <input 
                                autoFocus
                                type="text" 
                                placeholder="Ex: Idées Business, Journal Perso..." 
                                className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && createItem()}
                            />
                            <button onClick={() => setIsCreating(false)} className="px-6 font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl">Annuler</button>
                            <button onClick={createItem} className="px-8 font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700">Créer</button>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {notebooks.map(nb => (
                        <div 
                            key={nb.id} 
                            onClick={() => setActiveNotebookId(nb.id)}
                            className="group bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 shadow-sm hover:shadow-xl transition-all cursor-pointer relative overflow-hidden flex flex-col h-48 justify-between"
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={(e) => { e.stopPropagation(); deleteItem(nb); }} className="p-2 bg-white dark:bg-slate-700 text-red-500 rounded-full shadow-sm hover:bg-red-50"><Trash2 size={16}/></button>
                            </div>
                            <div>
                                <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><Book size={24}/></div>
                                <h3 className="text-xl font-bold text-gray-800 dark:text-white line-clamp-1">{nb.name}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{new Date(nb.created_at).toLocaleDateString()}</p>
                            </div>
                            <div className="flex items-center gap-2 text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider"><span>Entrer</span> <ArrowLeft size={12} className="rotate-180 group-hover:translate-x-1 transition-transform"/></div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    const activeNotebookName = notebooks.find(n => n.id === activeNotebookId)?.name || 'Carnet';

    return (
        <div className="flex h-[calc(100vh-1rem)] md:h-[calc(100vh-2rem)] max-w-[1920px] mx-auto overflow-hidden bg-white dark:bg-slate-900 shadow-sm border border-gray-200 dark:border-slate-700 fade-in relative">
            <div className="w-72 border-r border-gray-200 dark:border-slate-700 flex flex-col bg-gray-50/80 dark:bg-slate-950/50">
                <div className="p-4 border-b border-gray-200 dark:border-slate-700">
                    <button onClick={() => { setActiveNotebookId(null); setActivePageId(null); }} className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-blue-600 mb-4 transition-colors"><ArrowLeft size={12}/> RETOUR BIBLIOTHÈQUE</button>
                    <h3 className="font-bold text-lg text-gray-800 dark:text-white truncate mb-4 px-1">{activeNotebookName}</h3>
                    <div className="flex gap-2">
                        <button onClick={() => createPage(activeNotebookId)} className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-xs font-bold transition-colors shadow-sm"><Plus size={14}/> Page</button>
                        <button onClick={() => { setIsCreating('folder'); setTargetParentId(activeNotebookId); setNewName(''); }} className="flex-1 flex items-center justify-center gap-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200 py-2 rounded-lg text-xs font-bold transition-colors"><FolderPlus size={14}/> Dossier</button>
                    </div>
                </div>
                {isCreating === 'folder' && (
                    <div className="p-2 m-2 bg-white dark:bg-slate-800 rounded-lg border border-blue-200 dark:border-blue-800 shadow-sm animate-in slide-in-from-top-2">
                        <input autoFocus type="text" placeholder="Nom du dossier..." className="w-full text-sm mb-2 px-2 py-1 bg-transparent border-b border-blue-200 outline-none dark:text-white" value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && createItem()} />
                        <div className="flex justify-end gap-2 text-xs">
                            <button onClick={() => setIsCreating(false)} className="text-gray-400 hover:text-gray-600">Annuler</button>
                            <button onClick={createItem} className="text-blue-600 font-bold">Créer</button>
                        </div>
                    </div>
                )}
                <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                    {renderTree(structure)}
                    {structure.length === 0 && <div className="text-center mt-10 opacity-40"><FileText size={32} className="mx-auto mb-2"/><p className="text-xs">Carnet vide</p></div>}
                </div>
            </div>

            <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 relative">
                {activePageId ? (
                    <>
                        {/* BARRE D'OUTILS AMÉLIORÉE */}
                        <div className="h-14 border-b border-gray-100 dark:border-slate-800 flex items-center px-4 gap-1 bg-white dark:bg-slate-900 z-10 sticky top-0 overflow-x-auto">
                            <ToolbarButton icon={Bold} cmd="bold" title="Gras" />
                            <ToolbarButton icon={Italic} cmd="italic" title="Italique" />
                            <ToolbarButton icon={Underline} cmd="underline" title="Souligné" />
                            <ToolbarButton icon={Strikethrough} cmd="strikethrough" title="Barré" />
                            <div className="w-px h-5 bg-gray-200 dark:bg-slate-700 mx-2 shrink-0"></div>
                            
                            {/* Titres et Paragraphe */}
                            <button onMouseDown={(e) => execCmd(e, 'formatBlock', 'H2')} className="px-2 py-1 text-xs font-bold rounded hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-300">H1</button>
                            <button onMouseDown={(e) => execCmd(e, 'formatBlock', 'H3')} className="px-2 py-1 text-xs font-bold rounded hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-300">H2</button>
                            <ToolbarButton icon={Type} cmd="formatBlock" val="P" title="Paragraphe Normal" />
                            
                            <div className="w-px h-5 bg-gray-200 dark:bg-slate-700 mx-2 shrink-0"></div>
                            <ToolbarButton icon={List} cmd="insertUnorderedList" title="Liste à puces" />
                            <ToolbarButton icon={CheckSquare} cmd="insertOrderedList" title="Liste numérotée" />
                            <ToolbarButton icon={Quote} cmd="formatBlock" val="BLOCKQUOTE" title="Citation" />
                            
                            <div className="flex-1"></div>
                            <span className="text-xs text-gray-400 mr-3 hidden sm:inline">{isSaving ? 'Enregistrement...' : 'Sauvegardé'}</span>
                            <button onClick={saveContent} className={`p-2 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors`}><Save size={18}/></button>
                        </div>

                        {/* ZONE D'ÉDITION STABLE */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 md:p-12 max-w-4xl mx-auto w-full">
                            <input 
                                ref={titleRef}
                                type="text" 
                                placeholder="Titre de la page..."
                                className="text-4xl font-extrabold w-full mb-8 outline-none bg-transparent text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-slate-700"
                                onBlur={saveContent}
                            />
                            
                            <div 
                                ref={editorRef}
                                className="prose prose-lg dark:prose-invert max-w-none outline-none min-h-[60vh] text-gray-700 dark:text-gray-300 leading-relaxed empty:before:content-['Commencez_à_écrire_ici...'] empty:before:text-gray-300"
                                contentEditable
                                onBlur={saveContent}
                                onInput={() => { if(!isSaving) setIsSaving(true); }} 
                            />
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-300 dark:text-slate-600 bg-gray-50/30 dark:bg-slate-900">
                        <div className="w-20 h-20 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6"><Book size={40} className="text-gray-400 dark:text-slate-500"/></div>
                        <p className="text-xl font-bold text-gray-700 dark:text-slate-300">Sélectionnez une page</p>
                        <p className="text-sm mt-2">pour commencer à écrire.</p>
                    </div>
                )}
            </div>

            {/* STYLE CSS POUR LES LISTES (IMPORTANT) */}
            <style jsx>{`
                .prose ul { list-style-type: disc; padding-left: 1.5rem; }
                .prose ol { list-style-type: decimal; padding-left: 1.5rem; }
                .prose h2 { font-size: 1.75em; font-weight: bold; margin-top: 1em; margin-bottom: 0.5em; color: inherit; }
                .prose h3 { font-size: 1.4em; font-weight: bold; margin-top: 1em; margin-bottom: 0.5em; color: inherit; }
                .prose blockquote { border-left: 4px solid #e5e7eb; padding-left: 1rem; font-style: italic; color: gray; }
            `}</style>
        </div>
    );
}