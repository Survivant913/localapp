import { useState, useEffect, useRef } from 'react';
import { 
  Book, Folder, FileText, ChevronRight, ChevronDown, Plus, 
  Search, Trash2, Bold, Italic, List, CheckSquare, 
  Underline, Strikethrough,
  ArrowLeft, Star, Loader2, Calendar, Printer, FolderPlus, AlignLeft, AlignCenter,
  PanelLeft, Highlighter, Quote, AlignRight, AlignJustify, X, Home
} from 'lucide-react';
import { supabase } from './supabaseClient';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

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
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [showColorPalette, setShowColorPalette] = useState(false);
    
    // Editor State
    const [pageContent, setPageContent] = useState('');
    const [pageTitle, setPageTitle] = useState('');
    const [currentBlockType, setCurrentBlockType] = useState('P'); // Pour le sélecteur
    
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
                supabase.from('journal_pages').select('id, folder_id, title, created_at, updated_at, is_favorite, content').order('updated_at', { ascending: false })
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
    };

    const navigateUp = () => {
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
        if (!window.confirm("Supprimer ? Cette action est irréversible.")) return;
        try {
            if (type === 'page') {
                await supabase.from('journal_pages').delete().eq('id', id);
                setAllPages(allPages.filter(p => p.id !== id));
                if (activePageId === id) setActivePageId(null);
            } else {
                await supabase.from('journal_pages').delete().eq('folder_id', id);
                await supabase.from('journal_folders').delete().eq('id', id);
                setAllFolders(allFolders.filter(f => f.id !== id));
                setAllPages(allPages.filter(p => p.folder_id !== id));
                if (activeNotebookId === id) { setActiveNotebookId(null); setCurrentFolderId(null); }
            }
        } catch (err) {
            alert("Erreur suppression");
        }
    };

    // --- ÉDITEUR : COMMANDES ---
    const execCmd = (cmd, val = null) => {
        document.execCommand(cmd, false, val);
        if (editorRef.current) editorRef.current.focus();
        if (cmd === 'hiliteColor') setShowColorPalette(false);
        
        // Mise à jour visuelle du type de bloc
        if (cmd === 'formatBlock') setCurrentBlockType(val);
    };

    const ToolbarButton = ({ icon: Icon, cmd, val }) => (
        <button 
            onMouseDown={(e) => { e.preventDefault(); execCmd(cmd, val); }}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-700 rounded transition-colors"
        >
            <Icon size={18}/>
        </button>
    );

    // --- IMPRESSION (CSS PRINT FIX) ---
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
                    body { font-family: 'Merriweather', serif; line-height: 1.8; color: #1a1a1a; max-width: 800px; margin: 0 auto; padding: 40px; }
                    /* FIX COULEURS IMPRESSION */
                    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    h1 { font-size: 2.5em; font-weight: 700; margin: 0; color: #000; border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 40px; }
                    .meta { color: #666; font-style: italic; margin-bottom: 10px; font-size: 0.9em; }
                    .content { font-size: 1.1em; text-align: justify; }
                    blockquote { border-left: 4px solid #ddd; padding-left: 15px; font-style: italic; color: #555; }
                </style>
            </head>
            <body>
                <div class="meta">${date}</div>
                <h1>${title}</h1>
                <div class="content">${content}</div>
                <script>window.onload = () => window.print();</script>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    const rootFolders = allFolders.filter(f => !f.parent_id); 
    const currentSubFolders = allFolders.filter(f => f.parent_id === currentFolderId);
    const currentPages = allPages.filter(p => p.folder_id === currentFolderId);

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
                                        <button onClick={(e) => { e.stopPropagation(); deleteItem(nb.id, 'folder'); }} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16}/></button>
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
            </div>
        );
    }

    // --- VUE CONTENU ---
    return (
        <div className="flex h-full w-full bg-slate-50 dark:bg-slate-950 overflow-hidden">
            <div className={`${isSidebarOpen ? 'w-80' : 'w-0'} bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 flex flex-col shrink-0`}>
                
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 shrink-0 bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-sm">
                    <div className="flex items-center gap-2 mb-3">
                        <button onClick={navigateUp} className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 transition-all">
                            {currentFolderId === activeNotebookId ? <Home size={16}/> : <ArrowLeft size={16}/>}
                        </button>
                        <div className="font-bold text-slate-800 dark:text-white truncate flex-1">{allFolders.find(f => f.id === currentFolderId)?.name || 'Dossier'}</div>
                    </div>
                    
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 overflow-x-auto whitespace-nowrap mb-4 scrollbar-none">
                        {breadcrumbs.map((f, i) => (
                            <span key={f.id} className="flex items-center shrink-0">
                                <span onClick={() => navigateToFolder(f.id)} className="hover:text-indigo-500 cursor-pointer transition-colors">{f.name}</span>
                                {i < breadcrumbs.length - 1 && <ChevronRight size={10} className="mx-1 opacity-50"/>}
                            </span>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => createItem('folder')} className="flex-1 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 hover:border-indigo-500 transition-all flex items-center justify-center gap-1 shadow-sm"><FolderPlus size={14}/> Dossier</button>
                        <button onClick={() => createItem('page')} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 flex items-center justify-center gap-1 shadow-md shadow-indigo-200 dark:shadow-none"><Plus size={14}/> Page</button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {currentSubFolders.map(folder => (
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
                    {currentPages.map(page => (
                        <div key={page.id} onClick={() => { if(activePageId !== page.id) { saveCurrentPage(true); setActivePageId(page.id); } }} className={`group flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-all border border-transparent ${activePageId === page.id ? 'bg-white dark:bg-slate-800 border-indigo-200 dark:border-indigo-500/30 shadow-sm' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                            <div className="flex items-center gap-3 overflow-hidden">
                                <FileText size={16} className={`shrink-0 ${activePageId === page.id ? 'text-indigo-500' : 'text-slate-400'}`}/>
                                <span className={`truncate text-sm ${activePageId === page.id ? 'font-bold text-indigo-900 dark:text-indigo-100' : 'text-slate-600 dark:text-slate-300'}`}>{page.title || 'Sans titre'}</span>
                            </div>
                            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1">
                                <button onClick={(e) => { e.stopPropagation(); deleteItem(page.id, 'page'); }} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-400 rounded"><Trash2 size={12}/></button>
                            </div>
                        </div>
                    ))}
                    {currentSubFolders.length === 0 && currentPages.length === 0 && <div className="flex flex-col items-center justify-center py-10 text-slate-400"><FolderPlus size={32} className="opacity-20 mb-2"/><span className="text-xs">Dossier vide</span></div>}
                </div>
            </div>
            <div className="flex flex-col items-center py-4 bg-slate-50 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 w-4 shrink-0 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer transition-colors" onClick={() => setIsSidebarOpen(!isSidebarOpen)}><div className="w-1 h-8 bg-slate-300 dark:bg-slate-700 rounded-full my-auto"></div></div>
            <div className="flex-1 flex flex-col bg-white dark:bg-black relative min-w-0">
                {activePageId ? (
                    <>
                        <div className="border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2 p-2 bg-white dark:bg-black z-20 sticky top-0 min-h-[3.5rem]">
                            
                            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 mr-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg md:hidden"><PanelLeft size={20}/></button>

                            {/* SELECTEUR DE TITRE CLAIR */}
                            <select 
                                onChange={(e) => execCmd('formatBlock', e.target.value)} 
                                value={currentBlockType}
                                className="bg-slate-100 dark:bg-slate-800 border-none rounded-lg px-3 py-1.5 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                            >
                                <option value="P">¶ Normal</option>
                                <option value="H2">Grand Titre</option>
                                <option value="H3">Sous-titre</option>
                                <option value="BLOCKQUOTE">Citation</option>
                            </select>

                            <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>

                            <ToolbarButton cmd="bold" icon={Bold} />
                            <ToolbarButton cmd="italic" icon={Italic} />
                            <ToolbarButton cmd="underline" icon={Underline} />
                            <ToolbarButton cmd="strikeThrough" icon={Strikethrough} />

                            <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>

                            {/* SURLIGNEUR VISIBLE (POPUP ABSOLUTE) */}
                            <div className="relative">
                                <button onMouseDown={(e)=>{e.preventDefault(); setShowColorPalette(!showColorPalette)}} className={`p-2 rounded transition-colors ${showColorPalette ? 'bg-indigo-100 text-indigo-600' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}><Highlighter size={18}/></button>
                                {showColorPalette && (
                                    <div className="absolute top-full left-0 mt-2 flex gap-1 bg-white dark:bg-slate-800 border dark:border-slate-700 p-2 rounded-lg shadow-xl z-[60] min-w-max animate-in fade-in zoom-in-95">
                                        {['#fef08a', '#bbf7d0', '#bfdbfe', '#fecaca', 'transparent'].map((color, i) => (
                                            <button key={i} onMouseDown={(e)=>{e.preventDefault();execCmd('hiliteColor', color)}} className="w-6 h-6 rounded-full border border-slate-200 dark:border-slate-600 flex items-center justify-center hover:scale-110 transition-transform" style={{backgroundColor: color === 'transparent' ? 'white' : color}}>
                                                {color === 'transparent' && <X size={12} className="text-red-500"/>}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>

                            <ToolbarButton cmd="insertUnorderedList" icon={List} />
                            <ToolbarButton cmd="insertOrderedList" icon={CheckSquare} />
                            
                            <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>

                            <ToolbarButton cmd="justifyLeft" icon={AlignLeft}/>
                            <ToolbarButton cmd="justifyCenter" icon={AlignCenter}/>
                            <ToolbarButton cmd="justifyRight" icon={AlignRight}/>
                            <ToolbarButton cmd="justifyFull" icon={AlignJustify}/>

                            <div className="flex-1"></div>
                            
                            <div className="flex items-center gap-3">
                                <button onClick={handlePrint} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition-colors" title="Imprimer"><Printer size={18}/></button>
                                <div className="text-xs text-slate-400 font-mono w-20 text-right">{isSaving ? <span className="text-indigo-500 flex items-center justify-end gap-1"><Loader2 size={12} className="animate-spin"/> Save</span> : <span className="text-green-600 flex items-center justify-end gap-1">Prêt</span>}</div>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            <div className="max-w-3xl mx-auto px-10 py-16 min-h-full">
                                <div className="text-xs text-slate-400 mb-6 font-mono flex items-center gap-2 uppercase tracking-widest"><Calendar size={12}/> {format(new Date(), 'd MMMM yyyy', {locale: fr})}</div>
                                <input ref={titleRef} type="text" defaultValue={pageTitle} onBlur={() => saveCurrentPage(true)} className="w-full text-5xl font-black bg-transparent outline-none mb-10 text-slate-900 dark:text-white placeholder:text-slate-200 dark:placeholder:text-slate-800 leading-tight" placeholder="Titre..."/>
                                <div ref={editorRef} contentEditable onInput={() => saveCurrentPage(false)} onBlur={() => saveCurrentPage(true)} className="prose dark:prose-invert max-w-none outline-none min-h-[50vh] text-lg leading-loose text-slate-600 dark:text-slate-300 empty:before:content-[attr(placeholder)] empty:before:text-slate-300" placeholder="Écrivez vos pensées ici..."></div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-300 dark:text-slate-700"><div className="w-24 h-24 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mb-6"><Book size={48} className="opacity-20"/></div><p className="text-xl font-medium">Sélectionnez une page</p><p className="text-sm opacity-60 mt-2">ou créez-en une nouvelle pour commencer</p></div>
                )}
            </div>
            <style>{` .prose blockquote { border-left: 4px solid #e2e8f0; padding-left: 1em; margin-left: 0; color: #64748b; font-style: italic; } .prose ul { list-style-type: disc; padding-left: 1.5em; } .no-scrollbar::-webkit-scrollbar { display: none; } .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; } `}</style>
        </div>
    );
}