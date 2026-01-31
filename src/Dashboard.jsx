import { useState } from 'react';
import { 
  LayoutDashboard, Wallet, TrendingUp, TrendingDown, 
  CheckSquare, StickyNote, Plus, FolderKanban, 
  Calendar, Eye, EyeOff, CheckCircle2, List, Target, Euro, Flag, Clock, ArrowRightLeft
} from 'lucide-react'; 
import FocusProjectModal from './FocusProjectModal';

// --- COMPOSANT SPARKLINE (Graphique Mini - Optimisé) ---
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

    // --- 1. FILTRES INTELLIGENTS (CORRIGÉS) ---
    const isRelevantItem = (item) => {
        if (dashboardFilter === 'total') return true;
        const accId = String(item.accountId || item.account_id);
        const targetId = String(item.targetAccountId || item.target_account_id);
        return accId === String(dashboardFilter) || targetId === String(dashboardFilter);
    };

    const getFinancialImpact = (item) => {
        const amount = parseFloat(item.amount || 0);
        const type = item.type;
        const accId = String(item.accountId || item.account_id);
        const targetId = String(item.targetAccountId || item.target_account_id);

        if (dashboardFilter === 'total') {
            if (type === 'income') return amount;
            if (type === 'expense') return -amount;
            if (type === 'transfer') return 0; 
            return -amount;
        }

        if (type === 'transfer') {
            if (targetId === String(dashboardFilter)) return amount; 
            if (accId === String(dashboardFilter)) return -amount;   
            return 0;
        }

        if (type === 'income') return amount;
        return -amount;
    };

    // --- 2. CALCULS DE SOLDE ---
    const currentBalanceRaw = transactions
        .filter(t => isRelevantItem(t))
        .reduce((acc, t) => acc + getFinancialImpact(t), 0);
    
    const currentBalance = Math.round(currentBalanceRaw * 100) / 100;

    const renderAmount = (val, withSign = false) => {
        if (isPrivacyMode) return '**** €';
        const formatted = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(Math.abs(val));
        if (withSign) {
            if (val > 0) return '+' + formatted;
            if (val < 0) return '-' + formatted;
            return formatted;
        }
        return (val < 0 ? '-' : '') + formatted;
    };

    // --- NOUVEAU : CALCUL PRÉVISION FIN DE MOIS ---
    const getProjectedEndOfMonth = () => {
        const today = new Date();
        const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0); // Dernier jour du mois
        let projected = currentBalance;

        // 1. Ajouter les opérations planifiées (Scheduled) d'ici la fin du mois
        scheduled.forEach(s => {
            if (s.status === 'pending' && isRelevantItem(s)) {
                const sDate = new Date(s.date);
                if (sDate >= today && sDate <= lastDayOfMonth) {
                    projected += getFinancialImpact(s);
                }
            }
        });

        // 2. Ajouter les récurrentes (Recurring) d'ici la fin du mois
        recurring.forEach(r => {
            if (isRelevantItem(r) && r.nextDueDate) {
                const rDate = new Date(r.nextDueDate);
                if (rDate >= today && rDate <= lastDayOfMonth) {
                    projected += getFinancialImpact(r);
                }
            }
        });

        return projected;
    };
    const projectedBalance = getProjectedEndOfMonth();
    const balanceDiff = projectedBalance - currentBalance; // Différence pour savoir si ça monte ou descend

    // Graphique Performant
    const getSparklineData = () => {
        try {
            const days = 30; 
            const history = [];
            let tempBalance = currentBalance;
            
            const dailyChanges = {};
            const relevantTransactions = transactions.filter(t => isRelevantItem(t));
            
            relevantTransactions.forEach(t => {
                const d = new Date(t.date);
                d.setHours(0,0,0,0);
                const key = d.getTime();
                const impact = getFinancialImpact(t);
                dailyChanges[key] = (dailyChanges[key] || 0) + impact;
            });

            let currentDateCursor = new Date();
            currentDateCursor.setHours(0,0,0,0); 

            for (let i = 0; i < days; i++) {
                history.unshift(Number(tempBalance.toFixed(2)));
                const key = currentDateCursor.getTime();
                tempBalance -= (dailyChanges[key] || 0);
                currentDateCursor.setDate(currentDateCursor.getDate() - 1);
            }
            return history;
        } catch (e) { return [0, 0]; }
    };
    
    const sparkData = getSparklineData();

    // --- 3. CALCUL "À VENIR" ---
    const getUpcomingEvents = () => {
        try {
            const today = new Date();
            today.setHours(0,0,0,0);
            let events = [];

            scheduled.forEach(s => {
                if(s.status === 'pending') {
                    if (!isRelevantItem(s)) return;
                    events.push({ type: 'scheduled', date: new Date(s.date), data: s, id: `s-${s.id}` });
                }
            });

            recurring.forEach(r => {
                if (!isRelevantItem(r)) return;
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

    // --- 4. AUTRES HELPERS ---
    const getNextCalendarEvents = () => {
        try {
            const now = new Date();
            const today = new Date();
            today.setHours(0,0,0,0);
            
            const calEvents = (data.calendar_events || []).map(e => ({
                id: e.id, title: e.title, start_time: e.start_time, is_todo: false,
                is_all_day: e.is_all_day
            }));

            return calEvents
                .filter(e => {
                    const evtDate = new Date(e.start_time);
                    if (e.is_all_day) return evtDate >= today;
                    return evtDate > now;
                })
                .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
                .slice(0, 4);
        } catch (e) { return []; }
    };
    const nextCalendarEvents = getNextCalendarEvents();

    // --- NOUVEAU : FONCTION COMPTEUR JOURS (AGENDA) ---
    const getDayCounterLabel = (dateStr) => {
        const today = new Date(); today.setHours(0,0,0,0);
        const target = new Date(dateStr); target.setHours(0,0,0,0);
        const diffTime = target - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return { text: 'Auj.', color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30' };
        if (diffDays === 1) return { text: 'Demain', color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30' };
        if (diffDays < 0) return { text: 'Passé', color: 'text-gray-400 bg-gray-100 dark:bg-slate-700' };
        return { text: `J-${diffDays}`, color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30' };
    };

    const toggleTodo = (id) => {
        const newTodos = todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
        updateData({ ...data, todos: newTodos });
    };

    const getAccountBalanceForProject = (accId) => {
        return transactions
            .filter(t => String(t.accountId || t.account_id) === String(accId))
            .reduce((acc, t) => t.type === 'income' ? acc + parseFloat(t.amount || 0) : acc - parseFloat(t.amount || 0), 0);
    };

    const priorityWeight = { high: 3, medium: 2, low: 1, none: 0 };
    
    const activeProjects = projects
        .filter(p => p.status !== 'done' && p.status !== 'on_hold')
        .sort((a, b) => {
            const weightA = priorityWeight[a.priority] || 0;
            const weightB = priorityWeight[b.priority] || 0;
            return weightB - weightA; 
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
        // --- MODIF : w-full + px-8 pour pleine largeur ---
        <div className="space-y-8 fade-in p-6 pb-24 md:pb-20 w-full transition-all duration-500 bg-slate-50/30 dark:bg-slate-950/20">
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

            {/* HEADER DESIGN PREMIUM */}
            <div className="flex flex-col lg:flex-row gap-8">
                <div className="flex-1 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl p-8 md:p-10 rounded-[2.5rem] shadow-2xl shadow-indigo-500/5 border border-white dark:border-white/5 flex flex-col md:flex-row justify-between items-center gap-8 relative overflow-hidden group">
                    <div className="absolute -right-20 -top-20 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl transition-all group-hover:bg-blue-500/10"></div>
                    <div className="relative z-10 text-center md:text-left">
                        <h2 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-800 to-slate-500 dark:from-white dark:to-slate-400 mb-3 tracking-tighter italic">
                            {labels.userName || 'Bonjour,'}
                        </h2>
                        <p className="text-blue-600 dark:text-blue-400 text-lg md:text-xl font-bold uppercase tracking-[0.2em]">{todayDate}</p>
                    </div>
                    
                    <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
                        <select 
                            value={dashboardFilter} 
                            onChange={(e) => setDashboardFilter(e.target.value)} 
                            className="w-full md:w-auto px-6 py-3 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-black outline-none text-slate-800 dark:text-white shadow-sm ring-1 ring-inset ring-slate-100 dark:ring-slate-700 focus:ring-blue-500 transition-all"
                        >
                            <option value="total">Vue Stratégique</option>
                            {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                        </select>
                        <div className="flex gap-3 w-full md:w-auto">
                            <button onClick={() => setView('budget')} className="flex-1 md:flex-none p-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all"><Plus size={20}/></button>
                            <button onClick={() => setView('todo')} className="flex-1 md:flex-none p-4 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm hover:bg-slate-50 transition-all"><CheckSquare size={20}/></button>
                        </div>
                    </div>
                </div>
            </div>

            {/* METRICS ROW - EXPANSED GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* CARTE SOLDE MAJESTUEUSE */}
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 relative overflow-hidden flex flex-col group h-full transition-all hover:border-emerald-500/20">
                    <div className="absolute top-0 right-0 p-8 opacity-5">
                        <Wallet size={120} className="rotate-12"/>
                    </div>
                    <div className="flex justify-between items-start mb-10">
                        <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-100 dark:ring-emerald-800"><Wallet size={28}/></div>
                        <button onClick={togglePrivacyMode} className="p-2 text-slate-300 dark:text-slate-600 hover:text-blue-500 transition-all">{isPrivacyMode ? <EyeOff size={22}/> : <Eye size={22}/>}</button>
                    </div>
                    <div className="mb-8">
                        <h3 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tighter mb-2">{renderAmount(currentBalance)}</h3>
                        <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                           TRÉSORERIE {dashboardFilter === 'total' ? 'GLOBALE' : 'COMPTE'}
                        </p>
                        
                        {!isPrivacyMode && (
                            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 bg-slate-50 dark:bg-slate-800/50 rounded-full border border-slate-100 dark:border-slate-700">
                                <span className="text-[10px] font-bold text-slate-400">FIN DE MOIS :</span>
                                <span className={`text-xs font-black ${balanceDiff >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                                    {renderAmount(projectedBalance)}
                                </span>
                            </div>
                        )}
                    </div>
                    <div className="h-20 w-full mt-auto bg-slate-50/50 dark:bg-slate-800/30 rounded-3xl p-4 border border-slate-100 dark:border-slate-800/50">
                        <SparkLine data={sparkData} height={50} />
                    </div>
                </div>

                {/* CARTE OPÉRATIONS (2/3) - GLASS CARD */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col group transition-all hover:border-purple-500/20">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-3">
                            <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-xl text-purple-600"><Calendar size={22}/></div>
                            FLUX PLANIFIÉS
                        </h3>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Prochains Jours</span>
                    </div>
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {upcomingList.length === 0 ? (
                            <div className="col-span-full flex flex-col items-center justify-center text-slate-400 py-10 gap-2">
                                <ArrowRightLeft size={32} className="opacity-10"/>
                                <span className="text-sm font-bold italic">Tranquillité totale</span>
                            </div>
                        ) : (
                            upcomingList.map((e, idx) => {
                                const impact = getFinancialImpact(e.data);
                                return (
                                    <div key={idx} className="flex flex-col justify-between p-5 bg-slate-50/50 dark:bg-slate-800/40 rounded-3xl border border-slate-100 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800 transition-all duration-300">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="text-[10px] font-black px-2 py-1 bg-white dark:bg-slate-700 rounded-lg shadow-sm">{e.date.toLocaleDateString('fr-FR', {day: '2-digit', month: 'short'})}</div>
                                            {impact > 0 ? <TrendingUp size={16} className="text-emerald-500"/> : <TrendingDown size={16} className="text-rose-500"/>}
                                        </div>
                                        <p className="font-bold text-slate-800 dark:text-white text-sm line-clamp-2 mb-4 leading-tight h-10">{e.data.description}</p>
                                        <span className={`text-lg font-black ${impact === 0 ? 'text-blue-500' : impact > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            {impact === 0 ? 'TRANS.' : renderAmount(impact, true)}
                                        </span>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

            {/* MAIN CONTENT - REORGANIZED FULL WIDTH */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* PROJETS & NOTES (COLONNE GAUCHE + CENTRE) */}
                <div className="lg:col-span-8 space-y-8">
                    {/* SECTION PROJETS STYLE KANBAN FLAT */}
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-2xl">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-3">
                                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-600"><FolderKanban size={22}/></div>
                                CHANTIERS ACTIFS
                            </h3>
                            <button onClick={handleAutoFocus} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-900/20 transition-all active:scale-95">MODE FOCUS</button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {activeProjects.length === 0 ? (
                                <p className="col-span-full text-center text-slate-400 py-10 font-bold italic opacity-50 tracking-widest">RAS . AUCUN CHANTIER</p>
                            ) : (
                                activeProjects.map(p => {
                                    const cost = parseFloat(p.cost || 0);
                                    let budgetAvailable = p.linkedAccountId ? getAccountBalanceForProject(p.linkedAccountId) : Math.max(0, currentBalance);
                                    const fundingPercentage = cost > 0 ? Math.min(100, (Math.max(0, budgetAvailable) / cost) * 100) : 0;
                                    const safeProgress = Math.min(100, Math.max(0, p.progress || 0));
                                    const globalScore = cost > 0 ? (safeProgress + fundingPercentage) / 2 : safeProgress;

                                    return (
                                        <div key={p.id} className="bg-slate-50/50 dark:bg-slate-800/30 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800/80 hover:bg-white dark:hover:bg-slate-800 transition-all cursor-pointer group" onClick={() => setView('projects')}>
                                            <div className="flex items-center gap-5 mb-6">
                                                <div className="relative w-16 h-16 shrink-0">
                                                    <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                                        <path className="text-slate-200 dark:text-slate-700" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                                                        <path className="text-blue-500 transition-all duration-1000" strokeDasharray={`${globalScore}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                                                    </svg>
                                                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black dark:text-white">{Math.round(globalScore)}%</span>
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className="font-black text-slate-800 dark:text-white text-base truncate group-hover:text-blue-500 transition-colors">{p.title}</h4>
                                                    <span className="text-[9px] font-black text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full uppercase">En cours</span>
                                                </div>
                                            </div>
                                            <div className="space-y-4">
                                                <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                                    <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${safeProgress}%` }}></div>
                                                </div>
                                                <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                                                   <span>Avancement</span>
                                                   <span className="dark:text-slate-200">{Math.round(safeProgress)}%</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* NOTES PINNED - GRID STYLE */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {pinnedNotes.map(n => (
                            <div key={n.id} className={`p-8 rounded-[2rem] border border-white/20 shadow-2xl ${n.color} text-slate-900 relative overflow-hidden cursor-pointer group hover:scale-[1.02] transition-all`} onClick={() => setView('notes')}>
                                <div className="absolute top-4 right-6 opacity-20"><StickyNote size={24}/></div>
                                <h4 className="font-black text-lg mb-3 tracking-tighter">{n.title}</h4>
                                <p className="text-sm font-medium opacity-80 leading-relaxed line-clamp-4">{n.content}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* COLONNE DROITE (4/12) : DASHBOARD TOOLS */}
                <div className="lg:col-span-4 space-y-8">
                    
                    {/* WIDGET AGENDA - TIGHT & MODERN */}
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-2xl group transition-all hover:border-blue-500/20" onClick={() => setView('planning')}>
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-3 tracking-tighter">
                                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-600"><Clock size={20}/></div>
                                AGENDA
                            </h3>
                            <ArrowRightLeft size={16} className="text-slate-200 group-hover:text-blue-500 transition-colors"/>
                        </div>
                        <div className="space-y-4">
                            {nextCalendarEvents.length === 0 ? (
                                <p className="text-slate-400 text-sm font-bold italic py-4">Calendrier vierge</p>
                            ) : (
                                nextCalendarEvents.map(evt => {
                                    const d = new Date(evt.start_time);
                                    const dayLabel = getDayCounterLabel(evt.start_time);
                                    return (
                                        <div key={evt.id} className="flex gap-4 items-center p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all cursor-pointer group/item">
                                            <div className="flex flex-col items-center justify-center w-12 h-12 bg-white dark:bg-slate-800 shadow-sm rounded-xl shrink-0 border border-slate-100 dark:border-slate-700 transition-transform group-hover/item:scale-110">
                                                <span className="text-[10px] font-black uppercase text-blue-600 leading-none">{d.toLocaleDateString('fr-FR', {weekday: 'short'}).replace('.', '')}</span>
                                                <span className="text-lg font-black text-slate-800 dark:text-white leading-none mt-0.5">{d.getDate()}</span>
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center justify-between mb-0.5">
                                                    <p className="text-sm font-black text-slate-800 dark:text-white truncate tracking-tighter">{evt.title}</p>
                                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${dayLabel.color} tracking-tighter shadow-sm`}>{dayLabel.text}</span>
                                                </div>
                                                <p className="text-[11px] font-bold text-slate-400 uppercase">
                                                    {evt.is_all_day ? "Journée" : d.toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* URGENCES - BOLD DESIGN */}
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-2xl relative overflow-hidden">
                        <div className="absolute -left-4 -top-4 p-8 opacity-5 text-rose-500">
                           <Flag size={80} className="-rotate-12"/>
                        </div>
                        <div className="flex justify-between items-center mb-8 relative z-10">
                            <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-3">
                                <div className="p-2 bg-rose-50 dark:bg-rose-900/20 rounded-xl text-rose-600"><Flag size={20}/></div>
                                PRIORITÉS
                            </h3>
                            <div className="bg-rose-500 text-white text-[10px] font-black px-2 py-1 rounded-lg shadow-lg shadow-rose-500/20">{urgentTodos.length}</div>
                        </div>
                        <div className="space-y-3 relative z-10">
                            {urgentTodos.length === 0 ? (
                                <p className="text-slate-400 text-sm font-bold italic py-4 text-center">Aucun feu à éteindre</p>
                            ) : (
                                urgentTodos.map(t => (
                                    <div key={t.id} className="group flex items-center gap-4 p-4 bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-rose-500/30 transition-all cursor-pointer shadow-sm" onClick={() => toggleTodo(t.id)}>
                                        <div className="w-6 h-6 rounded-lg border-2 border-slate-200 dark:border-slate-600 flex items-center justify-center group-hover:border-emerald-500 group-hover:bg-emerald-500 transition-all text-transparent group-hover:text-white shadow-inner">
                                            <Check size={12} strokeWidth={4} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <span className="text-sm font-black text-slate-800 dark:text-slate-100 truncate block tracking-tighter">{t.text}</span>
                                            <div className="flex items-center gap-2 mt-1">
                                                <div className="h-1 w-12 bg-rose-500 rounded-full shadow-sm shadow-rose-500/40"></div>
                                                <span className="text-[8px] font-black text-rose-500 uppercase tracking-widest">CRITIQUE</span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        <button onClick={() => setView('todo')} className="w-full mt-8 py-4 bg-slate-900 dark:bg-slate-800 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-black transition-all shadow-xl active:scale-95">Explorer toutes les tâches</button>
                    </div>
                </div>
            </div>
        </div>
    );
}