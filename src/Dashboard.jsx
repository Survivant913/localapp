import { useState } from 'react';
import { 
  LayoutDashboard, Wallet, TrendingUp, TrendingDown, 
  CheckSquare, StickyNote, Plus, FolderKanban, 
  Calendar, Eye, EyeOff, CheckCircle2, List, Target, Euro, Flag
} from 'lucide-react';
import FocusProjectModal from './FocusProjectModal';

// --- COMPOSANT SPARKLINE (Graphique Mini) ---
const SparkLine = ({ data, height = 50 }) => {
    if (!data || !Array.isArray(data) || data.length < 2) return null;
    
    let min = Math.min(...data);
    let max = Math.max(...data);
    
    if (min > 0) min = 0; 
    if (max < 0) max = 0;
    
    const range = max - min || 1;
    const width = 100;
    
    const getY = (val) => height - ((val - min) / range) * height;

    const points = data.map((val, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = getY(val);
        return `${x},${y}`;
    }).join(' ');
    
    const zeroOffset = Math.max(0, Math.min(1, (max - 0) / range));
    const gradientId = "spark-grad-" + Math.random().toString(36).substr(2, 9);

    return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
            <defs>
                <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="1" />
                    <stop offset={`${zeroOffset * 100}%`} stopColor="#10b981" stopOpacity="1" />
                    <stop offset={`${zeroOffset * 100}%`} stopColor="#ef4444" stopOpacity="1" />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity="1" />
                </linearGradient>
            </defs>
            <line x1="0" y1={getY(0)} x2="100" y2={getY(0)} stroke="currentColor" className="text-gray-300 dark:text-slate-600" strokeWidth="0.5" strokeDasharray="2" opacity="0.8" />
            <polyline fill="none" stroke={`url(#${gradientId})`} strokeWidth="2" points={points} vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx={100} cy={getY(data[data.length-1])} r="3" fill={data[data.length-1] >= 0 ? "#10b981" : "#ef4444"} className="animate-pulse" vectorEffect="non-scaling-stroke"/>
        </svg>
    );
};

