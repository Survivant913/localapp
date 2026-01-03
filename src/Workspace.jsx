import { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import { 
  Plus, FileText, Users, Activity, 
  Trash2, ArrowLeft, Save, MousePointer2, Move, Type
} from 'lucide-react';

// --- MODULES ACTIFS ---
const MODULES = [
    { id: 'editor', label: 'Carnet', icon: FileText },
    { id: 'business', label: 'Stratégie', icon: Users },
    { id: 'mindmap', label: 'Mindmap', icon: Activity },
];

function useAutoSave(value, delay = 1000, callback) {
    useEffect(() => {
        const handler = setTimeout(() => {
            if (value !== undefined) callback(value);
        }, delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
}

// ==========================================
// 1. MODULE CARNET (Code inchangé)
// ==========================================
const EditorModule = ({ venture }) => {
    const [pages, setPages] = useState([]);
    const [activePageId, setActivePageId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!venture) return;
        const fetchPages = async () => {
            const { data } = await supabase.from('venture_pages').select('*').eq('venture_id', venture.id).order('created_at', { ascending: true });
            if (data) { setPages(data); if (data.length > 0) setActivePageId(data[0].id); }
            setLoading(false);
        };
        fetchPages();
    }, [venture]);

    const createPage = async () => {
        const { data } = await supabase.from('venture_pages').insert([{ venture_id: venture.id, title: 'Nouvelle Page', content: '' }]).select();
        if (data) { setPages([...pages, data[0]]); setActivePageId(data[0].id); }
    };

    const deletePage = async (id, e) => {
        e.stopPropagation(); if (!window.confirm("Supprimer ?")) return;
        await supabase.from('venture_pages').delete().eq('id', id);
        const newPages = pages.filter(p => p.id !== id);
        setPages(newPages);
        if (activePageId === id) setActivePageId(newPages[0]?.id || null);
    };

    const updateLocalPage = (id, field, value) => { setPages(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p)); };
    const activePage = pages.find(p => p.id === activePageId);

    useAutoSave(activePage, 1500, async (pageToSave) => {
        if (!pageToSave) return; setSaving(true);
        try { await supabase.from('venture_pages').update({ title: pageToSave.title, content: pageToSave.content }).eq('id', pageToSave.id); } 
        finally { setSaving(false); }
    });

    if (loading) return <div className="h-full flex items-center justify-center text-slate-400">Chargement...</div>;

    return (
        <div className="flex h-full w-full bg-white dark:bg-slate-900">
            <div className="w-64 bg-slate-50 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center"><span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pages</span><button onClick={createPage} className="p-1.5 hover:bg-white dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400 transition-colors"><Plus size={16}/></button></div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">{pages.map(page => (<div key={page.id} onClick={() => setActivePageId(page.id)} className={`group flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer text-sm transition-all ${activePageId === page.id ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-600 dark:text-indigo-400 font-medium' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-900'}`}><span className="truncate flex-1">{page.title || 'Sans titre'}</span><button onClick={(e) => deletePage(page.id, e)} className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500"><Trash2 size={12}/></button></div>))}</div>
            </div>
            <div className="flex-1 flex flex-col relative min-w-0 bg-white dark:bg-black">
                {activePage ? (<><div className="px-8 pt-8 pb-4 border-b border-slate-100 dark:border-slate-800"><input type="text" value={activePage.title} onChange={(e) => updateLocalPage(activePage.id, 'title', e.target.value)} placeholder="Titre de la page" className="w-full text-3xl font-bold text-slate-800 dark:text-white bg-transparent outline-none placeholder-slate-300 dark:placeholder-slate-700" />{saving && <span className="text-xs text-slate-400 animate-pulse absolute top-4 right-8">Sauvegarde...</span>}</div><textarea className="flex-1 w-full p-8 resize-none outline-none bg-transparent text-slate-700 dark:text-slate-200 leading-relaxed font-mono text-base custom-scrollbar" placeholder="Écrivez ici..." value={activePage.content || ''} onChange={(e) => updateLocalPage(activePage.id, 'content', e.target.value)}></textarea></>) : (<div className="flex-1 flex flex-col items-center justify-center text-slate-300 dark:text-slate-700"><FileText size={48} className="mb-4 opacity-50"/><p>Sélectionnez une page</p></div>)}
            </div>
        </div>
    );
};

