import { useState, useEffect, useRef } from 'react';
import { 
    Book, Folder, FileText, ChevronRight, ChevronDown, Plus, 
    Search, Trash2, Edit2, Bold, Italic, List, CheckSquare, 
    Heading, Type, Underline, Strikethrough,
    ArrowLeft, Star, Loader2, Calendar, Printer, FolderPlus, AlignLeft, AlignCenter,
    PanelLeft, Highlighter, Quote, AlignRight, AlignJustify, X, Home, Pilcrow,
    Maximize2, Minimize2, Eye, 
    Type as TypeIcon, RotateCcw, Users // AJOUT DE L'ICÔNE USERS ICI
} from 'lucide-react';
import { supabase } from './supabaseClient';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function JournalManager({ data, updateData, currentUserEmail }) {
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
    
    // Etats Menus
    const [showColorPalette, setShowColorPalette] = useState(false);
    const [showSizeMenu, setShowSizeMenu] = useState(false);
    
    // Contenu Editeur
    const [pageContent, setPageContent] = useState('');
    const [pageTitle, setPageTitle] = useState('');
    
    // Refs
    const editorRef = useRef(null);
    const titleRef = useRef(null);
    const saveTimeoutRef = useRef(null);

    // --- ÉTATS PARTAGE (NOUVEAU) ---
    const [shareModalFolder, setShareModalFolder] = useState(null);
    const [folderShares, setFolderShares] = useState([]);
    const [shareEmailInput, setShareEmailInput] = useState('');
    const [isSharing, setIsSharing] = useState(false);

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

    // --- SYNCHRONISATION TEMPS RÉEL (Depuis App.jsx - NOUVEAU) ---
    useEffect(() => {
        if (data?.journal_folders) {
            setAllFolders(prev => {
                const merged = [...prev];
                data.journal_folders.forEach(df => {
                    const idx = merged.findIndex(pf => String(pf.id) === String(df.id));
                    if (idx === -1) merged.push(df);
                    else merged[idx] = { ...merged[idx], ...df };
                });
                return merged;
            });
        }
        if (data?.journal_pages) {
            setAllPages(prev => {
                const merged = [...prev];
                data.journal_pages.forEach(dp => {
                    const idx = merged.findIndex(pp => String(pp.id) === String(dp.id));
                    if (idx === -1) merged.push(dp);
                    // Sécurité vitale : On n'écrase pas la page si on est en train de taper dedans !
                    else if (String(activePageId) !== String(dp.id)) merged[idx] = { ...merged[idx], ...dp }; 
                });
                return merged;
            });
        }
    }, [data?.journal_folders, data?.journal_pages]); 

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
            if (editorRef.current) {
                editorRef.current.innerHTML = '';
                editorRef.current.removeAttribute('data-init');
            }
            return;
        }

        const page = allPages.find(p => p.id === activePageId);
        if (page) {
            setPageTitle(page.title || 'Sans titre');
            if (titleRef.current) titleRef.current.value = page.title || 'Sans titre';
            
            // Nettoyage de l'ancien système de blocs pour revenir à un format fluide
            let cleanContent = page.content || '';
            cleanContent = cleanContent.replace(/<div class="page-break"[^>]*><\/div>/g, '<br><br>');
            
            setPageContent(cleanContent);
            
            // Forcer la mise à jour de l'éditeur lors du changement de page
            if (editorRef.current) {
                editorRef.current.innerHTML = cleanContent;
                editorRef.current.setAttribute('data-init', activePageId);
            }
        }
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
            alert("Erreur base de données : " + (err.message || err.details));
        }
    };

    // --- SUPPRESSION ---
    const deleteItem = async (id, type) => {
        const confirmMsg = type === 'page' 
            ? "Supprimer ce document ?" 
            : "Supprimer ce dossier et TOUT son contenu (sous-dossiers et pages) ? Cette action est irréversible.";
            
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
            alert("Erreur lors de la suppression en cascade.");
        }
    };

    // --- LOGIQUE PARTAGE (NOUVEAU) ---
    const openShareModal = async (folder, e) => {
        e.stopPropagation();
        setShareModalFolder(folder);
        setIsSharing(true);
        try {
            const { data } = await supabase.from('journal_shares').select('*').eq('folder_id', folder.id);
            setFolderShares(data || []);
        } catch (err) {
            console.error("Erreur chargement partages:", err);
        } finally {
            setIsSharing(false);
        }
    };

    const addShare = async () => {
        if (!shareEmailInput.trim()) return;
        setIsSharing(true);
        try {
            const newShare = { folder_id: shareModalFolder.id, user_email: shareEmailInput.trim().toLowerCase() };
            const { data, error } = await supabase.from('journal_shares').insert([newShare]).select();
            if (error) throw error;
            if (data) setFolderShares([...folderShares, data[0]]);
            setShareEmailInput('');
        } catch (err) {
            console.error("Erreur partage:", err);
            alert("Erreur lors du partage.");
        } finally {
            setIsSharing(false);
        }
    };

    const removeShare = async (shareId) => {
        setIsSharing(true);
        try {
            await supabase.from('journal_shares').delete().eq('id', shareId);
            setFolderShares(folderShares.filter(s => s.id !== shareId));
        } catch (err) {
            console.error("Erreur suppression partage:", err);
        } finally {
            setIsSharing(false);
        }
    };

    // --- FAVORIS ---
    const toggleFavorite = async (page) => {
        const newStatus = !page.is_favorite;
        setAllPages(prev => prev.map(p => p.id === page.id ? { ...p, is_favorite: newStatus } : p));
        await supabase.from('journal_pages').update({ is_favorite: newStatus }).eq('id', page.id);
    };

    // --- ÉDITEUR : COMMANDES ---
    const execCmd = (cmd, val = null) => {
        if (editorRef.current) editorRef.current.focus();
        document.execCommand('styleWithCSS', false, true);
        document.execCommand(cmd, false, val);
        if (cmd === 'hiliteColor') setShowColorPalette(false);
        setShowSizeMenu(false); 
    };

    const changeFontSizeSelection = (size) => {
        if (editorRef.current) editorRef.current.focus();
        document.execCommand('fontSize', false, size); 
        setShowSizeMenu(false);
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

    // --- IMPRESSION PARFAITE A4 ---
    const handlePrint = () => {
        if (!activePageId) return;
        const printWindow = window.open('', '_blank');
        const content = editorRef.current ? editorRef.current.innerHTML : pageContent;
        const title = titleRef.current ? titleRef.current.value : pageTitle;
        const date = format(new Date(), 'd MMMM yyyy', { locale: fr });

        printWindow.document.write(`
            <html>
            <head>
                <title>${title}</title>
                <link href="https://fonts.googleapis.com/css2?family=Merriweather:ital,wght@0,300;0,400;0,700;1,300&display=swap" rel="stylesheet">
                <style>
                    * { color: #000 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    
                    @page {
                        size: A4 portrait;
                        margin: 20mm 15mm; 
                    }
                    
                    body { 
                        font-family: 'Merriweather', serif; 
                        line-height: 1.6; 
                        background: #fff !important; 
                        margin: 0; 
                        padding: 0; 
                        font-size: 11pt;
                    }
                    
                    h1 { font-size: 24pt; font-weight: 700; margin: 0; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 30px; }
                    .meta { color: #555 !important; font-style: italic; margin-bottom: 10px; font-size: 9pt; text-align: right; }
                    .content { text-align: justify; }
                    
                    blockquote { border-left: 4px solid #333 !important; padding: 10px 15px !important; margin: 20px 0 !important; background: #f9f9f9 !important; font-style: italic !important; }
                    ul { list-style-type: disc; padding-left: 20px; }
                    ol { list-style-type: decimal; padding-left: 20px; }
                    li { margin-bottom: 5px; }
                    
                    /* Règle vitale pour que le texte se coupe bien entre les pages */
                    p, li, blockquote { page-break-inside: avoid; }
                    h1, h2, h3, h4 { page-break-after: avoid; margin-top: 20px; }
                </style>
            </head>
            <body>
                <div class="meta">${date}</div>
                <h1>${title}</h1>
                <div class="content">${content}</div>
                <script>window.onload = () => { window.print(); window.close(); }</script>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    // --- LOGIQUE D'AFFICHAGE ---
    const favoritePages = allPages.filter(p => p.is_favorite);
    const rootFolders = allFolders.filter(f => !f.parent_id); 
    const subFoldersInCurrent = allFolders.filter(f => f.parent_id === currentFolderId);
    const pagesInCurrent = allPages.filter(p => p.folder_id === currentFolderId);
    const searchFolders = allFolders.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));
    const searchPages = allPages.filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()));
    const displayedFolders = searchQuery ? searchFolders : subFoldersInCurrent;
    const displayedPages = searchQuery ? searchPages : pagesInCurrent;


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
                            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform"><Plus size={24} className="text-slate-400"/></div>
                            <span className="font-bold text-slate-500">Ajouter</span>
                        </div>

                        {rootFolders.map(nb => (
                            <div key={nb.id} onClick={() => { setActiveNotebookId(nb.id); setCurrentFolderId(nb.id); }} className="group bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-lg hover:border-indigo-500 cursor-pointer transition-all min-h-[180px] flex flex-col justify-between relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-slate-100 to-transparent dark:from-slate-800 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-150"></div>
                                <div>
                                    <div className="flex justify-between items-start mb-4 relative z-10">
                                        <Book size={24} className="text-indigo-600 dark:text-indigo-400"/>
                                        <div className="flex gap-1">
                                            {/* NOUVEAU BOUTON PARTAGER */}
                                            <button onClick={(e) => openShareModal(nb, e)} className="p-1.5 text-slate-300 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors" title="Partager ce carnet"><Users size={16}/></button>
                                            <button onClick={(e) => { e.stopPropagation(); deleteItem(nb.id, 'folder'); }} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16}/></button>
                                        </div>
                                    </div>
                                    <h3 className="font-bold text-xl text-slate-800 dark:text-white line-clamp-2">{nb.name}</h3>
                                </div>
                                <div className="text-xs text-slate-400 font-medium flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4">
                                    <span>{new Date(nb.created_at).toLocaleDateString()}</span>
                                    <span className="flex items-center gap-1 text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0">Ouvrir <ArrowLeft size={12} className="rotate-180"/></span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* NOUVELLE MODALE DE PARTAGE */}
                {shareModalFolder && (
                    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShareModalFolder(null)}>
                        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                                    <Users size={20} className="text-blue-500"/> Partager "{shareModalFolder.name}"
                                </h3>
                                <button onClick={() => setShareModalFolder(null)} className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"><X size={20}/></button>
                            </div>
                            
                            <div className="flex gap-2 mb-6">
                                <input 
                                    type="email" 
                                    placeholder="Email du collaborateur..." 
                                    value={shareEmailInput} 
                                    onChange={(e) => setShareEmailInput(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') addShare(); }}
                                    className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 bg-slate-50 dark:bg-slate-800 dark:text-white text-sm"
                                />
                                <button onClick={addShare} disabled={isSharing || !shareEmailInput.trim()} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center gap-2">
                                    {isSharing ? <Loader2 size={16} className="animate-spin"/> : "Ajouter"}
                                </button>
                            </div>

                            <div className="space-y-2">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Accès actuels</h4>
                                {folderShares.length === 0 ? (
                                    <p className="text-sm text-slate-500 dark:text-slate-400 italic">Ce carnet est privé.</p>
                                ) : (
                                    folderShares.map(share => (
                                        <div key={share.id} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{share.user_email}</span>
                                            <button onClick={() => removeShare(share.id)} disabled={isSharing} className="text-slate-400 hover:text-red-500 p-1 transition-colors" title="Retirer l'accès"><Trash2 size={14}/></button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // --- VUE CONTENU ---
    return (
        <div className="flex h-full w-full bg-slate-50 dark:bg-slate-950 overflow-hidden">
            {/* SIDEBAR */}
            <div className={`${(isSidebarOpen && !isZenMode) ? 'w-80' : 'w-0'} bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 flex flex-col shrink-0 overflow-hidden`}>
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 shrink-0 bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-sm">
                    <div className="relative mb-3">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                        <input type="text" placeholder="Rechercher..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-8 py-2 bg-slate-100 dark:bg-slate-800 border border-transparent focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 rounded-lg text-sm outline-none transition-all" />
                        {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700"><X size={14}/></button>}
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                        <button onClick={navigateUp} className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                            {currentFolderId === activeNotebookId ? <Home size={16}/> : <ArrowLeft size={16}/>}
                        </button>
                        <div className="font-bold text-slate-800 dark:text-white truncate flex-1">{searchQuery ? 'Résultats' : (allFolders.find(f => f.id === currentFolderId)?.name || 'Dossier')}</div>
                    </div>
                    {!searchQuery && (
                        <div className="flex items-center gap-1 text-[10px] text-slate-400 overflow-x-auto whitespace-nowrap mb-4 scrollbar-none">
                            {breadcrumbs.map((f, i) => (
                                <span key={f.id} className="flex items-center shrink-0">
                                    <span onClick={() => navigateToFolder(f.id)} className="hover:text-indigo-500 cursor-pointer">{f.name}</span>
                                    {i < breadcrumbs.length - 1 && <ChevronRight size={10} className="mx-1 opacity-50"/>}
                                </span>
                            ))}
                        </div>
                    )}
                    {!searchQuery && (
                        <div className="flex gap-2">
                            <button onClick={() => createItem('folder')} className="flex-1 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 hover:border-indigo-500 transition-all flex items-center justify-center gap-1"><FolderPlus size={14}/> Dossier</button>
                            <button onClick={() => createItem('page')} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 flex items-center justify-center gap-1 shadow-md shadow-indigo-200 dark:shadow-none"><Plus size={14}/> Page</button>
                        </div>
                    )}
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {favoritePages.length > 0 && !searchQuery && (
                        <div className="mb-4">
                            <div className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-amber-500 flex items-center gap-2">
                                <Star size={10} className="fill-amber-500"/> Favoris
                            </div>
                            {favoritePages.map(page => (
                                <div key={`fav-${page.id}`} onClick={() => { saveCurrentPage(true); setActivePageId(page.id); }} className={`group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-all ${activePageId === page.id ? 'bg-indigo-50 dark:bg-indigo-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <FileText size={14} className="text-amber-500 shrink-0"/>
                                        <span className={`truncate text-xs ${activePageId === page.id ? 'font-bold text-indigo-700 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-400'}`}>{page.title || 'Sans titre'}</span>
                                    </div>
                                </div>
                            ))}
                            <div className="h-px bg-slate-100 dark:bg-slate-800 mx-3 my-2"></div>
                        </div>
                    )}
                    {displayedFolders.map(folder => (
                        <div key={folder.id} onClick={() => navigateToFolder(folder.id)} className="group flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <Folder size={18} className="text-amber-400 fill-amber-100 dark:fill-amber-900/20 shrink-0"/>
                                <span className="truncate text-sm font-medium">{folder.name}</span>
                            </div>
                            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1">
                                <button onClick={(e) => { e.stopPropagation(); deleteItem(folder.id, 'folder'); }} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-400 rounded"><Trash2 size={12}/></button>
                                <ChevronRight size={14} className="text-slate-300"/>
                            </div>
                        </div>
                    ))}
                    {displayedPages.map(page => (
                        <div key={page.id} onClick={() => { if(activePageId !== page.id) { saveCurrentPage(true); setActivePageId(page.id); } }} className={`group flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-all border border-transparent ${activePageId === page.id ? 'bg-white dark:bg-slate-800 border-indigo-200 dark:border-indigo-500/30 shadow-sm' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                            <div className="flex items-center gap-3 overflow-hidden">
                                <FileText size={16} className={`shrink-0 ${activePageId === page.id ? 'text-indigo-500' : 'text-slate-400'}`}/>
                                <span className={`truncate text-sm ${activePageId === page.id ? 'font-bold text-indigo-900 dark:text-indigo-100' : 'text-slate-600 dark:text-slate-300'}`}>{page.title || 'Sans titre'}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                {page.is_favorite && <Star size={12} className="text-amber-500 fill-amber-500"/>}
                                <div className="opacity-0 group-hover:opacity-100">
                                    <button onClick={(e) => { e.stopPropagation(); deleteItem(page.id, 'page'); }} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-400 rounded"><Trash2 size={12}/></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* DIVISEUR */}
            {!isZenMode && (
                <div className="flex flex-col items-center py-4 bg-slate-50 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 w-4 shrink-0 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer transition-colors" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                    <div className="w-1 h-8 bg-slate-300 dark:bg-slate-700 rounded-full my-auto"></div>
                </div>
            )}

            {/* ÉDITEUR PRINCIPAL */}
            <div className={`flex-1 flex flex-col ${isZenMode ? 'bg-slate-100 dark:bg-slate-900' : 'bg-slate-100 dark:bg-slate-900'} relative min-w-0 transition-colors duration-500`}>
                
                {activePageId ? (
                    <>
                        {/* BARRE D'OUTILS */}
                        {!isZenMode ? (
                            <div className="border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-2 p-2 bg-white dark:bg-black z-20 sticky top-0 min-h-[3.5rem] shadow-sm">
                                <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 mr-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg md:hidden"><PanelLeft size={20}/></button>
                                <ToolbarButton cmd="formatBlock" val="<p>" icon={Pilcrow} title="Texte Normal (Reset)" />
                                <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>
                                <ToolbarButton cmd="formatBlock" val="<h2>" icon={Heading} title="Grand Titre" />
                                <ToolbarButton cmd="formatBlock" val="<h3>" icon={Type} title="Sous-titre" />
                                <ToolbarButton cmd="formatBlock" val="<blockquote>" icon={Quote} title="Citation" />
                                <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>
                                <ToolbarButton cmd="bold" icon={Bold} title="Gras" />
                                <ToolbarButton cmd="italic" icon={Italic} title="Italique" />
                                <ToolbarButton cmd="underline" icon={Underline} title="Souligné" />
                                <ToolbarButton cmd="strikeThrough" icon={Strikethrough} title="Barré" />
                                <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>
                                
                                <div className="relative group">
                                    <button 
                                        onMouseDown={(e) => { e.preventDefault(); setShowSizeMenu(!showSizeMenu); setShowColorPalette(false); }}
                                        className={`flex items-center gap-1 p-2 rounded transition-colors ${showSizeMenu ? 'bg-indigo-100 text-indigo-600' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                                        title="Taille de texte"
                                    >
                                        <TypeIcon size={18}/> <ChevronDown size={12}/>
                                    </button>
                                    
                                    {showSizeMenu && (
                                        <div className="absolute top-full left-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-[60] min-w-[120px] overflow-hidden animate-in fade-in zoom-in-95 p-1">
                                            {[
                                                { label: 'Petit', val: '2' },
                                                { label: 'Normal', val: '3' },
                                                { label: 'Grand', val: '5' },
                                                { label: 'Titre', val: '7' },
                                            ].map((size) => (
                                                <button 
                                                    key={size.val}
                                                    onMouseDown={(e) => { 
                                                        e.preventDefault(); 
                                                        changeFontSizeSelection(size.val);
                                                    }}
                                                    className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm text-slate-700 dark:text-slate-200 rounded-lg"
                                                >
                                                    {size.label}
                                                </button>
                                            ))}
                                            <div className="h-px bg-slate-100 dark:bg-slate-700 my-1"></div>
                                            <button 
                                                onMouseDown={(e) => { e.preventDefault(); document.execCommand('removeFormat', false, null); setShowSizeMenu(false); }}
                                                className="w-full text-left px-3 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 text-xs font-bold rounded-lg flex items-center gap-2"
                                            >
                                                <RotateCcw size={12}/> Reset
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="relative">
                                    <button onMouseDown={(e)=>{e.preventDefault(); setShowColorPalette(!showColorPalette)}} className={`p-2 rounded transition-colors ${showColorPalette ? 'bg-indigo-100 text-indigo-600' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`} title="Surligneur"><Highlighter size={18}/></button>
                                    {showColorPalette && (
                                        <div className="absolute top-full left-0 mt-2 flex gap-1 bg-white dark:bg-slate-800 border dark:border-slate-700 p-2 rounded-lg shadow-xl z-[60] min-w-max animate-in fade-in zoom-in-95">
                                            {[
                                                { val: '#fef08a', darkVal: '#ffff00' },
                                                { val: '#bbf7d0', darkVal: '#00ff00' },
                                                { val: '#bfdbfe', darkVal: '#00ffff' },
                                                { val: '#fecaca', darkVal: '#ff00ff' },
                                                { val: 'transparent', darkVal: 'transparent', icon: X }
                                            ].map((color, i) => (
                                                <button key={i} onMouseDown={(e)=>{ e.preventDefault(); const isDark = document.documentElement.classList.contains('dark'); execCmd('hiliteColor', isDark ? color.darkVal : color.val); }} className="w-6 h-6 rounded-full border border-slate-200 dark:border-slate-600 flex items-center justify-center hover:scale-110 transition-transform" style={{backgroundColor: color.val === 'transparent' ? 'white' : color.val}}>
                                                    {color.val === 'transparent' && <X size={12} className="text-red-500"/>}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>
                                <ToolbarButton cmd="insertUnorderedList" icon={List} title="Liste à puces" />
                                <ToolbarButton cmd="insertOrderedList" icon={CheckSquare} title="Liste numérotée" />
                                <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>
                                <ToolbarButton cmd="justifyLeft" icon={AlignLeft} title="Gauche" />
                                <ToolbarButton cmd="justifyCenter" icon={AlignCenter} title="Centrer" />
                                <ToolbarButton cmd="justifyRight" icon={AlignRight} title="Droite" />
                                <div className="flex-1"></div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => setIsZenMode(true)} className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-all" title="Mode Zen (Focus)"><Maximize2 size={18}/></button>
                                    <button onClick={handlePrint} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 transition-colors" title="Imprimer"><Printer size={18}/></button>
                                    <div className="text-xs text-slate-400 font-mono w-16 text-right">{isSaving ? <Loader2 size={12} className="animate-spin inline"/> : 'Prêt'}</div>
                                </div>
                            </div>
                        ) : (
                            <div className="absolute top-6 right-10 z-50 animate-in fade-in slide-in-from-top-4 duration-500">
                                <button 
                                    onClick={() => setIsZenMode(false)}
                                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 rounded-full text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all shadow-lg border border-slate-200 dark:border-slate-700"
                                >
                                    <Minimize2 size={14}/> Quitter le mode Focus
                                </button>
                            </div>
                        )}

                        <div className={`flex-1 overflow-y-auto ${isZenMode ? 'custom-scrollbar-none' : ''}`}>
                            <div className={`mx-auto transition-all duration-700 py-12 ${isZenMode ? 'w-full max-w-7xl px-8' : 'w-full px-4 md:px-12 max-w-4xl'}`}>
                                
                                <div className="bg-white dark:bg-black shadow-2xl border border-slate-200 dark:border-slate-800 rounded-lg min-h-[1122px] px-12 md:px-20 py-16 relative flex flex-col transition-all">
                                    <div className="text-xs text-slate-400 mb-8 font-mono flex items-center gap-2 uppercase tracking-widest flex justify-between">
                                        <span className="flex items-center gap-2"><Calendar size={12}/> {format(new Date(), 'd MMMM yyyy', {locale: fr})}</span>
                                        <button 
                                            onClick={() => toggleFavorite(allPages.find(p => p.id === activePageId))}
                                            className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-all ${allPages.find(p => p.id === activePageId)?.is_favorite ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' : 'text-slate-300 hover:text-slate-500'}`}
                                        >
                                            <Star size={16} className={allPages.find(p => p.id === activePageId)?.is_favorite ? 'fill-amber-500' : ''}/>
                                            <span className="text-[10px] font-bold uppercase">{allPages.find(p => p.id === activePageId)?.is_favorite ? 'Favori' : 'Favoris'}</span>
                                        </button>
                                    </div>
                                    
                                    <input ref={titleRef} type="text" defaultValue={pageTitle} onBlur={() => saveCurrentPage(true)} className={`w-full ${isZenMode ? 'text-5xl' : 'text-4xl'} font-black bg-transparent outline-none mb-10 text-slate-900 dark:text-white placeholder:text-slate-200 dark:placeholder:text-slate-800 leading-tight transition-all`} placeholder="Titre du document..."/>
                                    
                                    <div 
                                        ref={editorRef} 
                                        contentEditable 
                                        suppressContentEditableWarning={true}
                                        onInput={() => saveCurrentPage(false)} 
                                        onBlur={() => saveCurrentPage(true)} 
                                        className={`prose dark:prose-invert max-w-none outline-none ${isZenMode ? 'text-xl' : 'text-lg'} leading-loose text-slate-700 dark:text-slate-300 empty:before:content-[attr(placeholder)] empty:before:text-slate-300 transition-all flex-1`}
                                        placeholder="Commencez à écrire ici..."
                                    ></div>
                                </div>
                                
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 bg-white dark:bg-slate-950">
                        <div className="w-24 h-24 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mb-6"><Book size={48} className="opacity-20"/></div>
                        <p className="text-xl font-medium">Sélectionnez un document</p>
                        <p className="text-sm opacity-60 mt-2">ou créez-en un nouveau pour commencer</p>
                    </div>
                )}
            </div>
            
            <style>{`
                .prose blockquote { border-left: 4px solid #e2e8f0; padding-left: 1em; margin-left: 0; color: #64748b; font-style: italic; background: #f9f9f9; padding: 10px 1em; border-radius: 4px; }
                .dark .prose blockquote { background: #1e293b; border-color: #334155; color: #94a3b8; }
                .prose ul { list-style-type: disc !important; padding-left: 1.5em !important; margin-bottom: 1em; }
                .prose ol { list-style-type: decimal !important; padding-left: 1.5em !important; margin-bottom: 1em; }
                .prose li { margin-bottom: 0.25em; }
                .prose h2 { font-size: 1.8em !important; font-weight: 800 !important; margin-top: 1.5em !important; }
                .prose h3 { font-size: 1.4em !important; font-weight: 700 !important; margin-top: 1.2em !important; }
                .prose span[style*="background-color"] { color: black !important; padding: 0 2px; border-radius: 2px; }
                
                /* Masquage scrollbar en mode Zen */
                .custom-scrollbar-none::-webkit-scrollbar { display: none; }
                .custom-scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
}