export default function Dashboard({ data, updateData, setView }) {
    const [dashboardFilter, setDashboardFilter] = useState('total');
    const [focusedProject, setFocusedProject] = useState(null);
    
    const isPrivacyMode = data.settings?.privacyMode || false;
    const togglePrivacyMode = () => {
        updateData({ ...data, settings: { ...data.settings, privacyMode: !isPrivacyMode } });
    };

    // SÉCURISATION DES DONNÉES
    const todos = Array.isArray(data.todos) ? data.todos : [];
    const projects = Array.isArray(data.projects) ? data.projects : [];
    const notes = Array.isArray(data.notes) ? data.notes : [];
    
    const budget = data.budget || {};
    const transactions = Array.isArray(budget.transactions) ? budget.transactions : [];
    const scheduled = Array.isArray(budget.scheduled) ? budget.scheduled : [];
    const recurring = Array.isArray(budget.recurring) ? budget.recurring : [];
    const accounts = Array.isArray(budget.accounts) ? budget.accounts : [];
    
    const labels = data.customLabels || {};

    // --- 1. FILTRES & CALCULS FINANCIERS ---
    const isRelevantAccount = (accId) => {
        if (dashboardFilter === 'total') return true;
        return String(accId) === String(dashboardFilter);
    };

    // Solde affiché (dépend du filtre)
    const currentBalanceRaw = transactions
        .filter(t => isRelevantAccount(t.accountId || t.account_id))
        .reduce((acc, t) => t.type === 'income' ? acc + parseFloat(t.amount || 0) : acc - parseFloat(t.amount || 0), 0);
    
    // CORRECTIF 1: Arrondi strict pour éviter les erreurs flottantes (ex: 1450.0000001)
    const currentBalance = Math.round(currentBalanceRaw * 100) / 100;

    // Solde GLOBAL TOTAL (pour projets)
    const globalTotalBalance = Math.round(
        transactions.reduce((acc, t) => t.type === 'income' ? acc + parseFloat(t.amount || 0) : acc - parseFloat(t.amount || 0), 0) 
        * 100
    ) / 100;

    const renderAmount = (amount, withSign = false) => {
        if (isPrivacyMode) return '**** €';
        const val = parseFloat(amount || 0);
        const formatted = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(Math.abs(val));
        if (withSign) return (val >= 0 ? '+' : '-') + formatted;
        return formatted;
    };

    // CORRECTIF 3: Optimisation Performance Sparkline (O(N) au lieu de O(N²))
    const getSparklineData = () => {
        try {
            const days = 30; 
            const history = [];
            let tempBalance = currentBalance;
            
            // Étape 1 : Pré-calculer les mouvements par jour (Hash Map)
            const dailyChanges = {};
            const relevantTransactions = transactions.filter(t => isRelevantAccount(t.accountId || t.account_id));
            
            relevantTransactions.forEach(t => {
                // On utilise une clé date simple "YYYY-MM-DD" ou locale string
                const d = new Date(t.date);
                // Astuce: setHours à 0 pour normaliser la clé
                d.setHours(0,0,0,0);
                const key = d.getTime(); // Timestamp du début de journée comme clé unique rapide
                
                const amount = parseFloat(t.amount || 0);
                const delta = t.type === 'income' ? amount : -amount;
                
                dailyChanges[key] = (dailyChanges[key] || 0) + delta;
            });

            // Étape 2 : Boucle simple sur 30 jours
            let currentDateCursor = new Date();
            currentDateCursor.setHours(0,0,0,0); 

            for (let i = 0; i < days; i++) {
                // On enregistre le solde (arrondi)
                history.unshift(Number(tempBalance.toFixed(2)));
                
                // Pour remonter dans le temps, on SOUSTRAIT ce qui s'est passé ce jour-là
                // (Si j'ai gagné 10€ aujourd'hui, hier j'avais 10€ de moins)
                const key = currentDateCursor.getTime();
                const changeToday = dailyChanges[key] || 0;
                
                tempBalance -= changeToday;
                
                // Reculer d'un jour
                currentDateCursor.setDate(currentDateCursor.getDate() - 1);
            }
            return history;
        } catch (e) { console.error(e); return [0, 0]; }
    };
    
    const sparkData = getSparklineData();

    // --- 2. CALCUL "À VENIR" ---
    const getUpcomingEvents = () => {
        try {
            const today = new Date();
            today.setHours(0,0,0,0);
            let events = [];

            scheduled.forEach(s => {
                if(s.status === 'pending') {
                    if (!isRelevantAccount(s.accountId || s.account_id)) return;
                    events.push({ type: 'scheduled', date: new Date(s.date), data: s, id: `s-${s.id}` });
                }
            });

            recurring.forEach(r => {
                if (!isRelevantAccount(r.accountId || r.account_id)) return;
                let nextDate = r.nextDueDate ? new Date(r.nextDueDate) : new Date();
                events.push({ type: 'recurring', date: nextDate, data: r, id: `r-${r.id}` });
            });

            return events
                .filter(e => !isNaN(e.date.getTime()) && e.date >= today)
                .sort((a, b) => a.date - b.date)
                .slice(0, 3);
        } catch (e) { return []; }
    };
    const upcomingList = getUpcomingEvents();

    // --- 3. ACTIONS & LOGIQUE PROJET ---
    const toggleTodo = (id) => {
        const newTodos = todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
        updateData({ ...data, todos: newTodos });
    };

    const getAccountBalanceForProject = (accId) => {
        return transactions
            .filter(t => String(t.accountId || t.account_id) === String(accId))
            .reduce((acc, t) => t.type === 'income' ? acc + parseFloat(t.amount || 0) : acc - parseFloat(t.amount || 0), 0);
    };

    // CORRECTIF 2: Tri par Priorité Complet (High > Medium > Low > None)
    const priorityWeight = { high: 3, medium: 2, low: 1, none: 0 };
    
    const activeProjects = projects
        .filter(p => p.status !== 'done' && p.status !== 'on_hold')
        .sort((a, b) => {
            const weightA = priorityWeight[a.priority] || 0;
            const weightB = priorityWeight[b.priority] || 0;
            return weightB - weightA; // Descendant (plus haute priorité en premier)
        })
        .slice(0, 3);

    const handleAutoFocus = () => {
        const active = projects.filter(p => p.status !== 'done' && p.status !== 'on_hold');
        if (active.length === 0) return;
        const sorted = active.sort((a, b) => {
            const diffP = (priorityWeight[b.priority || 'none'] || 0) - (priorityWeight[a.priority || 'none'] || 0);
            if (diffP !== 0) return diffP;
            if (a.deadline && b.deadline) return new Date(a.deadline) - new Date(b.deadline);
            if (a.deadline) return -1;
            if (b.deadline) return 1;
            return 0;
        });
        setFocusedProject(sorted[0]);
    };

    const updateProjectFromFocus = (updatedProject) => {
        const updatedProjects = projects.map(p => p.id === updatedProject.id ? updatedProject : p);
        updateData({ ...data, projects: updatedProjects });
        setFocusedProject(updatedProject);
    };

    const pinnedNotes = notes.filter(n => n.isPinned).slice(0, 4);
    const urgentTodos = todos.filter(t => !t.completed && (t.priority === 'high' || t.priority === 'warm')).slice(0, 5);
    const todayDate = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    return (
        <div className="space-y-6 fade-in p-4 pb-24 md:pb-20 max-w-7xl mx-auto">
            {focusedProject && (
                <FocusProjectModal 
                    project={focusedProject} 
                    onClose={() => setFocusedProject(null)} 
                    updateProject={updateProjectFromFocus} 
                    accounts={accounts} 
                    availableForProjects={currentBalance} 
                    getAccountBalance={getAccountBalanceForProject} 
                />
            )}

            {/* HEADER */}
            <div className="flex flex-col lg:flex-row gap-6">
                <div className="flex-1 bg-white dark:bg-slate-800 p-6 md:p-8 rounded-3xl shadow-sm border border-gray-200 dark:border-slate-700 flex flex-col justify-between">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                        <div>
                            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white mb-1 md:mb-2">{labels.userName || 'Bonjour,'}</h2>
                            <p className="text-gray-500 dark:text-gray-400 text-sm md:text-lg capitalize">{todayDate}</p>
                        </div>
                        <select 
                            value={dashboardFilter} 
                            onChange={(e) => setDashboardFilter(e.target.value)} 
                            className="w-full md:w-auto px-4 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-sm font-bold outline-none text-slate-800 dark:text-white"
                        >
                            <option value="total">Vue Globale</option>
                            {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                        </select>
                    </div>
                    <div className="flex gap-2 md:gap-4 mt-auto">
                        <button onClick={() => setView('budget')} className="flex-1 flex items-center justify-center gap-2 px-3 py-3 md:px-6 md:py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl md:rounded-2xl text-sm md:text-base font-bold shadow-lg shadow-blue-900/20 transition-transform hover:scale-[1.02]"><Plus size={18}/> <span className="hidden sm:inline">Dépense</span><span className="sm:hidden">Ajout</span></button>
                        <button onClick={() => setView('todo')} className="flex-1 flex items-center justify-center gap-2 px-3 py-3 md:px-6 md:py-4 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-800 dark:text-white rounded-xl md:rounded-2xl text-sm md:text-base font-bold transition-transform hover:scale-[1.02]"><CheckSquare size={18} className="text-orange-500"/> <span className="hidden sm:inline">Tâche</span><span className="sm:hidden">Tâche</span></button>
                        <button onClick={() => setView('notes')} className="flex-1 flex items-center justify-center gap-2 px-3 py-3 md:px-6 md:py-4 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-800 dark:text-white rounded-xl md:rounded-2xl text-sm md:text-base font-bold transition-transform hover:scale-[1.02]"><StickyNote size={18} className="text-yellow-500"/> <span className="hidden sm:inline">Note</span><span className="sm:hidden">Note</span></button>
                    </div>
                </div>
            </div>

            {/* METRICS ROW */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* CARTE SOLDE */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-lg border border-gray-200 dark:border-slate-700 relative overflow-hidden flex flex-col justify-between min-h-[220px]">
                    <div className="relative z-10 flex justify-between items-start">
                        <div className="p-3 bg-green-50 dark:bg-slate-800 rounded-2xl text-green-600 dark:text-green-400"><Wallet size={24}/></div>
                        <button onClick={togglePrivacyMode} className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-white transition-colors">{isPrivacyMode ? <EyeOff size={20}/> : <Eye size={20}/>}</button>
                    </div>
                    <div className="relative z-10 mt-4 mb-4">
                        <h3 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-1">{renderAmount(currentBalance)}</h3>
                        <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Solde Total</p>
                    </div>
                    <div className="h-16 w-full mt-auto bg-gray-50 dark:bg-slate-800/50 rounded-xl p-2 border border-gray-100 dark:border-slate-700/50">
                        <SparkLine data={sparkData} height={50} />
                    </div>
                </div>

                {/* CARTE À VENIR */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-lg border border-gray-200 dark:border-slate-700 flex flex-col">
                    <div className="flex items-center gap-2 mb-6 text-purple-600 dark:text-purple-400">
                        <Calendar size={20}/>
                        <h3 className="font-bold text-gray-800 dark:text-white">À venir</h3>
                    </div>
                    <div className="flex-1 flex flex-col gap-3">
                        {upcomingList.length === 0 ? (
                            <div className="flex-1 flex items-center justify-center text-gray-400 dark:text-slate-500 text-sm py-4">Rien à signaler</div>
                        ) : (
                            upcomingList.map((e, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 md:p-4 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-gray-100 dark:border-slate-700">
                                    <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
                                        <div className="p-2 bg-white dark:bg-slate-700 rounded-lg text-gray-500 dark:text-slate-300 shadow-sm shrink-0">{e.type === 'scheduled' ? <Calendar size={18}/> : <TrendingUp size={18}/>}</div>
                                        <div className="min-w-0">
                                            <p className="font-bold text-gray-800 dark:text-white text-sm truncate">{e.data.description}</p>
                                            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400">
                                                <span>{e.date.toLocaleDateString()}</span>
                                                {e.type === 'recurring' && <span className="flex items-center gap-1"><TrendingUp size={10}/> <span className="hidden sm:inline">Récurrent</span></span>}
                                            </div>
                                        </div>
                                    </div>
                                    <span className={`font-bold text-sm shrink-0 pl-2 ${e.data.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                        {renderAmount(e.data.type === 'income' ? parseFloat(e.data.amount) : -parseFloat(e.data.amount), true)}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* MAIN CONTENT ROW */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* PROJETS ACTIFS (2/3) */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-200 dark:border-slate-700 shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2"><FolderKanban size={20} className="text-blue-500"/> Projets Actifs</h3>
                            <button onClick={handleAutoFocus} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-colors shadow-lg shadow-indigo-900/20"><Target size={14}/> FOCUS</button>
                        </div>
                        
                        <div className="space-y-4">
                            {activeProjects.length === 0 ? (
                                <p className="text-gray-400 dark:text-slate-500 text-sm italic text-center py-4">Aucun projet en cours.</p>
                            ) : (
                                activeProjects.map(p => {
                                    const cost = parseFloat(p.cost || 0);
                                    let fundingPercentage = 0;
                                    let isFunded = true;
                                    let budgetAvailable = 0;
                                    
                                    if (cost > 0) {
                                        budgetAvailable = p.linkedAccountId 
                                            ? getAccountBalanceForProject(p.linkedAccountId) 
                                            : Math.max(0, globalTotalBalance);
                                        
                                        fundingPercentage = Math.min(100, (Math.max(0, budgetAvailable) / cost) * 100);
                                        isFunded = budgetAvailable >= cost;
                                    }
                                    
                                    let globalScore = p.progress || 0;
                                    if (cost > 0) globalScore = (globalScore + fundingPercentage) / 2;

                                    return (
                                        <div key={p.id} className="bg-gray-50 dark:bg-slate-800/50 p-4 md:p-5 rounded-2xl border border-gray-100 dark:border-slate-700 hover:border-blue-200 dark:hover:border-slate-600 transition-colors cursor-pointer" onClick={() => setView('projects')}>
                                            <div className="flex items-center gap-4 md:gap-5">
                                                {/* CERCLE GAUCHE */}
                                                <div className="relative inline-flex items-center justify-center w-12 h-12 md:w-14 md:h-14 shrink-0">
                                                    <svg className="w-full h-full transform -rotate-90">
                                                        <circle cx="50%" cy="50%" r="45%" stroke="currentColor" strokeWidth="4" fill="none" className="text-gray-200 dark:text-slate-700" />
                                                        <circle cx="50%" cy="50%" r="45%" stroke="currentColor" strokeWidth="4" fill="none" strokeDasharray={2 * Math.PI * 22} strokeDashoffset={2 * Math.PI * 22 * (1 - globalScore / 100)} className={`transition-all duration-1000 ${globalScore >= 100 ? 'text-green-500' : 'text-blue-500'}`} strokeLinecap="round" />
                                                    </svg>
                                                    <span className="absolute text-[10px] md:text-xs font-bold text-gray-700 dark:text-slate-200">{Math.round(globalScore)}%</span>
                                                </div>

                                                {/* DETAIL DROITE */}
                                                <div className="flex-1 min-w-0 space-y-2">
                                                    <div className="flex justify-between items-start">
                                                        <div className="min-w-0 flex-1 pr-2">
                                                            <h4 className="font-bold text-gray-800 dark:text-white text-sm md:text-base truncate">{p.title}</h4>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                <span className={`w-2 h-2 shrink-0 rounded-full ${p.status === 'in_progress' ? 'bg-green-500' : 'bg-blue-500'}`}></span>
                                                                <p className="text-xs text-gray-500 dark:text-slate-400 truncate">{p.description || "Pas de description"}</p>
                                                            </div>
                                                        </div>
                                                        {p.status === 'in_progress' && <span className="hidden sm:inline-block text-[9px] font-bold bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded uppercase shrink-0">En cours</span>}
                                                    </div>

                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                                                        <div className="space-y-1">
                                                            <div className="flex justify-between text-[10px] text-gray-500 dark:text-slate-400">
                                                                <span className="flex items-center gap-1"><List size={10}/> Tâches</span>
                                                                <span>{Math.round(p.progress || 0)}%</span>
                                                            </div>
                                                            <div className="h-1.5 w-full bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                                                <div 
                                                                    className="h-full bg-blue-500 rounded-full" 
                                                                    style={{ width: `${Math.min(100, Math.max(0, p.progress || 0))}%` }}
                                                                ></div>
                                                            </div>
                                                        </div>
                                                        {cost > 0 && (
                                                            <div className="space-y-1">
                                                                <div className="flex justify-between text-[10px] text-gray-500 dark:text-slate-400">
                                                                    <span className="flex items-center gap-1"><Euro size={10}/> Budget</span>
                                                                    <span className={isFunded ? "text-green-600 dark:text-green-400" : "text-orange-500 dark:text-orange-400"}>{Math.round(fundingPercentage)}%</span>
                                                                </div>
                                                                <div className="h-1.5 w-full bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                                                        <div 
                                                                            className={`h-full rounded-full ${isFunded ? 'bg-green-500' : 'bg-orange-500'}`} 
                                                                            style={{ width: `${Math.min(100, Math.max(0, fundingPercentage))}%` }}
                                                                        ></div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* NOTES ÉPINGLÉES */}
                    {pinnedNotes.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {pinnedNotes.map(n => (
                                <div key={n.id} className={`p-5 rounded-2xl border border-transparent shadow-sm ${n.color} text-slate-800 min-h-[120px] flex flex-col cursor-pointer hover:opacity-90`} onClick={() => setView('notes')}>
                                    <h4 className="font-bold text-sm mb-1 line-clamp-1">{n.title}</h4>
                                    <p className="text-xs opacity-80 line-clamp-6 break-words">{n.content}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* URGENCES (1/3) */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-200 dark:border-slate-700 h-fit shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2"><CheckSquare size={20} className="text-red-500"/> Urgences</h3>
                        <span className="bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-bold px-2 py-1 rounded-full">{urgentTodos.length}</span>
                    </div>
                    <div className="space-y-3">
                        {urgentTodos.length === 0 ? (
                            <p className="text-gray-400 dark:text-slate-500 text-sm italic text-center py-4">Rien d'urgent.</p>
                        ) : (
                            urgentTodos.map(t => (
                                <div 
                                    key={t.id} 
                                    className="group flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 hover:border-red-300 dark:hover:border-red-500 hover:shadow-sm transition-all cursor-pointer"
                                    onClick={() => toggleTodo(t.id)}
                                >
                                    <button className="shrink-0 w-5 h-5 rounded-full border-2 border-gray-300 dark:border-slate-500 flex items-center justify-center transition-colors group-hover:border-green-500 group-hover:text-green-500 text-transparent">
                                        <CheckCircle2 size={12} />
                                    </button>
                                    
                                    <div className="flex-1 min-w-0">
                                        <span className="text-sm font-medium text-gray-800 dark:text-slate-100 line-clamp-1">{t.text}</span>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-[10px] font-bold text-red-500 flex items-center gap-1"><Flag size={8}/> Urgent</span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    <button onClick={() => setView('todo')} className="w-full mt-6 py-3 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-300 text-sm font-bold rounded-xl transition-colors">Voir toutes les tâches</button>
                </div>
            </div>
        </div>
    );
}