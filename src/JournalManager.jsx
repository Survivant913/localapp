import { useState, useEffect, useRef } from 'react';
import { 
  Book, Folder, FileText, ChevronRight, ChevronDown, Plus, 
  Search, Trash2, Edit2, Bold, Italic, List, CheckSquare, 
  Heading, Type, Underline, Strikethrough,
  ArrowLeft, Star, Loader2, Calendar, Printer, FolderPlus, AlignLeft, AlignCenter,
  PanelLeft, Highlighter, Quote, AlignRight, AlignJustify, X, Home
} from 'lucide-react';
import { supabase } from './supabaseClient';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function JournalManager({ data, updateData }) {
    // --- ÉTATS DONNÉES ---
    const [allFolders, setAllFolders] = useState([]); // Tous les dossiers (racines + sous-dossiers)
    const [allPages, setAllPages] = useState([]);     // Toutes les pages
    
    // --- ÉTATS NAVIGATION ---
    const [activeNotebookId, setActiveNotebookId] = useState(null); // Le "Carnet" (Racine) sélectionné
    const [currentFolderId, setCurrentFolderId] = useState(null);   // Le dossier actuellement ouvert (peut être un sous-dossier)
    const [activePageId, setActivePageId] = useState(null);         // La page en cours d'édition
    const [breadcrumbs, setBreadcrumbs] = useState([]);             // Fil d'ariane pour la navigation

    // UI & Contenu
    const [searchQuery, setSearchQuery] = useState('');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [showColorPalette, setShowColorPalette] = useState(false);
    
    // Editor State
    const [pageContent, setPageContent] = useState('');
    const [pageTitle, setPageTitle] = useState('');
    
    // Refs
    const editorRef = useRef(null);
    const titleRef = useRef(null);
    const saveTimeoutRef = useRef(null);

    // --- 1. CHARGEMENT INITIAL (Réparation Données) ---
    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            // On récupère TOUT pour reconstruire la hiérarchie en local
            const [foldersRes, pagesRes] = await Promise.all([
                supabase.from('journal_folders').select('*').order('name'),
                supabase.from('journal_pages').select('id, folder_id, title, created_at, updated_at, is_favorite').order('updated_at', { ascending: false })
            ]);
            
            if (foldersRes.data) setAllFolders(foldersRes.data);
            if (pagesRes.data) setAllPages(pagesRes.data);
            
        } catch (error) {
            console.error("Erreur chargement:", error);
            alert("Erreur de connexion à la base de données.");
        } finally {
            setIsLoading(false);
        }
    };

    // --- 2. LOGIQUE DE NAVIGATION (Fil d'ariane) ---
    useEffect(() => {
        if (!currentFolderId) {
            setBreadcrumbs([]);
            return;
        }
        // Reconstruit le chemin (Breadcrumbs)
        const path = [];
        let curr = allFolders.find(f => f.id === currentFolderId);
        while (curr) {
            path.unshift(curr);
            if (!curr.parent_id) break; // Racine atteinte
            // eslint-disable-next-line no-loop-func
            curr = allFolders.find(f => f.id === curr.parent_id);
        }
        setBreadcrumbs(path);
    }, [currentFolderId, allFolders]);

    const navigateToFolder = (folderId) => {
        setCurrentFolderId(folderId);
        setActivePageId(null); // On ferme l'éditeur quand on change de dossier
    };

    const navigateUp = () => {
        if (!currentFolderId) return;
        const current = allFolders.find(f => f.id === currentFolderId);
        if (current && current.parent_id) {
            setCurrentFolderId(current.parent_id); // Remonter au parent
        } else {
            // On est à la racine du carnet, retour liste carnets
            setActiveNotebookId(null);
            setCurrentFolderId(null);
        }
    };

    // --- 3. CHARGEMENT ÉDITEUR ---
    useEffect(() => {
        if (!activePageId) {
            setPageContent('');
            setPageTitle('');
            if (titleRef.current) titleRef.current.value = '';
            if (editorRef.current) editorRef.current.innerHTML = '';
            return;
        }

        const loadPageContent = async () => {
            setIsSaving(true);
            try {
                const { data } = await supabase.from('journal_pages').select('content, title').eq('id', activePageId).single();
                if (data) {
                    setPageContent(data.content || '');
                    setPageTitle(data.title || 'Sans titre');
                    if (titleRef.current) titleRef.current.value = data.title || 'Sans titre';
                    if (editorRef.current) editorRef.current.innerHTML = data.content || '';
                }
            } catch (err) {
                console.error(err);
            } finally {
                setIsSaving(false);
            }
        };
        loadPageContent();
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
                
                // Maj locale
                setAllPages(prev => prev.map(p => p.id === activePageId ? { ...p, title, updated_at: new Date().toISOString() } : p));
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

    // --- 5. ACTIONS CRÉATION & SUPPRESSION (Corrigées) ---
    
    // Crée un Carnet (Racine)
    const createNotebook = async () => {
        const name = prompt("Nom du nouveau Carnet :");
        if (!name) return;
        try {
            const { data, error } = await supabase.from('journal_folders').insert([{ name, parent_id: null }]).select();
            if (error) throw error;
            if (data) setAllFolders([...allFolders, data[0]]);
        } catch (err) { alert("Erreur création carnet: " + err.message); }
    };

    // Crée un Sous-dossier (Dans le dossier actuel)
    const createSubFolder = async () => {
        if (!currentFolderId) return;
        const name = prompt("Nom du nouveau Dossier :");
        if (!name) return;
        try {
            const { data, error } = await supabase.from('journal_folders').insert([{ name, parent_id: currentFolderId }]).select();
            if (error) throw error;
            if (data) setAllFolders([...allFolders, data[0]]);
        } catch (err) { alert("Erreur création dossier: " + err.message); }
    };

    // Crée une Page (Dans le dossier actuel)
    const createPage = async () => {
        if (!currentFolderId) { alert("Ouvrez un dossier pour créer une page."); return; }
        if (activePageId) await saveCurrentPage(true);

        try {
            const { data, error } = await supabase.from('journal_pages').insert([{ 
                folder_id: currentFolderId, 
                title: 'Nouvelle page', 
                content: '' 
            }]).select();
            if (error) throw error;
            if (data) {
                setAllPages([data[0], ...allPages]);
                setActivePageId(data[0].id);
            }
        } catch (err) { alert("Erreur création page: " + err.message); }
    };

    const deleteFolder = async (id, e) => {
        e.stopPropagation();
        if (!window.confirm("Supprimer ce dossier et tout son contenu ?")) return;
        // Note: Idéalement faire une fonction récursive ou cascade SQL, ici on supprime le niveau direct
        await supabase.from('journal_pages').delete().eq('folder_id', id);
        await supabase.from('journal_folders').delete().eq('id', id);
        setAllFolders(allFolders.filter(f => f.id !== id));
        setAllPages(allPages.filter(p => p.folder_id !== id));
        if (activeNotebookId === id) { setActiveNotebookId(null); setCurrentFolderId(null); }
    };

    const deletePage = async (id, e) => {
        e.stopPropagation();
        if (!window.confirm("Supprimer cette page ?")) return;
        await supabase.from('journal_pages').delete().eq('id', id);
        setAllPages(allPages.filter(p => p.id !== id));
        if (activePageId === id) setActivePageId(null);
    };

    const toggleFavorite = async (id, status, e) => {
        e.stopPropagation();
        await supabase.from('journal_pages').update({ is_favorite: !status }).eq('id', id);
        setAllPages(allPages.map(p => p.id === id ? { ...p, is_favorite: !status } : p));
    };

    // --- IMPRESSION ---
    const handlePrint = () => {
        if (!activePageId) return;
        const printWindow = window.open('', '_blank');
        const content = editorRef.current ? editorRef.current.innerHTML : pageContent;
        const title = titleRef.current ? titleRef.current.value : pageTitle;
        printWindow.document.write(`
            <html><head><title>${title}</title><style>
            body{font-family:serif;max-width:800px;margin:2cm auto;line-height:1.6}
            h1{text-align:center;border-bottom:1px solid #ccc;padding-bottom:10px}
            </style></head><body><h1>${title}</h1>${content}<script>window.print()</script></body></html>
        `);
        printWindow.document.close();
    };

    // --- HELPERS EDITOR ---
    const execCmd = (cmd, val = null) => { document.execCommand(cmd, false, val); if(editorRef.current) editorRef.current.focus(); if(cmd==='hiliteColor') setShowColorPalette(false); };
    const ToolbarButton = ({ icon: Icon, cmd, val }) => (
        <button onMouseDown={(e)=>{e.preventDefault(); execCmd(cmd, val)}} className="p-1.5 text-slate-500 hover:bg-slate-100 rounded"><Icon size={16}/></button>
    );

    // --- DONNÉES FILTRÉES POUR L'AFFICHAGE ---
    // 1. Racines (Notebooks)
    const rootFolders = allFolders.filter(f => f.parent_id === null);
    
    // 2. Contenu du dossier actuel
    const currentSubFolders = allFolders.filter(f => f.parent_id === currentFolderId);
    const currentPages = allPages.filter(p => p.folder_id === currentFolderId);
    
    // Filtrage recherche
    const filteredSubFolders = currentSubFolders.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));
    const filteredPages = currentPages.filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()));


    // --- VUE 1 : DASHBOARD (LISTE DES CARNETS) ---
    if (!activeNotebookId) {
        return (
            <div className="h-full w-full bg-slate-50 dark:bg-slate-950 p-8 overflow-y-auto">
                <div className="max-w-5xl mx-auto">
                    <div className="flex justify-between items-center mb-8">
                        <div><h2 className="text-3xl font-bold text-slate-800 dark:text-white">Bibliothèque</h2><p className="text-slate-500">Vos carnets de notes</p></div>
                        <button onClick={createNotebook} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors shadow-sm"><FolderPlus size={18}/> Nouveau Carnet</button>
                    </div>
                    {isLoading ? <div className="text-center py-20 text-slate-400">Chargement...</div> : (
                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            <div onClick={createNotebook} className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 min-h-[160px]"><Plus size={24} className="text-slate-400 mb-2"/><span className="font-bold text-slate-500">Créer un carnet</span></div>
                            {rootFolders.map(nb => (
                                <div key={nb.id} onClick={() => { setActiveNotebookId(nb.id); setCurrentFolderId(nb.id); }} className="group relative bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-indigo-500 cursor-pointer min-h-[160px] flex flex-col justify-between">
                                    <div>
                                        <div className="flex justify-between items-start mb-4"><div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg flex items-center justify-center text-indigo-600"><Book size={20}/></div><button onClick={(e) => deleteFolder(nb.id, e)} className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500"><Trash2 size={16}/></button></div>
                                        <h3 className="font-bold text-lg text-slate-800 dark:text-white truncate">{nb.name}</h3>
                                    </div>
                                    <div className="text-xs text-slate-400 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between"><span>{new Date(nb.created_at).toLocaleDateString()}</span><span className="flex items-center gap-1 text-indigo-500 font-bold group-hover:translate-x-1 transition-transform">Ouvrir <ChevronRight size={12}/></span></div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // --- VUE 2 : CONTENU DU CARNET (NAVIGATEUR) ---
    return (
        <div className="flex h-full w-full bg-slate-50 dark:bg-slate-950 overflow-hidden">
            <div className={`${isSidebarOpen ? 'w-80' : 'w-0'} bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 flex flex-col shrink-0`}>
                
                {/* Header Navigation */}
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
                    <div className="flex items-center gap-2 mb-3">
                        <button onClick={navigateUp} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500" title="Remonter / Retour">
                            {currentFolderId === activeNotebookId ? <Home size={18}/> : <ArrowLeft size={18}/>}
                        </button>
                        <div className="font-bold text-slate-800 dark:text-white truncate text-sm flex-1">
                            {allFolders.find(f => f.id === currentFolderId)?.name || 'Dossier'}
                        </div>
                    </div>
                    
                    {/* Breadcrumbs (Fil d'ariane) */}
                    <div className="flex items-center gap-1 text-xs text-slate-400 overflow-x-auto whitespace-nowrap mb-3 no-scrollbar">
                        {breadcrumbs.map((f, i) => (
                            <span key={f.id} className="flex items-center">
                                <span onClick={() => navigateToFolder(f.id)} className="hover:underline cursor-pointer hover:text-indigo-500">{f.name}</span>
                                {i < breadcrumbs.length - 1 && <ChevronRight size={10} className="mx-1"/>}
                            </span>
                        ))}
                    </div>

                    <div className="flex gap-2">
                        <button onClick={createSubFolder} className="flex-1 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 flex items-center justify-center gap-1"><FolderPlus size={14}/> Dossier</button>
                        <button onClick={createPage} className="flex-1 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 flex items-center justify-center gap-1"><Plus size={14}/> Page</button>
                    </div>
                </div>

                {/* Recherche */}
                <div className="p-3"><div className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input type="text" placeholder="Filtrer..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-500"/></div></div>

                {/* Liste Contenu (Dossiers puis Pages) */}
                <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
                    {/* Sous-dossiers */}
                    {filteredSubFolders.map(folder => (
                        <div key={folder.id} onClick={() => navigateToFolder(folder.id)} className="group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200">
                            <div className="flex items-center gap-2 overflow-hidden">
                                <Folder size={16} className="text-amber-400 fill-amber-100 dark:fill-amber-900/20 shrink-0"/>
                                <span className="truncate text-sm font-medium">{folder.name}</span>
                            </div>
                            <div className="opacity-0 group-hover:opacity-100 flex items-center">
                                <button onClick={(e) => deleteFolder(folder.id, e)} className="p-1 text-slate-400 hover:text-red-500"><Trash2 size={12}/></button>
                                <ChevronRight size={14} className="text-slate-300 ml-1"/>
                            </div>
                        </div>
                    ))}

                    {/* Pages */}
                    {filteredPages.map(page => (
                        <div key={page.id} onClick={() => { if(activePageId !== page.id) { saveCurrentPage(true); setActivePageId(page.id); } }} className={`group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${activePageId === page.id ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
                            <div className="flex items-center gap-2 overflow-hidden">
                                <FileText size={16} className="shrink-0 opacity-70"/>
                                <span className="truncate text-sm">{page.title || 'Sans titre'}</span>
                            </div>
                            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1">
                                <button onClick={(e) => toggleFavorite(page.id, page.is_favorite, e)}><Star size={12} className={page.is_favorite ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}/></button>
                                <button onClick={(e) => deletePage(page.id, e)} className="hover:text-red-500"><Trash2 size={12}/></button>
                            </div>
                        </div>
                    ))}

                    {filteredSubFolders.length === 0 && filteredPages.length === 0 && (
                        <div className="text-center py-10 text-slate-400 text-xs italic">Dossier vide</div>
                    )}
                </div>
            </div>

            {/* TOGGLE BAR */}
            <div className="flex flex-col items-center py-4 bg-slate-50 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 w-4 shrink-0 hover:bg-slate-200 cursor-pointer" onClick={() => setIsSidebarOpen(!isSidebarOpen)}><div className="w-1 h-8 bg-slate-300 rounded-full my-auto"></div></div>

            {/* ÉDITEUR */}
            <div className="flex-1 flex flex-col bg-white dark:bg-black relative min-w-0">
                {activePageId ? (
                    <>
                        <div className="h-12 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between px-4 sticky top-0 bg-white dark:bg-black z-10">
                            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                                <div className="flex gap-1 pr-2 border-r dark:border-slate-800">
                                    <ToolbarButton cmd="formatBlock" val="H2" icon={Heading}/>
                                    <ToolbarButton cmd="formatBlock" val="H3" icon={Type}/>
                                </div>
                                <div className="flex gap-1 px-2 border-r dark:border-slate-800">
                                    <ToolbarButton cmd="bold" icon={Bold}/>
                                    <ToolbarButton cmd="italic" icon={Italic}/>
                                    <ToolbarButton cmd="underline" icon={Underline}/>
                                </div>
                                <div className="flex gap-1 px-2 border-r dark:border-slate-800">
                                    <ToolbarButton cmd="justifyLeft" icon={AlignLeft}/>
                                    <ToolbarButton cmd="justifyCenter" icon={AlignCenter}/>
                                    <ToolbarButton cmd="insertUnorderedList" icon={List}/>
                                </div>
                                {/* Surligneur */}
                                <div className="relative">
                                    <button onMouseDown={(e)=>{e.preventDefault(); setShowColorPalette(!showColorPalette)}} className="p-1.5 hover:bg-slate-100 rounded text-slate-500"><Highlighter size={16}/></button>
                                    {showColorPalette && (
                                        <div className="absolute top-8 left-0 flex gap-1 bg-white border p-1 rounded shadow-lg z-20">
                                            <button onMouseDown={(e)=>{e.preventDefault();execCmd('hiliteColor','yellow')}} className="w-4 h-4 bg-yellow-300 rounded-full"/>
                                            <button onMouseDown={(e)=>{e.preventDefault();execCmd('hiliteColor','lightgreen')}} className="w-4 h-4 bg-green-300 rounded-full"/>
                                            <button onMouseDown={(e)=>{e.preventDefault();execCmd('hiliteColor','lightblue')}} className="w-4 h-4 bg-blue-300 rounded-full"/>
                                            <button onMouseDown={(e)=>{e.preventDefault();execCmd('hiliteColor','transparent')}} className="w-4 h-4 bg-white border rounded-full text-red-500 flex items-center justify-center"><X size={10}/></button>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-slate-400">
                                <button onClick={handlePrint} title="Imprimer" className="hover:text-slate-800"><Printer size={16}/></button>
                                {isSaving ? <Loader2 size={12} className="animate-spin text-indigo-500"/> : <CheckSquare size={12}/>}
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            <div className="max-w-3xl mx-auto px-8 py-12">
                                <div className="text-xs text-slate-400 mb-4 font-mono flex items-center gap-2"><Calendar size={12}/> {format(new Date(), 'd MMMM yyyy', {locale: fr})}</div>
                                <input ref={titleRef} type="text" defaultValue={pageTitle} onBlur={() => saveCurrentPage(true)} className="w-full text-4xl font-bold bg-transparent outline-none mb-8 text-slate-800 dark:text-white" placeholder="Titre..."/>
                                <div ref={editorRef} contentEditable onInput={() => saveCurrentPage(false)} onBlur={() => saveCurrentPage(true)} className="prose dark:prose-invert max-w-none outline-none min-h-[50vh]" placeholder="Écrivez ici..."></div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-300">
                        <Book size={64} className="mb-6 opacity-20"/>
                        <p>Sélectionnez une page pour écrire</p>
                    </div>
                )}
            </div>
            <style>{` .prose blockquote{border-left:4px solid #ddd;padding-left:1em;color:#666} .no-scrollbar::-webkit-scrollbar{display:none} `}</style>
        </div>
    );
}