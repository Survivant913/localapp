import { useState, useEffect, useRef } from 'react';
import { 
  Book, Folder, FileText, ChevronRight, ChevronDown, Plus, 
  Search, Trash2, Edit2, Bold, Italic, List, CheckSquare, 
  Heading, Type, Underline, Strikethrough,
  ArrowLeft, Star, Loader2, Calendar, Printer, FolderPlus, AlignLeft, AlignCenter,
  PanelLeft, Highlighter, Quote, AlignRight, AlignJustify, X, Home, Pilcrow,
  Maximize2, Minimize2, Layout, Sparkles
} from 'lucide-react';
import { supabase } from './supabaseClient';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// --- NOUVEAU : DÉFINITION DES MODÈLES ---
const JOURNAL_TEMPLATES = [
    {
        id: 'daily',
        name: 'Journal Quotidien',
        icon: Sparkles,
        content: `<h2>☀️ Ma Journée</h2><p><b>Gratitude du jour :</b></p><ul><li>...</li></ul><p><b>Objectifs prioritaires :</b></p><ul><li>...</li></ul><p><b>Pensées et réflexions :</b></p><blockquote>Écrivez ici vos ressentis...</blockquote>`
    },
    {
        id: 'meeting',
        name: 'Réunion / Client',
        icon: List,
        content: `<h2>🤝 Compte-rendu de Réunion</h2><p><b>Participants :</b> ...</p><p><b>Ordre du jour :</b></p><ul><li>...</li></ul><p><b>Décisions prises :</b></p><ul><li>...</li></ul><p><b>Actions à entreprendre :</b></p><ul><li>[ ] ...</li></ul>`
    },
    {
        id: 'brainstorm',
        name: 'Brainstorming',
        icon: Edit2,
        content: `<h2>💡 Session d'idées</h2><p><b>Problématique :</b> ...</p><h3>🚀 Idées en vrac :</h3><ul><li>...</li></ul><p><b>Sélection finale :</b></p><blockquote>Quelle est la meilleure idée ?</blockquote>`
    }
];

