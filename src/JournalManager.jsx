import { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Book, Folder, FileText, ChevronRight, ChevronDown, Plus, 
  Search, Trash2, Edit2, Bold, Italic, List, CheckSquare, 
  Heading, Quote, Save, FolderPlus, FilePlus,
  ArrowLeft, Underline, Strikethrough, Type,
  X, CornerDownRight, Highlighter, PanelLeft,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  MoreVertical, Star, Loader2, Calendar, Printer
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
    
    // Refs
    const editorRef = useRef(null);
    const saveTimeoutRef = useRef(null);

    // --- CHARGEMENT INITIAL ---
    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [nbRes, pgRes] = await Promise.all([
                supabase.from('journal_notebooks').select('*').order('created_at'),
                supabase.from('journal_pages').select('id, notebook_id, title, created_at, updated_at, is_favorite').order('updated_at', { ascending: false })
            ]);
            
            if (nbRes.data) setNotebooks(nbRes.data);
            if (pgRes.data) setPages(pgRes.data);
            
            // Ouvrir le premier notebook par défaut si dispo
            if (nbRes.data && nbRes.data.length > 0 && !activeNotebookId) {
                setActiveNotebookId(nbRes.data[0].id);
            }
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
            return;
        }

        const loadPageContent = async () => {
            setIsSaving(true);
            const { data } = await supabase.from('journal_pages').select('content, title').eq('id', activePageId).single();
            if (data) {
                setPageContent(data.content || '');
                setPageTitle(data.title || 'Sans titre');
                if (editorRef.current) {
                    editorRef.current.innerHTML = data.content || '';
                }
            }
            setIsSaving(false);
        };
        loadPageContent();
    }, [activePageId]);

    // --- SAUVEGARDE INTELLIGENTE ---
    const saveCurrentPage = async (force = false) => {
        if (!activePageId) return;

        const contentToSave = editorRef.current ? editorRef.current.innerHTML : pageContent;
        
        // Annuler le timeout précédent s'il existe
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

        const performSave = async () => {
            setIsSaving(true);
            try {
                await supabase.from('journal_pages').update({
                    title: pageTitle,
                    content: contentToSave,
                    updated_at: new Date().toISOString()
                }).eq('id', activePageId);
                
                // Mettre à jour la liste locale pour le tri
                setPages(prev => prev.map(p => p.id === activePageId ? { ...p, title: pageTitle, updated_at: new Date().toISOString() } : p));
            } catch (err) {
                console.error("Erreur sauvegarde:", err);
            } finally {
                setIsSaving(false);
            }
        };

        if (force) {
            await performSave();
        } else {
            // Debounce (attendre 1.5s après la frappe)
            setIsSaving(true); // Indicateur visuel immédiat
            saveTimeoutRef.current = setTimeout(performSave, 1500);
        }
    };

    // --- IMPRESSION MODE "ROMAN" ---
    const handlePrint = () => {
        if (!activePageId) return;

        const printWindow = window.open('', '_blank');
        const currentDate = format(new Date(), 'd MMMM yyyy', { locale: fr });
        const contentToPrint = editorRef.current ? editorRef.current.innerHTML : pageContent;

        const htmlContent = `
            <html>
            <head>
                <title>${pageTitle}</title>
                <link href="https://fonts.googleapis.com/css2?family=Merriweather:ital,wght@0,300;0,400;0,700;1,300&display=swap" rel="stylesheet">
                <style>
                    body {
                        font-family: 'Merriweather', serif;
                        line-height: 1.8;
                        color: #1a1a1a;
                        max-width: 800px;
                        margin: 0 auto;
                        padding: 40px;
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 60px;
                        border-bottom: 1px solid #e5e5e5;
                        padding-bottom: 20px;
                    }
                    .date {
                        font-style: italic;
                        color: #666;
                        font-size: 0.9em;
                        margin-bottom: 10px;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                    }
                    h1 {
                        font-size: 2.5em;
                        font-weight: 700;
                        margin: 0;
                        color: #000;
                    }
                    .content {
                        font-size: 1.1em;
                        text-align: justify;
                    }
                    /* Nettoyage des styles riches pour l'impression */
                    .content img { max-width: 100%; height: auto; display: block; margin: 20px auto; }
                    .content blockquote { border-left: 3px solid #ccc; padding-left: 15px; font-style: italic; margin: 20px 0; color: #555; }
                    .content ul, .content ol { padding-left: 20px; margin-bottom: 15px; }
                    
                    @media print {
                        body { padding: 0; margin: 2cm; max-width: 100%; }
                        @page { margin: 2cm; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="date">${currentDate}</div>
                    <h1>${pageTitle || 'Sans Titre'}</h1>
                </div>
                <div class="content">
                    ${contentToPrint}
                </div>
                <script>
                    window.onload = function() { window.print(); }
                </script>
            </body>
            </html>
        `;

        printWindow.document.write(htmlContent);
        printWindow.document.close();
    };

    // --- ACTIONS NOTEBOOKS ---
    const createNotebook = async () => {
        const name = prompt("Nom du nouveau dossier :");
        if (!name) return;
        const { data } = await supabase.from('journal_notebooks').insert([{ name, color: 'blue' }]).select();
        if (data) {
            setNotebooks([...notebooks, data[0]]);
            setActiveNotebookId(data[0].id);
        }
    };

    const deleteNotebook = async (id, e) => {
        e.stopPropagation();
        if (!window.confirm("⚠️ ATTENTION : Supprimer ce dossier effacera TOUTES les pages à l'intérieur. Continuer ?")) return;
        
        // 1. D'abord supprimer les pages (Nettoyage Base de Données)
        await supabase.from('journal_pages').delete().eq('notebook_id', id);
        
        // 2. Ensuite supprimer le dossier
        await supabase.from('journal_notebooks').delete().eq('id', id);
        
        setNotebooks(notebooks.filter(n => n.id !== id));
        setPages(pages.filter(p => p.notebook_id !== id));
        if (activeNotebookId === id) setActiveNotebookId(null);
    };

    // --- ACTIONS PAGES ---
    const createPage = async () => {
        if (!activeNotebookId) {
            alert("Sélectionnez un dossier d'abord.");
            return;
        }
        
        // Sauvegarder la page actuelle avant de changer
        if (activePageId) await saveCurrentPage(true);

        const { data } = await supabase.from('journal_pages').insert([{ 
            notebook_id: activeNotebookId, 
            title: 'Nouvelle page', 
            content: '' 
        }]).select();

        if (data) {
            setPages([data[0], ...pages]);
            setActivePageId(data[0].id);
            // Focus sera géré par le useEffect de chargement
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

    // --- ÉDITEUR FORMATAGE (FIX FOCUS) ---
    const execCmd = (cmd, value = null) => {
        document.execCommand(cmd, false, value);
        // On force le focus à revenir sur l'éditeur si besoin, mais preventDefault sur le bouton suffit généralement
        if (editorRef.current) editorRef.current.focus();
    };

    const FormatButton = ({ cmd, arg, icon: Icon, title }) => (
        <button 
            onMouseDown={(e) => { 
                e.preventDefault(); // EMPÊCHE LA PERTE DE FOCUS (BUG "CURSEUR SAUTEUR")
                execCmd(cmd, arg); 
            }}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-700 rounded transition-colors"
            title={title}
        >
            <Icon size={16} />
        </button>
    );

    // --- LISTE FILTRÉE ---
    const filteredPages = pages
        .filter(p => p.notebook_id === activeNotebookId)
        .filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <div className="flex h-full w-full bg-slate-50 dark:bg-slate-950 overflow-hidden">
            
            {/* SIDEBAR GAUCHE (DOSSIERS & PAGES) */}
            <div className={`${isSidebarOpen ? 'w-80' : 'w-0'} bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 flex flex-col shrink-0 overflow-hidden`}>
                
                {/* Header Sidebar */}
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center shrink-0">
                    <h2 className="font-bold text-slate-800 dark:text-white flex items-center gap-2"><Book size={20}/> Journal</h2>
                    <div className="flex gap-1">
                        <button onClick={createNotebook} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500" title="Nouveau Dossier"><FolderPlus size={18}/></button>
                        <button onClick={createPage} className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm" title="Nouvelle Page"><Plus size={18}/></button>
                    </div>
                </div>

                {/* Recherche */}
                <div className="p-3">
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                        <input 
                            type="text" 
                            placeholder="Rechercher..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/50 text-slate-700 dark:text-slate-200"
                        />
                    </div>
                </div>

                {/* Liste Dossiers & Pages */}
                <div className="flex-1 overflow-y-auto p-2 space-y-4">
                    {/* Favoris (si existent) */}
                    {pages.some(p => p.is_favorite) && (
                        <div className="mb-4">
                            <h3 className="text-xs font-bold text-slate-400 uppercase px-3 mb-2 flex items-center gap-1"><Star size={10} className="fill-amber-400 text-amber-400"/> Favoris</h3>
                            <div className="space-y-0.5">
                                {pages.filter(p => p.is_favorite).map(page => (
                                    <div key={page.id} onClick={() => { setActiveNotebookId(page.notebook_id); setActivePageId(page.id); }} className="px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                                        <FileText size={14} className="text-indigo-500"/>
                                        <span className="truncate flex-1">{page.title}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Notebooks */}
                    <div className="space-y-1">
                        {notebooks.map(nb => (
                            <div key={nb.id} className="select-none">
                                <div 
                                    onClick={() => setActiveNotebookId(nb.id)}
                                    className={`group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${activeNotebookId === nb.id ? 'bg-slate-100 dark:bg-slate-800' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                                >
                                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                                        {activeNotebookId === nb.id ? <ChevronDown size={16} className="text-slate-400"/> : <ChevronRight size={16} className="text-slate-400"/>}
                                        <Folder size={16} className={activeNotebookId === nb.id ? 'text-indigo-500 fill-indigo-100 dark:fill-indigo-900' : 'text-slate-400'}/>
                                        <span className="truncate">{nb.name}</span>
                                    </div>
                                    <button onClick={(e) => deleteNotebook(nb.id, e)} className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500"><Trash2 size={12}/></button>
                                </div>
                                
                                {/* Pages du notebook actif */}
                                {activeNotebookId === nb.id && (
                                    <div className="ml-4 mt-1 pl-2 border-l border-slate-200 dark:border-slate-800 space-y-0.5">
                                        {pages.filter(p => p.notebook_id === nb.id).length === 0 && (
                                            <div className="px-3 py-2 text-xs text-slate-400 italic">Dossier vide</div>
                                        )}
                                        {pages.filter(p => p.notebook_id === nb.id)
                                              .filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()))
                                              .map(page => (
                                            <div 
                                                key={page.id} 
                                                onClick={() => { if(activePageId !== page.id) { saveCurrentPage(true); setActivePageId(page.id); } }} 
                                                className={`group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-sm border border-transparent ${activePageId === page.id ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400 font-medium' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                                            >
                                                <div className="flex items-center gap-2 overflow-hidden">
                                                    <span className="truncate">{page.title || 'Sans titre'}</span>
                                                </div>
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                                                    <button onClick={(e) => toggleFavorite(page.id, page.is_favorite, e)} className={`p-1 hover:text-amber-500 ${page.is_favorite ? 'text-amber-500 opacity-100' : 'text-slate-300'}`}><Star size={12} className={page.is_favorite ? 'fill-amber-500' : ''}/></button>
                                                    <button onClick={(e) => deletePage(page.id, e)} className="p-1 hover:text-red-500 text-slate-300"><Trash2 size={12}/></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* TOGGLE SIDEBAR */}
            <div className="h-full flex flex-col items-center py-4 bg-slate-50 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 w-4 shrink-0 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer transition-colors" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                <div className="w-1 h-8 bg-slate-300 dark:bg-slate-700 rounded-full my-auto"></div>
            </div>

            {/* ZONE ÉDITEUR */}
            <div className="flex-1 flex flex-col bg-white dark:bg-black relative min-w-0">
                {activePageId ? (
                    <>
                        {/* Barre d'outils Formatage */}
                        <div className="h-12 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between px-4 bg-white dark:bg-black z-10 sticky top-0">
                            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                                <div className="flex items-center gap-1 pr-2 border-r border-slate-100 dark:border-slate-800">
                                    <FormatButton cmd="formatBlock" arg="H2" icon={Heading} title="Grand Titre" />
                                    <FormatButton cmd="formatBlock" arg="H3" icon={Type} title="Sous-titre" />
                                </div>
                                <div className="flex items-center gap-1 px-2 border-r border-slate-100 dark:border-slate-800">
                                    <FormatButton cmd="bold" icon={Bold} title="Gras" />
                                    <FormatButton cmd="italic" icon={Italic} title="Italique" />
                                    <FormatButton cmd="underline" icon={Underline} title="Souligné" />
                                    <FormatButton cmd="strikeThrough" icon={Strikethrough} title="Barré" />
                                </div>
                                <div className="flex items-center gap-1 px-2 border-r border-slate-100 dark:border-slate-800">
                                    <FormatButton cmd="insertUnorderedList" icon={List} title="Liste à puces" />
                                    <FormatButton cmd="insertOrderedList" icon={List} title="Liste numérotée" />
                                </div>
                                <div className="flex items-center gap-1 pl-2">
                                    <FormatButton cmd="justifyLeft" icon={AlignLeft} title="Aligner Gauche" />
                                    <FormatButton cmd="justifyCenter" icon={AlignCenter} title="Centrer" />
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                                <button onClick={handlePrint} className="flex items-center gap-1 hover:text-slate-800 dark:hover:text-white transition-colors mr-2" title="Imprimer / PDF">
                                    <Printer size={14} />
                                </button>
                                {isSaving ? <span className="flex items-center gap-1 text-indigo-500"><Loader2 size={10} className="animate-spin"/> Sauvegarde...</span> : <span><CheckSquare size={10} className="inline mr-1"/>Enregistré</span>}
                            </div>
                        </div>

                        {/* Contenu Page */}
                        <div className="flex-1 overflow-y-auto">
                            <div className="max-w-3xl mx-auto px-8 py-12 min-h-full">
                                {/* Date modif */}
                                <div className="text-xs text-slate-400 mb-4 font-mono flex items-center gap-2">
                                    <Calendar size={12}/> {format(new Date(), 'd MMMM yyyy', { locale: fr })}
                                </div>
                                
                                {/* Titre */}
                                <input 
                                    type="text" 
                                    value={pageTitle}
                                    onChange={(e) => { setPageTitle(e.target.value); saveCurrentPage(false); }}
                                    onBlur={() => saveCurrentPage(true)} // Sauvegarde Immédiate
                                    placeholder="Titre de la page..."
                                    className="w-full text-4xl font-bold text-slate-800 dark:text-slate-100 bg-transparent outline-none placeholder-slate-300 dark:placeholder-slate-700 mb-8"
                                />

                                {/* Zone de texte Riche */}
                                <div 
                                    ref={editorRef}
                                    contentEditable
                                    onInput={() => saveCurrentPage(false)} // Debounce save
                                    onBlur={() => saveCurrentPage(true)} // Force save on blur
                                    className="prose dark:prose-invert max-w-none outline-none min-h-[50vh] text-slate-700 dark:text-slate-300 leading-relaxed text-lg pb-32 empty:before:content-[attr(placeholder)] empty:before:text-slate-300"
                                    placeholder="Commencez à écrire..."
                                ></div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-300 dark:text-slate-700">
                        <Book size={64} className="mb-6 opacity-20"/>
                        <p className="text-lg font-medium">Sélectionnez une page ou créez-en une</p>
                        <button onClick={createPage} className="mt-4 px-6 py-2 bg-slate-100 dark:bg-slate-800 rounded-full text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                            + Nouvelle Page
                        </button>
                    </div>
                )}
            </div>

            {/* STYLES GLOBAUX POUR L'ÉDITEUR */}
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