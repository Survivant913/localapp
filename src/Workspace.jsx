import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from './supabaseClient';
import { 
  Plus, FolderOpen, ArrowRight, Trash2, ArrowLeft,
  FileText, Target, Users, DollarSign, 
  Network, BarChart3, Kanban,
  Loader2, Save
} from 'lucide-react';

// --- ICONS MAPPING (Présentation supprimée) ---
const MODULES = [
    { id: 'editor', label: 'Carnet', icon: FileText },
    { id: 'business', label: 'Stratégie', icon: Users },
    { id: 'competition', label: 'Concurrence', icon: Target },
    { id: 'finance', label: 'Finance', icon: DollarSign },
    { id: 'mindmap', label: 'Mindmap', icon: Network },
    { id: 'data', label: 'Graphiques', icon: BarChart3 },
    { id: 'kanban', label: 'Organisation', icon: Kanban },
];

// --- HOOK DE SAUVEGARDE AUTOMATIQUE ---
function useAutoSave(value, delay = 1000, callback) {
    useEffect(() => {
        const handler = setTimeout(() => {
            if (value !== undefined) callback(value);
        }, delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
}

// ==========================================
// 1. MODULE CARNET (EDITOR) - VERSION PLEIN ÉCRAN
// ==========================================
const EditorModule = ({ venture }) => {
    const [pages, setPages] = useState([]);
    const [activePageId, setActivePageId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchPages = async () => {
            const { data } = await supabase
                .from('venture_pages')
                .select('*')
                .eq('venture_id', venture.id)
                .order('created_at', { ascending: true });
            
            if (data) {
                setPages(data);
                if (data.length > 0) setActivePageId(data[0].id);
            }
            setLoading(false);
        };
        fetchPages();
    }, [venture.id]);

    const createPage = async () => {
        const { data, error } = await supabase
            .from('venture_pages')
            .insert([{ venture_id: venture.id, title: 'Nouvelle Page', content: '' }])
            .select();
        
        if (data) {
            setPages([...pages, data[0]]);
            setActivePageId(data[0].id);
        }
    };

    const deletePage = async (id, e) => {
        e.stopPropagation();
        if (!window.confirm("Supprimer cette page ?")) return;
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
        try {
            await supabase
                .from('venture_pages')
                .update({ title: pageToSave.title, content: pageToSave.content })
                .eq('id', pageToSave.id);
        } catch (error) {
            console.error("Erreur save auto", error);
        } finally {
            setSaving(false);
        }
    });

    if (loading) return <div className="p-10 text-center text-slate-400">Chargement...</div>;

    // --- MODIFICATION ICI : SUPPRESSION DES BORDURES ET MARGES ---
    return (
        <div className="flex h-full bg-white dark:bg-slate-900">
            {/* Sidebar des pages */}
            <div className="w-64 bg-slate-50 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 flex flex-col">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pages</span>
                    <button onClick={createPage} className="p-1.5 hover:bg-white dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400 transition-colors shadow-sm"><Plus size={16}/></button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {pages.map(page => (
                        <div 
                            key={page.id} 
                            onClick={() => setActivePageId(page.id)}
                            className={`group flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer text-sm transition-all ${activePageId === page.id ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-600 dark:text-indigo-400 font-medium' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-900'}`}
                        >
                            <div className="flex items-center gap-2 truncate">
                                <FileText size={14} className={activePageId === page.id ? 'opacity-100' : 'opacity-50'}/>
                                <span className="truncate">{page.title || 'Sans titre'}</span>
                            </div>
                            <button onClick={(e) => deletePage(page.id, e)} className={`opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-opacity ${pages.length <= 1 ? 'hidden' : ''}`}>
                                <Trash2 size={12}/>
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Zone d'édition */}
            <div className="flex-1 flex flex-col relative min-w-0">
                {activePage ? (
                    <>
                        <div className="px-8 pt-8 pb-4">
                            <div className="flex justify-between items-start gap-4">
                                <input 
                                    type="text" 
                                    value={activePage.title} 
                                    onChange={(e) => updateLocalPage(activePage.id, 'title', e.target.value)}
                                    placeholder="Titre de la page"
                                    className="flex-1 text-3xl font-bold text-slate-800 dark:text-white bg-transparent outline-none placeholder-slate-300 dark:placeholder-slate-700"
                                />
                                {saving && <span className="text-xs text-slate-400 animate-pulse flex items-center gap-1"><Save size={10}/> Sauvegarde...</span>}
                            </div>
                            <div className="h-px bg-slate-100 dark:bg-slate-800 mt-4 w-full"></div>
                        </div>
                        <textarea 
                            className="flex-1 w-full px-8 pb-8 resize-none outline-none bg-transparent text-slate-700 dark:text-slate-200 leading-relaxed font-mono text-base custom-scrollbar"
                            placeholder="Commencez à écrire ici..."
                            value={activePage.content || ''}
                            onChange={(e) => updateLocalPage(activePage.id, 'content', e.target.value)}
                        ></textarea>
                        <div className="px-6 py-2 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 flex justify-end gap-4 uppercase font-bold tracking-wider">
                            <span>{activePage.content ? activePage.content.length : 0} Caractères</span>
                            <span>{activePage.content ? activePage.content.split(/\s+/).filter(w => w.length > 0).length : 0} Mots</span>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-300 dark:text-slate-700">
                        <FileText size={48} className="mb-4 opacity-50"/>
                        <p>Sélectionnez ou créez une page</p>
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

    useEffect(() => {
        fetchVentures();
    }, []);

    const fetchVentures = async () => {
        try {
            const { data, error } = await supabase.from('ventures').select('*').order('last_modified', { ascending: false });
            if (error) throw error;
            setVentures(data || []);
        } catch (error) { console.error("Erreur chargement:", error); } finally { setLoading(false); }
    };

    const createVenture = async () => {
        if (!newVentureTitle.trim()) return;
        try {
            const { data, error } = await supabase.from('ventures').insert([{ title: newVentureTitle, status: 'Idea' }]).select();
            if (error) throw error;
            setVentures([data[0], ...ventures]);
            setNewVentureTitle("");
        } catch (error) { alert("Erreur création"); }
    };

    const deleteVenture = async (id, e) => {
        e.stopPropagation();
        if (!window.confirm("Supprimer ce projet ?")) return;
        try {
            const { error } = await supabase.from('ventures').delete().eq('id', id);
            if (error) throw error;
            setVentures(ventures.filter(v => v.id !== id));
            if (activeVenture?.id === id) setActiveVenture(null);
        } catch (error) { console.error("Erreur suppression", error); }
    };

    // --- VUE LISTE ---
    if (!activeVenture) {
        return (
            <div className="fade-in p-6 max-w-6xl mx-auto space-y-8">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-3xl font-bold text-slate-800 dark:text-white font-serif tracking-tight">Workspace</h2>
                        <p className="text-slate-500">Incubateur d'idées & Gestion de projets avancée</p>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex gap-2">
                    <div className="p-3 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-500"><FolderOpen size={20}/></div>
                    <input type="text" value={newVentureTitle} onChange={(e) => setNewVentureTitle(e.target.value)} placeholder="Nom de votre nouvelle idée..." className="flex-1 bg-transparent outline-none text-slate-800 dark:text-white placeholder-slate-400 font-medium" onKeyDown={(e) => e.key === 'Enter' && createVenture()} />
                    <button onClick={createVenture} className="bg-slate-900 dark:bg-white text-white dark:text-black px-6 py-2 rounded-lg font-bold hover:opacity-90 transition-opacity flex items-center gap-2"><Plus size={18}/> Créer</button>
                </div>
                {loading ? <div className="text-center py-20"><Loader2 className="animate-spin w-8 h-8 text-slate-400 mx-auto"/></div> : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {ventures.map(v => (
                            <div key={v.id} onClick={() => setActiveVenture(v)} className="group bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 cursor-pointer transition-all shadow-sm hover:shadow-lg relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity z-10"><button onClick={(e) => deleteVenture(v.id, e)} className="p-2 bg-white dark:bg-slate-700 text-red-500 rounded-lg shadow hover:bg-red-50"><Trash2 size={16}/></button></div>
                                <div className="flex justify-between items-start mb-4"><div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-xl shadow-lg shadow-indigo-500/20"><FolderOpen size={24}/></div><span className="px-2 py-1 bg-slate-100 dark:bg-slate-900 text-xs font-bold text-slate-500 rounded uppercase">{v.status || 'Idea'}</span></div>
                                <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2 truncate">{v.title}</h3>
                                <p className="text-xs text-slate-400">Modifié le {new Date(v.last_modified).toLocaleDateString()}</p>
                                <div className="mt-6 flex items-center text-indigo-600 dark:text-indigo-400 font-bold text-sm group-hover:translate-x-1 transition-transform">Ouvrir l'espace <ArrowRight size={16} className="ml-2"/></div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // --- VUE INTERIEURE (MODIFIÉE POUR PLEIN ÉCRAN) ---
    return (
        <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950">
            <header className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 shrink-0 z-20">
                <div className="flex items-center gap-4">
                    <button onClick={() => setActiveVenture(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition-colors" title="Retour aux projets"><ArrowLeft size={20}/></button>
                    <div className="h-6 w-px bg-slate-200 dark:bg-slate-700"></div>
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white truncate max-w-[200px] md:max-w-md">{activeVenture.title}</h2>
                </div>
                <div className="text-xs font-mono text-slate-400 hidden md:block">Workspace Auto-save ON</div>
            </header>
            
            <div className="flex-1 flex overflow-hidden">
                <nav className="w-16 hover:w-56 bg-slate-900 text-slate-400 flex flex-col items-center py-4 gap-2 transition-all duration-300 ease-in-out z-30 shrink-0 overflow-hidden group">
                    {MODULES.map(module => {
                        const isActive = activeModuleId === module.id;
                        const Icon = module.icon;
                        return (
                            <button key={module.id} onClick={() => setActiveModuleId(module.id)} className={`w-full flex items-center px-4 py-3 gap-4 transition-colors relative ${isActive ? 'text-white bg-indigo-600' : 'hover:text-white hover:bg-slate-800'}`} title={module.label}>
                                <Icon size={24} className="shrink-0"/>
                                <span className="text-sm font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 delay-75">{module.label}</span>
                                {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-white"></div>}
                            </button>
                        );
                    })}
                </nav>

                {/* ZONE PRINCIPALE SANS PADDING NI MARGES POUR LE PLEIN ÉCRAN */}
                <main className="flex-1 overflow-hidden flex flex-col bg-slate-100 dark:bg-black relative">
                    {activeModuleId === 'editor' && <EditorModule venture={activeVenture} />}
                    
                    {activeModuleId !== 'editor' && (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-300 dark:border-slate-800 m-8 rounded-2xl bg-white/50 dark:bg-slate-900/50">
                            <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full mb-4"><Users size={32} className="opacity-50"/></div>
                            <h3 className="text-xl font-bold text-slate-600 dark:text-slate-300">Module {activeModuleId}</h3>
                            <p className="text-sm">En cours de développement...</p>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}