import { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Book, Folder, FileText, ChevronRight, ChevronDown, Plus, 
  Search, Trash2, Edit2, Bold, Italic, List, CheckSquare, 
  Heading, Quote, Save, MoreHorizontal, FolderPlus, FilePlus
} from 'lucide-react';

export default function JournalManager({ data, updateData }) {
    // --- ÉTATS ---
    const [activePageId, setActivePageId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedFolders, setExpandedFolders] = useState({});
    const [isSaving, setIsSaving] = useState(false);
    
    // Pour la création
    const [isCreatingFolder, setIsCreatingFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [selectedFolderId, setSelectedFolderId] = useState(null); // Pour savoir où créer

    // Refs pour l'éditeur
    const editorRef = useRef(null);
    const titleRef = useRef(null);

    // --- DONNÉES ---
    const folders = Array.isArray(data.journal_folders) ? data.journal_folders : [];
    const pages = Array.isArray(data.journal_pages) ? data.journal_pages : [];

    // --- LOGIQUE ARBORESCENCE ---
    const structure = useMemo(() => {
        const tree = [];
        const rootPages = pages.filter(p => !p.folder_id);
        const rootFolders = folders.filter(f => !f.parent_id);

        // Fonction récursive pour construire l'arbre
        const buildNode = (folder) => {
            const subFolders = folders.filter(f => String(f.parent_id) === String(folder.id)).map(buildNode);
            const folderPages = pages.filter(p => String(p.folder_id) === String(folder.id));
            return { ...folder, type: 'folder', children: [...subFolders, ...folderPages.map(p => ({...p, type: 'page'}))] };
        };

        return [
            ...rootFolders.map(buildNode),
            ...rootPages.map(p => ({...p, type: 'page'}))
        ];
    }, [folders, pages]);

    // --- ACTIONS ---
    const createFolder = () => {
        if (!newFolderName.trim()) return;
        const newFolder = {
            id: Date.now(),
            name: newFolderName,
            parent_id: selectedFolderId || null,
            created_at: new Date().toISOString()
        };
        updateData({ ...data, journal_folders: [...folders, newFolder] });
        setNewFolderName('');
        setIsCreatingFolder(false);
        if (selectedFolderId) setExpandedFolders(prev => ({ ...prev, [selectedFolderId]: true }));
    };

    const createPage = (folderId = null) => {
        const newPage = {
            id: Date.now(),
            folder_id: folderId,
            title: '',
            content: '',
            updated_at: new Date().toISOString()
        };
        updateData({ ...data, journal_pages: [...pages, newPage] });
        setActivePageId(newPage.id);
        if (folderId) setExpandedFolders(prev => ({ ...prev, [folderId]: true }));
        
        // Focus sur le titre après création
        setTimeout(() => titleRef.current?.focus(), 100);
    };

    const deleteItem = (item) => {
        if (!window.confirm(`Supprimer "${item.title || item.name}" ?`)) return;
        
        if (item.type === 'folder') {
            // Suppression en cascade (simple : on filtre tout ce qui a cet ID)
            // Note: Dans une vraie app, il faudrait une fonction récursive pour tout nettoyer
            const updatedFolders = folders.filter(f => f.id !== item.id);
            const updatedPages = pages.filter(p => p.folder_id !== item.id);
            updateData({ ...data, journal_folders: updatedFolders, journal_pages: updatedPages }, { table: 'journal_folders', id: item.id });
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
        
        const updatedPages = pages.map(p => p.id === activePageId ? { ...p, title, content, updated_at: new Date().toISOString() } : p);
        updateData({ ...data, journal_pages: updatedPages });
        setTimeout(() => setIsSaving(false), 800);
    };

    // --- ÉDITEUR RICHE ---
    const execCmd = (command, value = null) => {
        document.execCommand(command, false, value);
        editorRef.current.focus();
    };

    const activePageData = pages.find(p => p.id === activePageId);

    // --- RENDU ARBRE (RECURSIF) ---
    const renderTree = (nodes, depth = 0) => {
        return nodes.map(node => {
            if (searchQuery && node.type === 'page' && !node.title.toLowerCase().includes(searchQuery.toLowerCase())) return null;
            
            // Si c'est un dossier
            if (node.type === 'folder') {
                const isOpen = expandedFolders[node.id] || searchQuery.length > 0;
                const hasChildren = node.children && node.children.length > 0;
                
                return (
                    <div key={node.id} className="select-none">
                        <div 
                            className={`flex items-center justify-between px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer group ${selectedFolderId === node.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                            style={{ paddingLeft: `${depth * 12 + 12}px` }}
                            onClick={() => {
                                setExpandedFolders(prev => ({ ...prev, [node.id]: !prev[node.id] }));
                                setSelectedFolderId(node.id);
                            }}
                        >
                            <div className="flex items-center gap-2 overflow-hidden">
                                {hasChildren ? (
                                    <span className="text-gray-400">{isOpen ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}</span>
                                ) : <span className="w-3.5"></span>}
                                <Folder size={16} className="text-blue-500 shrink-0 fill-current"/>
                                <span className="text-sm text-gray-700 dark:text-gray-200 truncate">{node.name}</span>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={(e) => { e.stopPropagation(); createPage(node.id); }} className="p-1 hover:text-green-500 text-gray-400" title="Nouvelle page ici"><FilePlus size={14}/></button>
                                <button onClick={(e) => { e.stopPropagation(); deleteItem(node); }} className="p-1 hover:text-red-500 text-gray-400"><Trash2 size={14}/></button>
                            </div>
                        </div>
                        {isOpen && node.children && <div className="border-l border-gray-100 dark:border-slate-800 ml-4">{renderTree(node.children, depth + 1)}</div>}
                    </div>
                );
            }
            
            // Si c'est une page
            return (
                <div 
                    key={node.id} 
                    onClick={() => setActivePageId(node.id)}
                    className={`flex items-center justify-between px-3 py-1.5 rounded-lg cursor-pointer group mb-0.5 ${activePageId === node.id ? 'bg-white shadow-sm border border-gray-200 dark:border-slate-700 dark:bg-slate-700' : 'hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-gray-400'}`}
                    style={{ paddingLeft: `${depth * 12 + 28}px` }}
                >
                    <div className="flex items-center gap-2 overflow-hidden">
                        <FileText size={14} className={activePageId === node.id ? "text-blue-600" : "text-gray-400"}/>
                        <span className={`text-sm truncate ${!node.title ? 'italic opacity-50' : ''}`}>{node.title || 'Sans titre'}</span>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); deleteItem(node); }} className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 text-gray-400"><Trash2 size={12}/></button>
                </div>
            );
        });
    };

    return (
        <div className="flex h-[calc(100vh-2rem)] md:h-[calc(100vh-4rem)] max-w-[1600px] mx-auto overflow-hidden bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 fade-in">
            
            {/* --- SIDEBAR GAUCHE (ARBORESCENCE) --- */}
            <div className="w-72 border-r border-gray-200 dark:border-slate-700 flex flex-col bg-gray-50/50 dark:bg-slate-900/50">
                {/* Header Sidebar */}
                <div className="p-4 border-b border-gray-200 dark:border-slate-700">
                    <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 mb-3">
                        <Search size={16} className="text-gray-400"/>
                        <input 
                            type="text" 
                            placeholder="Rechercher..." 
                            className="bg-transparent outline-none text-sm w-full dark:text-white"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => createPage(null)} className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-1.5 rounded-lg text-xs font-bold transition-colors">
                            <Plus size={14}/> Page
                        </button>
                        <button onClick={() => { setIsCreatingFolder(true); setSelectedFolderId(null); }} className="flex-1 flex items-center justify-center gap-2 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-200 py-1.5 rounded-lg text-xs font-bold transition-colors">
                            <FolderPlus size={14}/> Dossier
                        </button>
                    </div>
                </div>

                {/* Création Dossier Inline */}
                {isCreatingFolder && (
                    <div className="p-2 m-2 bg-white dark:bg-slate-800 rounded-lg border border-blue-200 dark:border-blue-800 shadow-sm animate-in slide-in-from-top-2">
                        <input 
                            autoFocus
                            type="text" 
                            placeholder="Nom du dossier..."
                            className="w-full text-sm mb-2 px-2 py-1 bg-transparent border-b border-blue-200 outline-none dark:text-white"
                            value={newFolderName}
                            onChange={e => setNewFolderName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && createFolder()}
                        />
                        <div className="flex justify-end gap-2 text-xs">
                            <button onClick={() => setIsCreatingFolder(false)} className="text-gray-400 hover:text-gray-600">Annuler</button>
                            <button onClick={createFolder} className="text-blue-600 font-bold">Créer</button>
                        </div>
                    </div>
                )}

                {/* Arbre */}
                <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                    {renderTree(structure)}
                    {structure.length === 0 && !searchQuery && (
                        <div className="text-center mt-10 opacity-40">
                            <Book size={32} className="mx-auto mb-2"/>
                            <p className="text-xs">Carnet vide</p>
                        </div>
                    )}
                </div>
            </div>

            {/* --- ZONE PRINCIPALE (ÉDITEUR) --- */}
            <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 relative">
                {activePageId ? (
                    <>
                        {/* Toolbar */}
                        <div className="h-12 border-b border-gray-100 dark:border-slate-800 flex items-center px-4 gap-2 bg-white dark:bg-slate-900 z-10">
                            <button onClick={() => execCmd('bold')} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-gray-300" title="Gras"><Bold size={16}/></button>
                            <button onClick={() => execCmd('italic')} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-gray-300" title="Italique"><Italic size={16}/></button>
                            <div className="w-px h-4 bg-gray-200 dark:bg-slate-700 mx-1"></div>
                            <button onClick={() => execCmd('formatBlock', 'H2')} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-gray-300" title="Titre"><Heading size={16}/></button>
                            <button onClick={() => execCmd('insertUnorderedList')} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-gray-300" title="Liste"><List size={16}/></button>
                            <div className="flex-1"></div>
                            <button onClick={saveContent} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${isSaving ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-800 dark:text-gray-300'}`}>
                                <Save size={14}/> {isSaving ? 'Enregistré' : 'Sauvegarder'}
                            </button>
                        </div>

                        {/* Zone de saisie */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 max-w-3xl mx-auto w-full">
                            <input 
                                ref={titleRef}
                                type="text" 
                                placeholder="Titre de la page..."
                                className="text-4xl font-bold w-full mb-6 outline-none bg-transparent text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-slate-700"
                                defaultValue={activePageData?.title}
                                onBlur={saveContent}
                            />
                            
                            <div 
                                ref={editorRef}
                                className="prose dark:prose-invert max-w-none outline-none min-h-[50vh] text-gray-700 dark:text-gray-300 leading-relaxed empty:before:content-['Commencez_à_écrire...'] empty:before:text-gray-300"
                                contentEditable
                                dangerouslySetInnerHTML={{ __html: activePageData?.content || '' }}
                                onBlur={saveContent}
                                onInput={() => { if(!isSaving) setIsSaving(false); }} // Simple trigger
                            />
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-300 dark:text-slate-600">
                        <Book size={64} className="mb-4 opacity-50"/>
                        <p className="text-lg font-medium">Sélectionnez ou créez une page</p>
                        <p className="text-sm">Votre second cerveau commence ici.</p>
                    </div>
                )}
            </div>
        </div>
    );
}