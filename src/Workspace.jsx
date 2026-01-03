import { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import { 
  Plus, FolderOpen, ArrowRight, Trash2, ArrowLeft,
  FileText, Target, Users, DollarSign, 
  Network, BarChart3, Kanban,
  Loader2, Save, Box, Activity, Sun, Zap, AlertTriangle, Check, X,
  Eye, EyeOff, Settings
} from 'lucide-react';

// --- ICONS MAPPING ---
const MODULES = [
    { id: 'editor', label: 'Carnet', icon: FileText },
    { id: 'business', label: 'Stratégie', icon: Users },
    { id: 'competition', label: 'Concurrence', icon: Target },
    { id: 'finance', label: 'Finance', icon: DollarSign },
    { id: 'mindmap', label: 'Mindmap', icon: Network },
    { id: 'data', label: 'Graphiques', icon: BarChart3 },
    { id: 'kanban', label: 'Organisation', icon: Kanban },
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
// COMPOSANTS UI PARTAGÉS
// ==========================================
const PostItItem = ({ item, updateItem, deleteItem, colors }) => {
    const textareaRef = useRef(null);
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [item.text]);

    const currentColor = colors.find(c => c.id === (item.color || 'yellow')) || colors[0];

    return (
        <div className={`p-3 rounded-lg border text-sm shadow-sm relative group/item transition-all hover:shadow-md ${currentColor.bg} ${currentColor.border}`}>
            <textarea 
                ref={textareaRef}
                value={item.text} 
                onChange={e => updateItem(item.id, 'text', e.target.value)}
                className="w-full bg-transparent outline-none resize-none text-slate-800 dark:text-slate-100 text-sm font-medium leading-relaxed overflow-hidden"
                placeholder="..."
                rows={1}
            />
            <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity bg-white/80 dark:bg-black/60 p-1 rounded backdrop-blur-sm shadow-sm z-10">
                {colors.map(c => (
                    <button key={c.id} onClick={() => updateItem(item.id, 'color', c.id)} className={`w-2.5 h-2.5 rounded-full ${c.bg.split(' ')[0]} border border-slate-300`}/>
                ))}
                <div className="w-px h-3 bg-slate-400/50 mx-0.5"></div>
                <button onClick={() => deleteItem(item.id)} className="text-red-500 hover:text-red-700"><Trash2 size={10}/></button>
            </div>
        </div>
    );
};

const PostItSection = ({ title, icon: Icon, items = [], onChange, colorDefault = 'yellow', className }) => {
    const colors = [
        { id: 'yellow', bg: 'bg-yellow-100 dark:bg-yellow-900/30', border: 'border-yellow-200 dark:border-yellow-800' },
        { id: 'blue', bg: 'bg-blue-100 dark:bg-blue-900/30', border: 'border-blue-200 dark:border-blue-800' },
        { id: 'green', bg: 'bg-green-100 dark:bg-green-900/30', border: 'border-green-200 dark:border-green-800' },
        { id: 'red', bg: 'bg-red-100 dark:bg-red-900/30', border: 'border-red-200 dark:border-red-800' },
    ];

    const addItem = () => {
        const newItem = { id: Math.random().toString(36).substr(2, 9), text: '', color: colorDefault };
        onChange([...items, newItem]);
    };

    const updateItem = (id, field, value) => {
        onChange(items.map(i => i.id === id ? { ...i, [field]: value } : i));
    };

    const deleteItem = (id) => {
        onChange(items.filter(i => i.id !== id));
    };

    return (
        <div className={`flex flex-col bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative group hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors ${className}`}>
            <h3 className="font-bold text-slate-700 dark:text-gray-200 flex items-center gap-2 text-xs uppercase tracking-wide shrink-0 mb-3">
                {Icon && <Icon size={14} className="text-indigo-500"/>} {title}
            </h3>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar min-h-[100px]">
                {items.map(item => (
                    <PostItItem key={item.id} item={item} updateItem={updateItem} deleteItem={deleteItem} colors={colors} />
                ))}
                <button onClick={addItem} className="w-full py-2 flex items-center justify-center gap-2 text-xs font-bold text-slate-400 hover:text-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 hover:border-indigo-300 transition-all shrink-0">
                    <Plus size={14}/> Ajouter
                </button>
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
        const fetchPages = async () => {
            const { data } = await supabase.from('venture_pages').select('*').eq('venture_id', venture.id).order('created_at', { ascending: true });
            if (data) { setPages(data); if (data.length > 0) setActivePageId(data[0].id); }
            setLoading(false);
        };
        fetchPages();
    }, [venture.id]);

    const createPage = async () => {
        const { data } = await supabase.from('venture_pages').insert([{ venture_id: venture.id, title: 'Nouvelle Page', content: '' }]).select();
        if (data) { setPages([...pages, data[0]]); setActivePageId(data[0].id); }
    };

    const deletePage = async (id, e) => {
        e.stopPropagation();
        if (!window.confirm("Supprimer ?")) return;
        await supabase.from('venture_pages').delete().eq('id', id);
        const newPages = pages.filter(p => p.id !== id);
        setPages(newPages);
        if (activePageId === id) setActivePageId(newPages[0]?.id || null);
    };

    const updateLocalPage = (id, field, value) => {
        setPages(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
    };

    const activePage = pages.find(p => p.id === activePageId);

    useAutoSave(activePage, 1500, async (pageToSave) => {
        if (!pageToSave) return;
        setSaving(true);
        try { await supabase.from('venture_pages').update({ title: pageToSave.title, content: pageToSave.content }).eq('id', pageToSave.id); } 
        finally { setSaving(false); }
    });

    if (loading) return <div className="h-full flex items-center justify-center text-slate-400">Chargement...</div>;

    return (
        <div className="flex h-full w-full bg-white dark:bg-slate-900">
            <div className="w-64 bg-slate-50 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pages</span>
                    <button onClick={createPage} className="p-1.5 hover:bg-white dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400 transition-colors"><Plus size={16}/></button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {pages.map(page => (
                        <div key={page.id} onClick={() => setActivePageId(page.id)} className={`group flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer text-sm transition-all ${activePageId === page.id ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-600 dark:text-indigo-400 font-medium' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-900'}`}>
                            <span className="truncate flex-1">{page.title || 'Sans titre'}</span>
                            <button onClick={(e) => deletePage(page.id, e)} className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500"><Trash2 size={12}/></button>
                        </div>
                    ))}
                </div>
            </div>
            <div className="flex-1 flex flex-col relative min-w-0 bg-white dark:bg-black">
                {activePage ? (
                    <>
                        <div className="px-8 pt-8 pb-4 border-b border-slate-100 dark:border-slate-800">
                            <input type="text" value={activePage.title} onChange={(e) => updateLocalPage(activePage.id, 'title', e.target.value)} placeholder="Titre de la page" className="w-full text-3xl font-bold text-slate-800 dark:text-white bg-transparent outline-none placeholder-slate-300 dark:placeholder-slate-700" />
                            {saving && <span className="text-xs text-slate-400 animate-pulse absolute top-4 right-8">Sauvegarde...</span>}
                        </div>
                        <textarea className="flex-1 w-full p-8 resize-none outline-none bg-transparent text-slate-700 dark:text-slate-200 leading-relaxed font-mono text-base custom-scrollbar" placeholder="Écrivez ici..." value={activePage.content || ''} onChange={(e) => updateLocalPage(activePage.id, 'content', e.target.value)}></textarea>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-300 dark:text-slate-700"><FileText size={48} className="mb-4 opacity-50"/><p>Sélectionnez une page</p></div>
                )}
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
        { id: 'partners', label: 'Partenaires Clés', icon: Network, col: 'md:col-span-2 md:row-span-2', color: 'blue' },
        { id: 'activities', label: 'Activités Clés', icon: Activity, col: 'md:col-span-2 md:row-span-1', color: 'yellow' },
        { id: 'valueProps', label: 'Propositions de Valeur', icon: Sun, col: 'md:col-span-2 md:row-span-2', color: 'red' },
        { id: 'relationships', label: 'Relations Client', icon: Users, col: 'md:col-span-2 md:row-span-1', color: 'green' },
        { id: 'segments', label: 'Segments Clients', icon: Target, col: 'md:col-span-2 md:row-span-2', color: 'green' },
        { id: 'resources', label: 'Ressources Clés', icon: Box, col: 'md:col-span-2 md:row-span-1', color: 'yellow' },
        { id: 'channels', label: 'Canaux', icon: ArrowRight, col: 'md:col-span-2 md:row-span-1', color: 'green' },
        { id: 'cost', label: 'Structure de Coûts', icon: Trash2, col: 'md:col-span-5 md:row-span-1', color: 'red' },
        { id: 'revenue', label: 'Flux de Revenus', icon: BarChart3, col: 'md:col-span-5 md:row-span-1', color: 'green' },
    ];

    const SECTIONS_SWOT = [
        { id: 'strengths', label: 'Forces (Interne)', icon: Check, color: 'green' },
        { id: 'weaknesses', label: 'Faiblesses (Interne)', icon: X, color: 'red' },
        { id: 'opportunities', label: 'Opportunités (Externe)', icon: Zap, color: 'blue' },
        { id: 'threats', label: 'Menaces (Externe)', icon: AlertTriangle, color: 'yellow' },
    ];

    useEffect(() => {
        const loadStrategy = async () => {
            const { data: rows } = await supabase.from('venture_strategies').select('*').eq('venture_id', venture.id);
            const formatted = {};
            if (rows) rows.forEach(row => formatted[row.section_id] = row.content);
            setData(formatted);
            setLoading(false);
        };
        loadStrategy();
    }, [venture.id]);

    const handleUpdate = (sectionId, newItems) => {
        setData(prev => ({ ...prev, [sectionId]: newItems }));
        if (saveTimeoutRef.current[sectionId]) clearTimeout(saveTimeoutRef.current[sectionId]);
        saveTimeoutRef.current[sectionId] = setTimeout(async () => {
            const type = SECTIONS_CANVAS.find(s => s.id === sectionId) ? 'canvas' : 'swot';
            await supabase.from('venture_strategies').upsert({
                venture_id: venture.id, type, section_id: sectionId, content: newItems
            }, { onConflict: 'venture_id, section_id' });
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
                {view === 'canvas' && (
                    <div className="grid grid-cols-1 md:grid-cols-10 gap-4 h-full min-h-[800px]">
                        {SECTIONS_CANVAS.map(section => (
                            <PostItSection key={section.id} title={section.label} icon={section.icon} items={data[section.id] || []} onChange={(val) => handleUpdate(section.id, val)} colorDefault={section.color} className={`${section.col} min-h-[200px]`}/>
                        ))}
                    </div>
                )}
                {view === 'swot' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full min-h-[600px]">
                        {SECTIONS_SWOT.map(section => (
                            <PostItSection key={section.id} title={section.label} icon={section.icon} items={data[section.id] || []} onChange={(val) => handleUpdate(section.id, val)} colorDefault={section.color} className="min-h-[300px]"/>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

// ==========================================
// 3. MODULE CONCURRENCE (CORRIGÉ : COULEURS & SAVE)
// ==========================================
const CompetitionModule = ({ venture }) => {
    const [competitors, setCompetitors] = useState([]);
    const [dimensions, setDimensions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isEditingDims, setIsEditingDims] = useState(false);
    const [newDimText, setNewDimText] = useState("");
    
    const MAX_SCORE = 5;
    const saveTimeoutRef = useRef({});
    
    // NOUVEAU : Palette de couleurs pour éviter le rouge systématique
    const COMPETITOR_COLORS = [
        'bg-red-500', 'bg-orange-500', 'bg-amber-500', 
        'bg-emerald-500', 'bg-cyan-500', 'bg-blue-500', 
        'bg-violet-500', 'bg-pink-500'
    ];

    useEffect(() => {
        const loadData = async () => {
            // 1. Charger les dimensions du projet
            const { data: vData } = await supabase.from('ventures').select('dimensions').eq('id', venture.id).single();
            const currentDims = vData?.dimensions || ['Prix', 'Qualité', 'Innovation', 'Service', 'Design'];
            setDimensions(currentDims);

            // 2. Charger les concurrents
            const { data: cData } = await supabase.from('venture_competitors').select('*').eq('venture_id', venture.id).order('id', { ascending: true });
            
            if (cData && cData.length > 0) {
                setCompetitors(cData);
            } else {
                // Initialiser "Mon Projet" si vide
                const initialStats = {};
                currentDims.forEach(d => initialStats[d] = 3);
                
                const myProject = {
                    venture_id: venture.id,
                    name: 'Mon Projet',
                    is_me: true,
                    stats: initialStats,
                    color: 'bg-indigo-500',
                    visible: true
                };
                const { data: inserted } = await supabase.from('venture_competitors').insert([myProject]).select();
                if (inserted) setCompetitors(inserted);
            }
            setLoading(false);
        };
        loadData();
    }, [venture.id]);

    // GESTION DES DIMENSIONS (CRITÈRES)
    const updateDimensionsInDB = async (newDims) => {
        setDimensions(newDims);
        await supabase.from('ventures').update({ dimensions: newDims }).eq('id', venture.id);
    };

    const addDimension = async () => {
        if (newDimText && !dimensions.includes(newDimText)) {
            const newDims = [...dimensions, newDimText];
            setDimensions(newDims);
            
            // 1. Sauvegarder la nouvelle liste de dimensions
            await supabase.from('ventures').update({ dimensions: newDims }).eq('id', venture.id);

            // 2. Ajouter la stat par défaut (3) à TOUS les concurrents existants
            const updatedCompetitors = competitors.map(c => ({
                ...c, stats: { ...c.stats, [newDimText]: 3 }
            }));
            setCompetitors(updatedCompetitors);

            // 3. Sauvegarder chaque concurrent mis à jour dans la DB
            for (const comp of updatedCompetitors) {
                await supabase.from('venture_competitors').upsert(comp);
            }
            
            setNewDimText("");
        }
    };

    const removeDimension = async (dim) => {
        if (dimensions.length <= 3) { alert("3 critères minimum !"); return; }
        const newDims = dimensions.filter(d => d !== dim);
        updateDimensionsInDB(newDims);
    };

    // GESTION DES CONCURRENTS
    const addCompetitor = async () => {
        const initialStats = {};
        dimensions.forEach(d => initialStats[d] = 3);
        
        // NOUVEAU : Choix de couleur rotatif
        const nextColor = COMPETITOR_COLORS[competitors.length % COMPETITOR_COLORS.length];

        const newComp = {
            venture_id: venture.id,
            name: 'Nouveau',
            is_me: false,
            stats: initialStats,
            color: nextColor, // <--- Couleur dynamique
            visible: true
        };
        const { data } = await supabase.from('venture_competitors').insert([newComp]).select();
        if (data) setCompetitors([...competitors, data[0]]);
    };

    const deleteCompetitor = async (id) => {
        if (!window.confirm("Supprimer ?")) return;
        await supabase.from('venture_competitors').delete().eq('id', id);
        setCompetitors(competitors.filter(c => c.id !== id));
    };

    const handleUpdateCompetitor = (id, field, value, statKey = null) => {
        // Update Local
        const updatedList = competitors.map(c => {
            if (c.id === id) {
                if (statKey) return { ...c, stats: { ...c.stats, [statKey]: parseFloat(value) } };
                return { ...c, [field]: value };
            }
            return c;
        });
        setCompetitors(updatedList);

        // Update DB (Debounce)
        if (saveTimeoutRef.current[id]) clearTimeout(saveTimeoutRef.current[id]);
        saveTimeoutRef.current[id] = setTimeout(async () => {
            const compToSave = updatedList.find(c => c.id === id);
            if(compToSave) await supabase.from('venture_competitors').upsert(compToSave);
        }, 800);
    };

    // --- LOGIQUE RADAR SVG ---
    const radarSize = 300;
    const centerX = radarSize / 2;
    const centerY = radarSize / 2;
    const radius = 100;

    const getCoordinates = (value, index, total) => {
        const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
        const r = (value / MAX_SCORE) * radius;
        return { x: centerX + r * Math.cos(angle), y: centerY + r * Math.sin(angle) };
    };

    const getPath = (stats) => {
        const points = dimensions.map((dim, i) => {
            const val = stats[dim] || 0;
            const coords = getCoordinates(val, i, dimensions.length);
            return `${coords.x},${coords.y}`;
        });
        return points.join(' ');
    };

    if (loading) return <div className="h-full flex items-center justify-center text-slate-400">Chargement...</div>;

    return (
        <div className="flex h-full bg-slate-50 dark:bg-slate-950 overflow-hidden">
            {/* PARTIE GAUCHE : RADAR */}
            <div className="flex-1 flex flex-col items-center justify-center border-r border-slate-200 dark:border-slate-800 p-6 relative">
                <h3 className="absolute top-6 left-6 font-bold text-lg text-slate-700 dark:text-white flex items-center gap-2">
                    <Target className="text-indigo-500"/> Radar de Positionnement
                </h3>
                
                <div className="relative w-[300px] h-[300px] md:w-[400px] md:h-[400px]">
                    <svg width="100%" height="100%" viewBox={`0 0 ${radarSize} ${radarSize}`} className="overflow-visible">
                        {/* Grille de fond */}
                        {[1, 2, 3, 4, 5].map(level => (
                            <polygon key={level} points={dimensions.map((_, i) => {
                                const c = getCoordinates(level, i, dimensions.length);
                                return `${c.x},${c.y}`;
                            }).join(' ')} fill="none" stroke="#cbd5e1" strokeWidth="1" strokeOpacity="0.5" className="dark:stroke-slate-700" />
                        ))}
                        {/* Axes */}
                        {dimensions.map((dim, i) => {
                            const end = getCoordinates(MAX_SCORE, i, dimensions.length);
                            return (
                                <g key={dim}>
                                    <line x1={centerX} y1={centerY} x2={end.x} y2={end.y} stroke="#cbd5e1" strokeWidth="1" className="dark:stroke-slate-700"/>
                                    <text x={end.x * 1.15 - centerX * 0.15} y={end.y * 1.15 - centerY * 0.15} textAnchor="middle" dominantBaseline="middle" className="text-[10px] font-bold fill-slate-500 dark:fill-slate-400 uppercase tracking-wide">
                                        {dim}
                                    </text>
                                </g>
                            );
                        })}
                        {/* Données */}
                        {competitors.map(comp => (
                            (comp.visible) && (
                                <g key={comp.id} className="transition-all duration-500 ease-out">
                                    <polygon 
                                        points={getPath(comp.stats)} 
                                        fill={comp.is_me ? "rgba(99, 102, 241, 0.2)" : "rgba(100, 116, 139, 0.1)"} 
                                        stroke={comp.is_me ? "#6366f1" : (comp.color?.replace('bg-', '') === 'red-500' ? '#ef4444' : '#cbd5e1')} // Fallback couleur simple pour SVG
                                        strokeWidth={comp.is_me ? 2.5 : 1.5} 
                                        style={{ stroke: comp.is_me ? '#6366f1' : 'inherit' }}
                                    />
                                    {/* Pour le SVG, on ne peut pas utiliser les classes tailwind bg-*, on garde une logique simple ici ou on mappe les couleurs Hex */}
                                    {dimensions.map((dim, i) => {
                                        const c = getCoordinates(comp.stats[dim], i, dimensions.length);
                                        return <circle key={i} cx={c.x} cy={c.y} r={comp.is_me ? 3 : 2} fill={comp.is_me ? "#6366f1" : "#94a3b8"} />;
                                    })}
                                </g>
                            )
                        ))}
                    </svg>
                </div>
            </div>

            {/* PARTIE DROITE : LISTE & ÉDITION */}
            <div className="w-96 flex flex-col bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shrink-0">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900">
                    <div className="flex items-center gap-2">
                        <button onClick={() => setIsEditingDims(!isEditingDims)} className={`p-1.5 rounded transition-colors ${isEditingDims ? 'bg-indigo-100 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`} title="Modifier les critères">
                            <Settings size={16}/>
                        </button>
                        <span className="text-xs font-bold text-slate-500 uppercase">Acteurs</span>
                    </div>
                    <button onClick={addCompetitor} className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded hover:text-indigo-600 transition-colors"><Plus size={16}/></button>
                </div>

                {isEditingDims && (
                    <div className="p-4 bg-slate-100 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-2">Gérer les critères du radar</h4>
                        <div className="flex flex-wrap gap-2 mb-3">
                            {dimensions.map(dim => (
                                <span key={dim} className="px-2 py-1 bg-white dark:bg-slate-700 rounded text-xs border border-slate-200 dark:border-slate-600 flex items-center gap-1">
                                    {dim}
                                    <button onClick={() => removeDimension(dim)} className="hover:text-red-500"><X size={10}/></button>
                                </span>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <input value={newDimText} onChange={e => setNewDimText(e.target.value)} className="flex-1 text-xs px-2 py-1.5 rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white" placeholder="Nouveau critère..." />
                            <button onClick={addDimension} className="px-3 py-1 bg-indigo-600 text-white text-xs rounded font-bold">OK</button>
                        </div>
                    </div>
                )}
                
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    {competitors.map(comp => (
                        <div key={comp.id} className={`rounded-xl border p-4 transition-all ${comp.is_me ? 'bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-200 dark:border-indigo-800' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}>
                            <div className="flex justify-between items-center mb-4">
                                <div className="flex items-center gap-2">
                                    <div className={`w-3 h-3 rounded-full ${comp.is_me ? 'bg-indigo-500' : comp.color}`}></div>
                                    <input value={comp.name} onChange={e => handleUpdateCompetitor(comp.id, 'name', e.target.value)} className="font-bold text-sm bg-transparent outline-none w-32 text-slate-800 dark:text-white" />
                                </div>
                                <div className="flex gap-1">
                                    <button onClick={() => handleUpdateCompetitor(comp.id, 'visible', !comp.visible)} className="p-1 text-slate-400 hover:text-indigo-500">{comp.visible ? <Eye size={14}/> : <EyeOff size={14}/>}</button>
                                    {!comp.is_me && <button onClick={() => deleteCompetitor(comp.id)} className="p-1 text-slate-400 hover:text-red-500"><Trash2 size={14}/></button>}
                                </div>
                            </div>
                            <div className="space-y-3">
                                {dimensions.map(dim => (
                                    <div key={dim} className="flex items-center gap-3">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase w-16 truncate" title={dim}>{dim}</span>
                                        <input type="range" min="1" max="5" step="0.5" value={comp.stats[dim] || 1} onChange={e => handleUpdateCompetitor(comp.id, null, e.target.value, dim)} className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                                        <span className="text-xs font-mono font-bold w-4 text-right text-slate-700 dark:text-slate-300">{comp.stats[dim]}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                                <textarea value={comp.strengths || ''} onChange={e => handleUpdateCompetitor(comp.id, 'strengths', e.target.value)} placeholder="Forces / Atouts..." className="w-full text-xs bg-transparent outline-none text-slate-600 dark:text-slate-400 resize-none h-12" />
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
        try {
            const { data, error } = await supabase.from('ventures').select('*').order('last_modified', { ascending: false });
            if (error) throw error;
            setVentures(data || []);
        } catch (error) { console.error(error); } finally { setLoading(false); }
    };

    const createVenture = async () => {
        if (!newVentureTitle.trim()) return;
        try {
            const { data } = await supabase.from('ventures').insert([{ title: newVentureTitle, status: 'Idea' }]).select();
            setVentures([data[0], ...ventures]); setNewVentureTitle("");
        } catch (error) { alert("Erreur"); }
    };

    const deleteVenture = async (id, e) => {
        e.stopPropagation();
        if (!window.confirm("Supprimer ?")) return;
        await supabase.from('ventures').delete().eq('id', id);
        setVentures(ventures.filter(v => v.id !== id));
    };

    if (!activeVenture) {
        return (
            <div className="fade-in p-6 max-w-6xl mx-auto space-y-8">
                <div className="flex justify-between items-center">
                    <h2 className="text-3xl font-bold text-slate-800 dark:text-white tracking-tight">Workspace</h2>
                </div>
                <div className="bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex gap-2">
                    <input type="text" value={newVentureTitle} onChange={(e) => setNewVentureTitle(e.target.value)} placeholder="Nouveau projet..." className="flex-1 bg-transparent px-4 outline-none text-slate-800 dark:text-white" onKeyDown={(e) => e.key === 'Enter' && createVenture()} />
                    <button onClick={createVenture} className="bg-slate-900 dark:bg-white text-white dark:text-black px-6 py-2 rounded-lg font-bold"><Plus size={18}/></button>
                </div>
                {loading ? <div className="text-center py-20 text-slate-400">Chargement...</div> : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {ventures.map(v => (
                            <div key={v.id} onClick={() => setActiveVenture(v)} className="group bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-indigo-500 cursor-pointer shadow-sm relative">
                                <button onClick={(e) => deleteVenture(v.id, e)} className="absolute top-4 right-4 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 size={16}/></button>
                                <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">{v.title}</h3>
                                <div className="text-indigo-500 text-sm font-bold mt-4 flex items-center gap-2">Ouvrir <ArrowRight size={16}/></div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950">
            <header className="h-12 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center px-4 shrink-0 z-20 gap-4">
                <button onClick={() => setActiveVenture(null)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500"><ArrowLeft size={20}/></button>
                <h2 className="text-sm font-bold text-slate-800 dark:text-white">{activeVenture.title}</h2>
            </header>
            <div className="flex-1 flex overflow-hidden">
                <nav className="w-14 bg-slate-900 flex flex-col items-center py-4 gap-2 z-30 shrink-0">
                    {MODULES.map(module => (
                        <button key={module.id} onClick={() => setActiveModuleId(module.id)} className={`p-3 rounded-xl transition-all ${activeModuleId === module.id ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-white hover:bg-slate-800'}`} title={module.label}><module.icon size={20}/></button>
                    ))}
                </nav>
                <main className="flex-1 overflow-hidden relative bg-white dark:bg-black">
                    {activeModuleId === 'editor' && <EditorModule venture={activeVenture} />}
                    {activeModuleId === 'business' && <StrategyModule venture={activeVenture} />}
                    {activeModuleId === 'competition' && <CompetitionModule venture={activeVenture} />}
                    {!['editor', 'business', 'competition'].includes(activeModuleId) && (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400"><Users size={48} className="mb-4 opacity-20"/><p>Module {activeModuleId} en construction</p></div>
                    )}
                </main>
            </div>
        </div>
    );
}