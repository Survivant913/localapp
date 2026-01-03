import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { 
  Plus, FolderOpen, ArrowRight, Trash2, 
  FileText, Target, Users, DollarSign, 
  Network, BarChart3, Kanban, ArrowLeft
} from 'lucide-react';

export default function Workspace() {
    const [ventures, setVentures] = useState([]);
    const [activeVenture, setActiveVenture] = useState(null);
    const [loading, setLoading] = useState(true);
    const [newVentureTitle, setNewVentureTitle] = useState("");

    // --- 1. CHARGEMENT DES PROJETS (VENTURES) ---
    useEffect(() => {
        fetchVentures();
    }, []);

    const fetchVentures = async () => {
        try {
            const { data, error } = await supabase
                .from('ventures')
                .select('*')
                .order('last_modified', { ascending: false });
            if (error) throw error;
            setVentures(data || []);
        } catch (error) {
            console.error("Erreur chargement:", error);
        } finally {
            setLoading(false);
        }
    };

    // --- 2. CRÉATION D'UN PROJET ---
    const createVenture = async () => {
        if (!newVentureTitle.trim()) return;
        try {
            const { data, error } = await supabase
                .from('ventures')
                .insert([{ title: newVentureTitle, status: 'Idea' }])
                .select();
            if (error) throw error;
            setVentures([data[0], ...ventures]);
            setNewVentureTitle("");
        } catch (error) {
            alert("Erreur création projet");
        }
    };

    // --- 3. SUPPRESSION ---
    const deleteVenture = async (id, e) => {
        e.stopPropagation();
        if (!window.confirm("Supprimer définitivement ce projet ?")) return;
        try {
            const { error } = await supabase.from('ventures').delete().eq('id', id);
            if (error) throw error;
            setVentures(ventures.filter(v => v.id !== id));
            if (activeVenture?.id === id) setActiveVenture(null);
        } catch (error) {
            console.error("Erreur suppression", error);
        }
    };

    // --- VUE : LISTE DES PROJETS ---
    if (!activeVenture) {
        return (
            <div className="fade-in p-6 max-w-6xl mx-auto space-y-8">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-3xl font-bold text-slate-800 dark:text-white font-serif">Workspace</h2>
                        <p className="text-slate-500">Incubateur d'idées & Gestion de projets avancée</p>
                    </div>
                </div>

                {/* BARRE DE CRÉATION */}
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex gap-4">
                    <input 
                        type="text" 
                        value={newVentureTitle}
                        onChange={(e) => setNewVentureTitle(e.target.value)}
                        placeholder="Nom de votre nouvelle idée..." 
                        className="flex-1 bg-transparent outline-none text-slate-800 dark:text-white placeholder-slate-400"
                        onKeyDown={(e) => e.key === 'Enter' && createVenture()}
                    />
                    <button onClick={createVenture} className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2">
                        <Plus size={18}/> Créer
                    </button>
                </div>

                {/* GRILLE DES PROJETS */}
                {loading ? (
                    <div className="text-center py-10 text-slate-400">Chargement...</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {ventures.map(v => (
                            <div 
                                key={v.id} 
                                onClick={() => setActiveVenture(v)}
                                className="group bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-indigo-500 cursor-pointer transition-all shadow-sm hover:shadow-md relative"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-xl">
                                        <FolderOpen size={24}/>
                                    </div>
                                    <button onClick={(e) => deleteVenture(v.id, e)} className="p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Trash2 size={18}/>
                                    </button>
                                </div>
                                <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">{v.title}</h3>
                                <p className="text-xs text-slate-400">Modifié le {new Date(v.last_modified).toLocaleDateString()}</p>
                                <div className="mt-6 flex items-center text-indigo-600 font-bold text-sm">
                                    Ouvrir l'espace <ArrowRight size={16} className="ml-2"/>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // --- VUE : INTERIEUR DU PROJET (Placeholder pour l'instant) ---
    return (
        <div className="h-full flex flex-col">
            <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-4 flex items-center gap-4">
                <button onClick={() => setActiveVenture(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500">
                    <ArrowLeft size={20}/>
                </button>
                <h2 className="text-xl font-bold text-slate-800 dark:text-white">{activeVenture.title}</h2>
                <span className="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full font-bold">Workspace</span>
            </div>
            
            <div className="flex-1 p-8 flex items-center justify-center text-slate-400 flex-col gap-4">
                <p>C'est ici que nous allons intégrer les 7 modules :</p>
                <div className="flex flex-wrap gap-2 justify-center">
                    <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded border">Carnet</span>
                    <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded border">Stratégie</span>
                    <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded border">Concurrence</span>
                    <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded border">Finance</span>
                    <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded border">Mindmap</span>
                    <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded border">Graphiques</span>
                    <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded border">Organisation</span>
                </div>
            </div>
        </div>
    );
}