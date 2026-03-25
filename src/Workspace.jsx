import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { supabase } from './supabaseClient';
import { 
  Plus, FileText, Users, ArrowLeft, Trash2, 
  Activity, Target, DollarSign, BarChart2, Share2, Menu, 
  Sun, Zap, AlertTriangle, Check, X, Box, Move, 
  ZoomIn, ZoomOut, Maximize, GitCommit, GripHorizontal, Minus,
  Wallet, Clock, Trophy, Swords, Settings, Eye, EyeOff,
  Printer, Loader2,
  PieChart, TrendingUp, TrendingDown, LayoutDashboard
} from 'lucide-react';

// --- MODULES ---
const MODULES = [
    { id: 'editor', label: 'Carnet', icon: FileText },
    { id: 'business', label: 'Stratégie', icon: Users },
    { id: 'mindmap', label: 'Mindmap', icon: Activity },
    { id: 'finance', label: 'Finance', icon: DollarSign },
    { id: 'competitors', label: 'Concurrence', icon: Swords },
    { id: 'analytics', label: 'Analyses', icon: LayoutDashboard }, // --- NOUVEAU MODULE ---
];

// --- COULEURS ---
const NODE_COLORS = [
    { id: 'white', bg: 'bg-white dark:bg-slate-800', border: 'border-slate-300 dark:border-slate-600', header: 'bg-slate-100 dark:bg-slate-700' },
    { id: 'blue', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-400 dark:border-blue-700', header: 'bg-blue-100 dark:bg-blue-800' },
    { id: 'green', bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-400 dark:border-emerald-700', header: 'bg-emerald-100 dark:bg-emerald-800' },
    { id: 'yellow', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-400 dark:border-amber-700', header: 'bg-amber-100 dark:bg-amber-800' },
    { id: 'red', bg: 'bg-rose-50 dark:bg-rose-900/20', border: 'border-rose-400 dark:border-rose-700', header: 'bg-rose-100 dark:bg-rose-800' },
    { id: 'purple', bg: 'bg-violet-50 dark:bg-violet-900/20', border: 'border-violet-400 dark:border-violet-700', header: 'bg-violet-100 dark:bg-violet-800' },
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
// COMPOSANT POST-IT (STRATÉGIE)
// ==========================================
const PostIt = ({ item, update, remove, color }) => {
    const textareaRef = useRef(null);
    useLayoutEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto'; 
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [item.text]);

    return (
        <div className={`p-2 rounded border mb-2 text-xs group relative shrink-0 ${color === 'blue' ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' : color === 'red' ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800' : color === 'green' ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' : 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800'}`}>
            <textarea 
                ref={textareaRef}
                value={item.text || ''} 
                onChange={e => update(item.id, 'text', e.target.value)} 
                className="w-full bg-transparent outline-none resize-none text-slate-800 dark:text-slate-200 overflow-hidden block leading-relaxed" 
                rows={1}
                placeholder="..."
                style={{ minHeight: '28px' }}
            />
            <button onClick={() => remove(item.id)} className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600 p-1 bg-white/50 dark:bg-black/50 rounded"><Trash2 size={10}/></button>
        </div>
    );
};

// ==========================================
// COMPOSANT MINDMAP NODE
// ==========================================
const MindmapNode = ({ node, selectedId, setSelectedId, updateLabel, handleMouseDown, toggleCollapse, hasChildren, isVisible }) => {
    const textareaRef = useRef(null);
    
    useLayoutEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [node.label]);

    if (!isVisible) return null;

    const style = NODE_COLORS.find(c => c.id === (node.color || 'white')) || NODE_COLORS[0];

    return (
        <div 
            style={{ transform: `translate(${node.x}px, ${node.y}px)`, width: '180px', height: 'auto' }} 
            className={`absolute top-0 left-0 rounded-xl shadow-sm transition-shadow duration-200 flex flex-col z-10 ${style.bg} border-2 ${selectedId === node.id ? 'border-indigo-500 shadow-xl z-50 ring-2 ring-indigo-500/20' : style.border}`} 
            onClick={(e) => { e.stopPropagation(); setSelectedId(node.id); }}
        >
            <div 
                className={`h-6 rounded-t-lg w-full cursor-grab active:cursor-grabbing flex items-center justify-center ${style.header}`} 
                onMouseDown={(e) => handleMouseDown(e, node.id)}
            >
                <GripHorizontal size={14} className="text-slate-400 dark:text-slate-500 opacity-50"/>
            </div>
            <div className="p-2 relative">
                <textarea 
                    ref={textareaRef}
                    value={node.label} 
                    onChange={(e) => updateLabel(node.id, e.target.value)} 
                    onMouseDown={(e) => e.stopPropagation()} 
                    className={`w-full bg-transparent text-center outline-none resize-none overflow-hidden font-medium text-sm text-slate-800 dark:text-slate-100 block`} 
                    placeholder="Idée..." 
                    rows={1}
                />
                {hasChildren && (
                    <button 
                        onClick={(e) => toggleCollapse(e, node.id)} 
                        className="absolute -right-3 top-1/2 -translate-y-1/2 w-5 h-5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 shadow-sm z-50" 
                        title={node.collapsed ? "Afficher" : "Masquer"}
                    >
                        {node.collapsed ? <Plus size={10} className="text-indigo-500"/> : <Minus size={10} className="text-slate-500"/>}
                    </button>
                )}
            </div>
        </div>
    );
};

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

    const savePageToDb = async (pageToSave) => {
        if (!pageToSave) return;
        setSaving(true);
        try { 
            await supabase.from('venture_pages').update({ title: pageToSave.title, content: pageToSave.content }).eq('id', pageToSave.id); 
        } finally { 
            setSaving(false); 
        }
    };

    useAutoSave(activePage, 1500, savePageToDb);

    if (loading) return <div className="h-full flex items-center justify-center text-slate-400">Chargement...</div>;

    return (
        <div className="flex h-full w-full bg-white dark:bg-slate-900">
            <div className="w-64 bg-slate-50 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center"><span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pages</span><button onClick={createPage} className="p-1.5 hover:bg-white dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400 transition-colors"><Plus size={16}/></button></div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">{pages.map(page => (<div key={page.id} onClick={() => setActivePageId(page.id)} className={`group flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer text-sm transition-all ${activePageId === page.id ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-600 dark:text-indigo-400 font-medium' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-900'}`}><span className="truncate flex-1">{page.title || 'Sans titre'}</span><button onClick={(e) => deletePage(page.id, e)} className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500"><Trash2 size={12}/></button></div>))}</div>
            </div>
            <div className="flex-1 flex flex-col relative min-w-0 bg-white dark:bg-black">
                {activePage ? (
                    <>
                        <div className="px-8 pt-8 pb-4 border-b border-slate-100 dark:border-slate-800">
                            <input 
                                type="text" 
                                value={activePage.title} 
                                onChange={(e) => updateLocalPage(activePage.id, 'title', e.target.value)} 
                                onBlur={() => savePageToDb(activePage)}
                                placeholder="Titre de la page" 
                                className="w-full text-3xl font-bold text-slate-800 dark:text-white bg-transparent outline-none placeholder-slate-300 dark:placeholder-slate-700" 
                            />
                            {saving && <span className="text-xs text-slate-400 animate-pulse absolute top-4 right-8">Sauvegarde...</span>}
                        </div>
                        <textarea 
                            className="flex-1 w-full p-8 resize-none outline-none bg-transparent text-slate-700 dark:text-slate-200 leading-relaxed font-mono text-base custom-scrollbar" 
                            placeholder="Écrivez ici..." 
                            value={activePage.content || ''} 
                            onChange={(e) => updateLocalPage(activePage.id, 'content', e.target.value)}
                            onBlur={() => savePageToDb(activePage)}
                        ></textarea>
                    </>
                ) : (<div className="flex-1 flex flex-col items-center justify-center text-slate-300 dark:text-slate-700"><FileText size={48} className="mb-4 opacity-50"/><p>Sélectionnez une page</p></div>)}
            </div>
        </div>
    );
};

