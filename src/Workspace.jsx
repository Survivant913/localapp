import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { supabase } from './supabaseClient';
import { 
  Plus, FileText, Users, ArrowLeft, Trash2, 
  Activity, Target, DollarSign, BarChart2, Share2, Menu, 
  Sun, Zap, AlertTriangle, Check, X, Box, Move, 
  ZoomIn, ZoomOut, Maximize, GitCommit, GripHorizontal, Minus,
  Wallet, Clock, Trophy, Swords // Icônes ajoutées
} from 'lucide-react';

// --- MODULES ---
const MODULES = [
    { id: 'editor', label: 'Carnet', icon: FileText },
    { id: 'business', label: 'Stratégie', icon: Users },
    { id: 'mindmap', label: 'Mindmap', icon: Activity },
    { id: 'finance', label: 'Finance', icon: DollarSign },
    { id: 'competitors', label: 'Concurrence', icon: Swords }, // NOUVEAU MODULE
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
// COMPOSANT POST-IT
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
    useEffect(() => { const handleMouseMove = (e) => { if (draggingNode) { const deltaX = (e.clientX - draggingNode.lastX) / scale; const deltaY = (e.clientY - draggingNode.lastY) / scale; const nodesToMove = new Set([draggingNode.id, ...getDescendants(draggingNode.id, nodes)]); setNodes(prev => prev.map(n => nodesToMove.has(n.id) ? { ...n, x: n.x + deltaX, y: n.y + deltaY } : n)); setDraggingNode(prev => ({ ...prev, lastX: e.clientX, lastY: e.clientY })); } else if (isPanning) { const dx = e.clientX - lastMousePos.x; const dy = e.clientY - lastMousePos.y; setPan(prev => ({ x: prev.x + dx, y: prev.y + dy })); setLastMousePos({ x: e.clientX, y: e.clientY }); } }; const handleMouseUp = () => { setDraggingNode(null); setIsPanning(false); }; window.addEventListener('mousemove', handleMouseMove); window.addEventListener('mouseup', handleMouseUp); return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); }; }, [draggingNode, isPanning, lastMousePos, scale, nodes]);
    const updateLabel = (id, newLabel) => { setNodes(nodes.map(n => n.id === id ? { ...n, label: newLabel } : n)); };

    const renderLines = () => nodes.map(node => { if (!isVisible(node.id)) return null; if (!node.parentId) return null; const parent = nodes.find(n => n.id === node.parentId); if (!parent) return null; const w = 180; const startX = parent.x + w; const startY = parent.y + 40; const endX = node.x; const endY = node.y + 40; const dist = Math.abs(endX - startX) / 2; const pathData = `M ${startX} ${startY} C ${startX + dist} ${startY}, ${endX - dist} ${endY}, ${endX} ${endY}`; return (<path key={`link-${node.id}`} d={pathData} fill="none" stroke="#cbd5e1" strokeWidth="2" className="dark:stroke-slate-700" />); });

    return (
        <div className="h-full w-full bg-slate-100 dark:bg-slate-950 relative overflow-hidden flex flex-col">
            <div className="absolute top-4 left-4 z-20 flex flex-col gap-2"><div className="flex gap-2 p-1 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800"><button onClick={addNode} className="p-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-indigo-600 rounded-lg transition-colors"><GitCommit size={20}/></button><button onClick={addRoot} className="p-2 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 text-emerald-600 rounded-lg transition-colors"><Plus size={20}/></button><div className="w-px bg-slate-200 dark:bg-slate-700 mx-1"></div><button onClick={deleteNode} className={`p-2 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-500 rounded-lg transition-colors ${!selectedId ? 'opacity-30' : ''}`}><Trash2 size={20}/></button></div>{selectedId && (<div className="flex gap-1 p-2 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 animate-in slide-in-from-left-2 fade-in duration-200">{NODE_COLORS.map(c => (<button key={c.id} onClick={() => updateColor(c.id)} className={`w-6 h-6 rounded-full border shadow-sm ${c.bg.split(' ')[0]} ${c.border.split(' ')[0]}`}/>))}</div>)}</div>
            <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-2 p-1 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800"><button onClick={() => setScale(s => Math.min(s + 0.1, 2))} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg"><ZoomIn size={20}/></button><button onClick={() => { setScale(1); setPan({x:0,y:0}); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg"><Maximize size={20}/></button><button onClick={() => setScale(s => Math.max(s - 0.1, 0.5))} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg"><ZoomOut size={20}/></button></div>
            <div ref={containerRef} className={`w-full h-full cursor-grab ${isPanning ? 'cursor-grabbing' : ''}`} onMouseDown={(e) => handleMouseDown(e)}><div style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`, transformOrigin: '0 0', width: '100%', height: '100%', position: 'absolute' }}><svg className="absolute top-0 left-0 overflow-visible pointer-events-none z-0" width="100%" height="100%">{renderLines()}</svg>{nodes.map(node => { if (!isVisible(node.id)) return null; const style = NODE_COLORS.find(c => c.id === (node.color || 'white')) || NODE_COLORS[0]; const hasChildren = nodes.some(n => n.parentId === node.id); return (<div key={node.id} style={{ transform: `translate(${node.x}px, ${node.y}px)`, width: '180px', height: 'auto' }} className={`absolute top-0 left-0 rounded-xl shadow-sm transition-shadow duration-200 flex flex-col z-10 ${style.bg} border-2 ${selectedId === node.id ? 'border-indigo-500 shadow-xl z-50 ring-2 ring-indigo-500/20' : style.border}`} onClick={(e) => { e.stopPropagation(); setSelectedId(node.id); }}><div className={`h-6 rounded-t-lg w-full cursor-grab active:cursor-grabbing flex items-center justify-center ${style.header}`} onMouseDown={(e) => handleMouseDown(e, node.id)}><GripHorizontal size={14} className="text-slate-400 dark:text-slate-500 opacity-50"/></div><div className="p-2 relative"><textarea value={node.label} onChange={(e) => updateLabel(node.id, e.target.value)} onMouseDown={(e) => e.stopPropagation()} className={`w-full bg-transparent text-center outline-none resize-none overflow-hidden font-medium text-sm text-slate-800 dark:text-slate-100`} placeholder="Idée..." rows={Math.max(2, (node.label?.split('\n').length || 1))}/>{hasChildren && (<button onClick={(e) => toggleCollapse(e, node.id)} className="absolute -right-3 top-1/2 -translate-y-1/2 w-5 h-5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 shadow-sm z-50" title={node.collapsed ? "Afficher" : "Masquer"}>{node.collapsed ? <Plus size={10} className="text-indigo-500"/> : <Minus size={10} className="text-slate-500"/>}</button>)}</div></div>); })}</div></div>
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
    
    // --- RUNWAY ---
    const monthlyBurn = Math.abs(profit); 
    const runway = profit >= 0 ? "∞" : (data.capital / monthlyBurn).toFixed(1);

    // --- GRAPHIQUE SVG NET & PRÉCIS ---
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
                        <div className={`text-5xl font-black mb-1 ${profit >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>{profit > 0 ? '+' : ''}{profit} €</div>
                        <div className={`text-sm font-bold ${profit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{profit >= 0 ? 'Rentable ! 🚀' : 'Déficitaire ⚠️'}</div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm h-96 relative flex flex-col">
                    <h3 className="text-sm font-bold text-slate-500 uppercase mb-4">Analyse du Point Mort</h3>
                    <div className="flex-1 w-full h-full relative">
                        <svg className="w-full h-full overflow-visible" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="xMidYMid meet">
                            <polygon points={`${ptBreakeven.x},${ptBreakeven.y} ${WIDTH-PADDING},${ptEndRev.y} ${WIDTH-PADDING},${ptEndCost.y}`} fill="rgba(16, 185, 129, 0.1)" />
                            <line x1={PADDING} y1={HEIGHT-PADDING} x2={WIDTH-PADDING} y2={HEIGHT-PADDING} stroke="#e2e8f0" strokeWidth="1" />
                            <line x1={PADDING} y1={PADDING} x2={PADDING} y2={HEIGHT-PADDING} stroke="#e2e8f0" strokeWidth="1" />
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
// 5. MODULE CONCURRENCE (RADAR CHART) - NOUVEAU
// ==========================================
const CompetitorModule = ({ venture }) => {
    const [competitors, setCompetitors] = useState([]);
    const [loading, setLoading] = useState(true);
    const saveTimeoutRef = useRef({});

    useEffect(() => {
        const load = async () => {
            const { data } = await supabase.from('venture_competitors').select('*').eq('venture_id', venture.id).order('is_primary', { ascending: false });
            if (data && data.length > 0) { setCompetitors(data); } 
            else {
                const me = { venture_id: venture.id, name: 'Mon Projet', is_primary: true, color: 'blue', scores: { "Prix": 3, "Qualité": 3, "Innovation": 3, "Service": 3, "Design": 3 } };
                const comp = { venture_id: venture.id, name: 'Concurrent A', is_primary: false, color: 'red', scores: { "Prix": 3, "Qualité": 3, "Innovation": 3, "Service": 3, "Design": 3 } };
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

    const handleScore = (id, criterion, val) => {
        const comp = competitors.find(c => c.id === id);
        const newScores = { ...comp.scores, [criterion]: parseInt(val) };
        handleUpdate(id, 'scores', newScores);
    };

    const addCompetitor = async () => {
        const base = competitors[0] || { scores: { "Prix": 3, "Qualité": 3, "Innovation": 3, "Service": 3, "Design": 3 } };
        const { data } = await supabase.from('venture_competitors').insert([{ venture_id: venture.id, name: 'Nouveau', is_primary: false, color: 'gray', scores: base.scores }]).select();
        if (data) setCompetitors([...competitors, data[0]]);
    };

    const deleteCompetitor = async (id) => {
        if (!window.confirm("Supprimer ?")) return;
        await supabase.from('venture_competitors').delete().eq('id', id);
        setCompetitors(competitors.filter(c => c.id !== id));
    };

    // --- RADAR MATH ---
    const criteria = competitors.length > 0 ? Object.keys(competitors[0].scores) : [];
    const radius = 100; const center = 150;
    const angleSlice = (Math.PI * 2) / criteria.length;

    const getCoords = (val, i) => {
        const angle = i * angleSlice - Math.PI / 2;
        return { x: center + Math.cos(angle) * radius * (val / 5), y: center + Math.sin(angle) * radius * (val / 5) };
    };

    if (loading) return <div className="h-full flex items-center justify-center text-slate-400">Chargement...</div>;

    return (
        <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden">
            <div className="h-16 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 bg-white dark:bg-slate-900 shrink-0">
                <h3 className="font-bold text-slate-700 dark:text-white flex items-center gap-2"><Trophy size={18} className="text-indigo-500"/> Radar de Positionnement</h3>
                <button onClick={addCompetitor} className="px-3 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-black text-xs font-bold rounded-lg flex items-center gap-2"><Plus size={14}/> Ajouter Concurrent</button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* RADAR CHART */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-center min-h-[400px]">
                    <svg width="350" height="300" viewBox="0 0 300 300" className="overflow-visible">
                        {/* Grille */}
                        {[1, 2, 3, 4, 5].map(level => (
                            <polygon key={level} points={criteria.map((_, i) => `${getCoords(level, i).x},${getCoords(level, i).y}`).join(' ')} fill="none" stroke="#e2e8f0" strokeWidth="1" />
                        ))}
                        {/* Axes */}
                        {criteria.map((c, i) => {
                            const p = getCoords(5, i);
                            return (
                                <g key={i}>
                                    <line x1={center} y1={center} x2={p.x} y2={p.y} stroke="#e2e8f0" strokeWidth="1"/>
                                    <text x={p.x} y={p.y} dx={p.x > center ? 10 : -10} dy={p.y > center ? 15 : -5} textAnchor={p.x > center ? 'start' : 'end'} className="text-[10px] font-bold fill-slate-500 uppercase">{c}</text>
                                </g>
                            );
                        })}
                        {/* Data */}
                        {competitors.map(c => {
                            const points = criteria.map((k, i) => { const p = getCoords(c.scores[k] || 0, i); return `${p.x},${p.y}`; }).join(' ');
                            const color = c.color === 'blue' ? '#3b82f6' : c.color === 'red' ? '#ef4444' : '#94a3b8';
                            return <polygon key={c.id} points={points} fill={color} fillOpacity={c.is_primary ? 0.2 : 0} stroke={color} strokeWidth={c.is_primary ? 3 : 2} />;
                        })}
                    </svg>
                </div>

                {/* CARDS */}
                <div className="space-y-4">
                    {competitors.map(c => (
                        <div key={c.id} className={`p-4 rounded-xl border ${c.is_primary ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/10 dark:border-indigo-800' : 'bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800'}`}>
                            <div className="flex justify-between items-center mb-4">
                                <div className="flex items-center gap-2">
                                    <div className={`w-3 h-3 rounded-full ${c.color === 'blue' ? 'bg-blue-500' : c.color === 'red' ? 'bg-red-500' : 'bg-slate-400'}`}></div>
                                    <input type="text" value={c.name} onChange={e => handleUpdate(c.id, 'name', e.target.value)} className="font-bold bg-transparent outline-none text-slate-800 dark:text-white text-sm"/>
                                </div>
                                {!c.is_primary && <button onClick={() => deleteCompetitor(c.id)} className="text-slate-400 hover:text-red-500"><Trash2 size={14}/></button>}
                            </div>
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                {Object.keys(c.scores).map(k => (
                                    <div key={k}>
                                        <div className="flex justify-between text-[10px] uppercase font-bold text-slate-400 mb-1"><span>{k}</span><span>{c.scores[k]}/5</span></div>
                                        <input type="range" min="0" max="5" step="1" value={c.scores[k]} onChange={e => handleScore(c.id, k, e.target.value)} className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"/>
                                    </div>
                                ))}
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <textarea value={c.strengths || ''} onChange={e => handleUpdate(c.id, 'strengths', e.target.value)} placeholder="Forces..." className="w-full bg-white dark:bg-slate-800 p-2 rounded border border-slate-100 dark:border-slate-700 text-xs resize-none h-16 outline-none"/>
                                <textarea value={c.weaknesses || ''} onChange={e => handleUpdate(c.id, 'weaknesses', e.target.value)} placeholder="Faiblesses..." className="w-full bg-white dark:bg-slate-800 p-2 rounded border border-slate-100 dark:border-slate-700 text-xs resize-none h-16 outline-none"/>
                            </div>
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
            <div className="flex-1 flex overflow-hidden"><nav className="w-14 bg-slate-900 flex flex-col items-center py-4 gap-2 z-30 shrink-0">{MODULES.map(module => (<button key={module.id} onClick={() => setActiveModuleId(module.id)} className={`p-3 rounded-xl transition-all ${activeModuleId === module.id ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-white hover:bg-slate-800'}`} title={module.label}><module.icon size={20}/></button>))}</nav><main className="flex-1 overflow-hidden relative bg-white dark:bg-black">{activeModuleId === 'editor' && <EditorModule venture={activeVenture} />}{activeModuleId === 'business' && <StrategyModule venture={activeVenture} />}{activeModuleId === 'mindmap' && <MindmapModule venture={activeVenture} />}{activeModuleId === 'finance' && <FinanceModule venture={activeVenture} />}{activeModuleId === 'competitors' && <CompetitorModule venture={activeVenture} />}</main></div>
        </div>
    );
}