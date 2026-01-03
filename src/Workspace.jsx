import { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import { 
  Plus, FileText, Users, ArrowLeft, Trash2, 
  Activity, Target, DollarSign, BarChart2, Share2, Menu, // Icônes utilisées dans les tuiles Stratégie
  Sun, Zap, AlertTriangle, Check, X, Box
} from 'lucide-react';

// --- SEULEMENT 2 MODULES ---
const MODULES = [
    { id: 'editor', label: 'Carnet', icon: FileText },
    { id: 'business', label: 'Stratégie', icon: Users },
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
// COMPOSANTS UI PARTAGÉS (Post-its)
// ==========================================
const PostItItem = ({ item, updateItem, deleteItem, colors }) => {
    const textareaRef = useRef(null);
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [item.text]);

    const safeColor = (item && item.color) ? item.color : 'yellow';
    const currentColor = colors.find(c => c.id === safeColor) || colors[0];

    return (
        <div className={`p-3 rounded-lg border text-sm shadow-sm relative group/item transition-all hover:shadow-md ${currentColor.bg} ${currentColor.border}`}>
            <textarea 
                ref={textareaRef}
                value={item.text || ''} 
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

    const addItem = () => { onChange([...items, { id: Math.random().toString(36).substr(2, 9), text: '', color: colorDefault }]); };
    const updateItem = (id, field, value) => { onChange(items.map(i => i.id === id ? { ...i, [field]: value } : i)); };
    const deleteItem = (id) => { onChange(items.filter(i => i.id !== id)); };
    const SafeIcon = Icon || FileText;

    return (
        <div className={`flex flex-col bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative group hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors ${className}`}>
            <h3 className="font-bold text-slate-700 dark:text-gray-200 flex items-center gap-2 text-xs uppercase tracking-wide shrink-0 mb-3">
                <SafeIcon size={14} className="text-indigo-500"/> {title}
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

    // ICÔNES STANDARD (On utilise celles importées en haut)
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
        { id: 'strengths', label: 'Forces (Interne)', icon: Check, color: 'green' },
        { id: 'weaknesses', label: 'Faiblesses (Interne)', icon: X, color: 'red' },
        { id: 'opportunities', label: 'Opportunités (Externe)', icon: Activity, color: 'blue' },
        { id: 'threats', label: 'Menaces (Externe)', icon: AlertTriangle, color: 'yellow' },
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
                {view === 'canvas' && (<div className="grid grid-cols-1 md:grid-cols-10 gap-4 h-full min-h-[800px]">{SECTIONS_CANVAS.map(section => (<PostItSection key={section.id} title={section.label} icon={section.icon} items={data[section.id] || []} onChange={(val) => handleUpdate(section.id, val)} colorDefault={section.color} className={`${section.col} min-h-[200px]`}/>))}</div>)}
                {view === 'swot' && (<div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full min-h-[600px]">{SECTIONS_SWOT.map(section => (<PostItSection key={section.id} title={section.label} icon={section.icon} items={data[section.id] || []} onChange={(val) => handleUpdate(section.id, val)} colorDefault={section.color} className="min-h-[300px]"/>))}</div>)}
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
            <div className="flex-1 flex overflow-hidden"><nav className="w-14 bg-slate-900 flex flex-col items-center py-4 gap-2 z-30 shrink-0">{MODULES.map(module => (<button key={module.id} onClick={() => setActiveModuleId(module.id)} className={`p-3 rounded-xl transition-all ${activeModuleId === module.id ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-white hover:bg-slate-800'}`} title={module.label}><module.icon size={20}/></button>))}</nav><main className="flex-1 overflow-hidden relative bg-white dark:bg-black">{activeModuleId === 'editor' && <EditorModule venture={activeVenture} />}{activeModuleId === 'business' && <StrategyModule venture={activeVenture} />}</main></div>
        </div>
    );
}