// ==========================================
// 2. MODULE STRATÉGIE (Code inchangé)
// ==========================================
// ... (Je garde le composant StrategyModule identique pour gagner de la place, 
// je le remets complet ci-dessous pour être sûr que tu as tout le fichier)
const StrategyModule = ({ venture }) => {
    const [view, setView] = useState('canvas');
    const [data, setData] = useState({});
    const [loading, setLoading] = useState(true);
    const saveTimeoutRef = useRef({}); 

    const SECTIONS_CANVAS = [
        { id: 'partners', label: 'Partenaires Clés', icon: Users, col: 'md:col-span-2 md:row-span-2', color: 'blue' },
        { id: 'activities', label: 'Activités Clés', icon: Activity, col: 'md:col-span-2 md:row-span-1', color: 'yellow' },
        { id: 'valueProps', label: 'Propositions de Valeur', icon: Activity, col: 'md:col-span-2 md:row-span-2', color: 'red' },
        { id: 'relationships', label: 'Relations Client', icon: Users, col: 'md:col-span-2 md:row-span-1', color: 'green' },
        { id: 'segments', label: 'Segments Clients', icon: Users, col: 'md:col-span-2 md:row-span-2', color: 'green' },
        { id: 'resources', label: 'Ressources Clés', icon: FileText, col: 'md:col-span-2 md:row-span-1', color: 'yellow' },
        { id: 'channels', label: 'Canaux', icon: Activity, col: 'md:col-span-2 md:row-span-1', color: 'green' },
        { id: 'cost', label: 'Structure de Coûts', icon: Trash2, col: 'md:col-span-5 md:row-span-1', color: 'red' },
        { id: 'revenue', label: 'Flux de Revenus', icon: Activity, col: 'md:col-span-5 md:row-span-1', color: 'green' },
    ];
    const SECTIONS_SWOT = [
        { id: 'strengths', label: 'Forces', icon: Activity, color: 'green' },
        { id: 'weaknesses', label: 'Faiblesses', icon: Trash2, color: 'red' },
        { id: 'opportunities', label: 'Opportunités', icon: Activity, color: 'blue' },
        { id: 'threats', label: 'Menaces', icon: Activity, color: 'yellow' },
    ];

    useEffect(() => {
        if (!venture) return;
        const loadStrategy = async () => {
            const { data: rows } = await supabase.from('venture_strategies').select('*').eq('venture_id', venture.id);
            const formatted = {};
            if (rows) rows.forEach(row => formatted[row.section_id] = row.content);
            setData(formatted);
            setLoading(false);
        };
        loadStrategy();
    }, [venture]);

    const handleUpdate = (sectionId, newItems) => {
        setData(prev => ({ ...prev, [sectionId]: newItems }));
        if (saveTimeoutRef.current[sectionId]) clearTimeout(saveTimeoutRef.current[sectionId]);
        saveTimeoutRef.current[sectionId] = setTimeout(async () => {
            const type = SECTIONS_CANVAS.find(s => s.id === sectionId) ? 'canvas' : 'swot';
            await supabase.from('venture_strategies').upsert({ venture_id: venture.id, type, section_id: sectionId, content: newItems }, { onConflict: 'venture_id, section_id' });
        }, 1000);
    };

    // Petit composant Post-it interne pour éviter dépendance externe
    const PostIt = ({ item, update, remove, color }) => (
        <div className={`p-2 rounded border mb-2 text-xs ${color === 'blue' ? 'bg-blue-50 border-blue-200' : color === 'red' ? 'bg-red-50 border-red-200' : color === 'green' ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
            <textarea value={item.text} onChange={e => update(item.id, 'text', e.target.value)} className="w-full bg-transparent outline-none resize-none text-slate-800" rows={2}/>
            <button onClick={() => remove(item.id)} className="text-red-400 hover:text-red-600"><Trash2 size={10}/></button>
        </div>
    );

    if (loading) return <div className="h-full flex items-center justify-center text-slate-400">Chargement...</div>;

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-hidden">
            <div className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between px-6 shrink-0">
                <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                    <button onClick={() => setView('canvas')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${view === 'canvas' ? 'bg-white dark:bg-slate-600 shadow-sm text-indigo-600 dark:text-white' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}>Canvas</button>
                    <button onClick={() => setView('swot')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${view === 'swot' ? 'bg-white dark:bg-slate-600 shadow-sm text-indigo-600 dark:text-white' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}>SWOT</button>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
                <div className={`grid gap-4 ${view === 'canvas' ? 'grid-cols-1 md:grid-cols-10' : 'grid-cols-1 md:grid-cols-2'}`}>
                    {(view === 'canvas' ? SECTIONS_CANVAS : SECTIONS_SWOT).map(s => (
                        <div key={s.id} className={`${s.col || ''} bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 min-h-[150px]`}>
                            <h3 className="font-bold text-slate-700 dark:text-gray-200 flex items-center gap-2 text-xs uppercase mb-2"><s.icon size={14} className="text-indigo-500"/> {s.label}</h3>
                            {data[s.id]?.map(i => <PostIt key={i.id} item={i} color={s.color} update={(id, f, v) => handleUpdate(s.id, data[s.id].map(x => x.id === id ? { ...x, [f]: v } : x))} remove={(id) => handleUpdate(s.id, data[s.id].filter(x => x.id !== id))} />)}
                            <button onClick={() => handleUpdate(s.id, [...(data[s.id] || []), { id: Date.now(), text: '' }])} className="w-full py-1 text-xs font-bold text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded border border-dashed border-slate-200 dark:border-slate-800"><Plus size={12} className="inline"/> Ajouter</button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// ==========================================
// 3. MODULE MINDMAP (NOUVEAU & LÉGER)
// ==========================================
const MindmapModule = ({ venture }) => {
    const [nodes, setNodes] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [draggingId, setDraggingId] = useState(null);
    const svgRef = useRef(null);
    const saveTimeoutRef = useRef(null);

    // Initialisation
    useEffect(() => {
        const load = async () => {
            const { data } = await supabase.from('venture_mindmaps').select('content').eq('venture_id', venture.id).single();
            if (data && data.content && data.content.length > 0) {
                setNodes(data.content);
            } else {
                // Créer racine si vide
                const root = [{ id: 'root', x: 400, y: 300, label: venture.title || 'Idée Centrale', type: 'root' }];
                setNodes(root);
                // Sauvegarde initiale
                await supabase.from('venture_mindmaps').insert([{ venture_id: venture.id, content: root }]);
            }
        };
        load();
    }, [venture]);

    // Sauvegarde Auto
    useEffect(() => {
        if (nodes.length === 0) return;
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(async () => {
            await supabase.from('venture_mindmaps').upsert({ venture_id: venture.id, content: nodes }, { onConflict: 'venture_id' });
        }, 1000);
    }, [nodes, venture.id]);

    const addNode = () => {
        if (!selectedId) { alert("Sélectionnez un noeud parent d'abord !"); return; }
        const parent = nodes.find(n => n.id === selectedId);
        const newNode = {
            id: Date.now().toString(),
            x: parent.x + 150,
            y: parent.y + 50,
            label: 'Nouveau',
            parentId: selectedId
        };
        setNodes([...nodes, newNode]);
        setSelectedId(newNode.id);
    };

    const deleteNode = () => {
        if (!selectedId || selectedId === 'root') return;
        // Supprime le noeud et ses enfants (récursif simple)
        const toDelete = new Set([selectedId]);
        let changed = true;
        while(changed) {
            changed = false;
            nodes.forEach(n => {
                if (n.parentId && toDelete.has(n.parentId) && !toDelete.has(n.id)) {
                    toDelete.add(n.id);
                    changed = true;
                }
            });
        }
        setNodes(nodes.filter(n => !toDelete.has(n.id)));
        setSelectedId(null);
    };

    const handleMouseDown = (e, id) => {
        e.stopPropagation();
        setSelectedId(id);
        setDraggingId(id);
    };

    const handleMouseMove = (e) => {
        if (!draggingId) return;
        const svg = svgRef.current;
        const rect = svg.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        setNodes(nodes.map(n => n.id === draggingId ? { ...n, x, y } : n));
    };

    const handleMouseUp = () => {
        setDraggingId(null);
    };

    const updateLabel = (id, newLabel) => {
        setNodes(nodes.map(n => n.id === id ? { ...n, label: newLabel } : n));
    };

    return (
        <div className="h-full w-full bg-slate-50 dark:bg-slate-950 relative overflow-hidden flex flex-col">
            <div className="absolute top-4 left-4 z-10 bg-white dark:bg-slate-800 p-2 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 flex gap-2">
                <button onClick={addNode} className="p-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-indigo-600 rounded" title="Ajouter un enfant"><Plus size={20}/></button>
                <button onClick={deleteNode} className={`p-2 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-500 rounded ${(!selectedId || selectedId === 'root') ? 'opacity-50 cursor-not-allowed' : ''}`} title="Supprimer"><Trash2 size={20}/></button>
                <div className="w-px bg-slate-200 dark:bg-slate-700 mx-1"></div>
                <span className="text-xs text-slate-400 flex items-center px-2">
                    {selectedId ? "1 noeud sélectionné" : "Sélectionnez un noeud"}
                </span>
            </div>

            <svg ref={svgRef} className="w-full h-full cursor-grab active:cursor-grabbing" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onClick={() => setSelectedId(null)}>
                {/* Liens */}
                {nodes.map(node => {
                    if (!node.parentId) return null;
                    const parent = nodes.find(n => n.id === node.parentId);
                    if (!parent) return null;
                    return (
                        <line 
                            key={`link-${node.id}`}
                            x1={parent.x + 60} y1={parent.y + 20} // +60/+20 pour centrer (largeur 120 / hauteur 40)
                            x2={node.x + 60} y2={node.y + 20}
                            stroke="#cbd5e1" strokeWidth="2"
                        />
                    );
                })}

                {/* Noeuds */}
                {nodes.map(node => (
                    <foreignObject key={node.id} x={node.x} y={node.y} width="120" height="40">
                        <div 
                            onMouseDown={(e) => handleMouseDown(e, node.id)}
                            className={`w-full h-full rounded-lg flex items-center justify-center border-2 transition-all shadow-sm select-none ${selectedId === node.id ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/50 shadow-md' : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'}`}
                        >
                            <input 
                                value={node.label}
                                onChange={(e) => updateLabel(node.id, e.target.value)}
                                className="w-full bg-transparent text-center text-xs font-bold text-slate-700 dark:text-slate-200 outline-none px-1"
                            />
                        </div>
                    </foreignObject>
                ))}
            </svg>
        </div>
    );
};

// ==========================================
// WORKSPACE MAIN
// ==========================================
export default function Workspace() {
    const [ventures, setVentures] = useState([]);
    const [activeVenture, setActiveVenture] = useState(null);
    const [loading, setLoading] = useState(true);
    const [newVentureTitle, setNewVentureTitle] = useState("");
    const [activeModuleId, setActiveModuleId] = useState('editor');

    useEffect(() => { fetchVentures(); }, []);

    const fetchVentures = async () => {
        try { const { data, error } = await supabase.from('ventures').select('*').order('last_modified', { ascending: false }); if (error) throw error; setVentures(data || []); } 
        catch (error) { console.error(error); } finally { setLoading(false); }
    };

    const createVenture = async () => {
        if (!newVentureTitle.trim()) return;
        try { const { data } = await supabase.from('ventures').insert([{ title: newVentureTitle, status: 'Idea' }]).select(); setVentures([data[0], ...ventures]); setNewVentureTitle(""); } 
        catch (error) { alert("Erreur"); }
    };

    const deleteVenture = async (id, e) => {
        e.stopPropagation(); if (!window.confirm("Supprimer ?")) return;
        await supabase.from('ventures').delete().eq('id', id); setVentures(ventures.filter(v => v.id !== id));
    };

    if (!activeVenture) {
        return (
            <div className="fade-in p-6 max-w-6xl mx-auto space-y-8"><div className="flex justify-between items-center"><h2 className="text-3xl font-bold text-slate-800 dark:text-white tracking-tight">Workspace</h2></div><div className="bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex gap-2"><input type="text" value={newVentureTitle} onChange={(e) => setNewVentureTitle(e.target.value)} placeholder="Nouveau projet..." className="flex-1 bg-transparent px-4 outline-none text-slate-800 dark:text-white" onKeyDown={(e) => e.key === 'Enter' && createVenture()} /><button onClick={createVenture} className="bg-slate-900 dark:bg-white text-white dark:text-black px-6 py-2 rounded-lg font-bold"><Plus size={18}/></button></div>{loading ? <div className="text-center py-20 text-slate-400">Chargement...</div> : (<div className="grid grid-cols-1 md:grid-cols-3 gap-6">{ventures.map(v => (<div key={v.id} onClick={() => setActiveVenture(v)} className="group bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-indigo-500 cursor-pointer shadow-sm relative"><button onClick={(e) => deleteVenture(v.id, e)} className="absolute top-4 right-4 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 size={16}/></button><h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">{v.title}</h3><div className="text-indigo-500 text-sm font-bold mt-4 flex items-center gap-2">Ouvrir <ArrowLeft size={16} className="rotate-180"/></div></div>))}</div>)}</div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950">
            <header className="h-12 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center px-4 shrink-0 z-20 gap-4"><button onClick={() => setActiveVenture(null)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500"><ArrowLeft size={20}/></button><h2 className="text-sm font-bold text-slate-800 dark:text-white">{activeVenture.title}</h2></header>
            <div className="flex-1 flex overflow-hidden"><nav className="w-14 bg-slate-900 flex flex-col items-center py-4 gap-2 z-30 shrink-0">{MODULES.map(module => (<button key={module.id} onClick={() => setActiveModuleId(module.id)} className={`p-3 rounded-xl transition-all ${activeModuleId === module.id ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-white hover:bg-slate-800'}`} title={module.label}><module.icon size={20}/></button>))}</nav><main className="flex-1 overflow-hidden relative bg-white dark:bg-black">{activeModuleId === 'editor' && <EditorModule venture={activeVenture} />}{activeModuleId === 'business' && <StrategyModule venture={activeVenture} />}{activeModuleId === 'mindmap' && <MindmapModule venture={activeVenture} />}</main></div>
        </div>
    );
}