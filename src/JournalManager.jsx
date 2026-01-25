import { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Book, Folder, FileText, ChevronRight, ChevronDown, Plus, 
  Search, Trash2, Edit2, Bold, Italic, List, CheckSquare, 
  Heading, Quote, Save, FolderPlus, FilePlus,
  ArrowLeft, Underline, Strikethrough, Type,
  X, CornerDownRight, Highlighter, PanelLeft,
  AlignLeft, AlignCenter, AlignRight, AlignJustify
} from 'lucide-react';

export default function JournalManager({ data, updateData }) {
    // --- ÉTATS ---
    const [activeNotebookId, setActiveNotebookId] = useState(null);
    const [activePageId, setActivePageId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedFolders, setExpandedFolders] = useState({});
    const [isSaving, setIsSaving] = useState(false);
    
    // État Interface
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    // États Création
    const [isCreating, setIsCreating] = useState(false);
    const [newName, setNewName] = useState('');
    const [targetParentId, setTargetParentId] = useState(null);

    // État Formats & Menu Couleur
    const [activeFormats, setActiveFormats] = useState({});
    const [showColorPalette, setShowColorPalette] = useState(false);

    // Refs
    const editorRef = useRef(null);
    const titleRef = useRef(null);

    // --- DONNÉES SÉCURISÉES ---
    const folders = Array.isArray(data.journal_folders) ? data.journal_folders : [];
    const pages = Array.isArray(data.journal_pages) ? data.journal_pages : [];
    const notebooks = folders.filter(f => !f.parent_id);

    // --- LOGIQUE ARBORESCENCE ---
    const treeStructure = useMemo(() => {
        if (!activeNotebookId) return [];
        const buildLevel = (parentId) => {
            const childFolders = folders
                .filter(f => String(f.parent_id) === String(parentId))
                .map(f => ({ ...f, type: 'folder', children: buildLevel(f.id) }));
            const childPages = pages
                .filter(p => String(p.folder_id) === String(parentId))
                .map(p => ({ ...p, type: 'page' }));
            return [...childFolders, ...childPages];
        };
        return buildLevel(activeNotebookId);
    }, [folders, pages, activeNotebookId]);

    // --- CHARGEMENT ---
    useEffect(() => {
        if (activePageId && editorRef.current) {
            const page = pages.find(p => String(p.id) === String(activePageId));
            if (page) {
                // On ne met à jour le HTML que si l'ID de page a changé pour ne pas écraser la frappe en cours
                if (editorRef.current.dataset.pageId !== String(activePageId)) {
                    editorRef.current.innerHTML = page.content || '<p><br/></p>';
                    editorRef.current.dataset.pageId = String(activePageId);
                }
                // Mise à jour du titre
                if (titleRef.current && titleRef.current.value !== page.title) {
                    titleRef.current.value = page.title || '';
                }
            }
        }
        // Reset des états d'outils
        setActiveFormats({});
        setShowColorPalette(false);
    }, [activePageId, pages]);

    // --- ACTIONS DE GESTION (Dossiers/Pages) ---
    const createContainer = () => {
        if (!newName.trim()) return;
        const newId = Date.now();
        const newFolder = { id: newId, name: newName, parent_id: isCreating === 'notebook' ? null : targetParentId, created_at: new Date().toISOString() };
        updateData({ ...data, journal_folders: [...folders, newFolder] });
        if (isCreating === 'folder' && targetParentId) setExpandedFolders(prev => ({ ...prev, [targetParentId]: true }));
        setNewName('');
        setIsCreating(false);
    };

    const createPage = (targetFolderId) => {
        const finalFolderId = targetFolderId || activeNotebookId;
        const newPage = { id: Date.now(), folder_id: finalFolderId, title: '', content: '<p><br/></p>', updated_at: new Date().toISOString() };
        updateData({ ...data, journal_pages: [...pages, newPage] });
        setExpandedFolders(prev => ({ ...prev, [finalFolderId]: true }));
        setActivePageId(newPage.id);
        if (window.innerWidth < 768) setIsSidebarOpen(false); 
        setTimeout(() => titleRef.current?.focus(), 100);
    };

    const deleteItem = (item) => {
        if (!window.confirm(`Supprimer "${item.title || item.name}" ?`)) return;
        const isFolder = item.type === 'folder' || item.name !== undefined;
        if (isFolder) {
            const updatedFolders = folders.filter(f => f.id !== item.id);
            const updatedPages = pages.filter(p => String(p.folder_id) !== String(item.id));
            updateData({ ...data, journal_folders: updatedFolders, journal_pages: updatedPages }, { table: 'journal_folders', id: item.id });
            if (String(activeNotebookId) === String(item.id)) setActiveNotebookId(null);
        } else {
            const updatedPages = pages.filter(p => p.id !== item.id);
            updateData({ ...data, journal_pages: updatedPages }, { table: 'journal_pages', id: item.id });
            if (activePageId === item.id) setActivePageId(null);
        }
    };

    const saveContent = () => {
        if (!activePageId) return;
        setIsSaving(true);
        const content = editorRef.current.innerHTML;
        const title = titleRef.current.value;
        const updatedPages = pages.map(p => String(p.id) === String(activePageId) ? { ...p, title, content, updated_at: new Date().toISOString() } : p);
        updateData({ ...data, journal_pages: updatedPages });
        setTimeout(() => setIsSaving(false), 800);
    };

    // --- MOTEUR ÉDITEUR (CŒUR DU SYSTÈME) ---
    
    // Vérifie quels formats sont actifs à l'endroit du curseur
    const checkFormats = () => {
        if (!document) return;
        try {
            setActiveFormats({
                bold: document.queryCommandState('bold'),
                italic: document.queryCommandState('italic'),
                underline: document.queryCommandState('underline'),
                strikethrough: document.queryCommandState('strikethrough'),
                insertUnorderedList: document.queryCommandState('insertUnorderedList'),
                insertOrderedList: document.queryCommandState('insertOrderedList'),
                justifyLeft: document.queryCommandState('justifyLeft'),
                justifyCenter: document.queryCommandState('justifyCenter'),
                justifyRight: document.queryCommandState('justifyRight'),
                justifyFull: document.queryCommandState('justifyFull'),
                // Détection avancée des blocs
                blockquote: document.queryCommandValue('formatBlock')?.toLowerCase() === 'blockquote',
                h2: document.queryCommandValue('formatBlock')?.toLowerCase() === 'h2',
                h3: document.queryCommandValue('formatBlock')?.toLowerCase() === 'h3',
            });
        } catch(e) { console.error(e); }
    };

    // Exécute une commande avec logique de nettoyage préventif
    const execCmd = (e, command, value = null) => {
        if(e) e.preventDefault(); 
        
        // SCENARIO 1 : CONFLIT LISTE vs TITRE
        // Si on insère une liste, on vérifie qu'on n'est pas sur un Titre
        if (command === 'insertUnorderedList' || command === 'insertOrderedList') {
            const currentBlock = document.queryCommandValue('formatBlock');
            if (['h1', 'h2', 'h3'].includes(currentBlock.toLowerCase())) {
                // On reset le bloc en Paragraphe 'P' d'abord pour éviter l'imbrication H2 > UL (invalide)
                document.execCommand('formatBlock', false, 'P');
            }
        }

        // SCENARIO 2 : CONFLIT TITRE vs LISTE
        // Si on applique un Titre, on sort d'abord de la liste
        if (command === 'formatBlock' && ['H2', 'H3'].includes(value)) {
            if (document.queryCommandState('insertUnorderedList') || document.queryCommandState('insertOrderedList')) {
                // On désactive les listes
                document.execCommand('insertUnorderedList', false, null); 
                document.execCommand('insertOrderedList', false, null);   
            }
        }

        // SCENARIO 3 : TOGGLE INTELLIGENT (ON/OFF)
        // Si on est déjà en Citation/Titre et qu'on reclique, on revient en texte normal
        if (command === 'formatBlock') {
            const currentBlock = document.queryCommandValue('formatBlock');
            if (currentBlock && currentBlock.toLowerCase() === value.toLowerCase()) {
                value = 'P'; // Reset vers paragraphe standard
            }
        }

        // Exécution de la commande
        document.execCommand(command, false, value);
        
        // SCENARIO 4 : PERSISTANCE DU FOCUS
        // On remet le focus dans l'éditeur immédiatement
        if(editorRef.current) editorRef.current.focus();
        
        checkFormats();
        
        // Fermer la palette si on a choisi une couleur
        if (command === 'hiliteColor') setShowColorPalette(false);
    };

    const applyHighlight = (e, color) => {
        if(e) e.preventDefault();
        document.execCommand('hiliteColor', false, color); 
        if(editorRef.current) editorRef.current.focus();
        setShowColorPalette(false);
    };

    // SCENARIO 5 : GESTION DE LA TOUCHE ENTRÉE
    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            // Vérifie dans quel type de bloc on se trouve
            const format = document.queryCommandValue('formatBlock');
            // Si on est dans un Titre ou une Citation
            if (['h1', 'h2', 'h3', 'blockquote'].includes(format.toLowerCase())) {
                // On empêche le comportement par défaut (qui prolonge le titre/citation)
                e.preventDefault();
                // On force la création d'un nouveau paragraphe vierge en dessous
                document.execCommand('insertParagraph');
            }
        }
    };

    const ToolbarButton = ({ icon: Icon, cmd, val, title, isActiveOverride }) => {
        const isActive = isActiveOverride !== undefined ? isActiveOverride : activeFormats[cmd];
        return (
            <button 
                onMouseDown={(e) => execCmd(e, cmd, val)} 
                className={`p-2 rounded transition-all duration-200 ${isActive ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300' : 'hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-300'}`}
                title={title}
            >
                <Icon size={18}/>
            </button>
        );
    };

    // --- RENDU ARBORESCENCE (Tree) ---
    const renderTree = (nodes, depth = 0) => {
        return nodes.map(node => {
            if (searchQuery && node.type === 'page' && !node.title.toLowerCase().includes(searchQuery.toLowerCase())) return null;
            if (node.type === 'folder') {
                const isOpen = expandedFolders[node.id] || searchQuery.length > 0;
                const hasChildren = node.children && node.children.length > 0;
                return (
                    <div key={node.id} className="select-none text-sm my-0.5">
                        <div 
                            className={`flex items-center justify-between px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer group transition-colors`}
                            style={{ paddingLeft: `${depth * 12 + 12}px` }}
                            onClick={() => setExpandedFolders(prev => ({ ...prev, [node.id]: !prev[node.id] }))}
                        >
                            <div className="flex items-center gap-2 overflow-hidden text-gray-700 dark:text-gray-200 min-w-0">
                                {hasChildren || isOpen ? (isOpen ? <ChevronDown size={14} className="shrink-0"/> : <ChevronRight size={14} className="shrink-0"/>) : <span className="w-3.5 shrink-0"></span>}
                                <Folder size={16} className="text-blue-500 shrink-0 fill-blue-500/20"/>
                                <span className="truncate font-medium">{node.name}</span>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={(e) => { e.stopPropagation(); createPage(node.id); }} className="p-1 hover:bg-green-100 dark:hover:bg-green-900/30 text-gray-400 hover:text-green-600 rounded"><FilePlus size={14}/></button>
                                <button onClick={(e) => { e.stopPropagation(); setTargetParentId(node.id); setIsCreating('folder'); }} className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-gray-400 hover:text-blue-600 rounded"><FolderPlus size={14}/></button>
                                <button onClick={(e) => { e.stopPropagation(); deleteItem(node); }} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 rounded"><Trash2 size={14}/></button>
                            </div>
                        </div>
                        {isOpen && <div className="border-l border-gray-200 dark:border-slate-700 ml-[calc(12px+0.4rem)]">{node.children && node.children.length > 0 ? renderTree(node.children, depth + 1) : <div className="py-1 pl-4 text-xs text-gray-400 italic flex items-center gap-2"><CornerDownRight size={10}/> Vide</div>}</div>}
                    </div>
                );
            }
            return (
                <div key={node.id} onClick={() => setActivePageId(node.id)} className={`flex items-center justify-between px-3 py-1.5 rounded-lg cursor-pointer group mb-0.5 text-sm transition-colors ${String(activePageId) === String(node.id) ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-200 font-medium' : 'hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-gray-400'}`} style={{ paddingLeft: `${depth * 12 + 28}px` }}>
                    <div className="flex items-center gap-2 overflow-hidden min-w-0"><FileText size={14} className="shrink-0"/><span className={`truncate ${!node.title ? 'italic opacity-50' : ''}`}>{node.title || 'Sans titre'}</span></div>
                    <button onClick={(e) => { e.stopPropagation(); deleteItem(node); }} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 rounded transition-all"><Trash2 size={12}/></button>
                </div>
            );
        });
    };

    // --- VUES ---
    if (!activeNotebookId) {
        return (
            <div className="fade-in p-6 w-full max-w-[1920px] mx-auto pb-24">
                <div className="flex justify-between items-center mb-8">
                    <div><h2 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3"><Book className="text-blue-600"/> Ma Bibliothèque</h2><p className="text-gray-500 dark:text-slate-400 mt-1">Gérez vos carnets, notes et documentations.</p></div>
                    <button onClick={() => { setIsCreating('notebook'); setNewName(''); }} className="flex items-center gap-2 px-6 py-3 bg-slate-900 dark:bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:opacity-90 transition-transform active:scale-95"><Plus size={20}/> Nouveau Carnet</button>
                </div>
                {isCreating === 'notebook' && (
                    <div className="mb-8 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-slate-700 animate-in slide-in-from-top-4">
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Nom du carnet</label>
                        <div className="flex gap-4"><input autoFocus type="text" placeholder="Ex: Idées Business..." className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && createContainer()} /><button onClick={() => setIsCreating(false)} className="px-6 font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl">Annuler</button><button onClick={createContainer} className="px-8 font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700">Créer</button></div>
                    </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {notebooks.map(nb => (
                        <div key={nb.id} onClick={() => setActiveNotebookId(nb.id)} className="group bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 shadow-sm hover:shadow-xl transition-all cursor-pointer relative overflow-hidden flex flex-col h-48 justify-between">
                            <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={(e) => { e.stopPropagation(); deleteItem(nb); }} className="p-2 bg-white dark:bg-slate-700 text-red-500 rounded-full shadow-sm hover:bg-red-50"><Trash2 size={16}/></button></div>
                            <div><div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><Book size={24}/></div><h3 className="text-xl font-bold text-gray-800 dark:text-white line-clamp-1">{nb.name}</h3><p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{new Date(nb.created_at).toLocaleDateString()}</p></div>
                            <div className="flex items-center gap-2 text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider"><span>Entrer</span> <ArrowLeft size={12} className="rotate-180 group-hover:translate-x-1 transition-transform"/></div>
                        </div>
                    ))}
                    {notebooks.length === 0 && !isCreating && <div className="col-span-full text-center py-20 opacity-50"><Book size={64} className="mx-auto mb-4 text-gray-300"/><p>Aucun carnet. Créez-en un pour commencer !</p></div>}
                </div>
            </div>
        );
    }

    const activeNotebookName = notebooks.find(n => n.id === activeNotebookId)?.name || 'Carnet';

    return (
        <div className="flex h-[calc(100vh-1rem)] md:h-[calc(100vh-2rem)] w-full overflow-hidden bg-white dark:bg-slate-900 shadow-sm border border-gray-200 dark:border-slate-700 fade-in relative">
            
            {/* SIDEBAR PLIABLE */}
            {isSidebarOpen && (
                <div className="w-80 border-r border-gray-200 dark:border-slate-700 flex flex-col bg-gray-50/80 dark:bg-slate-950/50 shrink-0 transition-all duration-300">
                    <div className="p-4 border-b border-gray-200 dark:border-slate-700">
                        <button onClick={() => { setActiveNotebookId(null); setActivePageId(null); }} className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-blue-600 mb-4 transition-colors"><ArrowLeft size={12}/> RETOUR BIBLIOTHÈQUE</button>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg text-gray-800 dark:text-white truncate px-1">{activeNotebookName}</h3>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => createPage(activeNotebookId)} className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-xs font-bold transition-colors shadow-sm"><Plus size={14}/> Page</button>
                            <button onClick={() => { setIsCreating('folder'); setTargetParentId(activeNotebookId); setNewName(''); }} className="flex-1 flex items-center justify-center gap-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200 py-2 rounded-lg text-xs font-bold transition-colors"><FolderPlus size={14}/> Dossier</button>
                        </div>
                    </div>
                    {isCreating === 'folder' && (
                        <div className="p-2 m-2 bg-white dark:bg-slate-800 rounded-lg border border-blue-200 dark:border-blue-800 shadow-sm animate-in slide-in-from-top-2">
                            <input autoFocus type="text" placeholder="Nom du dossier..." className="w-full text-sm mb-2 px-2 py-1 bg-transparent border-b border-blue-200 outline-none dark:text-white" value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && createContainer()} />
                            <div className="flex justify-end gap-2 text-xs"><button onClick={() => setIsCreating(false)} className="text-gray-400 hover:text-gray-600">Annuler</button><button onClick={createContainer} className="text-blue-600 font-bold">Créer</button></div>
                        </div>
                    )}
                    <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                        {renderTree(treeStructure)}
                        {treeStructure.length === 0 && <div className="text-center mt-10 opacity-40"><FileText size={32} className="mx-auto mb-2"/><p className="text-xs">Carnet vide</p></div>}
                    </div>
                </div>
            )}

            {/* ZONE ÉDITEUR (PLEIN ÉCRAN) */}
            <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 relative min-w-0">
                {activePageId ? (
                    <>
                        <div className="h-14 border-b border-gray-100 dark:border-slate-800 flex items-center px-4 gap-1 bg-white dark:bg-slate-900 z-10 sticky top-0 overflow-x-auto">
                            
                            {/* BOUTON TOGGLE SIDEBAR */}
                            <button 
                                onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
                                className="mr-3 p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                title={isSidebarOpen ? "Fermer le menu" : "Ouvrir le menu"}
                            >
                                <PanelLeft size={20} className={isSidebarOpen ? "text-blue-500" : ""} />
                            </button>

                            <div className="w-px h-5 bg-gray-200 dark:bg-slate-700 mr-2 shrink-0"></div>

                            <ToolbarButton icon={Type} cmd="formatBlock" val="P" title="Texte Normal" />
                            <div className="w-px h-5 bg-gray-200 dark:bg-slate-700 mx-2 shrink-0"></div>
                            
                            <ToolbarButton icon={Bold} cmd="bold" title="Gras" />
                            <ToolbarButton icon={Italic} cmd="italic" title="Italique" />
                            <ToolbarButton icon={Underline} cmd="underline" title="Souligné" />
                            <ToolbarButton icon={Strikethrough} cmd="strikethrough" title="Barré" />
                            
                            {/* --- MENU SURLIGNEUR EN LIGNE --- */}
                            <div className="flex items-center gap-1 mx-1 px-1 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
                                <button 
                                    onMouseDown={(e) => { e.preventDefault(); setShowColorPalette(!showColorPalette); }} 
                                    className={`p-1.5 rounded hover:bg-gray-200 dark:hover:bg-slate-600 ${showColorPalette ? 'text-blue-500' : 'text-gray-500'}`}
                                    title="Surligner"
                                >
                                    <Highlighter size={16} />
                                </button>
                                {showColorPalette && (
                                    <div className="flex items-center gap-1 animate-in slide-in-from-left-2 fade-in duration-200">
                                        <button onMouseDown={(e) => applyHighlight(e, 'rgba(253, 224, 71, 0.3)')} className="w-4 h-4 rounded-full bg-yellow-300 hover:scale-110 transition-transform ring-1 ring-black/10" title="Jaune"></button>
                                        <button onMouseDown={(e) => applyHighlight(e, 'rgba(134, 239, 172, 0.3)')} className="w-4 h-4 rounded-full bg-green-300 hover:scale-110 transition-transform ring-1 ring-black/10" title="Vert"></button>
                                        <button onMouseDown={(e) => applyHighlight(e, 'rgba(249, 168, 212, 0.3)')} className="w-4 h-4 rounded-full bg-pink-300 hover:scale-110 transition-transform ring-1 ring-black/10" title="Rose"></button>
                                        <button onMouseDown={(e) => applyHighlight(e, 'rgba(147, 197, 253, 0.3)')} className="w-4 h-4 rounded-full bg-blue-300 hover:scale-110 transition-transform ring-1 ring-black/10" title="Bleu"></button>
                                        <button onMouseDown={(e) => applyHighlight(e, 'transparent')} className="w-4 h-4 rounded-full bg-white border border-gray-300 flex items-center justify-center text-red-500 hover:bg-red-50" title="Aucun"><X size={10}/></button>
                                    </div>
                                )}
                            </div>

                            <div className="w-px h-5 bg-gray-200 dark:bg-slate-700 mx-2 shrink-0"></div>
                            
                            {/* ALIGNEMENT */}
                            <ToolbarButton icon={AlignLeft} cmd="justifyLeft" title="Aligner à gauche" />
                            <ToolbarButton icon={AlignCenter} cmd="justifyCenter" title="Centrer" />
                            <ToolbarButton icon={AlignRight} cmd="justifyRight" title="Aligner à droite" />
                            <ToolbarButton icon={AlignJustify} cmd="justifyFull" title="Justifier" />

                            <div className="w-px h-5 bg-gray-200 dark:bg-slate-700 mx-2 shrink-0"></div>
                            
                            <button onMouseDown={(e) => execCmd(e, 'formatBlock', 'H2')} className={`px-2 py-1 text-xs font-bold rounded transition-colors ${activeFormats.h2 ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-300'}`}>H1</button>
                            <button onMouseDown={(e) => execCmd(e, 'formatBlock', 'H3')} className={`px-2 py-1 text-xs font-bold rounded transition-colors ${activeFormats.h3 ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-300'}`}>H2</button>
                            
                            <div className="w-px h-5 bg-gray-200 dark:bg-slate-700 mx-2 shrink-0"></div>
                            <ToolbarButton icon={List} cmd="insertUnorderedList" title="Liste à puces" />
                            <ToolbarButton icon={CheckSquare} cmd="insertOrderedList" title="Liste numérotée" />
                            <ToolbarButton icon={Quote} cmd="formatBlock" val="BLOCKQUOTE" title="Citation" isActiveOverride={activeFormats.blockquote} />
                            
                            <div className="flex-1"></div>
                            <span className="text-xs text-gray-400 mr-3 hidden sm:inline">{isSaving ? 'Enregistrement...' : 'Sauvegardé'}</span>
                            <button onClick={saveContent} className={`p-2 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors`}><Save size={18}/></button>
                        </div>

                        {/* DOCUMENT FULL WIDTH */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-10 w-full">
                            <input 
                                ref={titleRef}
                                type="text" 
                                placeholder="Titre de la page..."
                                className="text-3xl font-bold w-full mb-6 outline-none bg-transparent text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-slate-700 border-none p-0 focus:ring-0"
                                onBlur={saveContent}
                            />
                            
                            <div 
                                ref={editorRef}
                                className="prose prose-lg dark:prose-invert max-w-none outline-none min-h-[60vh] text-gray-700 dark:text-gray-300 leading-relaxed empty:before:content-['Commencez_à_écrire_ici...'] empty:before:text-gray-300 selection:bg-blue-100 dark:selection:bg-blue-900/50"
                                contentEditable
                                onKeyDown={handleKeyDown} 
                                onKeyUp={checkFormats}
                                onMouseUp={checkFormats}
                                onBlur={saveContent}
                                onInput={() => { if(!isSaving) setIsSaving(true); }} 
                            />
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-300 dark:text-slate-600 bg-gray-50/30 dark:bg-slate-900">
                        {/* BOUTON D'OUVERTURE SI PAS DE PAGE SÉLECTIONNÉE */}
                        {!isSidebarOpen && (
                            <button onClick={() => setIsSidebarOpen(true)} className="absolute top-4 left-4 p-2 bg-white dark:bg-slate-800 shadow-md rounded-lg text-gray-500 hover:text-blue-600">
                                <PanelLeft size={20}/>
                            </button>
                        )}
                        <div className="w-20 h-20 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6"><Book size={40} className="text-gray-400 dark:text-slate-500"/></div>
                        <p className="text-xl font-bold text-gray-700 dark:text-slate-300">Sélectionnez une page</p>
                        <p className="text-sm mt-2">pour commencer à écrire.</p>
                    </div>
                )}
            </div>

            <style jsx>{`
                .prose ul { list-style-type: disc; padding-left: 1.5rem; margin-bottom: 1em; }
                .prose ol { list-style-type: decimal; padding-left: 1.5rem; margin-bottom: 1em; }
                .prose li { margin-bottom: 0.25em; }
                .prose h2 { font-size: 1.75em; font-weight: 800; margin-top: 1.5em; margin-bottom: 0.5em; color: inherit; line-height: 1.2; }
                .prose h3 { font-size: 1.4em; font-weight: 700; margin-top: 1.2em; margin-bottom: 0.5em; color: inherit; line-height: 1.3; }
                .prose blockquote { border-left: 4px solid #3b82f6; padding-left: 1rem; margin: 1.5em 0; font-style: italic; color: #6b7280; background: rgba(59, 130, 246, 0.05); padding: 1rem; border-radius: 0 0.5rem 0.5rem 0; }
                .dark .prose blockquote { border-left-color: #60a5fa; color: #9ca3af; background: rgba(59, 130, 246, 0.1); }
            `}</style>
        </div>
    );
}