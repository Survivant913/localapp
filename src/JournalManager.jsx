import { useState, useEffect, useRef } from 'react';
import { 
  Book, Folder, FileText, ChevronRight, ChevronDown, Plus, 
  Search, Trash2, Edit2, Bold, Italic, List, CheckSquare, 
  Heading, Type, Underline, Strikethrough,
  ArrowLeft, Star, Loader2, Calendar, Printer, FolderPlus, AlignLeft, AlignCenter,
  PanelLeft, Highlighter, Quote, AlignRight, AlignJustify, X
} from 'lucide-react';
import { supabase } from './supabaseClient';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function JournalManager({ data, updateData }) {
    // --- ÉTATS ---
    const [notebooks, setNotebooks] = useState([]);
    const [pages, setPages] = useState([]);
    const [activeNotebookId, setActiveNotebookId] = useState(null);
    const [activePageId, setActivePageId] = useState(null);
    
    // UI
    const [searchQuery, setSearchQuery] = useState('');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    // Contenu (Local State pour performance)
    const [pageContent, setPageContent] = useState('');
    const [pageTitle, setPageTitle] = useState('');
    const [showColorPalette, setShowColorPalette] = useState(false);
    
    // Refs
    const editorRef = useRef(null);
    const titleRef = useRef(null);
    const saveTimeoutRef = useRef(null);

    // --- CHARGEMENT INITIAL ---
    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            // CORRECTION CRITIQUE : Utilisation du vrai nom de table 'journal_folders'
            const [nbRes, pgRes] = await Promise.all([
                supabase.from('journal_folders').select('*').is('parent_id', null).order('created_at'),
                supabase.from('journal_pages').select('id, folder_id, title, created_at, updated_at, is_favorite').order('updated_at', { ascending: false })
            ]);
            
            if (nbRes.data) setNotebooks(nbRes.data);
            if (pgRes.data) setPages(pgRes.data);
            
        } catch (error) {
            console.error("Erreur chargement journal:", error);
        } finally {
            setIsLoading(false);
        }
    };

    // --- CHARGEMENT CONTENU PAGE ---
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
            const { data } = await supabase.from('journal_pages').select('content, title').eq('id', activePageId).single();
            if (data) {
                setPageContent(data.content || '');
                setPageTitle(data.title || 'Sans titre');
                
                // Mise à jour des refs directement
                if (titleRef.current) titleRef.current.value = data.title || 'Sans titre';
                if (editorRef.current) editorRef.current.innerHTML = data.content || '';
            }
            setIsSaving(false);
        };
        loadPageContent();
    }, [activePageId]);

    // --- SAUVEGARDE INTELLIGENTE ---
    const saveCurrentPage = async (force = false) => {
        if (!activePageId) return;

        const contentToSave = editorRef.current ? editorRef.current.innerHTML : pageContent;
        const titleToSave = titleRef.current ? titleRef.current.value : pageTitle;
        
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

        const performSave = async () => {
            setIsSaving(true);
            try {
                await supabase.from('journal_pages').update({
                    title: titleToSave,
                    content: contentToSave,
                    updated_at: new Date().toISOString()
                }).eq('id', activePageId);
                
                setPages(prev => prev.map(p => p.id === activePageId ? { ...p, title: titleToSave, updated_at: new Date().toISOString() } : p));
            } catch (err) {
                console.error("Erreur sauvegarde:", err);
            } finally {
                setIsSaving(false);
            }
        };

        if (force) {
            await performSave();
        } else {
            setIsSaving(true); 
            saveTimeoutRef.current = setTimeout(performSave, 1500);
        }
    };

    // --- IMPRESSION MODE "ROMAN" ---
    const handlePrint = () => {
        if (!activePageId) return;

        const printWindow = window.open('', '_blank');
        const currentDate = format(new Date(), 'd MMMM yyyy', { locale: fr });
        const contentToPrint = editorRef.current ? editorRef.current.innerHTML : pageContent;
        const titlePrint = titleRef.current ? titleRef.current.value : pageTitle;

        const htmlContent = `
            <html>
            <head>
                <title>${titlePrint}</title>
                <link href="https://fonts.googleapis.com/css2?family=Merriweather:ital,wght@0,300;0,400;0,700;1,300&display=swap" rel="stylesheet">
                <style>
                    body { font-family: 'Merriweather', serif; line-height: 1.8; color: #1a1a1a; max-width: 800px; margin: 0 auto; padding: 40px; }
                    .header { text-align: center; margin-bottom: 60px; border-bottom: 1px solid #e5e5e5; padding-bottom: 20px; }
                    .date { font-style: italic; color: #666; font-size: 0.9em; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px; }
                    h1 { font-size: 2.5em; font-weight: 700; margin: 0; color: #000; }
                    .content { font-size: 1.1em; text-align: justify; }
                    .content img { max-width: 100%; height: auto; display: block; margin: 20px auto; }
                    .content blockquote { border-left: 3px solid #ccc; padding-left: 15px; font-style: italic; margin: 20px 0; color: #555; }
                    .content ul, .content ol { padding-left: 20px; margin-bottom: 15px; }
                    @media print { body { padding: 0; margin: 2cm; max-width: 100%; } @page { margin: 2cm; } }
                </style>
            </head>
            <body>
                <div class="header"><div class="date">${currentDate}</div><h1>${titlePrint}</h1></div>
                <div class="content">${contentToPrint}</div>
                <script>window.onload = function() { window.print(); }</script>
            </body>
            </html>
        `;

        printWindow.document.write(htmlContent);
        printWindow.document.close();
    };

    // --- ACTIONS DOSSIERS (CORRIGÉ: journal_folders) ---
    const createNotebook = async () => {
        const name = prompt("Nom du nouveau dossier :");
        if (!name) return;
        
        try {
            // CORRECTION: Table journal_folders, pas de 'color' (n'existe pas en DB)
            const { data, error } = await supabase
                .from('journal_folders')
                .insert([{ name, parent_id: null }])
                .select();
                
            if (error) throw error;

            if (data) {
                setNotebooks([...notebooks, data[0]]);
            }
        } catch (err) {
            console.error("Erreur création dossier:", err);
            alert("Erreur lors de la création : " + err.message);
        }
    };

    const deleteNotebook = async (id, e) => {
        e.stopPropagation();
        if (!window.confirm("⚠️ ATTENTION : Supprimer ce dossier effacera TOUTES les pages à l'intérieur. Continuer ?")) return;
        
        // Suppression propre via journal_folders et folder_id
        await supabase.from('journal_pages').delete().eq('folder_id', id);
        await supabase.from('journal_folders').delete().eq('id', id);
        
        setNotebooks(notebooks.filter(n => n.id !== id));
        setPages(pages.filter(p => p.folder_id !== id));
        if (activeNotebookId === id) setActiveNotebookId(null);
    };

    // --- ACTIONS PAGES (CORRIGÉ: folder_id) ---
    const createPage = async () => {
        if (!activeNotebookId) {
            alert("Sélectionnez un dossier d'abord.");
            return;
        }
        if (activePageId) await saveCurrentPage(true);

        try {
            const { data, error } = await supabase.from('journal_pages').insert([{ 
                folder_id: activeNotebookId, 
                title: 'Nouvelle page', 
                content: '' 
            }]).select();

            if (error) throw error;

            if (data) {
                setPages([data[0], ...pages]);
                setActivePageId(data[0].id);
            }
        } catch (err) {
            console.error("Erreur création page:", err);
        }
    };

    const deletePage = async (id, e) => {
        e.stopPropagation();
        if (!window.confirm("Supprimer cette page ?")) return;
        await supabase.from('journal_pages').delete().eq('id', id);
        setPages(pages.filter(p => p.id !== id));
        if (activePageId === id) setActivePageId(null);
    };

    const toggleFavorite = async (id, currentStatus, e) => {
        e.stopPropagation();
        await supabase.from('journal_pages').update({ is_favorite: !currentStatus }).eq('id', id);
        setPages(pages.map(p => p.id === id ? { ...p, is_favorite: !currentStatus } : p));
    };

    // --- ÉDITEUR FORMATAGE ---
    const execCmd = (cmd, value = null) => {
        document.execCommand(cmd, false, value);
        if (editorRef.current) editorRef.current.focus();
        if (cmd === 'hiliteColor') setShowColorPalette(false);
    };

    const applyHighlight = (e, color) => {
        e.preventDefault();
        execCmd('hiliteColor', color);
    };

    const ToolbarButton = ({ icon: Icon, cmd, val, title }) => (
        <button 
            onMouseDown={(e) => { e.preventDefault(); execCmd(cmd, val); }} 
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-700 rounded transition-colors"
            title={title}
        >
            <Icon size={16} />
        </button>
    );

    // --- VUE DASHBOARD (GRID) ---
    if (!activeNotebookId) {
        return (
            <div className="h-full w-full bg-slate-50 dark:bg-slate-950 p-8 overflow-y-auto">
                <div className="max-w-5xl mx-auto">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">Mes Journaux</h2>
                            <p className="text-slate-500 dark:text-slate-400">Gérez vos notes et vos pensées.</p>
                        </div>
                        <button onClick={createNotebook} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors shadow-sm">
                            <FolderPlus size={18} /> Nouveau Dossier
                        </button>
                    </div>

                    {isLoading ? (
                        <div className="text-center py-20 text-slate-400"><Loader2 size={32} className="animate-spin mx-auto mb-4"/>Chargement...</div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            <div onClick={createNotebook} className="group flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-all min-h-[160px]">
                                <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-3 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/30"><Plus size={24} className="text-slate-400 group-hover:text-indigo-600" /></div>
                                <span className="font-bold text-slate-500 group-hover:text-indigo-600">Créer un journal</span>
                            </div>
                            {notebooks.map(nb => (
                                <div key={nb.id} onClick={() => setActiveNotebookId(nb.id)} className="group relative bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-indigo-500 dark:hover:border-indigo-500 cursor-pointer transition-all flex flex-col justify-between min-h-[160px]">
                                    <div>
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                                <Book size={20} />
                                            </div>
                                            <button onClick={(e) => deleteNotebook(nb.id, e)} className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"><Trash2 size={16} /></button>
                                        </div>
                                        <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-1 truncate">{nb.name}</h3>
                                        <p className="text-xs text-slate-500">{pages.filter(p => p.folder_id === nb.id).length} page(s)</p>
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
                                        <span>{new Date(nb.created_at).toLocaleDateString()}</span>
                                        <span className="group-hover:translate-x-1 transition-transform text-indigo-500 flex items-center gap-1 font-bold">Ouvrir <ChevronRight size={12}/></span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // --- VUE SPLIT (DOSSIER OUVERT) ---
    return (
        <div className="flex h-full w-full bg-slate-50 dark:bg-slate-950 overflow-hidden">
            <div className={`${isSidebarOpen ? 'w-80' : 'w-0'} bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 flex flex-col shrink-0 overflow-hidden`}>
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
                    <div className="flex items-center gap-2 mb-4">
                        <button onClick={() => { setActiveNotebookId(null); setActivePageId(null); }} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500" title="Retour aux dossiers"><ArrowLeft size={18}/></button>
                        <h2 className="font-bold text-slate-800 dark:text-white truncate">{notebooks.find(n => n.id === activeNotebookId)?.name || 'Dossier'}</h2>
                    </div>
                    <button onClick={createPage} className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm flex items-center justify-center gap-2 text-sm font-bold"><Plus size={16}/> Nouvelle Page</button>
                </div>
                <div className="p-3"><div className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input type="text" placeholder="Chercher une page..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/50 text-slate-700 dark:text-slate-200"/></div></div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {pages.filter(p => p.folder_id === activeNotebookId)
                          .filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()))
                          .map(page => (
                        <div key={page.id} onClick={() => { if(activePageId !== page.id) { saveCurrentPage(true); setActivePageId(page.id); } }} className={`group flex items-center justify-between px-3 py-3 rounded-lg cursor-pointer text-sm border border-transparent transition-all ${activePageId === page.id ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400 font-medium' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                            <span className="truncate flex-1">{page.title || 'Sans titre'}</span>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                                <button onClick={(e) => toggleFavorite(page.id, page.is_favorite, e)} className={`p-1 hover:text-amber-500 ${page.is_favorite ? 'text-amber-500 opacity-100' : 'text-slate-300'}`}><Star size={12} className={page.is_favorite ? 'fill-amber-500' : ''}/></button>
                                <button onClick={(e) => deletePage(page.id, e)} className="p-1 hover:text-red-500 text-slate-300"><Trash2 size={12}/></button>
                            </div>
                        </div>
                    ))}
                    {pages.filter(p => p.folder_id === activeNotebookId).length === 0 && <div className="text-center py-8 text-slate-400 text-xs italic">Aucune page. Créez-en une !</div>}
                </div>
            </div>
            
            <div className="h-full flex flex-col items-center py-4 bg-slate-50 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 w-4 shrink-0 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer transition-colors" onClick={() => setIsSidebarOpen(!isSidebarOpen)}><div className="w-1 h-8 bg-slate-300 dark:bg-slate-700 rounded-full my-auto"></div></div>
            
            <div className="flex-1 flex flex-col bg-white dark:bg-black relative min-w-0">
                {activePageId ? (
                    <>
                        <div className="h-14 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between px-4 bg-white dark:bg-black z-10 sticky top-0">
                            {/* BARRE D'OUTILS COMPLÈTE */}
                            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                                <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 mr-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg md:hidden"><PanelLeft size={20}/></button>
                                
                                <div className="flex items-center gap-1 pr-2 border-r border-slate-100 dark:border-slate-800">
                                    <ToolbarButton cmd="formatBlock" val="H2" icon={Heading} title="Grand Titre" />
                                    <ToolbarButton cmd="formatBlock" val="H3" icon={Type} title="Sous-titre" />
                                </div>
                                <div className="flex items-center gap-1 px-2 border-r border-slate-100 dark:border-slate-800">
                                    <ToolbarButton cmd="bold" icon={Bold} title="Gras" />
                                    <ToolbarButton cmd="italic" icon={Italic} title="Italique" />
                                    <ToolbarButton cmd="underline" icon={Underline} title="Souligné" />
                                    <ToolbarButton cmd="strikeThrough" icon={Strikethrough} title="Barré" />
                                </div>
                                
                                {/* SURLIGNEUR */}
                                <div className="flex items-center gap-1 mx-1 px-1 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                                    <button onMouseDown={(e) => { e.preventDefault(); setShowColorPalette(!showColorPalette); }} className={`p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-600 ${showColorPalette ? 'text-indigo-500' : 'text-slate-500'}`}><Highlighter size={16}/></button>
                                    {showColorPalette && (
                                        <div className="flex items-center gap-1 animate-in slide-in-from-left-2">
                                            <button onMouseDown={(e) => applyHighlight(e, 'rgba(253, 224, 71, 0.5)')} className="w-4 h-4 rounded-full bg-yellow-300 ring-1 ring-black/10"></button>
                                            <button onMouseDown={(e) => applyHighlight(e, 'rgba(134, 239, 172, 0.5)')} className="w-4 h-4 rounded-full bg-green-300 ring-1 ring-black/10"></button>
                                            <button onMouseDown={(e) => applyHighlight(e, 'rgba(147, 197, 253, 0.5)')} className="w-4 h-4 rounded-full bg-blue-300 ring-1 ring-black/10"></button>
                                            <button onMouseDown={(e) => applyHighlight(e, 'transparent')} className="w-4 h-4 rounded-full bg-white border border-red-200 flex items-center justify-center text-red-500"><X size={10}/></button>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-1 px-2 border-r border-slate-100 dark:border-slate-800">
                                    <ToolbarButton cmd="insertUnorderedList" icon={List} title="Liste à puces" />
                                    <ToolbarButton cmd="insertOrderedList" icon={CheckSquare} title="Liste numérotée" />
                                    <ToolbarButton cmd="formatBlock" val="BLOCKQUOTE" icon={Quote} title="Citation" />
                                </div>
                                <div className="flex items-center gap-1 pl-2">
                                    <ToolbarButton cmd="justifyLeft" icon={AlignLeft} title="Gauche" />
                                    <ToolbarButton cmd="justifyCenter" icon={AlignCenter} title="Centrer" />
                                    <ToolbarButton cmd="justifyRight" icon={AlignRight} title="Droite" />
                                    <ToolbarButton cmd="justifyFull" icon={AlignJustify} title="Justifier" />
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-3 text-xs text-slate-400 font-mono pl-4 border-l border-slate-100 dark:border-slate-800">
                                <button onClick={handlePrint} className="flex items-center gap-1 hover:text-slate-800 dark:hover:text-white transition-colors" title="Imprimer / PDF"><Printer size={16} /></button>
                                {isSaving ? <span className="flex items-center gap-1 text-indigo-500"><Loader2 size={12} className="animate-spin"/> Sauvegarde...</span> : <span><CheckSquare size={12} className="inline mr-1"/>Enregistré</span>}
                            </div>
                        </div>

                        {/* Contenu Page */}
                        <div className="flex-1 overflow-y-auto">
                            <div className="max-w-3xl mx-auto px-8 py-12 min-h-full">
                                <div className="text-xs text-slate-400 mb-4 font-mono flex items-center gap-2"><Calendar size={12}/> {format(new Date(), 'd MMMM yyyy', { locale: fr })}</div>
                                <input 
                                    ref={titleRef}
                                    type="text" 
                                    defaultValue={pageTitle}
                                    onBlur={saveCurrentPage} // Sauvegarde uniquement quand on quitte le titre
                                    placeholder="Titre de la page..." 
                                    className="w-full text-4xl font-bold text-slate-800 dark:text-slate-100 bg-transparent outline-none placeholder-slate-300 dark:placeholder-slate-700 mb-8"
                                />
                                <div 
                                    ref={editorRef}
                                    contentEditable
                                    onInput={() => saveCurrentPage(false)}
                                    onBlur={() => saveCurrentPage(true)}
                                    className="prose dark:prose-invert max-w-none outline-none min-h-[50vh] text-slate-700 dark:text-slate-300 leading-relaxed text-lg pb-32 empty:before:content-[attr(placeholder)] empty:before:text-slate-300"
                                    placeholder="Commencez à écrire..."
                                ></div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-300 dark:text-slate-700">
                        <Book size={64} className="mb-6 opacity-20"/>
                        <p className="text-lg font-medium">Sélectionnez une page</p>
                        <button onClick={createPage} className="mt-4 px-6 py-2 bg-slate-100 dark:bg-slate-800 rounded-full text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">+ Nouvelle Page</button>
                    </div>
                )}
            </div>
            
            <style>{`
                .prose h2 { font-size: 1.5em; font-weight: 800; margin-top: 1.5em; margin-bottom: 0.5em; color: inherit; }
                .prose h3 { font-size: 1.25em; font-weight: 700; margin-top: 1.2em; margin-bottom: 0.5em; color: inherit; }
                .prose ul { list-style-type: disc; padding-left: 1.5em; margin-bottom: 1em; }
                .prose ol { list-style-type: decimal; padding-left: 1.5em; margin-bottom: 1em; }
                .prose blockquote { border-left: 4px solid #e2e8f0; padding-left: 1em; font-style: italic; color: #64748b; }
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
}