import { useState } from 'react';
import { 
  FolderKanban, Target, Calendar, List, Euro, Briefcase, Plus, X, 
  ChevronDown, ChevronRight, CheckSquare, Square, Link as LinkIcon, 
  StickyNote, Trash2, Edit, Maximize2, CheckCircle2 
} from 'lucide-react';
import FocusProjectModal from './FocusProjectModal';

export default function ProjectsManager({ data, updateData }) {
    // --- 1. ÉTATS LOCAUX ---
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

    // SÉCURITÉ : On filtre les comptes vides pour éviter les crashs ou "undefined"
    const rawAccounts = data.budget?.accounts || [];
    const accounts = rawAccounts.filter(a => a && a.id && a.name);

    // --- 2. HELPERS & CALCULS ---
    const parseAmount = (val) => { if (!val) return 0; const cleanVal = val.toString().replace(/,/g, '.').replace(/\s/g, ''); const floatVal = parseFloat(cleanVal); return isNaN(floatVal) ? 0 : floatVal; };
    const formatCurrency = (val) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(val);

    const getAccountBalance = (accId) => {
        return (data.budget?.transactions || [])
            .filter(t => String(t.accountId) === String(accId)) // Correction Type ID
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

    // --- 3. ACTIONS ---
    const updateProjectFromFocus = (updatedProject) => {
        const updatedProjects = data.projects.map(p => p.id === updatedProject.id ? updatedProject : p);
        updateData({ ...data, projects: updatedProjects });
        setFocusedProject(updatedProject);
    };

    const toggleExpand = (projectId) => setExpandedProjects(prev => ({ ...prev, [projectId]: !prev[projectId] }));

    const saveNewAccount = (e) => {
        if(e) e.preventDefault(); // Empêche le reload du formulaire
        if (tempAccountName.trim()) {
            const newId = Date.now().toString();
            const newAccount = { id: newId, name: tempAccountName };
            const newAccounts = [...accounts, newAccount];
            
            // Mise à jour
            const newBudget = { ...data.budget, accounts: newAccounts };
            updateData({ ...data, budget: newBudget });
            
            // On force la sélection immédiatement
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
        // Reset et fermeture
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
        // Force string pour éviter le bug d'affichage
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

    return (
        <div className="space-y-8 fade-in max-w-4xl mx-auto pb-20">
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
                    className="w-full py-4 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-xl flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 dark:hover:border-blue-500 transition-all group"
                >
                    <div className="p-2 bg-gray-100 dark:bg-slate-700 rounded-full group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30 transition-colors">
                        <Plus size={24} />
                    </div>
                    <span className="font-bold">Créer un nouveau projet</span>
                </button>
            ) : (
                <div className={`bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border ${editingProject ? 'border-blue-300 dark:border-blue-700 ring-2 ring-blue-100 dark:ring-blue-900/20' : 'border-gray-200 dark:border-slate-700'} animate-in slide-in-from-top-4`}>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                            {editingProject ? <Edit className="w-6 h-6 text-blue-600" /> : <Plus className="w-6 h-6 text-blue-600" />}
                            {editingProject ? 'Modifier le projet' : 'Créer un nouveau projet'}
                        </h2>
                        <button onClick={cancelEdit} className="text-sm text-red-500 hover:text-red-700 flex items-center gap-1 bg-red-50 dark:bg-red-900/10 px-3 py-1 rounded-lg"> <X size={14}/> Annuler </button>
                    </div>
                    
                    <form onSubmit={handleProjectSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2"> <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nom du projet</label> <input type="text" required value={newProjectTitle} onChange={e => setNewProjectTitle(e.target.value)} className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:bg-slate-700 dark:text-white" placeholder="Ex: Refonte du site web" /> </div>
                        <div className="md:col-span-2"> <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description (Optionnel)</label> <input type="text" value={newProjectDesc} onChange={e => setNewProjectDesc(e.target.value)} className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:bg-slate-700 dark:text-white" placeholder="Objectifs principaux..." /> </div>
                        <div> <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priorité</label> <select value={newProjectPriority} onChange={e => setNewProjectPriority(e.target.value)} className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 dark:text-white"> <option value="none">⚪ Aucune</option> <option value="high">🔴 Haute</option> <option value="medium">🟠 Moyenne</option> <option value="low">🔵 Basse</option> </select> </div>
                        <div> <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date limite</label> <input type="date" value={newProjectDeadline} onChange={e => setNewProjectDeadline(e.target.value)} className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:bg-slate-700 dark:text-white" /> </div>
                        <div className="md:col-span-2 border-t border-gray-100 dark:border-slate-700 pt-4 mt-2"> <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2"><Euro size={16}/> Financement (Optionnel)</h4> <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> <div> <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Coût Estimé (€)</label> <input type="text" value={newProjectCost} onChange={e => setNewProjectCost(e.target.value)} className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:bg-slate-700 dark:text-white" placeholder="0" /> </div> <div> <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Compte lié</label> <div className="flex gap-2"> {isCreatingAccount ? ( <div className="flex-1 flex gap-1"> <input type="text" value={tempAccountName} onChange={e => setTempAccountName(e.target.value)} className="flex-1 px-2 py-1 border border-blue-300 rounded text-sm dark:bg-slate-700 dark:text-white" placeholder="Nom du compte..." /> <button type="button" onClick={saveNewAccount} className="text-green-600 hover:bg-green-50 p-1 rounded"><CheckCircle2 size={18}/></button> <button type="button" onClick={() => setIsCreatingAccount(false)} className="text-red-600 hover:bg-red-50 p-1 rounded"><X size={18}/></button> </div> ) : ( <> <select value={linkedAccountId || ""} onChange={e => setLinkedAccountId(e.target.value)} className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg outline-none focus:border-blue-500 bg-white dark:bg-slate-700 dark:text-white text-sm"> <option value="">(Aucun - Global)</option> {accounts.map(acc => <option key={acc.id} value={String(acc.id)}>{acc.name}</option>)} </select> <button type="button" onClick={() => setIsCreatingAccount(true)} className="px-3 py-2 bg-gray-100 dark:bg-slate-600 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-500" title="Créer un nouveau compte dédié"><Plus size={16}/></button> </> )} </div> <p className="text-[10px] text-gray-400 mt-1">Lier un compte permet de suivre le financement indépendamment du reste.</p> </div> </div> </div>
                        <div className="md:col-span-2 text-right mt-4"> <button type="submit" className={`px-6 py-2 text-white rounded-lg transition-colors ${editingProject ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-800 hover:bg-slate-900'}`}> {editingProject ? 'Enregistrer les modifications' : 'Commencer le projet'} </button> </div>
                    </form>
                </div>
            )}

            <div className="space-y-6">
                {sortedProjects.length === 0 && !showForm && ( <div className="text-center py-12 bg-gray-50 dark:bg-slate-800 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-xl"> <FolderKanban className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600 mb-3" /> <h3 className="text-lg font-medium text-gray-900 dark:text-gray-200">Pas encore de projets</h3> </div> )}
                {sortedProjects.map(project => {
                    const financialStatus = getProjectFinancialStatus(project);
                    let globalScore = project.progress;
                    if (project.cost > 0 && financialStatus) globalScore = (project.progress + financialStatus.fundingPercentage) / 2;
                    // Correction pour l'affichage : On cherche par String ID
                    const linkedAccountName = project.linkedAccountId ? accounts.find(a => String(a.id) === String(project.linkedAccountId))?.name : null;
                    const health = getProjectHealth(project, financialStatus);
                    const linkedNotes = (data.notes || []).filter(n => String(n.linkedProjectId) === String(project.id));

                    return (
                        <div key={project.id} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden transition-all hover:shadow-md relative group">
                            <button onClick={(e) => { e.stopPropagation(); setFocusedProject(project); }} className="absolute top-4 right-14 text-gray-300 hover:text-indigo-500 p-2 rounded-full hover:bg-indigo-50 dark:hover:bg-indigo-900/20 z-10 transition-colors" title="Ouvrir en Mode Focus"> <Maximize2 size={20} /> </button>
                            <div className="p-6 border-b border-gray-100 dark:border-slate-700 cursor-pointer bg-gray-50/50 dark:bg-slate-700/50" onClick={() => toggleExpand(project.id)}>
                                <div className="flex justify-between items-center mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="relative inline-flex items-center justify-center w-[60px] h-[60px]"> <svg className="w-full h-full transform -rotate-90"> <circle cx="30" cy="30" r="26" stroke="currentColor" strokeWidth="4" fill="none" className="text-gray-200 dark:text-slate-600" /> <circle cx="30" cy="30" r="26" stroke="currentColor" strokeWidth="4" fill="none" strokeDasharray={26 * 2 * Math.PI} strokeDashoffset={26 * 2 * Math.PI * (1 - globalScore / 100)} className={`transition-all duration-1000 ${globalScore >= 100 ? 'text-green-500' : 'text-blue-500'}`} strokeLinecap="round" /> </svg> <span className="absolute text-xs font-bold text-gray-700 dark:text-gray-200">{Math.round(globalScore)}%</span> </div>
                                        <div> <div className="flex items-center gap-2 mb-1"> <div className={`w-3 h-3 rounded-full ${health === 'critical' ? 'bg-red-500 animate-pulse' : health === 'warning' ? 'bg-orange-500' : 'bg-green-500'}`} title={health === 'critical' ? 'Urgent / Retard / Budget dépassé' : health === 'warning' ? 'Attention / Budget court' : 'Sain'}></div> <h3 className="text-xl font-bold text-gray-800 dark:text-white">{project.title}</h3> <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${statusColors[project.status || 'todo']}`}>{statusLabels[project.status || 'todo']}</span> </div> <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">{project.description}</p> {project.deadline && (<div className="flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400"><Calendar size={12} /> {new Date(project.deadline).toLocaleDateString()}</div>)} </div>
                                    </div>
                                    <div className="flex items-center gap-3"> <button onClick={(e) => { e.stopPropagation(); startEditProject(project); }} className="text-gray-400 dark:text-gray-500 hover:text-blue-500 p-2"><Edit size={18} /></button> {deletingProjectId === project.id ? ( <div className="flex items-center gap-1"> <button onClick={(e) => { e.stopPropagation(); confirmDeleteProject(project.id); }} className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700">Confirmer</button> <button onClick={(e) => { e.stopPropagation(); setDeletingProjectId(null); }} className="p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-600 rounded"><X size={14}/></button> </div> ) : ( <button onClick={(e) => { e.stopPropagation(); setDeletingProjectId(project.id); }} className="text-gray-400 dark:text-gray-500 hover:text-red-500 p-2"><Trash2 size={18} /></button> )} {expandedProjects[project.id] ? <ChevronDown size={20} className="text-gray-400"/> : <ChevronRight size={20} className="text-gray-400"/>} </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6"> <div className="space-y-1"> <div className="flex justify-between text-xs font-medium text-gray-600 dark:text-gray-400"> <span className="flex items-center gap-1"><Briefcase size={12}/> Avancement Tâches</span> <span>{project.progress}%</span> </div> <div className="h-2 w-full bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden"> <div className={`h-full transition-all duration-500 bg-blue-500`} style={{ width: `${project.progress}%` }}></div> </div> </div> {project.cost > 0 && financialStatus && ( <div className="space-y-1"> <div className="flex justify-between text-xs font-medium text-gray-600 dark:text-gray-400"> <span className="flex items-center gap-1"><Euro size={12}/> {financialStatus.isLinked ? `Lié à : ${linkedAccountName || 'Compte introuvable'}` : "Capacité Économique"}</span> <span>{Math.round(financialStatus.fundingPercentage)}%</span> </div> <div className="h-2 w-full bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden"> <div className={`h-full transition-all duration-500 ${financialStatus.fundingPercentage >= 100 ? 'bg-green-500' : 'bg-yellow-500'}`} style={{ width: `${financialStatus.fundingPercentage}%` }}></div> </div> <div className="text-[10px] text-gray-400 dark:text-gray-500 text-right"> {financialStatus.fundingPercentage >= 100 ? "Financement OK" : `Manque ${formatCurrency(financialStatus.missing)}`} </div> </div> )} </div>
                            </div>
                            {expandedProjects[project.id] && (
                                <div className="p-6 bg-white dark:bg-slate-800 space-y-6">
                                    <div className="flex gap-2 bg-gray-50 dark:bg-slate-700/50 p-1 rounded-lg border border-gray-200 dark:border-slate-600 w-fit mb-4"> {Object.entries(statusLabels).map(([key, label]) => ( <button key={key} onClick={() => updateProjectStatus(project.id, key)} className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${project.status === key ? 'bg-white dark:bg-slate-600 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-600'}`}>{label}</button> ))} </div>
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        <div> <h4 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2"><Target size={16}/> Objectifs</h4> <div className="space-y-4"> {project.objectives && project.objectives.map(obj => { const objProgress = obj.subObjectives && obj.subObjectives.length > 0 ? (obj.subObjectives.filter(s => s.completed).length / obj.subObjectives.length) * 100 : (obj.completed ? 100 : 0); return ( <div key={obj.id} className="border border-gray-200 dark:border-slate-700 rounded-lg p-4 bg-gray-50/30 dark:bg-slate-700/30"> <div className="flex items-center justify-between mb-3"> <div className="flex items-center gap-2 font-semibold text-gray-800 dark:text-gray-200"> <Target size={18} className="text-indigo-500" /> {obj.title} </div> <button onClick={() => deleteObjective(project.id, obj.id)} className="text-gray-300 hover:text-red-400"><X size={16} /></button> </div> <div className="pl-6 space-y-2 mb-3"> {obj.subObjectives && obj.subObjectives.map(sub => ( <div key={sub.id} className="flex items-center gap-2 cursor-pointer group" onClick={() => toggleSubObjective(project.id, obj.id, sub.id)}> {sub.completed ? <CheckSquare size={16} className="text-indigo-600" /> : <Square size={16} className="text-gray-400 group-hover:text-indigo-400" />} <span className={`text-sm ${sub.completed ? 'text-gray-400 line-through dark:text-gray-500' : 'text-gray-600 dark:text-gray-300'}`}>{sub.title}</span> </div> ))} </div> <div className="pl-6 flex gap-2"> <input type="text" className="flex-1 text-sm bg-transparent border-b border-gray-300 dark:border-slate-600 focus:border-indigo-500 outline-none py-1 dark:text-white" placeholder="+ Ajouter une étape..." value={newSubObjectiveText[`${project.id}-${obj.id}`] || ''} onChange={(e) => setNewSubObjectiveText({...newSubObjectiveText, [`${project.id}-${obj.id}`]: e.target.value})} onKeyDown={(e) => e.key === 'Enter' && addSubObjective(project.id, obj.id)} /> <button onClick={() => addSubObjective(project.id, obj.id)} className="text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/50 p-1 rounded"><Plus size={16} /></button> </div> <div className="mt-3 h-1 w-full bg-gray-100 dark:bg-slate-600 rounded-full overflow-hidden"> <div className="h-full bg-indigo-400 transition-all duration-300" style={{ width: `${objProgress}%` }}></div> </div> </div> ); })} </div> <div className="flex gap-2 p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-dashed border-gray-300 dark:border-slate-600 mt-4"> <input type="text" className="flex-1 bg-transparent outline-none dark:text-white" placeholder="Nouvel objectif principal..." value={newObjectiveText[project.id] || ''} onChange={(e) => setNewObjectiveText({...newObjectiveText, [project.id]: e.target.value})} onKeyDown={(e) => e.key === 'Enter' && addObjective(project.id)} /> <button onClick={() => addObjective(project.id)} className="px-3 py-1 bg-white dark:bg-slate-600 border border-gray-200 dark:border-slate-500 text-sm font-medium text-gray-700 dark:text-white rounded shadow-sm hover:bg-gray-50 dark:hover:bg-slate-500">Ajouter</button> </div> </div>
                                    <div className="space-y-6"> 
                                        <div> 
                                            <h4 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2"><LinkIcon size={16}/> Notes liées</h4> 
                                            {linkedNotes.length > 0 ? ( 
                                                <div className="space-y-2"> 
                                                    {linkedNotes.map(note => ( 
                                                        <div key={note.id} className={`p-3 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-700/30`}> 
                                                            <h5 className="font-bold text-sm text-gray-800 dark:text-gray-100">{note.title}</h5> 
                                                            <p className="text-xs text-gray-600 dark:text-gray-300 whitespace-pre-wrap break-words line-clamp-6">{note.content}</p> 
                                                        </div> 
                                                    ))} 
                                                </div> 
                                            ) : ( <p className="text-xs text-gray-400 italic bg-gray-50 dark:bg-slate-700/30 p-3 rounded-lg">Aucune note liée pour l'instant. Créez-en une dans l'onglet "Bloc-notes" en sélectionnant ce projet.</p> )} 
                                        </div> 
                                        <div> 
                                            <h4 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2"><StickyNote size={16}/> Idées en vrac (Interne)</h4> 
                                            <textarea value={project.notes || ''} onChange={(e) => updateProjectNotes(project.id, e.target.value)} className="w-full h-48 p-4 text-sm bg-yellow-50 dark:bg-slate-700/30 border border-yellow-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-yellow-400 focus:border-transparent outline-none resize-none dark:text-gray-200" placeholder="Noter des idées, des liens, des références, des pensées en vrac..."></textarea> 
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