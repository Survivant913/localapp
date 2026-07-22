import { useState, useEffect, useRef } from 'react';
import { 
    Book, Folder, FileText, ChevronRight, ChevronDown, Plus, 
    Search, Trash2, Edit2, Bold, Italic, List, CheckSquare, 
    Heading, Type, Underline, Strikethrough,
    ArrowLeft, Star, Loader2, Calendar, Printer, FolderPlus, AlignLeft, AlignCenter,
    PanelLeft, Highlighter, Quote, AlignRight, AlignJustify, X, Home, Pilcrow,
    Maximize2, Minimize2, Eye, 
    Type as TypeIcon, RotateCcw, Users
} from 'lucide-react';
import { supabase } from './supabaseClient';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import TiptapEditor from './TiptapEditor';
import { ErrorBoundary } from './ErrorBoundary';

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
    // Refs
    const saveTimeoutRef = useRef(null);

    // --- ÉTATS PARTAGE ---
    const [shareModalFolder, setShareModalFolder] = useState(null);
    const [folderShares, setFolderShares] = useState([]);
    const [shareEmailInput, setShareEmailInput] = useState('');
    const [isSharing, setIsSharing] = useState(false);

    // --- NOUVEAU : FONCTIONS DE SÉCURITÉ & FAVORIS PERSONNELS ---
    const isPageFavorite = (pageId) => {
        return (data?.journal_favorites || []).some(f => String(f.page_id) === String(pageId));
    };

    const hasAccessToItem = (item) => {
        if (!item) return false;
        let currFolderId = item.folder_id || item.id;
        let currFolder = allFolders.find(f => String(f.id) === String(currFolderId));
        let safety = 0;
        
        while (currFolder && safety < 10) {
            if (currFolder.user_id === data?.profile?.id) return true; // Le proprio a accès à tout
            const isShared = (data?.journal_shares || []).some(s => 
                String(s.folder_id) === String(currFolder.id) && 
                s.user_email?.toLowerCase() === currentUserEmail?.toLowerCase()
            );
            if (isShared) return true; // L'invité a accès via ce dossier
            currFolder = allFolders.find(f => String(f.id) === String(currFolder.parent_id));
            safety++;
        }
        return false;
    };

    // --- NOUVEAU : ÉJECTION AUTOMATIQUE (TUEUR DE FANTÔMES) ---
    useEffect(() => {
        if (activeNotebookId && !hasAccessToItem({ id: activeNotebookId, folder_id: activeNotebookId })) {
            setActiveNotebookId(null);
            setCurrentFolderId(null);
            setActivePageId(null);
        }
        if (activePageId) {
            const page = allPages.find(p => p.id === activePageId);
            if (page && !hasAccessToItem(page)) {
                setActivePageId(null);
            }
        }
    }, [data?.journal_shares, allPages, allFolders, activeNotebookId, activePageId, data?.profile?.id, currentUserEmail]);


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

    // --- SYNCHRONISATION TEMPS RÉEL ---
    
    useEffect(() => {
        const channel = new BroadcastChannel('app-sync');
        channel.onmessage = (e) => {
            if (e.data.type === 'journal_page_deleted') {
                setAllPages(prev => prev.filter(p => String(p.id) !== String(e.data.id)));
                setActivePageId(prev => String(prev) === String(e.data.id) ? null : prev);
            } else if (e.data.type === 'journal_folder_deleted') {
                setAllFolders(prev => prev.filter(f => String(f.id) !== String(e.data.id)));
                setCurrentFolderId(prev => String(prev) === String(e.data.id) ? null : prev);
            }
        };
        return () => channel.close();
    }, []);

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
                    if (idx === -1) {
                        merged.push(dp);
                    } else {
                        merged[idx] = { ...merged[idx], ...dp }; 
                    }
                });
                return merged;
            });
        }
    }, [data?.journal_folders, data?.journal_pages]); 

    // --- SUPPRESSION DE L'ANCIENNE MISE A JOUR INSTANTANEE ---

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

    // --- NOUVELLE SAUVEGARDE TIPTAP ---
    const handleEditorUpdate = (title, content) => {
        if (!activePageId) return;

        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

        saveTimeoutRef.current = setTimeout(async () => {
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
        }, 1000);
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
        const itemToDelete = type === 'page' ? allPages.find(p => p.id === id) : allFolders.find(f => f.id === id);
        if (!itemToDelete) return;

        const isOwner = itemToDelete.user_id === data?.profile?.id;

        let confirmMsg = "";
        if (type === 'page') {
            confirmMsg = "Supprimer ce document ?";
        } else {
            confirmMsg = isOwner 
                ? "Supprimer ce dossier et TOUT son contenu (sous-dossiers et pages) ? Cette action est irréversible."
                : "Quitter ce carnet ? Il disparaîtra de votre liste, mais restera intact chez le propriétaire.";
        }
            
        if (!window.confirm(confirmMsg)) return;

        try {
            if (type === 'page') {
                await supabase.from('journal_pages').delete().eq('id', id);
                setAllPages(allPages.filter(p => p.id !== id));
                if (activePageId === id) setActivePageId(null);
            } else {
                if (isOwner) {
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
                } else {
                    const shareToRemove = (data?.journal_shares || []).find(s => 
                        String(s.folder_id) === String(id) && 
                        s.user_email?.toLowerCase() === currentUserEmail?.toLowerCase()
                    );
                    
                    if (shareToRemove) {
                        await supabase.from('journal_shares').delete().eq('id', shareToRemove.id);
                        setAllFolders(prev => prev.filter(f => f.id !== id));
                        setAllPages(prev => prev.filter(p => p.folder_id !== id));
                    }
                }

                if (activeNotebookId === id || currentFolderId === id) {
                    setActiveNotebookId(null);
                    setCurrentFolderId(null);
                    setActivePageId(null);
                }
            }
        } catch (err) {
            console.error("Erreur suppression:", err);
            alert("Erreur lors de l'opération.");
        }
    };

    // --- LOGIQUE PARTAGE ---
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

    // --- MODIFICATION : FAVORIS PERSONNELS ---
    const toggleFavorite = async (page) => {
        if (!page) return;
        const isFav = isPageFavorite(page.id);
        
        if (isFav) {
            const fav = (data?.journal_favorites || []).find(f => String(f.page_id) === String(page.id));
            if (fav) {
                // Optimiste
                updateData({ ...data, journal_favorites: data.journal_favorites.filter(f => f.id !== fav.id) });
                await supabase.from('journal_favorites').delete().eq('id', fav.id);
            }
        } else {
            const newFav = { page_id: page.id, user_id: data?.profile?.id };
            const { data: inserted } = await supabase.from('journal_favorites').insert([newFav]).select();
            if (inserted && inserted.length > 0) {
                // Optimiste
                updateData({ ...data, journal_favorites: [...(data?.journal_favorites || []), inserted[0]] });
            }
        }
    };

    // --- ÉDITEUR : COMMANDES ---
    const execCmd = (cmd, val = null) => {
        if (editorRef.current) editorRef.current.focus();
        document.execCommand('styleWithCSS', false, true);
        document.execCommand(cmd, false, val);
        if (cmd === 'hiliteColor') setShowColorPalette(false);
        setShowSizeMenu(false); 
        isDirtyRef.current = true;
        saveCurrentPage(false);
    };

    const changeFontSizeSelection = (size) => {
        if (editorRef.current) editorRef.current.focus();
        document.execCommand('fontSize', false, size); 
        setShowSizeMenu(false);
        isDirtyRef.current = true;
        saveCurrentPage(false);
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
        const page = allPages.find(p => p.id === activePageId);
        if (!page) return;

        const printWindow = window.open('', '_blank');
        const content = page.content || '';
        const title = page.title || 'Sans titre';
        const date = format(new Date(), 'd MMMM yyyy', { locale: fr });

        printWindow.document.write(`
            <html>
            <head>
                <title>${title}</title>
                <link href="https://fonts.googleapis.com/css2?family=Merriweather:ital,wght@0,300;0,400;0,700;1,300&display=swap" rel="stylesheet">
                <style>
                    * { color: #000 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    
                    @page { size: A4 portrait; margin: 20mm 15mm; }
                    body { font-family: 'Merriweather', serif; line-height: 1.6; background: #fff !important; margin: 0; padding: 0; font-size: 11pt; }
                    h1 { font-size: 24pt; font-weight: 700; margin: 0; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 30px; }
                    .meta { color: #555 !important; font-style: italic; margin-bottom: 10px; font-size: 9pt; text-align: right; }
                    .content { text-align: justify; }
                    blockquote { border-left: 4px solid #333 !important; padding: 10px 15px !important; margin: 20px 0 !important; background: #f9f9f9 !important; font-style: italic !important; }
                    ul { list-style-type: disc; padding-left: 20px; }
                    ol { list-style-type: decimal; padding-left: 20px; }
                    li { margin-bottom: 5px; }
                    p, li, blockquote { page-break-inside: avoid; }
                    h1, h2, h3, h4 { page-break-after: avoid; margin-top: 20px; }
                </style>
            </head>
            <body>
                <div class="meta">${date}</div>
                <h1>${title}</h1>
                <div class="content">${content}</div>
                <script>
                    setTimeout(() => {
                        window.print();
                        window.close();
                    }, 500);
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    // --- LOGIQUE D'AFFICHAGE SÉCURISÉE ---
    // NOUVEAU: On n'affiche dans les favoris que les pages auxquelles on a REELLEMENT accès
    const favoritePages = allPages.filter(p => isPageFavorite(p.id) && hasAccessToItem(p));
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

                        {rootFolders.map(nb => {
                            const isOwner = nb.user_id === data?.profile?.id;
                            return (
                                <div key={nb.id} onClick={() => { setActiveNotebookId(nb.id); setCurrentFolderId(nb.id); }} className="group bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-lg hover:border-indigo-500 cursor-pointer transition-all min-h-[180px] flex flex-col justify-between relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-slate-100 to-transparent dark:from-slate-800 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-150"></div>
                                    <div>
                                        <div className="flex justify-between items-start mb-4 relative z-10">
                                            <Book size={24} className="text-indigo-600 dark:text-indigo-400"/>
                                            <div className="flex gap-1">
                                                {isOwner && (
                                                    <button onClick={(e) => openShareModal(nb, e)} className="p-1.5 text-slate-300 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors" title="Partager ce carnet"><Users size={16}/></button>
                                                )}
                                                <button onClick={(e) => { e.stopPropagation(); deleteItem(nb.id, 'folder'); }} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title={isOwner ? "Supprimer définitivement" : "Quitter ce carnet"}><Trash2 size={16}/></button>
                                            </div>
                                        </div>
                                        <h3 className="font-bold text-xl text-slate-800 dark:text-white line-clamp-2">{nb.name}</h3>
                                        {!isOwner && <span className="text-[9px] font-black uppercase text-indigo-500 tracking-widest bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded mt-2 inline-block">Partagé avec moi</span>}
                                    </div>
                                    <div className="text-xs text-slate-400 font-medium flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4">
                                        <span>{new Date(nb.created_at).toLocaleDateString()}</span>
                                        <span className="flex items-center gap-1 text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0">Ouvrir <ArrowLeft size={12} className="rotate-180"/></span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* MODALE DE PARTAGE */}
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
                                <div key={`fav-${page.id}`} onClick={() => { setActivePageId(page.id); }} className={`group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-all ${activePageId === page.id ? 'bg-indigo-50 dark:bg-indigo-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
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
                        <div key={page.id} onClick={() => { if(activePageId !== page.id) { setActivePageId(page.id); } }} className={`group flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-all border border-transparent ${activePageId === page.id ? 'bg-white dark:bg-slate-800 border-indigo-200 dark:border-indigo-500/30 shadow-sm' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                            <div className="flex items-center gap-3 overflow-hidden">
                                <FileText size={16} className={`shrink-0 ${activePageId === page.id ? 'text-indigo-500' : 'text-slate-400'}`}/>
                                <span className={`truncate text-sm ${activePageId === page.id ? 'font-bold text-indigo-900 dark:text-indigo-100' : 'text-slate-600 dark:text-slate-300'}`}>{page.title || 'Sans titre'}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                {isPageFavorite(page.id) && <Star size={12} className="text-amber-500 fill-amber-500"/>}
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
                    <ErrorBoundary>
                        <TiptapEditor 
                            key={activePageId}
                            pageId={activePageId}
                            initialTitle={allPages.find(p => p.id === activePageId)?.title}
                            initialContent={allPages.find(p => p.id === activePageId)?.content}
                            onUpdate={handleEditorUpdate}
                            currentUserEmail={currentUserEmail}
                            isZenMode={isZenMode}
                            onToggleZenMode={() => setIsZenMode(!isZenMode)}
                            onPrint={handlePrint}
                            header={
                                <div className="text-xs text-slate-400 mb-8 font-mono flex items-center gap-2 uppercase tracking-widest flex justify-between">
                                    <span className="flex items-center gap-2">
                                        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-1 mr-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded md:hidden"><PanelLeft size={16}/></button>
                                        <Calendar size={12}/> {format(new Date(), 'd MMMM yyyy', {locale: fr})}
                                    </span>
                                    <button 
                                        onClick={() => {
                                            const page = allPages.find(p => p.id === activePageId);
                                            if (page) toggleFavorite(page);
                                        }}
                                        className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-all ${isPageFavorite(activePageId) ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' : 'text-slate-300 hover:text-slate-500'}`}
                                    >
                                        <Star size={16} className={isPageFavorite(activePageId) ? 'fill-amber-500' : ''}/>
                                        <span className="text-[10px] font-bold uppercase">{isPageFavorite(activePageId) ? 'Favori' : 'Favoris'}</span>
                                    </button>
                                </div>
                            }
                        />
                    </ErrorBoundary>
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