export default function JournalManager({ data, updateData }) {
    // --- ÉTATS DONNÉES ---
    const [allFolders, setAllFolders] = useState([]);
    const [allPages, setAllPages] = useState([]);
    
    // --- ÉTATS NAVIGATION ---
    const [activeNotebookId, setActiveNotebookId] = useState(null); 
    const [currentFolderId, setCurrentFolderId] = useState(null);   
    const [activePageId, setActivePageId] = useState(null);         
    const [breadcrumbs, setBreadcrumbs] = useState([]);

    // UI
    const [searchQuery, setSearchQuery] = useState('');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isZenMode, setIsZenMode] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [showColorPalette, setShowColorPalette] = useState(false);
    const [showTemplates, setShowTemplates] = useState(false); // NOUVEAU
    
    // Contenu Editeur
    const [pageContent, setPageContent] = useState('');
    const [pageTitle, setPageTitle] = useState('');
    
    // Refs
    const editorRef = useRef(null);
    const titleRef = useRef(null);
    const saveTimeoutRef = useRef(null);

    // --- 1. CHARGEMENT INITIAL ---
    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [foldersRes, pagesRes] = await Promise.all([
                supabase.from('journal_folders').select('*').order('created_at'),
                supabase.from('journal_pages').select('*').order('updated_at', { ascending: false })
            ]);
            
            if (foldersRes.data) setAllFolders(foldersRes.data);
            if (pagesRes.data) setAllPages(pagesRes.data);
            
        } catch (error) {
            console.error("Erreur chargement:", error);
        } finally {
            setIsLoading(false);
        }
    };

    // --- 2. NAVIGATION ---
    useEffect(() => {
        if (!currentFolderId) {
            setBreadcrumbs([]);
            return;
        }
        const path = [];
        let curr = allFolders.find(f => f.id === currentFolderId);
        let safety = 0;
        while (curr && safety < 10) {
            path.unshift(curr);
            if (!curr.parent_id) break;
            curr = allFolders.find(f => f.id === curr.parent_id);
            safety++;
        }
        setBreadcrumbs(path);
    }, [currentFolderId, allFolders]);

    const navigateToFolder = (folderId) => {
        setCurrentFolderId(folderId);
        setActivePageId(null);
        setSearchQuery(''); 
    };

    const navigateUp = () => {
        setSearchQuery(''); 
        if (!currentFolderId) return;
        const current = allFolders.find(f => f.id === currentFolderId);
        if (current && current.parent_id) {
            setCurrentFolderId(current.parent_id);
        } else {
            setActiveNotebookId(null);
            setCurrentFolderId(null);
        }
    };

    // --- 3. CHARGEMENT PAGE ---
    useEffect(() => {
        if (!activePageId) {
            setPageContent('');
            setPageTitle('');
            if (titleRef.current) titleRef.current.value = '';
            if (editorRef.current) editorRef.current.innerHTML = '';
            return;
        }

        const page = allPages.find(p => p.id === activePageId);
        if (page) {
            setPageContent(page.content || '');
            setPageTitle(page.title || 'Sans titre');
            if (titleRef.current) titleRef.current.value = page.title || 'Sans titre';
            if (editorRef.current) editorRef.current.innerHTML = page.content || '';
        }
        setShowTemplates(false);
    }, [activePageId]);

    // --- 4. SAUVEGARDE ---
    const saveCurrentPage = async (force = false) => {
        if (!activePageId) return;
        
        const content = editorRef.current ? editorRef.current.innerHTML : pageContent;
        const title = titleRef.current ? titleRef.current.value : pageTitle;
        
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

        const performSave = async () => {
            setIsSaving(true);
            try {
                await supabase.from('journal_pages').update({
                    title: title,
                    content: content,
                    updated_at: new Date().toISOString()
                }).eq('id', activePageId);
                
                setAllPages(prev => prev.map(p => p.id === activePageId ? { ...p, title, content, updated_at: new Date().toISOString() } : p));
            } catch (err) {
                console.error("Erreur save:", err);
            } finally {
                setIsSaving(false);
            }
        };

        if (force) await performSave();
        else {
            setIsSaving(true);
            saveTimeoutRef.current = setTimeout(performSave, 1500);
        }
    };

    // --- 5. CRÉATION ---
    const createItem = async (type) => {
        let name = '';
        if (type === 'root') name = prompt("Nom du nouveau Carnet :");
        else if (type === 'folder') name = prompt("Nom du nouveau Dossier :");
        else name = "Nouvelle Page";

        if ((type !== 'page' && !name) || (type === 'folder' && !currentFolderId)) return;

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Non connecté");

            const NEW_ID = Date.now(); 

            if (type === 'page') {
                if (activePageId) await saveCurrentPage(true);
                const { data, error } = await supabase.from('journal_pages').insert([{ 
                    id: NEW_ID,
                    folder_id: currentFolderId, 
                    title: name, 
                    content: '',
                    user_id: user.id 
                }]).select();
                
                if (error) throw error;
                if (data) {
                    setAllPages([data[0], ...allPages]);
                    setActivePageId(data[0].id);
                }
            } else {
                const parentId = type === 'root' ? null : currentFolderId;
                const { data, error } = await supabase.from('journal_folders').insert([{ 
                    id: NEW_ID,
                    name, 
                    parent_id: parentId,
                    user_id: user.id
                }]).select();
                
                if (error) throw error;
                if (data) setAllFolders([...allFolders, data[0]]);
            }
        } catch (err) {
            console.error("Erreur création:", err);
        }
    };

    // --- SUPPRESSION RÉCURSIVE PRÉSERVÉE ---
    const deleteItem = async (id, type) => {
        const confirmMsg = type === 'page' 
            ? "Supprimer cette page ?" 
            : "Supprimer ce dossier et TOUT son contenu ? Cette action est irréversible.";
            
        if (!window.confirm(confirmMsg)) return;

        try {
            if (type === 'page') {
                await supabase.from('journal_pages').delete().eq('id', id);
                setAllPages(allPages.filter(p => p.id !== id));
                if (activePageId === id) setActivePageId(null);
            } else {
                const getAllDescendantIds = (parentId) => {
                    let ids = [parentId];
                    const children = allFolders.filter(f => f.parent_id === parentId);
                    children.forEach(child => {
                        ids = [...ids, ...getAllDescendantIds(child.id)];
                    });
                    return ids;
                };
                const idsToDelete = getAllDescendantIds(id);
                await supabase.from('journal_pages').delete().in('folder_id', idsToDelete);
                await supabase.from('journal_folders').delete().in('id', idsToDelete);
                setAllFolders(prev => prev.filter(f => !idsToDelete.includes(f.id)));
                setAllPages(prev => prev.filter(p => !idsToDelete.includes(p.folder_id)));
                if (idsToDelete.includes(currentFolderId) || idsToDelete.includes(activeNotebookId)) {
                    setActiveNotebookId(null);
                    setCurrentFolderId(null);
                    setActivePageId(null);
                }
            }
        } catch (err) {
            console.error("Erreur suppression:", err);
        }
    };

    // --- FAVORIS PRÉSERVÉS ---
    const toggleFavorite = async (page) => {
        const newStatus = !page.is_favorite;
        setAllPages(prev => prev.map(p => p.id === page.id ? { ...p, is_favorite: newStatus } : p));
        await supabase.from('journal_pages').update({ is_favorite: newStatus }).eq('id', page.id);
    };

    // --- NOUVEAU : APPLIQUER UN MODÈLE ---
    const applyTemplate = (htmlContent) => {
        if (editorRef.current) {
            editorRef.current.innerHTML = htmlContent;
            saveCurrentPage(true);
            setShowTemplates(false);
        }
    };

    // --- ÉDITEUR : COMMANDES ---
    const execCmd = (cmd, val = null) => {
        if (editorRef.current) editorRef.current.focus();
        document.execCommand('styleWithCSS', false, true);
        document.execCommand(cmd, false, val);
        if (cmd === 'hiliteColor') setShowColorPalette(false);
    };

    const ToolbarButton = ({ icon: Icon, cmd, val, title }) => (
        <button 
            onMouseDown={(e) => { 
                e.preventDefault(); 
                execCmd(cmd, val); 
            }}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-700 rounded transition-colors"
            title={title}
        >
            <Icon size={18}/>
        </button>
    );

    // --- IMPRESSION NOIR PUR PRÉSERVÉE ---
    const handlePrint = () => {
        if (!activePageId) return;
        const printWindow = window.open('', '_blank');
        const content = editorRef.current ? editorRef.current.innerHTML : pageContent;
        const title = titleRef.current ? titleRef.current.value : pageTitle;
        const date = format(new Date(), 'd MMMM yyyy', { locale: fr });
        printWindow.document.write(`<html><head><title>${title}</title><style>* { color: #000 !important; -webkit-print-color-adjust: exact !important; } body { font-family: sans-serif; line-height: 1.8; padding: 40px; } h1 { border-bottom: 2px solid #333; padding-bottom: 20px; } blockquote { border-left: 5px solid #333; padding: 15px 20px; background: #f0f0f0; }</style></head><body><div style="font-style:italic;">${date}</div><h1>${title}</h1><div>${content}</div><script>window.onload = () => { window.print(); window.close(); }</script></body></html>`);
        printWindow.document.close();
    };

    // --- LOGIQUE D'AFFICHAGE ---
    const favoritePages = allPages.filter(p => p.is_favorite);
    const rootFolders = allFolders.filter(f => !f.parent_id); 
    const subFoldersInCurrent = allFolders.filter(f => f.parent_id === currentFolderId);
    const pagesInCurrent = allPages.filter(p => p.folder_id === currentFolderId);
    const displayedFolders = searchQuery ? allFolders.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase())) : subFoldersInCurrent;
    const displayedPages = searchQuery ? allPages.filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase())) : pagesInCurrent;

    // --- VUE DASHBOARD ---
    if (!activeNotebookId) {
        return (
            <div className="h-full w-full bg-slate-50 dark:bg-slate-950 p-8 overflow-y-auto">
                <div className="max-w-6xl mx-auto">
                    <div className="flex justify-between items-center mb-8">
                        <h2 className="text-3xl font-bold text-slate-800 dark:text-white">Mes Carnets</h2>
                        <button onClick={() => createItem('root')} className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white dark:bg-white dark:text-black rounded-xl font-bold hover:opacity-90 transition-opacity"><FolderPlus size={18}/> Nouveau Carnet</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        <div onClick={() => createItem('root')} className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 min-h-[180px] group transition-all">
                            <Plus size={24} className="text-slate-400 mb-3 group-hover:scale-110 transition-transform"/>
                            <span className="font-bold text-slate-500">Ajouter</span>
                        </div>
                        {rootFolders.map(nb => (
                            <div key={nb.id} onClick={() => { setActiveNotebookId(nb.id); setCurrentFolderId(nb.id); }} className="group bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-lg cursor-pointer transition-all flex flex-col justify-between relative overflow-hidden">
                                <div className="flex justify-between items-start mb-4 relative z-10">
                                    <Book size={24} className="text-indigo-600 dark:text-indigo-400"/>
                                    <button onClick={(e) => { e.stopPropagation(); deleteItem(nb.id, 'folder'); }} className="p-1.5 text-slate-300 hover:text-red-500 rounded-lg transition-colors"><Trash2 size={16}/></button>
                                </div>
                                <h3 className="font-bold text-xl text-slate-800 dark:text-white">{nb.name}</h3>
                                <div className="text-xs text-slate-400 pt-4 border-t border-slate-100 dark:border-slate-800">Ouvrir <ArrowLeft size={10} className="rotate-180 inline ml-1"/></div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // --- VUE CONTENU ---
    return (
        <div className="flex h-full w-full bg-slate-50 dark:bg-slate-950 overflow-hidden">
            <div className={`${(isSidebarOpen && !isZenMode) ? 'w-80' : 'w-0'} bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 flex flex-col shrink-0 overflow-hidden`}>
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
                    <div className="relative mb-3">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                        <input type="text" placeholder="Rechercher..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm outline-none" />
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                        <button onClick={navigateUp} className="p-2 border rounded-lg"><Home size={16}/></button>
                        <div className="font-bold text-slate-800 dark:text-white truncate flex-1">{allFolders.find(f => f.id === currentFolderId)?.name || 'Dossier'}</div>
                    </div>
                    {!searchQuery && (
                        <div className="flex gap-2">
                            <button onClick={() => createItem('folder')} className="flex-1 py-2 border rounded-lg text-xs font-bold">Dossier</button>
                            <button onClick={() => createItem('page')} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold">Page</button>
                        </div>
                    )}
                </div>
                <div className="flex-1 overflow-y-auto p-2">
                    {favoritePages.length > 0 && !searchQuery && (
                        <div className="mb-4">
                            <div className="px-3 py-2 text-[10px] font-black uppercase text-amber-500">Favoris</div>
                            {favoritePages.map(page => (
                                <div key={`fav-${page.id}`} onClick={() => setActivePageId(page.id)} className="px-3 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer flex items-center gap-2">
                                    <Star size={10} className="fill-amber-500 text-amber-500"/> <span className="truncate">{page.title}</span>
                                </div>
                            ))}
                        </div>
                    )}
                    {displayedFolders.map(folder => (
                        <div key={folder.id} onClick={() => navigateToFolder(folder.id)} className="px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer flex items-center justify-between group">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <Folder size={18} className="text-amber-400 shrink-0"/> <span className="truncate text-sm font-medium">{folder.name}</span>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); deleteItem(folder.id, 'folder'); }} className="opacity-0 group-hover:opacity-100 text-red-400"><Trash2 size={12}/></button>
                        </div>
                    ))}
                    {displayedPages.map(page => (
                        <div key={page.id} onClick={() => setActivePageId(page.id)} className={`px-3 py-2.5 rounded-lg cursor-pointer flex items-center justify-between ${activePageId === page.id ? 'bg-indigo-50 dark:bg-indigo-900/20' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                            <div className="flex items-center gap-3 overflow-hidden">
                                <FileText size={16} className={activePageId === page.id ? 'text-indigo-500' : 'text-slate-400'}/>
                                <span className={`truncate text-sm ${activePageId === page.id ? 'font-bold' : ''}`}>{page.title}</span>
                            </div>
                            {page.is_favorite && <Star size={12} className="fill-amber-500 text-amber-500"/>}
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex-1 flex flex-col bg-white dark:bg-black relative min-w-0 transition-all">
                {activePageId ? (
                    <>
                        {!isZenMode && (
                            <div className="border-b border-slate-100 dark:border-slate-800 flex items-center gap-2 p-2 bg-white dark:bg-black z-20">
                                <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 md:hidden"><PanelLeft size={20}/></button>
                                <ToolbarButton cmd="formatBlock" val="<p>" icon={Pilcrow} title="Normal" />
                                <div className="w-px h-6 bg-slate-200 dark:bg-slate-700"></div>
                                <ToolbarButton cmd="formatBlock" val="<h2>" icon={Heading} title="H2" />
                                <ToolbarButton cmd="formatBlock" val="<blockquote>" icon={Quote} title="Citation" />
                                <div className="w-px h-6 bg-slate-200 dark:bg-slate-700"></div>
                                <ToolbarButton cmd="bold" icon={Bold} title="Gras" />
                                <ToolbarButton cmd="italic" icon={Italic} title="Italique" />
                                <div className="w-px h-6 bg-slate-200 dark:bg-slate-700"></div>
                                <div className="relative">
                                    <button onMouseDown={(e)=>{e.preventDefault(); setShowColorPalette(!showColorPalette)}} className="p-2 text-slate-500"><Highlighter size={18}/></button>
                                    {showColorPalette && (
                                        <div className="absolute top-full left-0 mt-2 flex gap-1 bg-white dark:bg-slate-800 border p-2 rounded-lg shadow-xl z-50">
                                            {['#fef08a', '#bbf7d0', '#bfdbfe', '#fecaca'].map((c, i) => (
                                                <button key={i} onMouseDown={(e)=>{ e.preventDefault(); execCmd('hiliteColor', c); }} className="w-6 h-6 rounded-full" style={{backgroundColor: c}}></button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1"></div>
                                {/* NOUVEAU : BOUTON TEMPLATES DANS LA BARRE */}
                                <button onClick={() => setShowTemplates(!showTemplates)} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors" title="Modèles"><Layout size={18}/></button>
                                <button onClick={() => setIsZenMode(true)} className="p-2 text-slate-400" title="Mode Focus"><Maximize2 size={18}/></button>
                                <button onClick={handlePrint} className="p-2 text-slate-400" title="Imprimer"><Printer size={18}/></button>
                            </div>
                        )}

                        {isZenMode && (
                            <button onClick={() => setIsZenMode(false)} className="absolute top-6 right-10 z-50 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-full text-xs font-bold border dark:border-slate-700 transition-all shadow-md">
                                <Minimize2 size={14} className="inline mr-2"/> Quitter Focus
                            </button>
                        )}

                        <div className={`flex-1 overflow-y-auto ${isZenMode ? 'bg-white dark:bg-slate-950' : ''}`}>
                            <div className={`${isZenMode ? 'max-w-2xl' : 'max-w-3xl'} mx-auto px-10 py-16 transition-all duration-700`}>
                                <div className="flex justify-between items-center text-xs text-slate-400 mb-6 font-mono">
                                    <span><Calendar size={12} className="inline mr-1"/> {format(new Date(), 'd MMMM yyyy', {locale: fr})}</span>
                                    <button onClick={() => toggleFavorite(allPages.find(p => p.id === activePageId))} className={`flex items-center gap-1 px-2 py-1 rounded-lg ${allPages.find(p => p.id === activePageId)?.is_favorite ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30' : ''}`}>
                                        <Star size={16} className={allPages.find(p => p.id === activePageId)?.is_favorite ? 'fill-amber-500 text-amber-500' : ''}/>
                                    </button>
                                </div>
                                <input ref={titleRef} type="text" defaultValue={pageTitle} onBlur={() => saveCurrentPage(true)} className="w-full text-5xl font-black bg-transparent outline-none mb-10 text-slate-900 dark:text-white" placeholder="Titre..."/>
                                
                                {/* ÉDITEUR PRINCIPAL */}
                                <div className="relative">
                                    <div ref={editorRef} contentEditable onInput={() => saveCurrentPage(false)} onBlur={() => saveCurrentPage(true)} className="prose dark:prose-invert max-w-none outline-none min-h-[50vh] text-lg leading-loose text-slate-600 dark:text-slate-300 empty:before:content-[attr(placeholder)] empty:before:text-slate-300" placeholder="Écrivez ici..."></div>
                                    
                                    {/* NOUVEAU : INTERFACE DES MODÈLES (AFFICHE SI PAGE VIDE OU BOUTON CLIQUE) */}
                                    {(showTemplates || (editorRef.current && (editorRef.current.innerText.trim() === "" || editorRef.current.innerHTML === "<br>"))) && (
                                        <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                            <div className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Sparkles size={14} className="text-indigo-500"/> Appliquer un modèle de page ?</h4>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                    {JOURNAL_TEMPLATES.map(temp => (
                                                        <button 
                                                            key={temp.id} 
                                                            onClick={() => applyTemplate(temp.content)}
                                                            className="flex flex-col items-center gap-3 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 hover:border-indigo-500 hover:shadow-lg transition-all group"
                                                        >
                                                            <temp.icon size={20} className="text-indigo-500 group-hover:scale-110 transition-transform"/>
                                                            <span className="text-xs font-bold dark:text-white">{temp.name}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-300"><Book size={48} className="opacity-20 mb-6"/><p>Sélectionnez une page</p></div>
                )}
            </div>
            
            <style>{`
                .prose blockquote { border-left: 4px solid #e2e8f0; padding: 10px 1em; color: #64748b; font-style: italic; background: #f9f9f9; border-radius: 4px; }
                .dark .prose blockquote { background: #1e293b; border-color: #334155; color: #94a3b8; }
                .prose span[style*="background-color"] { color: black !important; padding: 0 2px; border-radius: 2px; }
            `}</style>
        </div>
    );
}