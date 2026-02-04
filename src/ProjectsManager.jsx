import { useState } from 'react';
import { 
  FolderKanban, Target, Calendar, List, Euro, Briefcase, Plus, X, 
  ChevronDown, ChevronRight, CheckSquare, Square, Link as LinkIcon, 
  StickyNote, Trash2, Edit, Maximize2, CheckCircle2 
} from 'lucide-react';
import FocusProjectModal from './FocusProjectModal';

export default function ProjectsManager({ data, updateData }) {
    // --- 1. ÉTATS LOCAUX (INTACTS) ---
    const [newProjectTitle, setNewProjectTitle] = useState('');
    const [newProjectDesc, setNewProjectDesc] = useState('');
    const [newProjectDeadline, setNewProjectDeadline] = useState('');
    const [newProjectPriority, setNewProjectPriority] = useState('none');
    const [newProjectCost, setNewProjectCost] = useState('');
    const [linkedAccountId, setLinkedAccountId] = useState('');
    
    // États d'interface
    const [showForm, setShowForm] = useState(false); 
    const [expandedProjects, setExpandedProjects] = useState({});
    const [newObjectiveText, setNewObjectiveText] = useState({});
    const [newSubObjectiveText, setNewSubObjectiveText] = useState({});
    const [deletingProjectId, setDeletingProjectId] = useState(null);
    const [editingProject, setEditingProject] = useState(null);
    const [focusedProject, setFocusedProject] = useState(null);
    
    const [isCreatingAccount, setIsCreatingAccount] = useState(false);
    const [tempAccountName, setTempAccountName] = useState('');

    // SÉCURITÉ
    const rawAccounts = data.budget?.accounts || [];
    const accounts = rawAccounts.filter(a => a && a.id && a.name);

    // --- 2. HELPERS & CALCULS (INTACTS) ---
    const parseAmount = (val) => { if (!val) return 0; const cleanVal = val.toString().replace(/,/g, '.').replace(/\s/g, ''); const floatVal = parseFloat(cleanVal); return isNaN(floatVal) ? 0 : floatVal; };
    const formatCurrency = (val) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(val);

    const getAccountBalance = (accId) => {
        return (data.budget?.transactions || [])
            .filter(t => String(t.accountId) === String(accId)) 
            .reduce((acc, t) => t.type === 'income' ? acc + parseFloat(t.amount) : acc - parseFloat(t.amount), 0);
    };
    
    const currentTotalBalance = (data.budget?.transactions || []).reduce((acc, t) => t.type === 'income' ? acc + parseFloat(t.amount) : acc - parseFloat(t.amount), 0);

    const calculateProgress = (objectives) => {
        if (!objectives || objectives.length === 0) return 0;
        const totalProgress = objectives.reduce((acc, obj) => {
            if (!obj.subObjectives || obj.subObjectives.length === 0) return acc + (obj.completed ? 100 : 0);
            const completedSubs = obj.subObjectives.filter(sub => sub.completed).length;
            return acc + (completedSubs / obj.subObjectives.length) * 100;
        }, 0);
        return Math.round(totalProgress / objectives.length);
    };

    const getProjectHealth = (project, financialStatus) => {
        let status = 'healthy';
        if (project.deadline) {
            const today = new Date();
            today.setHours(0,0,0,0);
            const deadline = new Date(project.deadline);
            deadline.setHours(0,0,0,0);
            const diffTime = deadline - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays < 0) return 'critical';
            if (diffDays === 0) return 'critical';
            if (diffDays <= 7) status = 'warning';
        }
        if (financialStatus && !financialStatus.isFunded) {
            if (status !== 'critical') status = 'warning';
        }
        return status;
    };

    const getProjectFinancialStatus = (project) => {
        if (!project.cost) return null;
        if (project.linkedAccountId) {
            const linkedAccountBalance = getAccountBalance(project.linkedAccountId);
            const fundingPercentage = Math.min(100, (Math.max(0, linkedAccountBalance) / project.cost) * 100);
            return { isFunded: linkedAccountBalance >= project.cost, missing: Math.max(0, project.cost - linkedAccountBalance), available: linkedAccountBalance, fundingPercentage, isLinked: true };
        }
        const availableForProjects = Math.max(0, currentTotalBalance);
        const fundingPercentage = Math.min(100, (availableForProjects / project.cost) * 100);
        return { isFunded: availableForProjects >= project.cost, missing: Math.max(0, project.cost - availableForProjects), available: availableForProjects, fundingPercentage, isLinked: false };
    };

    // --- 3. ACTIONS (INTACTES) ---
    const updateProjectFromFocus = (updatedProject) => {
        const updatedProjects = data.projects.map(p => p.id === updatedProject.id ? updatedProject : p);
        updateData({ ...data, projects: updatedProjects });
        setFocusedProject(updatedProject);
    };

    const toggleExpand = (projectId) => setExpandedProjects(prev => ({ ...prev, [projectId]: !prev[projectId] }));

    const saveNewAccount = (e) => {
        if(e) e.preventDefault(); 
        if (tempAccountName.trim()) {
            const newId = Date.now().toString();
            const newAccount = { id: newId, name: tempAccountName };
            const newAccounts = [...accounts, newAccount];
            const newBudget = { ...data.budget, accounts: newAccounts };
            updateData({ ...data, budget: newBudget });
            setLinkedAccountId(newId);
            setTempAccountName('');
            setIsCreatingAccount(false);
        }
    };

    const handleProjectSubmit = (e) => {
        e.preventDefault();
        if (!newProjectTitle.trim()) return;
        const projectData = { title: newProjectTitle, description: newProjectDesc, deadline: newProjectDeadline, priority: newProjectPriority, cost: parseAmount(newProjectCost) || 0, linkedAccountId: linkedAccountId || null };
        if (editingProject) {
            const updatedProjects = data.projects.map(p => p.id === editingProject.id ? { ...p, ...projectData } : p);
            updateData({ ...data, projects: updatedProjects });
            setEditingProject(null);
        } else {
            const newProject = { id: Date.now(), ...projectData, progress: 0, objectives: [], status: 'todo', notes: '' };
            updateData({ ...data, projects: [...(data.projects || []), newProject] });
        }
        setNewProjectTitle(''); setNewProjectDesc(''); setNewProjectDeadline(''); setNewProjectPriority('none'); setNewProjectCost(''); setLinkedAccountId('');
        setShowForm(false);
    };

    const startEditProject = (project) => { 
        setEditingProject(project); 
        setNewProjectTitle(project.title); 
        setNewProjectDesc(project.description || ''); 
        setNewProjectDeadline(project.deadline || ''); 
        setNewProjectPriority(project.priority || 'none'); 
        setNewProjectCost(project.cost || ''); 
        setLinkedAccountId(project.linkedAccountId ? String(project.linkedAccountId) : ''); 
        setShowForm(true); 
        window.scrollTo({ top: 0, behavior: 'smooth' }); 
    };

    const cancelEdit = () => { 
        setEditingProject(null); 
        setShowForm(false); 
        setNewProjectTitle(''); setNewProjectDesc(''); setNewProjectDeadline(''); setNewProjectPriority('none'); setNewProjectCost(''); setLinkedAccountId(''); 
    };
    
    const confirmDeleteProject = (projectId) => { updateData({ ...data, projects: data.projects.filter(p => p.id !== projectId) }, { table: 'projects', id: projectId }); setDeletingProjectId(null); if (editingProject && editingProject.id === projectId) cancelEdit(); };

    const addObjective = (projectId) => {
        const text = newObjectiveText[projectId];
        if (!text || !text.trim()) return;
        const updatedProjects = data.projects.map(p => { if (p.id === projectId) { const newObjectives = [...(p.objectives || []), { id: Date.now(), title: text, completed: false, subObjectives: [] }]; return { ...p, objectives: newObjectives, progress: calculateProgress(newObjectives) }; } return p; });
        updateData({ ...data, projects: updatedProjects });
        setNewObjectiveText({ ...newObjectiveText, [projectId]: '' });
    };
    const deleteObjective = (projectId, objId) => { const updatedProjects = data.projects.map(p => { if (p.id === projectId) { const newObjectives = p.objectives.filter(o => o.id !== objId); return { ...p, objectives: newObjectives, progress: calculateProgress(newObjectives) }; } return p; }); updateData({ ...data, projects: updatedProjects }); };
    const addSubObjective = (projectId, objId) => { const key = `${projectId}-${objId}`; const text = newSubObjectiveText[key]; if (!text || !text.trim()) return; const updatedProjects = data.projects.map(p => { if (p.id === projectId) { const newObjectives = p.objectives.map(o => { if (o.id === objId) { return { ...o, subObjectives: [...(o.subObjectives || []), { id: Date.now(), title: text, completed: false }] }; } return o; }); return { ...p, objectives: newObjectives, progress: calculateProgress(newObjectives) }; } return p; }); updateData({ ...data, projects: updatedProjects }); setNewSubObjectiveText({ ...newSubObjectiveText, [key]: '' }); };
    const toggleSubObjective = (projectId, objId, subId) => { const updatedProjects = data.projects.map(p => { if (p.id === projectId) { const newObjectives = p.objectives.map(o => { if (o.id === objId) { const newSubs = o.subObjectives.map(s => s.id === subId ? { ...s, completed: !s.completed } : s); return { ...o, subObjectives: newSubs }; } return o; }); return { ...p, objectives: newObjectives, progress: calculateProgress(newObjectives) }; } return p; }); updateData({ ...data, projects: updatedProjects }); };
    const updateProjectStatus = (projectId, newStatus) => { updateData({ ...data, projects: data.projects.map(p => p.id === projectId ? { ...p, status: newStatus } : p) }); };
    const updateProjectNotes = (projectId, newNotes) => { updateData({ ...data, projects: data.projects.map(p => p.id === projectId ? { ...p, notes: newNotes } : p) }); };

    const sortedProjects = (data.projects || []).sort((a, b) => { const pScore = { high: 3, medium: 2, low: 1, none: 0 }; const diffP = (pScore[b.priority || 'none'] || 0) - (pScore[a.priority || 'none'] || 0); if (diffP !== 0) return diffP; if (a.deadline && b.deadline) return new Date(a.deadline) - new Date(b.deadline); if (a.deadline) return -1; if (b.deadline) return 1; return 0; });
    const statusColors = { todo: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300', in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', on_hold: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300', done: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' };
    const statusLabels = { todo: 'À faire', in_progress: 'En cours', on_hold: 'En pause', done: 'Terminé' };

    const inputClass = "w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm";
    const labelClass = "block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2";

    return (
        // MODIF : Largeur maximale étendue pour le design "Dashboard"
        <div className="space-y-10 fade-in w-full max-w-[1920px] mx-auto p-6 md:p-10 pb-24">
            
            {focusedProject && (
                <FocusProjectModal 
                    project={focusedProject} 
                    onClose={() => setFocusedProject(null)} 
                    updateProject={updateProjectFromFocus} 
                    accounts={accounts} 
                    availableForProjects={currentTotalBalance} 
                    getAccountBalance={getAccountBalance} 
                />
            )}

            {/* HEADER : BOUTON OU FORMULAIRE */}
            {!showForm ? (
                <button 
                    onClick={() => setShowForm(true)}
                    className="w-full py-8 border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-[2rem] flex flex-col items-center justify-center gap-3 text-gray-400 dark:text-gray-500 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 dark:hover:border-blue-500 transition-all group bg-gray-50/50 dark:bg-slate-900/50 hover:bg-blue-50/30 dark:hover:bg-blue-900/10"
                >
                    <div className="p-4 bg-white dark:bg-slate-800 rounded-full shadow-sm group-hover:scale-110 transition-transform">
                        <Plus size={32} />
                    </div>
                    <span className="font-black text-lg">Lancer un nouveau projet</span>
                </button>
            ) : (
                <div className={`bg-white dark:bg-slate-900 p-8 md:p-10 rounded-[2.5rem] shadow-2xl border border-gray-100 dark:border-slate-800 animate-in slide-in-from-top-6 duration-500 ${editingProject ? 'ring-2 ring-blue-500/20' : ''}`}>
                    <div className="flex justify-between items-center mb-8 border-b border-gray-100 dark:border-slate-800 pb-6">
                        <h2 className="text-3xl font-black text-gray-900 dark:text-white flex items-center gap-3">
                            {editingProject ? <Edit className="w-8 h-8 text-blue-600" /> : <Plus className="w-8 h-8 text-blue-600" />}
                            {editingProject ? 'Modifier le projet' : 'Nouveau Projet'}
                        </h2>
                        <button onClick={cancelEdit} className="text-sm font-bold text-red-500 hover:text-red-600 flex items-center gap-2 bg-red-50 dark:bg-red-900/10 px-4 py-2 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors"> <X size={18}/> Annuler </button>
                    </div>
                    
                    <form onSubmit={handleProjectSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="md:col-span-2"> 
                            <label className={labelClass}>Nom du projet</label> 
                            <input type="text" required value={newProjectTitle} onChange={e => setNewProjectTitle(e.target.value)} className={`${inputClass} text-xl font-bold`} placeholder="Ex: Lancement Startup..." autoFocus/> 
                        </div>
                        <div className="md:col-span-2"> 
                            <label className={labelClass}>Description courte</label> 
                            <input type="text" value={newProjectDesc} onChange={e => setNewProjectDesc(e.target.value)} className={inputClass} placeholder="Objectif principal du projet..." /> 
                        </div>
                        <div> 
                            <label className={labelClass}>Priorité</label> 
                            <select value={newProjectPriority} onChange={e => setNewProjectPriority(e.target.value)} className={inputClass}> 
                                <option value="none">⚪ Normale</option> 
                                <option value="high">🔥 Haute Priorité</option> 
                                <option value="medium">⚡ Moyenne</option> 
                                <option value="low">💤 Basse</option> 
                            </select> 
                        </div>
                        <div> 
                            <label className={labelClass}>Deadline</label> 
                            <input type="date" value={newProjectDeadline} onChange={e => setNewProjectDeadline(e.target.value)} className={inputClass} /> 
                        </div>
                        
                        <div className="md:col-span-2 bg-gray-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-gray-100 dark:border-slate-700"> 
                            <h4 className="text-sm font-black text-gray-900 dark:text-white mb-4 flex items-center gap-2 uppercase tracking-wider"><Euro size={18} className="text-blue-500"/> Budget & Financement</h4> 
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6"> 
                                <div> 
                                    <label className={labelClass}>Coût Estimé (€)</label> 
                                    <input type="text" value={newProjectCost} onChange={e => setNewProjectCost(e.target.value)} className={inputClass} placeholder="0.00" /> 
                                </div> 
                                <div> 
                                    <label className={labelClass}>Compte Dédié (Optionnel)</label> 
                                    <div className="flex gap-2"> 
                                        {isCreatingAccount ? ( 
                                            <div className="flex-1 flex gap-2 items-center"> 
                                                <input type="text" value={tempAccountName} onChange={e => setTempAccountName(e.target.value)} className="flex-1 px-4 py-3 rounded-xl border border-blue-500 bg-white dark:bg-slate-900 outline-none" placeholder="Nom du compte..." autoFocus/> 
                                                <button type="button" onClick={saveNewAccount} className="bg-green-500 text-white p-3 rounded-xl hover:bg-green-600 shadow-lg"><CheckCircle2 size={20}/></button> 
                                                <button type="button" onClick={() => setIsCreatingAccount(false)} className="bg-red-500 text-white p-3 rounded-xl hover:bg-red-600 shadow-lg"><X size={20}/></button> 
                                            </div> 
                                        ) : ( 
                                            <> 
                                                <select value={linkedAccountId || ""} onChange={e => setLinkedAccountId(e.target.value)} className={inputClass}> 
                                                    <option value="">(Financement Global)</option> 
                                                    {accounts.map(acc => <option key={acc.id} value={String(acc.id)}>{acc.name}</option>)} 
                                                </select> 
                                                <button type="button" onClick={() => setIsCreatingAccount(true)} className="px-4 bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors" title="Créer un compte"><Plus size={20}/></button> 
                                            </> 
                                        )} 
                                    </div> 
                                </div> 
                            </div> 
                        </div>
                        
                        <div className="md:col-span-2 flex justify-end mt-4"> 
                            <button type="submit" className={`px-10 py-4 text-white font-bold rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all ${editingProject ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/30' : 'bg-slate-900 hover:bg-slate-800 shadow-slate-900/30 dark:bg-blue-600 dark:hover:bg-blue-700'}`}> 
                                {editingProject ? 'Sauvegarder' : 'Lancer le Projet 🚀'} 
                            </button> 
                        </div>
                    </form>
                </div>
            )}

            {/* LISTE DES PROJETS - GRILLE RESPONSIVE */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
                {sortedProjects.length === 0 && !showForm && ( 
                    <div className="xl:col-span-2 text-center py-24"> 
                        <FolderKanban className="mx-auto h-20 w-20 text-gray-200 dark:text-slate-700 mb-6" /> 
                        <h3 className="text-2xl font-bold text-gray-400 dark:text-slate-600">Aucun projet actif</h3> 
                    </div> 
                )}
                
                {sortedProjects.map(project => {
                    const financialStatus = getProjectFinancialStatus(project);
                    let globalScore = project.progress;
                    if (project.cost > 0 && financialStatus) globalScore = (project.progress + financialStatus.fundingPercentage) / 2;
                    const linkedAccountName = project.linkedAccountId ? accounts.find(a => String(a.id) === String(project.linkedAccountId))?.name : null;
                    const health = getProjectHealth(project, financialStatus);
                    const linkedNotes = (data.notes || []).filter(n => String(n.linkedProjectId) === String(project.id));

                    return (
                        <div key={project.id} className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden transition-all hover:shadow-2xl hover:border-blue-200 dark:hover:border-slate-700 group relative flex flex-col">
                            
                            {/* BOUTON FOCUS FLOTTANT */}
                            <button onClick={(e) => { e.stopPropagation(); setFocusedProject(project); }} className="absolute top-6 right-20 text-gray-400 hover:text-blue-600 p-2 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/20 z-10 transition-colors" title="Mode Focus"> <Maximize2 size={22} /> </button>
                            
                            {/* EN-TÊTE DE LA CARTE */}
                            <div className="p-8 cursor-pointer bg-gradient-to-b from-gray-50 to-white dark:from-slate-800 dark:to-slate-900" onClick={() => toggleExpand(project.id)}>
                                <div className="flex justify-between items-start mb-8">
                                    <div className="flex items-center gap-6">
                                        {/* Score Circulaire */}
                                        <div className="relative inline-flex items-center justify-center w-20 h-20 shrink-0"> 
                                            <svg className="w-full h-full transform -rotate-90"> 
                                                <circle cx="40" cy="40" r="34" stroke="currentColor" strokeWidth="6" fill="none" className="text-gray-100 dark:text-slate-800" /> 
                                                <circle cx="40" cy="40" r="34" stroke="currentColor" strokeWidth="6" fill="none" strokeDasharray={34 * 2 * Math.PI} strokeDashoffset={34 * 2 * Math.PI * (1 - globalScore / 100)} className={`transition-all duration-1000 ${globalScore >= 100 ? 'text-green-500' : 'text-blue-600'}`} strokeLinecap="round" /> 
                                            </svg> 
                                            <span className="absolute text-lg font-black text-gray-800 dark:text-white">{Math.round(globalScore)}%</span> 
                                        </div>
                                        
                                        <div> 
                                            <div className="flex flex-wrap items-center gap-3 mb-2"> 
                                                <h3 className="text-2xl font-black text-gray-900 dark:text-white leading-tight">{project.title}</h3> 
                                                <div className={`w-3 h-3 rounded-full shadow-sm ${health === 'critical' ? 'bg-red-500 animate-pulse shadow-red-500/50' : health === 'warning' ? 'bg-orange-500' : 'bg-green-500'}`}></div> 
                                            </div> 
                                            <div className="flex flex-wrap gap-2 mb-2">
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${statusColors[project.status || 'todo']}`}>{statusLabels[project.status || 'todo']}</span> 
                                                {project.deadline && (
                                                    <span className="flex items-center gap-1 text-[10px] font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                                                        <Calendar size={12} /> {new Date(project.deadline).toLocaleDateString()}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-gray-500 dark:text-gray-400 text-sm line-clamp-2">{project.description}</p> 
                                        </div>
                                    </div>
                                    
                                    {/* Actions */}
                                    <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-1 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700"> 
                                        <button onClick={(e) => { e.stopPropagation(); startEditProject(project); }} className="text-gray-400 hover:text-blue-600 p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"><Edit size={18} /></button> 
                                        {deletingProjectId === project.id ? ( 
                                            <button onClick={(e) => { e.stopPropagation(); confirmDeleteProject(project.id); }} className="px-3 py-1 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 animate-in fade-in">Confirmer</button> 
                                        ) : ( 
                                            <button onClick={(e) => { e.stopPropagation(); setDeletingProjectId(project.id); }} className="text-gray-400 hover:text-red-500 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"><Trash2 size={18} /></button> 
                                        )} 
                                        <div className="w-px h-6 bg-gray-200 dark:bg-slate-700 mx-1"></div>
                                        <div className="p-2 text-gray-300 dark:text-slate-600">
                                            {expandedProjects[project.id] ? <ChevronDown size={20}/> : <ChevronRight size={20}/>} 
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Indicateurs */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-gray-100 dark:border-slate-700/50"> 
                                    <div className="space-y-2"> 
                                        <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400"> 
                                            <span className="flex items-center gap-2"><Briefcase size={14}/> Tâches</span> 
                                            <span>{project.progress}%</span> 
                                        </div> 
                                        <div className="h-2 w-full bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden"> 
                                            <div className="h-full transition-all duration-1000 bg-blue-500 rounded-full" style={{ width: `${project.progress}%` }}></div> 
                                        </div> 
                                    </div> 
                                    
                                    {project.cost > 0 && financialStatus && ( 
                                        <div className="space-y-2"> 
                                            <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400"> 
                                                <span className="flex items-center gap-2"><Euro size={14}/> {financialStatus.isLinked ? "Budget (Compte dédié)" : "Budget (Global)"}</span> 
                                                <span className={financialStatus.fundingPercentage >= 100 ? "text-green-500" : "text-orange-500"}>{Math.round(financialStatus.fundingPercentage)}%</span> 
                                            </div> 
                                            <div className="h-2 w-full bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden"> 
                                                <div className={`h-full transition-all duration-1000 rounded-full ${financialStatus.fundingPercentage >= 100 ? 'bg-green-500' : 'bg-gradient-to-r from-orange-400 to-yellow-400'}`} style={{ width: `${financialStatus.fundingPercentage}%` }}></div> 
                                            </div> 
                                        </div> 
                                    )} 
                                </div>
                            </div>
                            
                            {/* CONTENU DÉPLIÉ */}
                            {expandedProjects[project.id] && (
                                <div className="p-8 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-200 dark:border-slate-700 animate-in slide-in-from-top-2">
                                    {/* Statut Switcher */}
                                    <div className="flex gap-2 mb-8 overflow-x-auto pb-2"> 
                                        {Object.entries(statusLabels).map(([key, label]) => ( 
                                            <button key={key} onClick={() => updateProjectStatus(project.id, key)} className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-sm ${project.status === key ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md transform scale-105' : 'bg-white dark:bg-slate-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-600'}`}>{label}</button> 
                                        ))} 
                                    </div>
                                    
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                        
                                        {/* COLONNE GAUCHE : OBJECTIFS */}
                                        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-100 dark:border-slate-700/50 shadow-sm"> 
                                            <h4 className="text-sm font-black text-gray-900 dark:text-white mb-6 flex items-center gap-3 uppercase tracking-widest border-b border-gray-100 dark:border-slate-700 pb-4"><Target size={18} className="text-blue-600"/> Objectifs & Tâches</h4> 
                                            <div className="space-y-6"> 
                                                {project.objectives && project.objectives.map(obj => { 
                                                    const objProgress = obj.subObjectives && obj.subObjectives.length > 0 ? (obj.subObjectives.filter(s => s.completed).length / obj.subObjectives.length) * 100 : (obj.completed ? 100 : 0); 
                                                    return ( 
                                                        <div key={obj.id} className="group/obj"> 
                                                            <div className="flex items-center justify-between mb-3"> 
                                                                <div className="flex items-center gap-3 font-bold text-gray-800 dark:text-gray-200"> 
                                                                    <div className={`w-2 h-8 rounded-full ${objProgress === 100 ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                                                                    {obj.title} 
                                                                </div> 
                                                                <button onClick={() => deleteObjective(project.id, obj.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover/obj:opacity-100 transition-opacity"><X size={16} /></button> 
                                                            </div> 
                                                            
                                                            <div className="pl-5 border-l-2 border-gray-100 dark:border-slate-700 space-y-3 mb-4"> 
                                                                {obj.subObjectives && obj.subObjectives.map(sub => ( 
                                                                    <div key={sub.id} className="flex items-center gap-3 cursor-pointer group/sub hover:bg-gray-50 dark:hover:bg-slate-700/50 p-2 rounded-lg transition-colors" onClick={() => toggleSubObjective(project.id, obj.id, sub.id)}> 
                                                                        {sub.completed ? <CheckSquare size={18} className="text-green-500" /> : <Square size={18} className="text-gray-300 group-hover/sub:text-blue-500 transition-colors" />} 
                                                                        <span className={`text-sm font-medium ${sub.completed ? 'text-gray-400 line-through' : 'text-gray-600 dark:text-gray-300'}`}>{sub.title}</span> 
                                                                    </div> 
                                                                ))} 
                                                                <div className="flex gap-2 pl-2"> 
                                                                    <input type="text" className="flex-1 text-sm bg-transparent border-b border-gray-200 dark:border-slate-600 focus:border-blue-500 outline-none py-2 dark:text-white placeholder-gray-400 transition-colors" placeholder="Ajouter une sous-tâche..." value={newSubObjectiveText[`${project.id}-${obj.id}`] || ''} onChange={(e) => setNewSubObjectiveText({...newSubObjectiveText, [`${project.id}-${obj.id}`]: e.target.value})} onKeyDown={(e) => e.key === 'Enter' && addSubObjective(project.id, obj.id)} /> 
                                                                    <button onClick={() => addSubObjective(project.id, obj.id)} className="text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 p-2 rounded-lg transition-colors"><Plus size={18} /></button> 
                                                                </div>
                                                            </div> 
                                                        </div> 
                                                    ); 
                                                })} 
                                            </div> 
                                            <div className="flex gap-3 p-4 bg-gray-50 dark:bg-slate-700/30 rounded-2xl border border-dashed border-gray-300 dark:border-slate-600 mt-6"> 
                                                <input type="text" className="flex-1 bg-transparent outline-none dark:text-white font-medium" placeholder="Nouvel objectif principal..." value={newObjectiveText[project.id] || ''} onChange={(e) => setNewObjectiveText({...newObjectiveText, [project.id]: e.target.value})} onKeyDown={(e) => e.key === 'Enter' && addObjective(project.id)} /> 
                                                <button onClick={() => addObjective(project.id)} className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold uppercase tracking-wider rounded-xl hover:opacity-90 shadow-lg">Ajouter</button> 
                                            </div> 
                                        </div>
                                        
                                        {/* COLONNE DROITE : NOTES & LIENS */}
                                        <div className="space-y-8"> 
                                            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-100 dark:border-slate-700/50 shadow-sm"> 
                                                <h4 className="text-sm font-black text-gray-900 dark:text-white mb-6 flex items-center gap-3 uppercase tracking-widest border-b border-gray-100 dark:border-slate-700 pb-4"><LinkIcon size={18} className="text-purple-500"/> Notes Liées</h4> 
                                                {linkedNotes.length > 0 ? ( 
                                                    <div className="space-y-3"> 
                                                        {linkedNotes.map(note => ( 
                                                            <div key={note.id} className="p-4 rounded-2xl border border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-700/20 hover:border-purple-200 transition-colors"> 
                                                                <h5 className="font-bold text-sm text-gray-900 dark:text-white mb-1">{note.title}</h5> 
                                                                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{note.content}</p> 
                                                            </div> 
                                                        ))} 
                                                    </div> 
                                                ) : ( <p className="text-sm text-gray-400 italic text-center py-4">Aucune note liée. Utilisez le Bloc-notes pour en ajouter.</p> )} 
                                            </div> 
                                            
                                            <div className="bg-yellow-50 dark:bg-slate-800 p-6 rounded-3xl border border-yellow-100 dark:border-slate-700 shadow-sm"> 
                                                <h4 className="text-sm font-black text-yellow-700 dark:text-yellow-500 mb-4 flex items-center gap-3 uppercase tracking-widest"><StickyNote size={18}/> Brouillon Rapide</h4> 
                                                <textarea value={project.notes || ''} onChange={(e) => updateProjectNotes(project.id, e.target.value)} className="w-full h-40 p-4 text-sm bg-white dark:bg-slate-900/50 border border-yellow-200 dark:border-slate-600 rounded-2xl focus:ring-2 focus:ring-yellow-400 focus:border-transparent outline-none resize-none dark:text-gray-200 shadow-inner" placeholder="Idées en vrac, liens, pensées..."></textarea> 
                                            </div> 
                                        </div> 
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}