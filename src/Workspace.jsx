import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from './supabaseClient';
import { 
  Plus, FileText, Users, ArrowLeft, Trash2, 
  Activity, Target, DollarSign, BarChart2, Share2, Menu, 
  Sun, Zap, AlertTriangle, Check, X, Box, Move, ZoomIn, ZoomOut, Maximize
} from 'lucide-react';

// --- MODULES ---
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
// COMPOSANT POST-IT (EXTERNE POUR EVITER LE BUG DE FOCUS)
// ==========================================
const PostIt = ({ item, update, remove, color }) => (
    <div className={`p-2 rounded border mb-2 text-xs group relative ${color === 'blue' ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' : color === 'red' ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800' : color === 'green' ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' : 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800'}`}>
        <textarea 
            value={item.text || ''} 
            onChange={e => update(item.id, 'text', e.target.value)} 
            className="w-full bg-transparent outline-none resize-none text-slate-800 dark:text-slate-200 leading-relaxed" 
            rows={3}
            placeholder="..."
        />
        <button 
            onClick={() => remove(item.id)} 
            className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600 p-1 bg-white/50 dark:bg-black/50 rounded"
        >
            <Trash2 size={10}/>
        </button>
    </div>
);

// ==========================================
// 1. MODULE CARNET
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
// 2. MODULE STRATÉGIE (SANS BUG DE FOCUS)
// ==========================================
const StrategyModule = ({ venture }) => {
    const [view, setView] = useState('canvas');
    const [data, setData] = useState({});
    const [loading, setLoading] = useState(true);
    const saveTimeoutRef = useRef({}); 

    const SECTIONS_CANVAS = [
        { id: 'partners', label: 'Partenaires Clés', icon: Share2, col: 'md:col-span-2 md:row-span-2', color: 'blue' },
        { id: 'activities', label: 'Activités Clés', icon: Activity, col: 'md:col-span-2 md:row-span-1', color: 'yellow' },
        { id: 'valueProps', label: 'Propositions de Valeur', icon: Sun, col: 'md:col-span-2 md:row-span-2', color: 'red' },
        { id: 'relationships', label: 'Relations Client', icon: Users, col: 'md:col-span-2 md:row-span-1', color: 'green' },
        { id: 'segments', label: 'Segments Clients', icon: Target, col: 'md:col-span-2 md:row-span-2', color: 'green' },
        { id: 'resources', label: 'Ressources Clés', icon: Box, col: 'md:col-span-2 md:row-span-1', color: 'yellow' },
        { id: 'channels', label: 'Canaux', icon: Menu, col: 'md:col-span-2 md:row-span-1', color: 'green' },
        { id: 'cost', label: 'Structure de Coûts', icon: DollarSign, col: 'md:col-span-5 md:row-span-1', color: 'red' },
        { id: 'revenue', label: 'Flux de Revenus', icon: BarChart2, col: 'md:col-span-5 md:row-span-1', color: 'green' },
    ];
    const SECTIONS_SWOT = [
        { id: 'strengths', label: 'Forces', icon: Check, color: 'green' },
        { id: 'weaknesses', label: 'Faiblesses', icon: X, color: 'red' },
        { id: 'opportunities', label: 'Opportunités', icon: Zap, color: 'blue' },
        { id: 'threats', label: 'Menaces', icon: AlertTriangle, color: 'yellow' },
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
                            {data[s.id]?.map(i => (
                                <PostIt 
                                    key={i.id} 
                                    item={i} 
                                    color={s.color} 
                                    update={(id, f, v) => handleUpdate(s.id, data[s.id].map(x => x.id === id ? { ...x, [f]: v } : x))} 
                                    remove={(id) => handleUpdate(s.id, data[s.id].filter(x => x.id !== id))} 
                                />
                            ))}
                            <button onClick={() => handleUpdate(s.id, [...(data[s.id] || []), { id: Date.now(), text: '' }])} className="w-full py-1 text-xs font-bold text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded border border-dashed border-slate-200 dark:border-slate-800"><Plus size={12} className="inline"/> Ajouter</button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// ==========================================
// 3. MODULE MINDMAP (AMÉLIORÉ : ZOOM, PAN, SVG FLUIDE)
// ==========================================
const MindmapModule = ({ venture }) => {
    const [nodes, setNodes] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [pan, setPan] = useState({ x: 0, y: 0 }); // Navigation (Pan)
    const [scale, setScale] = useState(1); // Zoom
    const [isPanning, setIsPanning] = useState(false);
    const [draggingNode, setDraggingNode] = useState(null); // { id, offsetX, offsetY }
    const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
    
    const containerRef = useRef(null);
    const saveTimeoutRef = useRef(null);

    // Initialisation
    useEffect(() => {
        const load = async () => {
            const { data } = await supabase.from('venture_mindmaps').select('content').eq('venture_id', venture.id).single();
            if (data && data.content && data.content.length > 0) {
                setNodes(data.content);
                // Centrer la vue (simple)
                setPan({ x: 0, y: 0 });
            } else {
                const root = [{ id: 'root', x: 400, y: 300, label: venture.title || 'Idée Centrale', type: 'root' }];
                setNodes(root);
                await supabase.from('venture_mindmaps').upsert({ venture_id: venture.id, content: root }, { onConflict: 'venture_id' });
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

    // --- ACTIONS ---
    const addNode = () => {
        if (!selectedId) { alert("Sélectionnez une carte parente d'abord !"); return; }
        const parent = nodes.find(n => n.id === selectedId);
        if (!parent) return;

        const newNode = {
            id: Date.now().toString(),
            x: parent.x + 220, // Un peu plus loin
            y: parent.y + (Math.random() * 100 - 50),
            label: 'Nouvelle idée',
            parentId: selectedId,
            type: 'child'
        };
        setNodes([...nodes, newNode]);
        setSelectedId(newNode.id);
    };

    const deleteNode = () => {
        if (!selectedId || selectedId === 'root') return;
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

    // --- GESTION SOURIS (PAN & DRAG) ---
    const handleMouseDown = (e, nodeId = null) => {
        if (nodeId) {
            // Start Dragging Node
            e.stopPropagation(); // Ne pas déclencher le Pan
            const node = nodes.find(n => n.id === nodeId);
            setSelectedId(nodeId);
            setDraggingNode({ id: nodeId, startX: e.clientX, startY: e.clientY });
        } else {
            // Start Panning Canvas
            setIsPanning(true);
            setLastMousePos({ x: e.clientX, y: e.clientY });
            setSelectedId(null); // Deselect on click empty space
        }
    };

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (draggingNode) {
                // Deplacer le noeud (en tenant compte du zoom !)
                const dx = (e.clientX - draggingNode.startX) / scale;
                const dy = (e.clientY - draggingNode.startY) / scale;
                
                setNodes(prev => prev.map(n => 
                    n.id === draggingNode.id 
                    ? { ...n, x: n.x + dx, y: n.y + dy } 
                    : n
                ));
                // Update start position for next frame
                setDraggingNode(prev => ({ ...prev, startX: e.clientX, startY: e.clientY }));
            } else if (isPanning) {
                // Deplacer le canvas
                const dx = e.clientX - lastMousePos.x;
                const dy = e.clientY - lastMousePos.y;
                setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
                setLastMousePos({ x: e.clientX, y: e.clientY });
            }
        };

        const handleMouseUp = () => {
            setDraggingNode(null);
            setIsPanning(false);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [draggingNode, isPanning, lastMousePos, scale]);

    const updateLabel = (id, newLabel) => {
        setNodes(nodes.map(n => n.id === id ? { ...n, label: newLabel } : n));
    };

    // Rendu des lignes courbes (Bézier)
    const renderLines = () => {
        return nodes.map(node => {
            if (!node.parentId) return null;
            const parent = nodes.find(n => n.id === node.parentId);
            if (!parent) return null;

            // Dimensions approx d'une carte (180x60)
            const w = 180; const h = 60;
            const startX = parent.x + w; // Sortie à droite du parent
            const startY = parent.y + h/2; // Milieu vertical
            const endX = node.x; // Entrée à gauche de l'enfant
            const endY = node.y + h/2; // Milieu vertical

            // Courbe
            const dist = Math.abs(endX - startX) / 2;
            const cp1x = startX + dist;
            const cp1y = startY;
            const cp2x = endX - dist;
            const cp2y = endY;

            const pathData = `M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`;

            return (
                <path 
                    key={`link-${node.id}`} d={pathData}
                    fill="none" stroke="#cbd5e1" strokeWidth="2" className="dark:stroke-slate-700"
                />
            );
        });
    };

    return (
        <div className="h-full w-full bg-slate-100 dark:bg-slate-950 relative overflow-hidden flex flex-col">
            {/* Toolbar */}
            <div className="absolute top-4 left-4 z-20 flex gap-2 p-1 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800">
                <button onClick={addNode} className="p-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-indigo-600 rounded-lg transition-colors" title="Ajouter Enfant"><Plus size={20}/></button>
                <div className="w-px bg-slate-200 dark:bg-slate-700 mx-1"></div>
                <button onClick={deleteNode} className={`p-2 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-500 rounded-lg transition-colors ${(!selectedId || selectedId === 'root') ? 'opacity-30 cursor-not-allowed' : ''}`} title="Supprimer"><Trash2 size={20}/></button>
            </div>

            {/* Zoom Controls */}
            <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-2 p-1 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800">
                <button onClick={() => setScale(s => Math.min(s + 0.1, 2))} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg"><ZoomIn size={20}/></button>
                <button onClick={() => { setScale(1); setPan({x:0,y:0}); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg"><Maximize size={20}/></button>
                <button onClick={() => setScale(s => Math.max(s - 0.1, 0.5))} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg"><ZoomOut size={20}/></button>
            </div>

            {/* Canvas infini */}
            <div 
                ref={containerRef}
                className={`w-full h-full cursor-grab ${isPanning ? 'cursor-grabbing' : ''}`}
                onMouseDown={(e) => handleMouseDown(e)}
            >
                <div 
                    style={{ 
                        transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
                        transformOrigin: '0 0',
                        width: '100%', height: '100%',
                        position: 'absolute'
                    }}
                >
                    <svg className="absolute top-0 left-0 overflow-visible pointer-events-none z-0" width="100%" height="100%">
                        {renderLines()}
                    </svg>

                    {nodes.map(node => (
                        <div 
                            key={node.id}
                            style={{ 
                                transform: `translate(${node.x}px, ${node.y}px)`,
                                width: '180px',
                                cursor: draggingNode?.id === node.id ? 'grabbing' : 'grab'
                            }}
                            className={`absolute top-0 left-0 p-4 rounded-2xl shadow-sm transition-shadow duration-200 flex flex-col items-center justify-center backdrop-blur-sm z-10
                                ${selectedId === node.id 
                                    ? 'ring-2 ring-indigo-500 shadow-xl bg-white dark:bg-slate-800 z-50' 
                                    : 'border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/90 hover:border-indigo-300'}
                                ${node.type === 'root' ? 'bg-indigo-50/90 dark:bg-indigo-900/40 border-indigo-200 dark:border-indigo-800' : ''}
                            `}
                            onMouseDown={(e) => handleMouseDown(e, node.id)}
                        >
                            <input 
                                value={node.label} 
                                onChange={(e) => updateLabel(node.id, e.target.value)} 
                                className={`w-full bg-transparent text-center outline-none break-words font-medium ${node.type === 'root' ? 'text-indigo-700 dark:text-indigo-300 text-sm font-bold uppercase tracking-wide' : 'text-slate-700 dark:text-slate-200 text-sm'}`} 
                                placeholder="Idée..." 
                            />
                            {node.type !== 'root' && (
                                <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-indigo-400 rounded-full"></div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
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