// ==========================================
// 2. MODULE STRATÉGIE
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
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                <div className={`grid gap-4 ${view === 'canvas' ? 'grid-cols-1 md:grid-cols-10 auto-rows-[400px]' : 'grid-cols-1 md:grid-cols-2 auto-rows-[400px]'}`}>
                    {(view === 'canvas' ? SECTIONS_CANVAS : SECTIONS_SWOT).map(s => (
                        <div key={s.id} className={`${s.col || ''} bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col h-full overflow-hidden`}>
                            <h3 className="font-bold text-slate-700 dark:text-gray-200 flex items-center gap-2 text-xs uppercase mb-2 shrink-0"><s.icon size={14} className="text-indigo-500"/> {s.label}</h3>
                            <div className="flex-1 overflow-y-auto min-h-0 pr-1 custom-scrollbar space-y-2">
                                {data[s.id]?.map(i => <PostIt key={i.id} item={i} color={s.color} update={(id, f, v) => handleUpdate(s.id, data[s.id].map(x => x.id === id ? { ...x, [f]: v } : x))} remove={(id) => handleUpdate(s.id, data[s.id].filter(x => x.id !== id))} />)}
                            </div>
                            <button onClick={() => handleUpdate(s.id, [...(data[s.id] || []), { id: Date.now(), text: '' }])} className="mt-2 w-full py-2 text-xs font-bold text-slate-400 hover:text-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-800 rounded border border-dashed border-slate-200 dark:border-slate-800 shrink-0"><Plus size={12} className="inline mr-1"/> Ajouter</button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// ==========================================
// 3. MODULE MINDMAP
// ==========================================
const MindmapModule = ({ venture }) => {
    const [nodes, setNodes] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [scale, setScale] = useState(1);
    const [isPanning, setIsPanning] = useState(false);
    const [draggingNode, setDraggingNode] = useState(null); 
    const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
    
    const nodesRef = useRef(nodes);
    useEffect(() => { nodesRef.current = nodes; }, [nodes]);

    const containerRef = useRef(null);
    const saveTimeoutRef = useRef(null);

    useEffect(() => {
        const load = async () => {
            const { data } = await supabase.from('venture_mindmaps').select('content').eq('venture_id', venture.id).single();
            if (data && data.content && data.content.length > 0) { setNodes(data.content); const centerX = window.innerWidth / 2 - 400; const centerY = window.innerHeight / 2 - 300; setPan({ x: centerX, y: centerY }); } 
            else { const root = [{ id: 'root', x: 400, y: 300, label: venture.title || 'Idée Centrale', type: 'root', color: 'blue', collapsed: false }]; setNodes(root); await supabase.from('venture_mindmaps').upsert({ venture_id: venture.id, content: root }, { onConflict: 'venture_id' }); }
        };
        load();
    }, [venture]);

    useEffect(() => {
        if (nodes.length === 0) return;
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(async () => { await supabase.from('venture_mindmaps').upsert({ venture_id: venture.id, content: nodes }, { onConflict: 'venture_id' }); }, 1000);
    }, [nodes, venture.id]);

    const getDescendants = (nodeId, allNodes) => { let descendants = []; allNodes.filter(n => n.parentId === nodeId).forEach(child => { descendants.push(child.id); descendants = [...descendants, ...getDescendants(child.id, allNodes)]; }); return descendants; };
    const isVisible = (nodeId) => { const node = nodes.find(n => n.id === nodeId); if (!node) return false; if (!node.parentId) return true; const parent = nodes.find(n => n.id === node.parentId); if (!parent) return false; if (parent.collapsed) return false; return isVisible(parent.id); };

    const addNode = () => { if (!selectedId) { alert("Sélectionnez une carte !"); return; } const parent = nodes.find(n => n.id === selectedId); if (!parent) return; if (parent.collapsed) { setNodes(prev => prev.map(n => n.id === parent.id ? { ...n, collapsed: false } : n)); } const newNode = { id: Date.now().toString(), x: parent.x + 240, y: parent.y, label: 'Nouvelle idée', parentId: selectedId, type: 'child', color: parent.color || 'white', collapsed: false }; setNodes(prev => [...prev, newNode]); setSelectedId(newNode.id); };
    const addRoot = () => { const viewportCenterX = (-pan.x + (containerRef.current?.clientWidth || 800) / 2) / scale; const viewportCenterY = (-pan.y + (containerRef.current?.clientHeight || 600) / 2) / scale; const newRoot = { id: Date.now().toString(), x: viewportCenterX - 90, y: viewportCenterY - 40, label: 'Nouvelle Source', type: 'root', color: 'blue', collapsed: false }; setNodes([...nodes, newRoot]); setSelectedId(newRoot.id); };
    const deleteNode = () => { if (!selectedId) return; const toDelete = new Set([selectedId, ...getDescendants(selectedId, nodes)]); setNodes(nodes.filter(n => !toDelete.has(n.id))); setSelectedId(null); };
    const toggleCollapse = (e, nodeId) => { e.stopPropagation(); setNodes(nodes.map(n => n.id === nodeId ? { ...n, collapsed: !n.collapsed } : n)); };
    const updateColor = (colorId) => { if(!selectedId) return; setNodes(nodes.map(n => n.id === selectedId ? { ...n, color: colorId } : n)); };

    const handleMouseDown = (e, nodeId = null) => { if (nodeId) { e.stopPropagation(); setSelectedId(nodeId); setDraggingNode({ id: nodeId, lastX: e.clientX, lastY: e.clientY }); } else { setIsPanning(true); setLastMousePos({ x: e.clientX, y: e.clientY }); setSelectedId(null); } };
    
    useEffect(() => { 
        const handleMouseMove = (e) => { 
            if (draggingNode) { 
                const currentNodes = nodesRef.current;
                const deltaX = (e.clientX - draggingNode.lastX) / scale; 
                const deltaY = (e.clientY - draggingNode.lastY) / scale; 
                const nodesToMove = new Set([draggingNode.id, ...getDescendants(draggingNode.id, currentNodes)]); 
                setNodes(prev => prev.map(n => nodesToMove.has(n.id) ? { ...n, x: n.x + deltaX, y: n.y + deltaY } : n)); 
                setDraggingNode(prev => ({ ...prev, lastX: e.clientX, lastY: e.clientY })); 
            } else if (isPanning) { 
                const dx = e.clientX - lastMousePos.x; 
                const dy = e.clientY - lastMousePos.y; 
                setPan(prev => ({ x: prev.x + dx, y: prev.y + dy })); 
                setLastMousePos({ x: e.clientX, y: e.clientY }); 
            } 
        }; 
        const handleMouseUp = () => { setDraggingNode(null); setIsPanning(false); }; 
        window.addEventListener('mousemove', handleMouseMove); 
        window.addEventListener('mouseup', handleMouseUp); 
        return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); }; 
    }, [draggingNode, isPanning, lastMousePos, scale]);

    const updateLabel = (id, newLabel) => { setNodes(nodes.map(n => n.id === id ? { ...n, label: newLabel } : n)); };

    const renderLines = () => nodes.map(node => { if (!isVisible(node.id)) return null; if (!node.parentId) return null; const parent = nodes.find(n => n.id === node.parentId); if (!parent) return null; const w = 180; const startX = parent.x + w; const startY = parent.y + 40; const endX = node.x; const endY = node.y + 40; const dist = Math.abs(endX - startX) / 2; const pathData = `M ${startX} ${startY} C ${startX + dist} ${startY}, ${endX - dist} ${endY}, ${endX} ${endY}`; return (<path key={`link-${node.id}`} d={pathData} fill="none" stroke="#cbd5e1" strokeWidth="2" className="dark:stroke-slate-700" />); });

    return (
        <div className="h-full w-full bg-slate-100 dark:bg-slate-950 relative overflow-hidden flex flex-col">
            <div className="absolute top-4 left-4 z-20 flex flex-col gap-2"><div className="flex gap-2 p-1 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800"><button onClick={addNode} className="p-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-indigo-600 rounded-lg transition-colors"><GitCommit size={20}/></button><button onClick={addRoot} className="p-2 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 text-emerald-600 rounded-lg transition-colors"><Plus size={20}/></button><div className="w-px bg-slate-200 dark:bg-slate-700 mx-1"></div><button onClick={deleteNode} className={`p-2 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-500 rounded-lg transition-colors ${!selectedId ? 'opacity-30' : ''}`}><Trash2 size={20}/></button></div>{selectedId && (<div className="flex gap-1 p-2 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 animate-in slide-in-from-left-2 fade-in duration-200">{NODE_COLORS.map(c => (<button key={c.id} onClick={() => updateColor(c.id)} className={`w-6 h-6 rounded-full border shadow-sm ${c.bg.split(' ')[0]} ${c.border.split(' ')[0]}`}/>))}</div>)}</div>
            <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-2 p-1 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800"><button onClick={() => setScale(s => Math.min(s + 0.1, 2))} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg"><ZoomIn size={20}/></button><button onClick={() => { setScale(1); setPan({x:0,y:0}); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg"><Maximize size={20}/></button><button onClick={() => setScale(s => Math.max(s - 0.1, 0.5))} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg"><ZoomOut size={20}/></button></div>
            <div ref={containerRef} className={`w-full h-full cursor-grab ${isPanning ? 'cursor-grabbing' : ''}`} onMouseDown={(e) => handleMouseDown(e)}>
                <div style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`, transformOrigin: '0 0', width: '100%', height: '100%', position: 'absolute' }}>
                    <svg className="absolute top-0 left-0 overflow-visible pointer-events-none z-0" width="100%" height="100%">{renderLines()}</svg>
                    {nodes.map(node => (
                        <MindmapNode 
                            key={node.id} 
                            node={node} 
                            selectedId={selectedId} 
                            setSelectedId={setSelectedId} 
                            updateLabel={updateLabel} 
                            handleMouseDown={handleMouseDown} 
                            toggleCollapse={toggleCollapse}
                            hasChildren={nodes.some(n => n.parentId === node.id)}
                            isVisible={isVisible(node.id)}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

// ==========================================
// 4. MODULE FINANCE
// ==========================================
const FinanceModule = ({ venture }) => {
    const [activeScenario, setActiveScenario] = useState('realistic');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const saveTimeoutRef = useRef(null);

    const DEFAULT_DATA = {
        capital: 5000,
        realistic: { fixed: 1500, var: 10, price: 50, target: 100 },
        optimistic: { fixed: 1500, var: 8, price: 60, target: 150 },
        pessimistic: { fixed: 1800, var: 12, price: 40, target: 50 }
    };

    useEffect(() => {
        const load = async () => {
            const { data: dbData } = await supabase.from('venture_financials').select('scenarios').eq('venture_id', venture.id).single();
            if (dbData) setData(dbData.scenarios);
            else {
                setData(DEFAULT_DATA);
                await supabase.from('venture_financials').upsert({ venture_id: venture.id, scenarios: DEFAULT_DATA }, { onConflict: 'venture_id' });
            }
            setLoading(false);
        };
        load();
    }, [venture]);

    const updateData = (field, value, isGlobal = false) => {
        const newData = { ...data };
        if (isGlobal) newData[field] = parseFloat(value) || 0;
        else newData[activeScenario][field] = parseFloat(value) || 0;
        
        setData(newData);
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(async () => {
            await supabase.from('venture_financials').upsert({ venture_id: venture.id, scenarios: newData }, { onConflict: 'venture_id' });
        }, 1000);
    };

    if (loading || !data) return <div className="h-full flex items-center justify-center text-slate-400">Chargement...</div>;

    const s = data[activeScenario];
    const breakevenQty = s.price > s.var ? Math.ceil(s.fixed / (s.price - s.var)) : 0;
    const breakevenRev = breakevenQty * s.price;
    const projectedRevenue = s.target * s.price;
    const projectedCost = s.fixed + (s.target * s.var);
    const profit = projectedRevenue - projectedCost;
    const monthlyBurn = Math.abs(profit); 
    const runway = profit >= 0 ? "∞" : (monthlyBurn > 0 ? (data.capital / monthlyBurn).toFixed(1) : "0");

    const WIDTH = 1000;
    const HEIGHT = 400;
    const PADDING = 60; 
    const graphMaxX = Math.max(breakevenQty * 1.5, s.target * 1.2, 10);
    const graphMaxY = Math.max(breakevenRev * 1.2, projectedRevenue * 1.2, 100);
    const effectiveW = WIDTH - (PADDING * 2);
    const effectiveH = HEIGHT - (PADDING * 2);
    const xToPx = (val) => PADDING + (val / graphMaxX) * effectiveW;
    const yToPx = (val) => (HEIGHT - PADDING) - (val / graphMaxY) * effectiveH;
    const ptStart = { x: PADDING, y: yToPx(s.fixed) };
    const ptEndCost = { x: WIDTH - PADDING, y: yToPx(s.fixed + (s.var * graphMaxX)) };
    const ptEndRev = { x: WIDTH - PADDING, y: yToPx(s.price * graphMaxX) };
    const ptBreakeven = { x: xToPx(breakevenQty), y: yToPx(breakevenRev) };
    const ptTarget = { x: xToPx(s.target), y: yToPx(projectedRevenue) };

    return (
        <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden">
            <div className="h-16 px-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white dark:bg-slate-900">
                <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                    {['realistic', 'optimistic', 'pessimistic'].map(key => (
                        <button key={key} onClick={() => setActiveScenario(key)} className={`px-4 py-1.5 rounded-md text-sm font-bold capitalize transition-all ${activeScenario === key ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}>
                            {key === 'realistic' ? 'Réaliste' : key === 'optimistic' ? 'Optimiste' : 'Pessimiste'}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-400 uppercase">Capital Départ</span>
                    <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg px-3 py-1.5 border border-slate-200 dark:border-slate-700">
                        <Wallet size={16} className="text-slate-400 mr-2"/>
                        <input type="number" value={data.capital} onChange={e => updateData('capital', e.target.value, true)} className="w-20 bg-transparent text-sm font-bold text-right outline-none text-slate-800 dark:text-white"/>
                        <span className="text-xs font-bold text-slate-400 ml-1">€</span>
                    </div>
                    <div className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 ${parseFloat(runway) < 3 && runway !== "∞" ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                        <Clock size={14}/> Runway: {runway} {runway !== "∞" ? 'mois' : ''}
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <h3 className="text-sm font-bold text-slate-500 uppercase mb-4 flex items-center gap-2"><Menu size={16}/> Paramètres ({activeScenario})</h3>
                        <div className="space-y-4">
                            <div><label className="text-xs font-bold text-slate-400 mb-1 block">Coûts Fixes (Mensuel)</label><input type="number" value={s.fixed} onChange={e => updateData('fixed', e.target.value)} className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-700 dark:text-white outline-none focus:border-indigo-500"/></div>
                            <div><label className="text-xs font-bold text-slate-400 mb-1 block">Coût Variable (Unitaire)</label><input type="number" value={s.var} onChange={e => updateData('var', e.target.value)} className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-700 dark:text-white outline-none focus:border-indigo-500"/></div>
                            <div><label className="text-xs font-bold text-slate-400 mb-1 block">Prix de Vente</label><input type="number" value={s.price} onChange={e => updateData('price', e.target.value)} className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-700 dark:text-white outline-none focus:border-indigo-500"/></div>
                            <div><label className="text-xs font-bold text-slate-400 mb-1 block">Objectif Ventes (Unités)</label><input type="number" value={s.target} onChange={e => updateData('target', e.target.value)} className="w-full p-2 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg text-sm font-bold text-indigo-700 dark:text-indigo-300 outline-none focus:border-indigo-500"/></div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center text-center">
                        <h3 className="text-xs font-bold text-slate-400 uppercase mb-2">Seuil de Rentabilité</h3>
                        <div className="text-5xl font-black text-slate-800 dark:text-white mb-1">{breakevenQty}</div>
                        <div className="text-sm font-medium text-slate-400">unités à vendre</div>
                        <div className="mt-4 px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-xs font-bold text-slate-500">soit {breakevenRev} € de CA</div>
                    </div>

                    <div className={`p-5 rounded-2xl border shadow-sm flex flex-col items-center justify-center text-center ${profit >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'}`}>
                        <h3 className={`text-xs font-bold uppercase mb-2 ${profit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>Résultat Projeté</h3>
                        <div className={`text-5xl font-black mb-1 ${profit >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>{profit > 0 ? '+' : ''}{parseFloat(profit).toFixed(2)} €</div>
                        <div className={`text-sm font-bold ${profit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{profit >= 0 ? 'Rentable ! 🚀' : 'Déficitaire ⚠️'}</div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm h-96 relative flex flex-col">
                    <h3 className="text-sm font-bold text-slate-500 uppercase mb-4">Analyse du Point Mort</h3>
                    <div className="flex-1 w-full h-full relative">
                        <svg className="w-full h-full overflow-hidden rounded-lg" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="xMidYMid meet">
                            <polygon points={`${ptBreakeven.x},${ptBreakeven.y} ${WIDTH-PADDING},${ptEndRev.y} ${WIDTH-PADDING},${ptEndCost.y}`} fill="rgba(16, 185, 129, 0.1)" />
                            <line x1={PADDING} y1={HEIGHT-PADDING} x2={WIDTH-PADDING} y2={HEIGHT-PADDING} stroke="#e2e8f0" strokeWidth="1" className="dark:stroke-slate-700" />
                            <line x1={PADDING} y1={PADDING} x2={PADDING} y2={HEIGHT-PADDING} stroke="#e2e8f0" strokeWidth="1" className="dark:stroke-slate-700" />
                            <line x1={ptTarget.x} y1={HEIGHT-PADDING} x2={ptTarget.x} y2={ptTarget.y} stroke="#6366f1" strokeWidth="1" strokeDasharray="4,4" />
                            <line x1={PADDING} y1={HEIGHT-PADDING} x2={WIDTH-PADDING} y2={ptEndRev.y} stroke="#10b981" strokeWidth="2" />
                            <text x={WIDTH-PADDING} y={ptEndRev.y - 10} textAnchor="end" className="text-xs fill-emerald-500 font-bold">Revenus</text>
                            <line x1={PADDING} y1={ptStart.y} x2={WIDTH-PADDING} y2={ptEndCost.y} stroke="#ef4444" strokeWidth="2" strokeDasharray="5,5" />
                            <text x={WIDTH-PADDING} y={ptEndCost.y - 10} textAnchor="end" className="text-xs fill-red-500 font-bold">Coûts</text>
                            <circle cx={ptBreakeven.x} cy={ptBreakeven.y} r="4" fill="#1e293b" />
                            <text x={ptBreakeven.x} y={ptBreakeven.y + 20} textAnchor="middle" className="text-[10px] fill-slate-500 font-bold">PM ({breakevenQty})</text>
                            <circle cx={ptTarget.x} cy={ptTarget.y} r="5" fill="#6366f1" />
                            <text x={ptTarget.x} y={ptTarget.y - 15} textAnchor="middle" className="text-xs fill-indigo-500 font-bold">Objectif ({s.target})</text>
                        </svg>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ==========================================
// 5. MODULE CONCURRENCE
// ==========================================
const CompetitorModule = ({ venture }) => {
    const [competitors, setCompetitors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showConfig, setShowConfig] = useState(false);
    const [newCriterion, setNewCriterion] = useState("");
    const saveTimeoutRef = useRef({});

    const COMP_COLORS = ['red', 'green', 'orange', 'purple', 'pink', 'cyan', 'yellow'];

    useEffect(() => {
        const load = async () => {
            const { data } = await supabase.from('venture_competitors').select('*').eq('venture_id', venture.id).order('is_primary', { ascending: false });
            if (data && data.length > 0) { setCompetitors(data); } 
            else {
                const me = { venture_id: venture.id, name: 'Mon Projet', is_primary: true, color: 'blue', is_visible: true, scores: { "Prix": 3, "Qualité": 3, "Innovation": 3, "Service": 3, "Design": 3 } };
                const comp = { venture_id: venture.id, name: 'Concurrent A', is_primary: false, color: 'red', is_visible: true, scores: { "Prix": 3, "Qualité": 3, "Innovation": 3, "Service": 3, "Design": 3 } };
                const { data: created } = await supabase.from('venture_competitors').insert([me, comp]).select();
                if (created) setCompetitors(created);
            }
            setLoading(false);
        };
        load();
    }, [venture]);

    const handleUpdate = (id, field, value) => {
        const newComps = competitors.map(c => c.id === id ? { ...c, [field]: value } : c);
        setCompetitors(newComps);
        if (saveTimeoutRef.current[id]) clearTimeout(saveTimeoutRef.current[id]);
        saveTimeoutRef.current[id] = setTimeout(async () => {
            await supabase.from('venture_competitors').update({ [field]: value }).eq('id', id);
        }, 1000);
    };

    const toggleVisibility = (id) => {
        const comp = competitors.find(c => c.id === id);
        handleUpdate(id, 'is_visible', !comp.is_visible);
    };

    const handleScore = (id, criterion, val) => {
        const comp = competitors.find(c => c.id === id);
        const newScores = { ...comp.scores, [criterion]: parseInt(val) };
        handleUpdate(id, 'scores', newScores);
    };

    const addCompetitor = async () => {
        const base = competitors[0] || { scores: { "Prix": 3, "Qualité": 3, "Innovation": 3, "Service": 3, "Design": 3 } };
        const nextColor = COMP_COLORS[(competitors.length - 1) % COMP_COLORS.length];
        const { data } = await supabase.from('venture_competitors').insert([{ venture_id: venture.id, name: 'Nouveau', is_primary: false, color: nextColor, is_visible: true, scores: base.scores }]).select();
        if (data) setCompetitors([...competitors, data[0]]);
    };

    const deleteCompetitor = async (id) => {
        if (!window.confirm("Supprimer ?")) return;
        await supabase.from('venture_competitors').delete().eq('id', id);
        setCompetitors(competitors.filter(c => c.id !== id));
    };

    const updateAllScores = async (updatedCompetitors) => {
        setCompetitors(updatedCompetitors);
        for (const comp of updatedCompetitors) {
            await supabase.from('venture_competitors').update({ scores: comp.scores }).eq('id', comp.id);
        }
    };

    const addCriterion = async () => {
        if (!newCriterion.trim()) return;
        const key = newCriterion.trim();
        const updated = competitors.map(c => ({ ...c, scores: { ...c.scores, [key]: 3 } })); 
        await updateAllScores(updated);
        setNewCriterion("");
    };

    const removeCriterion = async (key) => {
        if (!window.confirm(`Supprimer le critère "${key}" pour tous ?`)) return;
        const updated = competitors.map(c => {
            const s = { ...c.scores }; delete s[key]; return { ...c, scores: s };
        });
        await updateAllScores(updated);
    };

    const renameCriterion = async (oldKey) => {
        const newKey = prompt("Renommer le critère :", oldKey);
        if (!newKey || newKey === oldKey) return;
        const updated = competitors.map(c => {
            const s = { ...c.scores };
            s[newKey] = s[oldKey];
            delete s[oldKey];
            return { ...c, scores: s };
        });
        await updateAllScores(updated);
    };

    const criteria = competitors.length > 0 ? Object.keys(competitors[0].scores) : [];
    const radius = 135; 
    const center = 150;
    const angleSlice = (Math.PI * 2) / (criteria.length || 1);

    const getCoords = (val, i) => {
        const angle = i * angleSlice - Math.PI / 2;
        return { x: center + Math.cos(angle) * radius * (val / 5), y: center + Math.sin(angle) * radius * (val / 5) };
    };

    if (loading) return <div className="h-full flex items-center justify-center text-slate-400">Chargement...</div>;

    return (
        <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden relative">
            {showConfig && (
                <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl w-full max-w-sm shadow-2xl border border-slate-200 dark:border-slate-800">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-slate-800 dark:text-white">Gérer les Critères</h3>
                            <button onClick={() => setShowConfig(false)}><X size={20}/></button>
                        </div>
                        <div className="flex gap-2 mb-4">
                            <input type="text" value={newCriterion} onChange={e => setNewCriterion(e.target.value)} placeholder="Nouveau critère..." className="flex-1 p-2 bg-slate-100 dark:bg-slate-800 rounded-lg outline-none text-sm"/>
                            <button onClick={addCriterion} className="p-2 bg-indigo-600 text-white rounded-lg"><Plus size={18}/></button>
                        </div>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                            {criteria.map(c => (
                                <div key={c} className="flex justify-between items-center p-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                                    <span onClick={() => renameCriterion(c)} className="text-sm font-medium cursor-pointer hover:text-indigo-500">{c}</span>
                                    <button onClick={() => removeCriterion(c)} className="text-red-400 hover:text-red-600"><Trash2 size={14}/></button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <div className="h-16 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 bg-white dark:bg-slate-900 shrink-0">
                <h3 className="font-bold text-slate-700 dark:text-white flex items-center gap-2"><Trophy size={18} className="text-indigo-500"/> Radar de Positionnement</h3>
                <div className="flex gap-2">
                    <button onClick={() => setShowConfig(true)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500" title="Configurer Critères"><Settings size={18}/></button>
                    <button onClick={addCompetitor} className="px-3 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-black text-xs font-bold rounded-lg flex items-center gap-2"><Plus size={14}/> Ajouter Concurrent</button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-center min-h-[400px]">
                    <svg width="350" height="350" viewBox="0 0 300 300" className="overflow-visible">
                        {[1, 2, 3, 4, 5].map(level => (
                            <polygon key={level} points={criteria.map((_, i) => `${getCoords(level, i).x},${getCoords(level, i).y}`).join(' ')} fill="none" stroke="currentColor" strokeWidth="1" className="text-slate-200 dark:text-slate-700" />
                        ))}
                        {criteria.map((c, i) => {
                            const p = getCoords(5, i);
                            return (
                                <g key={i}>
                                    <line x1={center} y1={center} x2={p.x} y2={p.y} stroke="currentColor" strokeWidth="1" className="text-slate-200 dark:text-slate-700"/>
                                    <text x={p.x} y={p.y} dx={p.x > center ? 15 : -15} dy={p.y > center ? 10 : -10} textAnchor={p.x > center ? 'start' : 'end'} className="text-[11px] font-bold fill-slate-500 uppercase">{c}</text>
                                </g>
                            );
                        })}
                        {competitors.map(c => {
                            if (!c.is_visible) return null;
                            const points = criteria.map((k, i) => { const p = getCoords(c.scores[k] || 0, i); return `${p.x},${p.y}`; }).join(' ');
                            const color = c.color === 'blue' ? '#3b82f6' : c.color === 'red' ? '#ef4444' : c.color === 'green' ? '#10b981' : c.color === 'orange' ? '#f97316' : c.color === 'purple' ? '#8b5cf6' : c.color === 'pink' ? '#ec4899' : c.color === 'cyan' ? '#06b6d4' : c.color === 'yellow' ? '#eab308' : '#64748b';
                            return <polygon key={c.id} points={points} fill={color} fillOpacity={0.1} stroke={color} strokeWidth={c.is_primary ? 3 : 2} />;
                        })}
                    </svg>
                </div>
                <div className="space-y-4">
                    {competitors.map(c => (
                        <div key={c.id} className={`p-4 rounded-xl border ${c.is_primary ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/10 dark:border-indigo-800' : 'bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800'} transition-opacity ${!c.is_visible ? 'opacity-60' : ''}`}>
                            <div className="flex justify-between items-center mb-4">
                                <div className="flex items-center gap-2">
                                    <button onClick={() => toggleVisibility(c.id)} className="text-slate-400 hover:text-indigo-500">{c.is_visible ? <Eye size={16}/> : <EyeOff size={16}/>}</button>
                                    <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: c.color === 'blue' ? '#3b82f6' : c.color === 'red' ? '#ef4444' : c.color === 'green' ? '#10b981' : c.color === 'orange' ? '#f97316' : c.color === 'purple' ? '#8b5cf6' : c.color === 'pink' ? '#ec4899' : c.color === 'cyan' ? '#06b6d4' : c.color === 'yellow' ? '#eab308' : c.color }}></div>
                                    <input type="text" value={c.name} onChange={e => handleUpdate(c.id, 'name', e.target.value)} className="font-bold bg-transparent outline-none text-slate-800 dark:text-white text-sm"/>
                                </div>
                                {!c.is_primary && <button onClick={() => deleteCompetitor(c.id)} className="text-slate-400 hover:text-red-500"><Trash2 size={14}/></button>}
                            </div>
                            {c.is_visible && (
                                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        {criteria.map(k => (
                                            <div key={k}>
                                                <div className="flex justify-between text-[10px] uppercase font-bold text-slate-400 mb-1"><span>{k}</span><span>{c.scores[k] || 0}/5</span></div>
                                                <input type="range" min="0" max="5" step="1" value={c.scores[k] || 0} onChange={e => handleScore(c.id, k, e.target.value)} className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"/>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        <textarea value={c.strengths || ''} onChange={e => handleUpdate(c.id, 'strengths', e.target.value)} placeholder="Forces..." className="w-full bg-white dark:bg-slate-800 p-2 rounded border border-slate-100 dark:border-slate-700 text-xs resize-none h-16 outline-none"/>
                                        <textarea value={c.weaknesses || ''} onChange={e => handleUpdate(c.id, 'weaknesses', e.target.value)} placeholder="Faiblesses..." className="w-full bg-white dark:bg-slate-800 p-2 rounded border border-slate-100 dark:border-slate-700 text-xs resize-none h-16 outline-none"/>
                                        <textarea value={c.notes || ''} onChange={e => handleUpdate(c.id, 'notes', e.target.value)} placeholder="Notes / Stratégie..." className="w-full bg-yellow-50 dark:bg-yellow-900/10 p-2 rounded border border-yellow-100 dark:border-yellow-900/20 text-xs resize-none h-16 outline-none text-slate-700 dark:text-slate-300"/>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// ==========================================
// 6. MODULE ANALYSES (NOUVEAU)
// ==========================================
const AnalyticsModule = ({ venture }) => {
    const [charts, setCharts] = useState([]);
    const [activeChartId, setActiveChartId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saveTimer, setSaveTimer] = useState(null);
    
    // Champs de saisie
    const [newLabel, setNewLabel] = useState('');
    const [newVal, setNewVal] = useState('');

    useEffect(() => {
        if (!venture) return;
        const fetchCharts = async () => {
            const { data } = await supabase.from('venture_analytics').select('*').eq('venture_id', venture.id).order('created_at', { ascending: true });
            if (data) {
                setCharts(data);
                if (data.length > 0) setActiveChartId(data[0].id);
            }
            setLoading(false);
        };
        fetchCharts();
    }, [venture]);

    const updateChart = (id, field, value) => {
        const updated = charts.map(c => c.id === id ? { ...c, [field]: value } : c);
        setCharts(updated);
        
        if (saveTimer) clearTimeout(saveTimer);
        setSaveTimer(setTimeout(async () => {
            await supabase.from('venture_analytics').update({ [field]: value, updated_at: new Date().toISOString() }).eq('id', id);
        }, 1000));
    };

    const addChart = async () => {
        const newChart = { venture_id: venture.id, title: 'Nouvelle Analyse', chart_type: 'line', data_points: [], show_trend: true };
        const { data } = await supabase.from('venture_analytics').insert([newChart]).select();
        if (data && data.length > 0) {
            setCharts([...charts, data[0]]);
            setActiveChartId(data[0].id);
        }
    };

    const deleteChart = async (id, e) => {
        e.stopPropagation();
        if (!window.confirm("Supprimer ce graphique et toutes ses données ?")) return;
        await supabase.from('venture_analytics').delete().eq('id', id);
        const remaining = charts.filter(c => c.id !== id);
        setCharts(remaining);
        if (activeChartId === id) setActiveChartId(remaining[0]?.id || null);
    };

    const activeChart = charts.find(c => c.id === activeChartId);

    const addDataPoint = () => {
        if (!newLabel.trim() || !newVal) return;
        const v = parseFloat(newVal);
        if (isNaN(v)) return;
        
        const pts = [...(activeChart.data_points || []), { id: Date.now(), label: newLabel, value: v }];
        updateChart(activeChart.id, 'data_points', pts);
        setNewLabel('');
        setNewVal('');
    };

    const removeDataPoint = (ptId) => {
        const pts = (activeChart.data_points || []).filter(p => p.id !== ptId);
        updateChart(activeChart.id, 'data_points', pts);
    };

    // Calculs KPI
    const pts = activeChart?.data_points || [];
    const total = pts.reduce((sum, p) => sum + p.value, 0);
    const avg = pts.length > 0 ? total / pts.length : 0;
    const max = pts.length > 0 ? Math.max(...pts.map(p => p.value)) : 0;
    const trend = pts.length > 1 ? pts[pts.length - 1].value - pts[pts.length - 2].value : 0;

    const renderSVG = () => {
        if (!activeChart || pts.length === 0) return <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">Ajoutez des données ci-dessous pour générer le graphique.</div>;
        
        // --- CORRECTION 2 : AGRANDISSEMENT DU GRAPHIQUE ---
        const W = 800;
        const H = 350; // Plus haut pour respirer
        const P = 50;  // Plus de marge pour les axes
        
        // On définit la palette de couleurs ici pour qu'elle serve au Camembert ET à la légende
        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

        if (activeChart.chart_type === 'pie') {
            if (total === 0) return null;
            let startAngle = 0;
            const cx = W / 2;
            const cy = H / 2;
            const r = Math.min(W, H) / 2 - 20;
            
            return (
                <div className="flex items-center w-full h-full gap-8">
                    {/* Le Camembert */}
                    <svg viewBox={`0 0 ${W} ${H}`} className="w-2/3 h-full overflow-visible">
                        {pts.map((p, i) => {
                            const angle = (Math.abs(p.value) / Math.abs(total)) * Math.PI * 2; // Math.abs évite les bugs si valeur négative dans un pie
                            const endAngle = startAngle + angle;
                            
                            const x1 = cx + r * Math.cos(startAngle - Math.PI/2);
                            const y1 = cy + r * Math.sin(startAngle - Math.PI/2);
                            const x2 = cx + r * Math.cos(endAngle - Math.PI/2);
                            const y2 = cy + r * Math.sin(endAngle - Math.PI/2);
                            
                            const largeArc = angle > Math.PI ? 1 : 0;
                            const d = angle >= Math.PI * 2 * 0.999 
                                ? `M ${cx} ${cy-r} A ${r} ${r} 0 1 1 ${cx} ${cy+r} A ${r} ${r} 0 1 1 ${cx} ${cy-r}`
                                : `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
                            
                            startAngle += angle;
                            return <path key={p.id} d={d} fill={colors[i % colors.length]} stroke="#fff" strokeWidth="2" className="dark:stroke-slate-800" />;
                        })}
                    </svg>

                    {/* --- CORRECTION 3 : LÉGENDE DU CAMEMBERT --- */}
                    <div className="w-1/3 max-h-full overflow-y-auto pr-4 custom-scrollbar flex flex-col gap-2 justify-center">
                        {pts.map((p, i) => (
                            <div key={p.id} className="flex items-center gap-3">
                                <div className="w-4 h-4 rounded" style={{ backgroundColor: colors[i % colors.length] }}></div>
                                <span className="text-sm text-slate-700 dark:text-slate-300 truncate flex-1">{p.label}</span>
                                <span className="text-xs font-bold text-slate-500">{((Math.abs(p.value) / Math.abs(total)) * 100).toFixed(1)}%</span>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        const target = activeChart.target_value || 0;
        
        // --- CORRECTION 1 : GESTION DES VALEURS NÉGATIVES ---
        const dataMin = Math.min(...pts.map(p => p.value), target, 0); 
        const dataMax = Math.max(...pts.map(p => p.value), target, 1);
        
        // On rajoute 10% de marge en haut et en bas
        const graphMin = dataMin < 0 ? dataMin * 1.1 : 0;
        const graphMax = dataMax > 0 ? dataMax * 1.1 : 0;
        const range = graphMax - graphMin || 1;

        const getX = (i) => P + (i * (W - 2 * P) / Math.max(1, pts.length - 1));
        const getBarX = (i) => P + (i * (W - 2 * P) / pts.length);
        const getY = (val) => (H - P) - ((val - graphMin) / range) * (H - 2 * P);
        
        const yZero = getY(0);

        // --- GÉNÉRATION DES LIGNES DE GRILLE (Axe Y) ---
        const gridLines = [];
        const step = range / 4; 
        for (let i = 0; i <= 4; i++) {
            const val = graphMin + (step * i);
            gridLines.push({ val: val, y: getY(val) });
        }

        return (
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full overflow-visible">
                {/* Lignes de quadrillage horizontales */}
                {gridLines.map((line, i) => (
                    <g key={i}>
                        <line x1={P} y1={line.y} x2={W-P} y2={line.y} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 4" className="dark:stroke-slate-700 opacity-50" />
                        <text x={P - 10} y={line.y + 4} textAnchor="end" className="text-[10px] fill-slate-400 font-medium">
                            {line.val.toFixed(0)}
                        </text>
                    </g>
                ))}

                {/* Axe central (Zéro) s'il y a du négatif */}
                {graphMin < 0 && (
                    <line x1={P} y1={yZero} x2={W-P} y2={yZero} stroke="#94a3b8" strokeWidth="1.5" className="dark:stroke-slate-500 opacity-50" />
                )}
                
                {/* Axe X et Y principaux */}
                <line x1={P} y1={H-P} x2={W-P} y2={H-P} stroke="#cbd5e1" strokeWidth="2" className="dark:stroke-slate-600" />
                <line x1={P} y1={P} x2={P} y2={H-P} stroke="#cbd5e1" strokeWidth="2" className="dark:stroke-slate-600" />
                
                {target !== 0 && (
                    <line x1={P} y1={getY(target)} x2={W-P} y2={getY(target)} stroke="#f59e0b" strokeWidth="2" strokeDasharray="6 6" />
                )}

                {activeChart.chart_type === 'bar' ? (
                    pts.map((p, i) => {
                        const barW = Math.max((W - 2*P) / pts.length - 10, 10);
                        const x = getBarX(i) + ((W - 2*P) / pts.length - barW) / 2;
                        const y = getY(p.value);
                        // Hauteur de la barre : du Y du point jusqu'à l'axe Zéro
                        const barHeight = Math.abs(yZero - y);
                        // Si valeur négative, la barre part de 0 et descend
                        const startY = p.value >= 0 ? y : yZero;
                        
                        return (
                            <g key={p.id}>
                                <rect x={x} y={startY} width={barW} height={barHeight} fill={p.value >= 0 ? "#3b82f6" : "#ef4444"} rx="2" />
                                <text x={x + barW/2} y={H-P+15} textAnchor="middle" className="text-[10px] fill-slate-400 font-bold">{p.label}</text>
                            </g>
                        );
                    })
                ) : (
                    <>
                        <polyline points={pts.map((p, i) => `${getX(i)},${getY(p.value)}`).join(' ')} fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                        {pts.map((p, i) => (
                            <g key={p.id}>
                                <circle cx={getX(i)} cy={getY(p.value)} r="4" fill="#fff" stroke="#3b82f6" strokeWidth="2" className="dark:fill-slate-800" />
                                <text x={getX(i)} y={H-P+15} textAnchor="middle" className="text-[10px] fill-slate-400 font-bold">{p.label}</text>
                            </g>
                        ))}
                        
                        {activeChart.show_trend && pts.length > 1 && (() => {
                            const n = pts.length;
                            let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
                            pts.forEach((p, i) => { sumX += i; sumY += p.value; sumXY += i * p.value; sumXX += i * i; });
                            const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
                            const intercept = (sumY - slope * sumX) / n;
                            const y1 = intercept;
                            const y2 = slope * (n - 1) + intercept;
                            return (
                                <line x1={getX(0)} y1={getY(y1)} x2={getX(n-1)} y2={getY(y2)} stroke="#ec4899" strokeWidth="2" strokeDasharray="4 4" className="opacity-50" />
                            );
                        })()}
                    </>
                )}
            </svg>
        );
    };

    if (loading) return <div className="h-full flex items-center justify-center text-slate-400">Chargement...</div>;

    return (
        <div className="flex h-full w-full bg-white dark:bg-slate-900">
            {/* PANNEAU LATÉRAL GAUCHE : LISTE DES GRAPHIQUES */}
            <div className="w-64 bg-slate-50 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Graphiques</span>
                    <button onClick={addChart} className="p-1.5 hover:bg-white dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400 transition-colors"><Plus size={16}/></button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {charts.map(c => (
                        <div key={c.id} onClick={() => setActiveChartId(c.id)} className={`group flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer text-sm transition-all ${activeChartId === c.id ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-600 dark:text-indigo-400 font-medium' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-900'}`}>
                            <div className="flex items-center gap-2 truncate">
                                {c.chart_type === 'pie' ? <PieChart size={14}/> : c.chart_type === 'bar' ? <BarChart2 size={14}/> : <TrendingUp size={14}/>}
                                <span className="truncate">{c.title}</span>
                            </div>
                            <button onClick={(e) => deleteChart(c.id, e)} className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500"><Trash2 size={12}/></button>
                        </div>
                    ))}
                    {charts.length === 0 && <p className="text-xs text-slate-400 text-center py-4">Aucune analyse.</p>}
                </div>
            </div>

            {/* CONTENU PRINCIPAL */}
            <div className="flex-1 flex flex-col relative min-w-0 bg-slate-50 dark:bg-slate-950 overflow-y-auto custom-scrollbar">
                {activeChart ? (
                    <div className="p-6 max-w-6xl mx-auto w-full space-y-6">
                        
                        {/* HEADER DE CONFIGURATION DU GRAPHIQUE */}
                        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap gap-4 items-center justify-between">
                            <input type="text" value={activeChart.title} onChange={e => updateChart(activeChart.id, 'title', e.target.value)} className="text-xl font-bold bg-transparent outline-none text-slate-800 dark:text-white placeholder-slate-300 dark:placeholder-slate-700 min-w-[200px]"/>
                            
                            <div className="flex flex-wrap items-center gap-4">
                                <select value={activeChart.chart_type} onChange={e => updateChart(activeChart.id, 'chart_type', e.target.value)} className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium rounded-lg px-3 py-2 outline-none text-slate-700 dark:text-slate-300 cursor-pointer">
                                    <option value="line">Courbe (Ligne)</option>
                                    <option value="bar">Barres (Histogramme)</option>
                                    <option value="pie">Camembert (Circulaire)</option>
                                </select>
                                
                                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2">
                                    <Target size={14} className="text-slate-400"/>
                                    <input type="number" placeholder="Objectif (Ligne cible)" value={activeChart.target_value || ''} onChange={e => updateChart(activeChart.id, 'target_value', parseFloat(e.target.value) || null)} className="bg-transparent w-32 text-sm font-medium outline-none text-slate-700 dark:text-slate-300 placeholder-slate-400 dark:placeholder-slate-500"/>
                                </div>
                                
                                <label className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400 cursor-pointer hover:text-indigo-600 transition-colors">
                                    <input type="checkbox" checked={activeChart.show_trend} onChange={e => updateChart(activeChart.id, 'show_trend', e.target.checked)} className="w-4 h-4 accent-indigo-600 cursor-pointer"/>
                                    Afficher Tendance
                                </label>
                            </div>
                        </div>

                        {/* KPIS */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Cumulé</span>
                                <span className="text-2xl font-black text-slate-800 dark:text-white">{total.toLocaleString('fr-FR')}</span>
                            </div>
                            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Moyenne</span>
                                <span className="text-2xl font-black text-slate-800 dark:text-white">{avg.toLocaleString('fr-FR', {maximumFractionDigits: 1})}</span>
                            </div>
                            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Pic Maximum</span>
                                <span className="text-2xl font-black text-slate-800 dark:text-white">{max.toLocaleString('fr-FR')}</span>
                            </div>
                            <div className={`p-4 rounded-2xl border shadow-sm flex flex-col ${trend >= 0 ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/10 dark:border-emerald-800' : 'bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-800'}`}>
                                <span className={`text-xs font-bold uppercase tracking-wider mb-1 ${trend >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>Dernière Tendance</span>
                                <span className={`text-2xl font-black flex items-center gap-2 ${trend >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                    {trend >= 0 ? <TrendingUp size={20}/> : <TrendingDown size={20}/>}
                                    {trend > 0 ? '+' : ''}{trend.toLocaleString('fr-FR')}
                                </span>
                            </div>
                        </div>

                        {/* RENDU DU GRAPHIQUE */}
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <div className="h-96 w-full flex items-center justify-center">
                                {renderSVG()}
                            </div>
                        </div>

                        {/* LISTE DES DONNÉES / SAISIE */}
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <h3 className="font-bold text-slate-700 dark:text-white mb-4">Valeurs du graphique</h3>
                            
                            <div className="flex gap-2 mb-6">
                                <input type="text" placeholder="Libellé (ex: Janvier, Produit A...)" value={newLabel} onChange={e => setNewLabel(e.target.value)} onKeyDown={e => e.key === 'Enter' && addDataPoint()} className="flex-1 px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium outline-none focus:border-indigo-500 text-slate-700 dark:text-white"/>
                                <input type="number" placeholder="Valeur" value={newVal} onChange={e => setNewVal(e.target.value)} onKeyDown={e => e.key === 'Enter' && addDataPoint()} className="w-32 px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium outline-none focus:border-indigo-500 text-slate-700 dark:text-white"/>
                                <button onClick={addDataPoint} className="px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-bold flex items-center gap-2"><Plus size={18}/> Ajouter</button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                {pts.map((p, i) => (
                                    <div key={p.id} className="flex justify-between items-center px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                                        <div className="flex items-center gap-3">
                                            <span className="text-slate-400 font-black text-xs opacity-50">{i+1}</span>
                                            <span className="font-bold text-sm text-slate-700 dark:text-slate-200 truncate max-w-[100px]">{p.label}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="font-black text-indigo-600 dark:text-indigo-400">{p.value.toLocaleString('fr-FR')}</span>
                                            <button onClick={() => removeDataPoint(p.id)} className="text-slate-400 hover:text-red-500 transition-colors bg-white dark:bg-slate-900 p-1.5 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700"><Trash2 size={14}/></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-300 dark:text-slate-700 h-full">
                        <LayoutDashboard size={64} className="mb-4 opacity-50"/>
                        <p className="text-lg font-medium">Sélectionnez ou créez un graphique d'analyse</p>
                    </div>
                )}
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
    const [isExporting, setIsExporting] = useState(false);

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

    // --- EXPORT PDF V3 : ULTIMATE EDITION (AVEC SWOT MATRICE) ---
    const generateBusinessPlan = async () => {
        if (!activeVenture) return;
        setIsExporting(true);
        
        try {
            // 1. Récupérer TOUTES les données
            const [pages, strat, fin, comps, mind] = await Promise.all([
                supabase.from('venture_pages').select('*').eq('venture_id', activeVenture.id),
                supabase.from('venture_strategies').select('*').eq('venture_id', activeVenture.id),
                supabase.from('venture_financials').select('scenarios').eq('venture_id', activeVenture.id).single(),
                supabase.from('venture_competitors').select('*').eq('venture_id', activeVenture.id),
                supabase.from('venture_mindmaps').select('content').eq('venture_id', activeVenture.id).single()
            ]);

            const pagesData = pages.data || [];
            const stratData = strat.data || [];
            const f = fin.data?.scenarios || { realistic: {}, optimistic: {}, pessimistic: {} };
            const compData = comps.data || [];
            const mindData = mind.data?.content || [];

            const calcProfit = (s) => (s.target * s.price) - (s.fixed + (s.target * s.var));

            // --- HTML TEMPLATE ---
            const htmlContent = `
                <html>
                <head>
                    <title>Business Plan - ${activeVenture.title}</title>
                    <style>
                        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;800&display=swap');
                        @page { margin: 0; }
                        
                        body { 
                            font-family: 'Inter', sans-serif; 
                            color: #1e293b; 
                            line-height: 1.6; 
                            margin: 0; 
                            background: #fff; 
                        }
                        
                        .sheet { padding: 40px; max-width: 210mm; margin: 0 auto; min-height: 297mm; }
                        .page-break { page-break-before: always; }
                        .no-break { page-break-inside: avoid; }

                        /* HEADER/FOOTER */
                        .page-number { text-align: center; font-size: 10px; color: #94a3b8; margin-top: 40px; border-top: 1px solid #f1f5f9; padding-top: 10px; }

                        /* TYPOGRAPHY */
                        h2 { font-size: 24px; color: #0f172a; border-left: 6px solid #2563eb; padding-left: 15px; margin-top: 40px; margin-bottom: 25px; letter-spacing: -0.5px; }
                        h3 { font-size: 14px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 10px; letter-spacing: 0.5px; }

                        /* COVER */
                        .cover { height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; background: #f8fafc; border-bottom: 20px solid #2563eb; }
                        .cover h1 { font-size: 48px; margin: 0; font-weight: 800; color: #0f172a; line-height: 1.2; }
                        .cover .subtitle { font-size: 20px; color: #64748b; margin-top: 15px; font-weight: 400; }
                        .cover .meta { margin-top: 60px; font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 2px; }

                        /* CANVAS */
                        .canvas-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
                        .card { border: 1px solid #cbd5e1; padding: 12px; border-radius: 6px; background: #fff; font-size: 11px; min-height: 100px; }
                        .card strong { display: block; margin-bottom: 5px; color: #475569; font-size: 10px; text-transform: uppercase; }
                        .card ul { padding-left: 15px; margin: 0; }
                        .card li { margin-bottom: 2px; }

                        /* SWOT MATRIX (NEW) */
                        .swot-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px; }
                        .swot-box { padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; }
                        .swot-box.positive { background-color: #f0fdf4; border-color: #bbf7d0; }
                        .swot-box.negative { background-color: #fef2f2; border-color: #fecaca; }
                        .swot-header { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; font-weight: 800; font-size: 14px; text-transform: uppercase; }
                        .positive .swot-header { color: #166534; }
                        .negative .swot-header { color: #991b1b; }
                        .swot-list { list-style: none; padding: 0; margin: 0; }
                        .swot-list li { margin-bottom: 6px; padding-left: 15px; position: relative; font-size: 12px; }
                        .swot-list li::before { content: "•"; position: absolute; left: 0; color: inherit; font-weight: bold; }

                        /* FINANCE TABLE */
                        table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 10px; }
                        th, td { padding: 8px 10px; text-align: right; border-bottom: 1px solid #e2e8f0; }
                        th { text-align: left; background: #f1f5f9; color: #334155; font-weight: 600; }
                        td:first-child { text-align: left; font-weight: 500; color: #334155; }
                        .highlight-row { background: #f8fafc; font-weight: 700; }
                        .positive { color: #059669; }
                        .negative { color: #dc2626; }

                        @media print { body { -webkit-print-color-adjust: exact; } }
                    </style>
                </head>
                <body>
                    
                    <div class="cover">
                        <h1>${activeVenture.title}</h1>
                        <div class="subtitle">Document de Synthèse Stratégique</div>
                        <div class="meta">Généré le ${new Date().toLocaleDateString('fr-FR')} | Confidentiel</div>
                    </div>

                    <div class="sheet">
                        <h2>1. Résumé Exécutif</h2>
                        <div style="column-count: 2; column-gap: 40px; font-size: 12px; text-align: justify;">
                            ${pagesData.length === 0 ? '<p>Aucune note enregistrée.</p>' : pagesData.map(p => `
                                <div style="margin-bottom: 20px; break-inside: avoid;">
                                    <div style="font-weight: 700; font-size: 14px; color: #2563eb; margin-bottom: 5px;">${p.title}</div>
                                    <div style="white-space: pre-wrap;">${p.content || ''}</div>
                                </div>
                            `).join('')}
                        </div>
                        <div class="page-number">Page 2</div>
                    </div>

                    <div class="page-break"></div>
                    <div class="sheet">
                        <h2>2. Business Model Canvas</h2>
                        <div class="canvas-grid">
                            <div class="card" style="background:#eff6ff; border-color:#bfdbfe;"><strong>PARTENAIRES CLÉS</strong><ul>${(stratData.find(s=>s.section_id==='partners')?.content||[]).map(i=>`<li>${i.text}</li>`).join('')}</ul></div>
                            <div class="card" style="background:#fefce8; border-color:#fde047;"><strong>ACTIVITÉS CLÉS</strong><ul>${(stratData.find(s=>s.section_id==='activities')?.content||[]).map(i=>`<li>${i.text}</li>`).join('')}</ul></div>
                            <div class="card" style="background:#fef2f2; border-color:#fecaca;"><strong>PROPOSITIONS DE VALEUR</strong><ul>${(stratData.find(s=>s.section_id==='valueProps')?.content||[]).map(i=>`<li>${i.text}</li>`).join('')}</ul></div>
                            <div class="card" style="background:#ecfdf5; border-color:#a7f3d0;"><strong>RELATIONS CLIENT</strong><ul>${(stratData.find(s=>s.section_id==='relationships')?.content||[]).map(i=>`<li>${i.text}</li>`).join('')}</ul></div>
                            <div class="card" style="background:#ecfdf5; border-color:#a7f3d0;"><strong>SEGMENTS CLIENTS</strong><ul>${(stratData.find(s=>s.section_id==='segments')?.content||[]).map(i=>`<li>${i.text}</li>`).join('')}</ul></div>
                            <div class="card" style="background:#fefce8; border-color:#fde047;"><strong>RESSOURCES CLÉS</strong><ul>${(stratData.find(s=>s.section_id==='resources')?.content||[]).map(i=>`<li>${i.text}</li>`).join('')}</ul></div>
                            <div class="card" style="background:#ecfdf5; border-color:#a7f3d0;"><strong>CANAUX</strong><ul>${(stratData.find(s=>s.section_id==='channels')?.content||[]).map(i=>`<li>${i.text}</li>`).join('')}</ul></div>
                            <div class="card" style="background:#fef2f2; border-color:#fecaca;"><strong>COÛTS</strong><ul>${(stratData.find(s=>s.section_id==='cost')?.content||[]).map(i=>`<li>${i.text}</li>`).join('')}</ul></div>
                            <div class="card" style="background:#ecfdf5; border-color:#a7f3d0;"><strong>REVENUS</strong><ul>${(stratData.find(s=>s.section_id==='revenue')?.content||[]).map(i=>`<li>${i.text}</li>`).join('')}</ul></div>
                        </div>
                        <div class="page-number">Page 3</div>
                    </div>

                    <div class="page-break"></div>
                    <div class="sheet">
                        <h2>3. Analyse Stratégique (SWOT)</h2>
                        <p style="font-size: 12px; color: #64748b; margin-bottom: 20px;">Analyse des facteurs internes et externes influençant le projet.</p>
                        
                        <div class="swot-grid">
                            <div class="swot-box positive">
                                <div class="swot-header">Forces (Interne)</div>
                                <ul class="swot-list">
                                    ${(stratData.find(s=>s.section_id==='strengths')?.content||[]).map(i=>`<li>${i.text}</li>`).join('') || '<li>Aucune force listée</li>'}
                                </ul>
                            </div>
                            
                            <div class="swot-box negative">
                                <div class="swot-header">Faiblesses (Interne)</div>
                                <ul class="swot-list">
                                    ${(stratData.find(s=>s.section_id==='weaknesses')?.content||[]).map(i=>`<li>${i.text}</li>`).join('') || '<li>Aucune faiblesse listée</li>'}
                                </ul>
                            </div>

                            <div class="swot-box positive">
                                <div class="swot-header">Opportunités (Externe)</div>
                                <ul class="swot-list">
                                    ${(stratData.find(s=>s.section_id==='opportunities')?.content||[]).map(i=>`<li>${i.text}</li>`).join('') || '<li>Aucune opportunité listée</li>'}
                                </ul>
                            </div>

                            <div class="swot-box negative">
                                <div class="swot-header">Menaces (Externe)</div>
                                <ul class="swot-list">
                                    ${(stratData.find(s=>s.section_id==='threats')?.content||[]).map(i=>`<li>${i.text}</li>`).join('') || '<li>Aucune menace listée</li>'}
                                </ul>
                            </div>
                        </div>

                        <div class="no-break" style="margin-top: 40px;">
                            <h3>Structure des Idées (Mindmap)</h3>
                            <div style="font-size: 11px; padding: 15px; border: 1px dashed #cbd5e1; border-radius: 6px; background: #f8fafc;">
                                <ul style="list-style-type: circle; padding-left: 20px;">
                                    ${mindData.map(n => `<li>${n.label}</li>`).join('')}
                                </ul>
                            </div>
                        </div>
                        <div class="page-number">Page 4</div>
                    </div>

                    <div class="page-break"></div>
                    <div class="sheet">
                        <h2>4. Prévisions Financières & Marché</h2>
                        
                        <table>
                            <thead>
                                <tr>
                                    <th style="width: 40%">Indicateur</th>
                                    <th style="background: #fef2f2; color: #dc2626;">Pessimiste</th>
                                    <th style="background: #f1f5f9; color: #0f172a;">Réaliste</th>
                                    <th style="background: #ecfdf5; color: #059669;">Optimiste</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr><td>Prix de Vente</td><td>${f.pessimistic?.price || 0} €</td><td><strong>${f.realistic?.price || 0} €</strong></td><td>${f.optimistic?.price || 0} €</td></tr>
                                <tr><td>Coût Variable</td><td>${f.pessimistic?.var || 0} €</td><td>${f.realistic?.var || 0} €</td><td>${f.optimistic?.var || 0} €</td></tr>
                                <tr><td>Coûts Fixes (Mois)</td><td>${f.pessimistic?.fixed || 0} €</td><td>${f.realistic?.fixed || 0} €</td><td>${f.optimistic?.fixed || 0} €</td></tr>
                                <tr><td>Volume Ventes</td><td>${f.pessimistic?.target || 0}</td><td><strong>${f.realistic?.target || 0}</strong></td><td>${f.optimistic?.target || 0}</td></tr>
                                <tr class="highlight-row">
                                    <td>RÉSULTAT NET</td>
                                    <td class="${calcProfit(f.pessimistic || {}) >= 0 ? 'positive' : 'negative'}">${calcProfit(f.pessimistic || {}).toFixed(2)} €</td>
                                    <td class="${calcProfit(f.realistic || {}) >= 0 ? 'positive' : 'negative'}"><strong>${calcProfit(f.realistic || {}).toFixed(2)} €</strong></td>
                                    <td class="${calcProfit(f.optimistic || {}) >= 0 ? 'positive' : 'negative'}">${calcProfit(f.optimistic || {}).toFixed(2)} €</td>
                                </tr>
                            </tbody>
                        </table>

                        <div style="margin-top: 40px;">
                            <h3>Positionnement Concurrentiel</h3>
                            <table>
                                <thead><tr><th>Concurrent</th><th>Forces / Faiblesses</th><th>Note</th></tr></thead>
                                <tbody>
                                    ${compData.map(c => {
                                        const score = (Object.values(c.scores || {}).reduce((a,b)=>a+b,0) / (Object.values(c.scores || {}).length || 1));
                                        return `<tr>
                                            <td><strong>${c.name}</strong> ${c.is_primary ? '(Vous)' : ''}</td>
                                            <td style="font-size: 10px;">${c.strengths ? `+ ${c.strengths}` : ''} <br> ${c.weaknesses ? `- ${c.weaknesses}` : ''}</td>
                                            <td><strong>${score.toFixed(1)}/5</strong></td>
                                        </tr>`
                                    }).join('')}
                                </tbody>
                            </table>
                        </div>
                        <div class="page-number">Page 5</div>
                    </div>
                </body>
                </html>
            `;

            // 4. Ouvrir et Imprimer
            const printWindow = window.open('', '_blank');
            printWindow.document.write(htmlContent);
            printWindow.document.close();
            
            setTimeout(() => {
                printWindow.print();
                setIsExporting(false);
            }, 800);

        } catch (error) {
            console.error(error);
            alert("Erreur lors de la génération.");
            setIsExporting(false);
        }
    };

    if (!activeVenture) {
        return (
            <div className="fade-in p-6 max-w-6xl mx-auto space-y-8"><div className="flex justify-between items-center"><h2 className="text-3xl font-bold text-slate-800 dark:text-white tracking-tight">Workspace</h2></div><div className="bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex gap-2"><input type="text" value={newVentureTitle} onChange={(e) => setNewVentureTitle(e.target.value)} placeholder="Nouveau projet..." className="flex-1 bg-transparent px-4 outline-none text-slate-800 dark:text-white" onKeyDown={(e) => e.key === 'Enter' && createVenture()} /><button onClick={createVenture} className="bg-slate-900 dark:bg-white text-white dark:text-black px-6 py-2 rounded-lg font-bold"><Plus size={18}/></button></div>{loading ? <div className="text-center py-20 text-slate-400">Chargement...</div> : (<div className="grid grid-cols-1 md:grid-cols-3 gap-6">{ventures.map(v => (<div key={v.id} onClick={() => setActiveVenture(v)} className="group bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-indigo-500 cursor-pointer shadow-sm relative"><button onClick={(e) => deleteVenture(v.id, e)} className="absolute top-4 right-4 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 size={16}/></button><h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">{v.title}</h3><div className="text-indigo-500 text-sm font-bold mt-4 flex items-center gap-2">Ouvrir <ArrowLeft size={16} className="rotate-180"/></div></div>))}</div>)}</div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950">
            <header className="h-12 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 shrink-0 z-20">
                <div className="flex items-center gap-4">
                    <button onClick={() => setActiveVenture(null)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500"><ArrowLeft size={20}/></button>
                    <h2 className="text-sm font-bold text-slate-800 dark:text-white">{activeVenture.title}</h2>
                </div>
                <button 
                    onClick={generateBusinessPlan} 
                    disabled={isExporting}
                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                >
                    {isExporting ? <Loader2 size={14} className="animate-spin"/> : <Printer size={14}/>}
                    Imprimer le Dossier
                </button>
            </header>
            <div className="flex-1 flex overflow-hidden"><nav className="w-14 bg-slate-900 flex flex-col items-center py-4 gap-2 z-30 shrink-0">{MODULES.map(module => (<button key={module.id} onClick={() => setActiveModuleId(module.id)} className={`p-3 rounded-xl transition-all ${activeModuleId === module.id ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-white hover:bg-slate-800'}`} title={module.label}><module.icon size={20}/></button>))}</nav><main className="flex-1 overflow-hidden relative bg-white dark:bg-black">{activeModuleId === 'editor' && <EditorModule venture={activeVenture} />}{activeModuleId === 'business' && <StrategyModule venture={activeVenture} />}{activeModuleId === 'mindmap' && <MindmapModule venture={activeVenture} />}{activeModuleId === 'finance' && <FinanceModule venture={activeVenture} />}{activeModuleId === 'competitors' && <CompetitorModule venture={activeVenture} />}{activeModuleId === 'analytics' && <AnalyticsModule venture={activeVenture} />}</main></div>
        </div>
    );
}