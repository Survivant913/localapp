import { useState, useEffect, useMemo } from 'react';
import { 
  Wallet, TrendingUp, TrendingDown, CreditCard, PiggyBank, LineChart, 
  ShieldCheck, Plus, ChevronUp, ChevronDown, ShoppingCart, Trash2, 
  Edit, CheckCircle2, X, Repeat, CalendarClock, List, Archive, AlertCircle, ArrowRightLeft
} from 'lucide-react';

export default function BudgetManager({ data, updateData }) {
    // --- 1. INITIALISATION ET SÉCURISATION ---
    const budgetData = data.budget || { transactions: [], recurring: [], scheduled: [], planner: { base: 0, items: [] }, accounts: [] };
    
    const transactionsList = Array.isArray(budgetData.transactions) ? budgetData.transactions : [];
    const recurringList = Array.isArray(budgetData.recurring) ? budgetData.recurring : [];
    const scheduledList = Array.isArray(budgetData.scheduled) ? budgetData.scheduled : [];
    const accounts = (budgetData.accounts && budgetData.accounts.length > 0) 
        ? budgetData.accounts 
        : [{ id: '1', name: "Compte Courant" }];
    
    const planner = { items: [], safetyBases: {}, ...budgetData.planner };

    // --- 2. ÉTATS LOCAUX ---
    const [activeTab, setActiveTab] = useState('dashboard');
    
    // Formulaires
    const [amount, setAmount] = useState('');
    const [desc, setDesc] = useState('');
    const [type, setType] = useState('expense');
    const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id || '');
    const [targetAccountId, setTargetAccountId] = useState(accounts.length > 1 ? accounts[1].id : accounts[0]?.id);
    const [scheduleDate, setScheduleDate] = useState('');
    const [recurDay, setRecurDay] = useState(1);
    const [recurEndDate, setRecurEndDate] = useState('');
    const [plannerTargetId, setPlannerTargetId] = useState(accounts[0]?.id || '');
    const [plannerBaseInput, setPlannerBaseInput] = useState('');
    const [plannerItemName, setPlannerItemName] = useState('');
    const [plannerItemCost, setPlannerItemCost] = useState('');
    const [plannerItemAccount, setPlannerItemAccount] = useState(accounts[0]?.id || '');
    const [newAccountName, setNewAccountName] = useState('');
    const [editingAccountId, setEditingAccountId] = useState(null);
    const [editingAccountName, setEditingAccountName] = useState('');
    const [deletingAccountId, setDeletingAccountId] = useState(null);

    // Filtres
    const [showArchived, setShowArchived] = useState(false);
    const [forecastAccount, setForecastAccount] = useState('total');
    const [historyLimit, setHistoryLimit] = useState(5);

    useEffect(() => {
        const val = planner.safetyBases?.[plannerTargetId] || 0;
        setPlannerBaseInput(val === 0 ? '' : val);
    }, [plannerTargetId, planner.safetyBases]);

    // --- HELPERS BLINDÉS ---
    const round2 = (num) => Math.round((parseFloat(num) || 0) * 100) / 100;

    const parseAmount = (val) => { 
        if (!val) return 0; 
        try {
            const cleanVal = val.toString().replace(/,/g, '.').replace(/\s/g, ''); 
            const floatVal = parseFloat(cleanVal); 
            return isNaN(floatVal) ? 0 : round2(floatVal); 
        } catch (e) { return 0; }
    };

    const formatCurrency = (val) => {
        try {
            return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(val || 0);
        } catch (e) { return "0,00 €"; }
    };

    const parseLocalDate = (dateStr) => { 
        if (!dateStr) return new Date(); 
        try {
            if (dateStr instanceof Date) return dateStr;
            if (typeof dateStr === 'string') {
                const cleanStr = dateStr.split('T')[0]; 
                const parts = cleanStr.split('-');
                if (parts.length === 3) {
                    return new Date(parts[0], parts[1] - 1, parts[2]);
                }
            }
            return new Date(dateStr); 
        } catch (e) {
            return new Date(); 
        }
    };

    // --- 3. CALCULS ---
    const getBalanceForAccount = (accId) => {
        const bal = transactionsList
            .filter(t => t.accountId === accId || (!t.accountId && accId === accounts[0].id))
            .reduce((acc, t) => t.type === 'income' ? acc + parseFloat(t.amount || 0) : acc - parseFloat(t.amount || 0), 0);
        return round2(bal);
    };

    const currentTotalBalance = round2(transactionsList.reduce((acc, t) => t.type === 'income' ? acc + parseFloat(t.amount || 0) : acc - parseFloat(t.amount || 0), 0));

    const getMonthlySavingsForAccount = (accId) => {
        let monthlyIn = 0;
        let monthlyOut = 0;
        recurringList.forEach(r => {
            const amt = parseFloat(r.amount || 0);
            if (r.type === 'income') {
                if (r.accountId === accId || (!r.accountId && accId === accounts[0].id)) monthlyIn += amt;
            } else if (r.type === 'expense') {
                if (r.accountId === accId) monthlyOut += amt;
            } else if (r.type === 'transfer') {
                if (r.accountId === accId) monthlyOut += amt;
                if (r.targetAccountId === accId) monthlyIn += amt;
            }
        });
        return round2(monthlyIn - monthlyOut);
    };

    // Prévision fin de mois
    const endOfMonthForecast = useMemo(() => {
        const today = new Date();
        const currentDay = today.getDate();
        const endOfMonthDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        const lastDay = endOfMonthDate.getDate();

        let projected = currentTotalBalance;
        if (forecastAccount !== 'total') {
            projected = getBalanceForAccount(forecastAccount);
        }

        recurringList.forEach(r => {
            if (r.endDate && parseLocalDate(r.endDate) < today) return;
            if (r.dayOfMonth > currentDay && r.dayOfMonth <= lastDay) {
                const amt = parseFloat(r.amount || 0);
                if (r.type === 'transfer') {
                    if (forecastAccount === 'total') return;
                    if (r.accountId === forecastAccount) projected -= amt;
                    if (r.targetAccountId === forecastAccount) projected += amt;
                } else {
                    if (forecastAccount !== 'total' && r.accountId !== forecastAccount) return;
                    projected += (r.type === 'income' ? amt : -amt);
                }
            }
        });

        scheduledList.forEach(s => {
            if (s.status !== 'pending') return;
            const sDate = parseLocalDate(s.date);
            if (isNaN(sDate.getTime())) return; 

            if (sDate > today && sDate <= endOfMonthDate) {
                 const amt = parseFloat(s.amount || 0);
                 if (s.type === 'transfer') {
                    if (forecastAccount === 'total') return;
                    if (s.accountId === forecastAccount) projected -= amt;
                    if (s.targetAccountId === forecastAccount) projected += amt;
                } else {
                    if (forecastAccount !== 'total' && s.accountId !== forecastAccount) return;
                    projected += (s.type === 'income' ? amt : -amt);
                }
            }
        });
        return round2(projected);
    }, [budgetData, forecastAccount, currentTotalBalance]);

    // Planner logic
    const processedPlannerItems = useMemo(() => {
        const simulatedBalances = {};
        accounts.forEach(acc => {
            const realBalance = getBalanceForAccount(acc.id);
            const safety = planner.safetyBases?.[acc.id] || 0;
            simulatedBalances[acc.id] = Math.max(0, realBalance - safety);
        });

        return (planner.items || []).map(item => {
            const targetAcc = item.targetAccountId || accounts[0].id;
            const liquidityOnAccount = simulatedBalances[targetAcc] || 0;
            const cost = parseFloat(item.cost || 0);
            const allocated = Math.min(cost, liquidityOnAccount);
            simulatedBalances[targetAcc] -= allocated;
            
            const pct = cost > 0 ? Math.min(100, (allocated / cost) * 100) : 0;
            let dateStr = "Dispo !";
            
            if (pct < 100) {
                const savingsRate = getMonthlySavingsForAccount(targetAcc);
                const missing = cost - allocated;
                const currentRealBalance = getBalanceForAccount(targetAcc);
                const safetyTarget = planner.safetyBases?.[targetAcc] || 0;
                let securityDrag = 0;
                if (currentRealBalance < safetyTarget) securityDrag = safetyTarget - currentRealBalance;
                const totalToSave = missing + Math.max(0, securityDrag);

                if (savingsRate <= 0) {
                    dateStr = "Jamais (Épargne <= 0)";
                } else {
                    const monthsToWait = Math.ceil(totalToSave / savingsRate);
                    const targetDate = new Date();
                    targetDate.setMonth(targetDate.getMonth() + monthsToWait);
                    dateStr = targetDate.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
                }
            }
            return { ...item, allocated: round2(allocated), pct: round2(pct), dateStr, targetAccName: accounts.find(a=>a.id === targetAcc)?.name };
        });
    }, [planner.items, planner.safetyBases, budgetData.transactions, budgetData.recurring, accounts]);

    // Prévision 12 mois
    const forecastData = useMemo(() => {
        const today = new Date();
        let projectedBalance = endOfMonthForecast;
        const monthsData = [];
        for (let i = 1; i <= 12; i++) {
            const targetDate = new Date(today.getFullYear(), today.getMonth() + i, 1);
            const monthName = targetDate.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
            const monthIndex = targetDate.getMonth();
            const year = targetDate.getFullYear();
            let monthlyChange = 0;

            recurringList.forEach(r => {
                const occurrenceDate = new Date(year, monthIndex, r.dayOfMonth);
                if (r.endDate && parseLocalDate(r.endDate) < occurrenceDate) return;
                const amt = parseFloat(r.amount || 0);
                
                if (r.type === 'transfer') {
                    if (forecastAccount === 'total') return;
                    if (r.accountId === forecastAccount) monthlyChange -= amt;
                    if (r.targetAccountId === forecastAccount) monthlyChange += amt;
                } else {
                    if (forecastAccount !== 'total' && r.accountId !== forecastAccount) return;
                    monthlyChange += (r.type === 'income' ? amt : -amt);
                }
            });
            projectedBalance += monthlyChange;
            monthsData.push({ label: monthName, endBalance: round2(projectedBalance), change: round2(monthlyChange) });
        }
        return monthsData;
    }, [budgetData, forecastAccount, endOfMonthForecast]);

    // --- 4. ACTIONS ---
    const addAccount = () => { if(!newAccountName.trim()) return; updateData({ ...data, budget: { ...budgetData, accounts: [...accounts, { id: Date.now().toString(), name: newAccountName }] } }); setNewAccountName(''); };
    const deleteAccount = (id) => { if (accounts.length <= 1) return; updateData({ ...data, budget: { ...budgetData, accounts: accounts.filter(a => a.id !== id) } }, { table: 'accounts', id: id }); setDeletingAccountId(null); };
    const startEditAccount = (acc) => { setEditingAccountId(acc.id); setEditingAccountName(acc.name); };
    const saveEditAccount = () => { updateData({ ...data, budget: { ...budgetData, accounts: accounts.map(a => a.id === editingAccountId ? { ...a, name: editingAccountName } : a) } }); setEditingAccountId(null); };

    const addTransaction = () => {
        if(!amount || !desc) return;
        let newTransactions = [];
        const commonData = { id: Date.now(), amount: parseAmount(amount), date: new Date().toISOString(), archived: false };
        if (type === 'transfer') {
            if (selectedAccountId === targetAccountId) { alert("Comptes identiques !"); return; }
            const sourceName = accounts.find(a => a.id === selectedAccountId)?.name;
            const targetName = accounts.find(a => a.id === targetAccountId)?.name;
            newTransactions.push({ ...commonData, id: Date.now(), type: 'expense', description: `Virement vers ${targetName} : ${desc}`, accountId: selectedAccountId });
            newTransactions.push({ ...commonData, id: Date.now() + 1, type: 'income', description: `Virement reçu de ${sourceName} : ${desc}`, accountId: targetAccountId });
        } else {
            newTransactions.push({ ...commonData, type, description: desc, accountId: selectedAccountId });
        }
        updateData({ ...data, budget: { ...budgetData, transactions: [...newTransactions, ...transactionsList] } });
        setAmount(''); setDesc(''); setActiveTab('dashboard');
    };

    const addScheduled = () => { if(!amount || !desc || !scheduleDate) return; const newSch = { id: Date.now(), type, amount: parseAmount(amount), description: desc, date: scheduleDate, status: 'pending', accountId: selectedAccountId, targetAccountId: type === 'transfer' ? targetAccountId : null }; updateData({ ...data, budget: { ...budgetData, scheduled: [...scheduledList, newSch].sort((a,b) => new Date(a.date) - new Date(b.date)) } }); setAmount(''); setDesc(''); setScheduleDate(''); setActiveTab('dashboard'); };
    const addRecurring = () => { if(!amount || !desc) return; const newRec = { id: Date.now(), type, amount: parseAmount(amount), description: desc, dayOfMonth: parseInt(recurDay), endDate: recurEndDate || null, accountId: selectedAccountId, targetAccountId: type === 'transfer' ? targetAccountId : null, nextDueDate: new Date().toISOString() }; updateData({ ...data, budget: { ...budgetData, recurring: [...recurringList, newRec].sort((a,b) => a.dayOfMonth - b.dayOfMonth) } }); setAmount(''); setDesc(''); setRecurEndDate(''); setActiveTab('dashboard'); };
    const deleteItem = (collection, id) => { 
        const map = { 'transactions': 'transactions', 'recurring': 'recurring', 'scheduled': 'scheduled' };
        const targetList = Array.isArray(budgetData[collection]) ? budgetData[collection] : [];
        updateData({ ...data, budget: { ...budgetData, [collection]: targetList.filter(i => i.id !== id) } }, { table: map[collection], id: id }); 
    };
    const archiveTransaction = (id) => { const newTransactions = transactionsList.map(t => t.id === id ? { ...t, archived: !t.archived } : t); updateData({ ...data, budget: { ...budgetData, transactions: newTransactions } }); };
    
    const savePlannerBase = () => { const newBases = { ...planner.safetyBases, [plannerTargetId]: parseAmount(plannerBaseInput) || 0 }; updateData({ ...data, budget: { ...budgetData, planner: { ...planner, safetyBases: newBases } } }); };
    const addPlannerItem = () => { if (!plannerItemName || !plannerItemCost) return; updateData({ ...data, budget: { ...budgetData, planner: { ...planner, items: [...planner.items, { id: Date.now(), name: plannerItemName, cost: parseAmount(plannerItemCost), targetAccountId: plannerItemAccount }] } } }); setPlannerItemName(''); setPlannerItemCost(''); };
    const deletePlannerItem = (id) => { updateData({ ...data, budget: { ...budgetData, planner: { ...planner, items: planner.items.filter(i => i.id !== id) } } }, { table: 'planner_items', id: id }); };
    const movePlannerItem = (index, direction) => { const items = [...planner.items]; if (direction === 'up' && index > 0) { [items[index], items[index - 1]] = [items[index - 1], items[index]]; } else if (direction === 'down' && index < items.length - 1) { [items[index], items[index + 1]] = [items[index + 1], items[index]]; } updateData({ ...data, budget: { ...budgetData, planner: { ...planner, items } } }); };
    const buyPlannerItem = (item) => { if(window.confirm(`Confirmer l'achat de "${item.name}" pour ${formatCurrency(item.cost)} ?`)) { const newTransaction = { id: Date.now(), amount: item.cost, date: new Date().toISOString(), archived: false, type: 'expense', description: `Achat planifié : ${item.name}`, accountId: item.targetAccountId || accounts[0].id }; const newTransactions = [newTransaction, ...transactionsList]; const newItems = planner.items.filter(i => i.id !== item.id); updateData({ ...data, budget: { ...budgetData, transactions: newTransactions, planner: { ...planner, items: newItems } } }, { table: 'planner_items', id: item.id }); } };
    
    const neededToReachBase = Math.max(0, (planner.safetyBases?.[plannerTargetId] || 0) - getBalanceForAccount(plannerTargetId));
    
    // --- TRI ET AFFICHAGE ---
    const visibleTransactions = transactionsList
        .filter(t => showArchived ? true : !t.archived)
        .sort((a, b) => new Date(b.date) - new Date(a.date)); // Tri Descendant (Plus récent en haut)

    const displayedTransactions = visibleTransactions.slice(0, historyLimit);
    const visibleScheduled = scheduledList.filter(s => s.status === 'pending');

    return (
        <div className="space-y-6 fade-in max-w-4xl mx-auto pb-20">
            {/* 1. CARTES DU HAUT */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-6 rounded-xl text-white shadow-lg col-span-2">
                    <div className="flex justify-between items-start mb-4">
                        <div><p className="text-blue-200 text-sm font-medium">Solde Total</p><h3 className="text-3xl font-bold mt-1">{formatCurrency(currentTotalBalance)}</h3></div>
                        <div className="p-2 bg-white/20 rounded-lg"><Wallet size={24}/></div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 border-t border-white/20 pt-4">
                        {accounts.map(acc => (<div key={acc.id}><p className="text-xs text-blue-200 truncate">{acc.name}</p><p className="font-bold text-sm">{formatCurrency(getBalanceForAccount(acc.id))}</p></div>))}
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                                Prévision (Fin de mois) 
                                <span className="text-[10px] opacity-70 ml-1">
                                    {forecastAccount === 'total' ? '(Global)' : accounts.find(a=>a.id === forecastAccount)?.name}
                                </span>
                            </p>
                            <h3 className={`text-2xl font-bold mt-1 ${endOfMonthForecast >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                {formatCurrency(endOfMonthForecast)}
                            </h3>
                        </div>
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg"><TrendingUp size={24}/></div>
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Projection incluant les opérations à venir ce mois-ci.</p>
                </div>
            </div>

            {/* 2. MENU ONGLETS */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
                <div className="flex border-b border-gray-100 dark:border-slate-700 overflow-x-auto">
                    <button onClick={() => setActiveTab('dashboard')} className={`flex-1 py-3 px-4 text-sm font-medium whitespace-nowrap ${activeTab === 'dashboard' ? 'bg-gray-50 dark:bg-slate-700 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'}`}>Vue d'ensemble</button>
                    <button onClick={() => setActiveTab('accounts')} className={`flex-1 py-3 px-4 text-sm font-medium whitespace-nowrap flex items-center justify-center gap-2 ${activeTab === 'accounts' ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-b-2 border-orange-600' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'}`}><CreditCard size={16} /> Comptes</button>
                    <button onClick={() => setActiveTab('planner')} className={`flex-1 py-3 px-4 text-sm font-medium whitespace-nowrap flex items-center justify-center gap-2 ${activeTab === 'planner' ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-b-2 border-purple-600' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'}`}><PiggyBank size={16} /> Planificateur</button>
                    <button onClick={() => setActiveTab('forecast')} className={`flex-1 py-3 px-4 text-sm font-medium whitespace-nowrap flex items-center justify-center gap-2 ${activeTab === 'forecast' ? 'bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 border-b-2 border-teal-600' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'}`}><LineChart size={16} /> Prévisions</button>
                    <button onClick={() => {setActiveTab('add-transaction'); setType('expense')}} className={`flex-1 py-3 px-4 text-sm font-medium whitespace-nowrap ${activeTab === 'add-transaction' ? 'bg-gray-50 dark:bg-slate-700 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'}`}>+ Transaction</button>
                    <button onClick={() => {setActiveTab('add-scheduled'); setType('expense')}} className={`flex-1 py-3 px-4 text-sm font-medium whitespace-nowrap ${activeTab === 'add-scheduled' ? 'bg-gray-50 dark:bg-slate-700 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'}`}>+ Planifié</button>
                    <button onClick={() => {setActiveTab('add-recurring'); setType('expense')}} className={`flex-1 py-3 px-4 text-sm font-medium whitespace-nowrap ${activeTab === 'add-recurring' ? 'bg-gray-50 dark:bg-slate-700 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'}`}>+ Récurrent</button>
                </div>

                {/* 3. CONTENU DYNAMIQUE DES ONGLETS */}

                {/* --- VUE D'ENSEMBLE --- */}
                {activeTab === 'dashboard' && (
                    <div className="p-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* COLONNE GAUCHE */}
                            <div className="space-y-6">
                                {/* RÉCURRENTS */}
                                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
                                    <h3 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                                        <Repeat size={18} className="text-orange-500"/> Récurrent (Mensuel)
                                    </h3>
                                    {(!recurringList || recurringList.length === 0) && (
                                        <p className="text-gray-400 text-sm text-center py-4">Rien de récurrent.</p>
                                    )}
                                    <ul className="space-y-3">
                                        {recurringList.map(r => (
                                            <li key={r.id} className="flex justify-between items-center text-sm p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
                                                <div className="flex items-center gap-3">
                                                    {/* CORRECTION ICI : Gestion de l'icône Virement */}
                                                    <div className={`p-1.5 rounded-full ${r.type === 'income' ? 'bg-green-100 text-green-600' : r.type === 'transfer' ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'}`}>
                                                        {r.type === 'income' ? <TrendingUp size={14}/> : r.type === 'transfer' ? <ArrowRightLeft size={14}/> : <TrendingDown size={14}/>}
                                                    </div>
                                                    <div>
                                                        <span className="font-medium text-gray-700 dark:text-gray-200">{r.description}</span>
                                                        <div className="flex flex-col">
                                                            <span className="text-xs text-gray-500 dark:text-gray-400">Le {r.dayOfMonth} du mois</span>
                                                            {r.endDate && <span className="text-[10px] text-orange-500">Jusqu'au {new Date(r.endDate).toLocaleDateString()}</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="font-bold text-gray-700 dark:text-gray-200">{formatCurrency(parseFloat(r.amount))}</span>
                                                    <button onClick={() => deleteItem('recurring', r.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={14}/></button>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* PLANIFIÉS */}
                                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
                                    <h3 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                                        <CalendarClock size={18} className="text-purple-500"/> Planifié (Futur)
                                    </h3>
                                    {(!visibleScheduled || visibleScheduled.length === 0) && (
                                        <p className="text-gray-400 text-sm text-center py-4">Rien de prévu.</p>
                                    )}
                                    <ul className="space-y-3">
                                        {visibleScheduled.map(s => (
                                            <li key={s.id} className="flex justify-between items-center text-sm p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
                                                <div className="flex items-center gap-3">
                                                    {/* CORRECTION ICI : Gestion de l'icône Virement */}
                                                    <div className={`p-1.5 rounded-full ${s.type === 'income' ? 'bg-green-100 text-green-600' : s.type === 'transfer' ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'}`}>
                                                        {s.type === 'income' ? <TrendingUp size={14}/> : s.type === 'transfer' ? <ArrowRightLeft size={14}/> : <TrendingDown size={14}/>}
                                                    </div>
                                                    <div>
                                                        <span className="font-medium text-gray-700 dark:text-gray-200">{s.description}</span>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">{parseLocalDate(s.date).toLocaleDateString()}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="font-bold text-gray-700 dark:text-gray-200">{formatCurrency(parseFloat(s.amount))}</span>
                                                    <button onClick={() => deleteItem('scheduled', s.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={14}/></button>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>

                            {/* COLONNE DROITE : Historique */}
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 h-fit">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                        <List size={18} className="text-blue-500"/> Historique
                                    </h3>
                                    <button onClick={() => { setShowArchived(!showArchived); setHistoryLimit(5); }} className={`text-xs px-2 py-1 rounded border transition-colors ${showArchived ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                                        {showArchived ? 'Masquer archives' : 'Voir archives'}
                                    </button>
                                </div>
                                
                                {(!transactionsList || transactionsList.length === 0) && (
                                    <p className="text-gray-400 text-sm text-center py-4">Aucune transaction.</p>
                                )}

                                <ul className="space-y-3 mb-4 pr-2">
                                    {displayedTransactions.map(t => (
                                        <li key={t.id} className={`flex justify-between items-center p-3 border-b border-gray-50 dark:border-slate-700 last:border-0 ${t.archived ? 'opacity-50 grayscale' : ''}`}>
                                            <div>
                                                <span className="block font-medium text-gray-700 dark:text-gray-200 text-sm">{t.description} {t.archived && '(Archivé)'}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-gray-400">{parseLocalDate(t.date).toLocaleDateString()}</span>
                                                    <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-slate-700 rounded text-gray-500 dark:text-gray-400">{accounts.find(a => a.id === t.accountId)?.name || 'Compte Inconnu'}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className={`font-bold text-sm ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>{t.type === 'income' ? '+' : '-'}{formatCurrency(parseFloat(t.amount))}</span>
                                                <div className="flex gap-1">
                                                    <button onClick={() => archiveTransaction(t.id)} className="text-gray-400 hover:text-blue-500 p-1" title={t.archived ? "Désarchiver" : "Archiver"}><Archive size={14}/></button>
                                                    <button onClick={() => deleteItem('transactions', t.id)} className="text-gray-200 hover:text-red-400 p-1"><Trash2 size={14}/></button>
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>

                                <div className="flex gap-2 mt-2">
                                    {visibleTransactions.length > historyLimit && (
                                        <button onClick={() => setHistoryLimit(prev => prev + 5)} className="flex-1 py-2 text-xs font-medium text-gray-500 hover:text-blue-600 hover:bg-gray-50 dark:hover:bg-slate-700/50 rounded-lg transition-colors border border-dashed border-gray-200 dark:border-slate-700">
                                            Voir plus ({visibleTransactions.length - historyLimit} restantes)
                                        </button>
                                    )}
                                    {historyLimit > 5 && (
                                        <button onClick={() => setHistoryLimit(prev => Math.max(5, prev - 5))} className="flex-1 py-2 text-xs font-medium text-gray-500 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-slate-700/50 rounded-lg transition-colors border border-dashed border-gray-200 dark:border-slate-700">
                                            Voir moins
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- COMPTES --- */}
                {activeTab === 'accounts' && (
                    <div className="p-6 bg-orange-50/30 dark:bg-orange-900/10">
                        <div className="max-w-xl mx-auto space-y-6">
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-orange-100 dark:border-slate-700 shadow-sm">
                                <h3 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2"><CreditCard size={18} className="text-orange-600"/> Mes Comptes</h3>
                                <ul className="space-y-3 mb-6">
                                    {accounts.map(acc => (
                                        <li key={acc.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-slate-700 rounded-lg border border-gray-100 dark:border-slate-600">
                                            {editingAccountId === acc.id ? (
                                                <div className="flex gap-2 flex-1 mr-2"><input type="text" value={editingAccountName} onChange={e => setEditingAccountName(e.target.value)} className="flex-1 px-2 py-1 border border-blue-300 rounded outline-none dark:bg-slate-600 dark:text-white" /><button onClick={saveEditAccount} className="text-green-600 hover:bg-green-50 p-1 rounded"><CheckCircle2 size={16}/></button></div>
                                            ) : (<span className="font-medium text-gray-700 dark:text-gray-200">{acc.name}</span>)}
                                            <div className="flex items-center gap-3">
                                                <span className="font-bold text-gray-500 dark:text-gray-400 text-sm">{formatCurrency(getBalanceForAccount(acc.id))}</span>
                                                <div className="flex gap-1">
                                                    <button onClick={() => startEditAccount(acc)} className="text-gray-400 hover:text-blue-600 p-1"><Edit size={14}/></button>
                                                    {deletingAccountId === acc.id ? (
                                                        <button onClick={() => deleteAccount(acc.id)} className="text-white bg-red-600 px-2 rounded text-xs hover:bg-red-700 transition-colors">Confirmer ?</button>
                                                    ) : (
                                                        <button onClick={() => setDeletingAccountId(acc.id)} className="text-gray-400 hover:text-red-600 p-1"><Trash2 size={14}/></button>
                                                    )}
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                                <div className="flex gap-2 border-t border-gray-100 dark:border-slate-700 pt-4">
                                    <input type="text" placeholder="Nouveau compte..." value={newAccountName} onChange={e => setNewAccountName(e.target.value)} className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg outline-none focus:border-orange-500 dark:bg-slate-700 dark:text-white" />
                                    <button onClick={addAccount} className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm flex items-center gap-2"><Plus size={16}/> Ajouter</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- PRÉVISIONS --- */}
                {activeTab === 'forecast' && (
                    <div className="p-6 bg-teal-50/30 dark:bg-teal-900/10">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2"><LineChart size={20} className="text-teal-600"/> Projection sur 1 an</h3>
                            <select value={forecastAccount} onChange={(e) => setForecastAccount(e.target.value)} className="px-3 py-1 border border-teal-200 rounded-lg text-sm bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white outline-none focus:border-teal-500">
                                <option value="total">Total (Tous les comptes)</option>
                                {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                            </select>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {forecastData.map((data, index) => (
                                <div key={index} className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-teal-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all">
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="font-bold text-gray-700 dark:text-gray-200 capitalize">{data.label}</span>
                                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${data.change >= 0 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>{data.change >= 0 ? '+' : ''}{formatCurrency(data.change)}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs text-gray-400 uppercase tracking-wide">Solde fin de mois</span>
                                        <span className={`text-2xl font-bold ${data.endBalance >= 0 ? 'text-gray-800 dark:text-white' : 'text-red-600 dark:text-red-400'}`}>{formatCurrency(data.endBalance)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-6 text-center italic">* Cette projection est basée sur votre solde actuel, vos opérations récurrentes mensuelles et les opérations planifiées uniques.</p>
                    </div>
                )}

                {/* --- PLANIFICATEUR --- */}
                {activeTab === 'planner' && (
                    <div className="p-6 bg-purple-50/50 dark:bg-purple-900/10">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="space-y-6 lg:col-span-1">
                                <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-purple-100 dark:border-slate-700 shadow-sm">
                                    <h3 className="font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2"><ShieldCheck size={18} className="text-purple-600"/> Base de sécurité</h3>
                                    <div className="mb-3">
                                        <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block uppercase">Compte</label>
                                        <select value={plannerTargetId} onChange={(e) => setPlannerTargetId(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg outline-none focus:border-purple-500 dark:bg-slate-700 dark:text-white text-sm">
                                            {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name} ({formatCurrency(getBalanceForAccount(acc.id))})</option>)}
                                        </select>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Montant minimum à garder sur <strong>ce compte spécifique</strong>. Les envies liées à ce compte utiliseront le surplus.</p>
                                    <div className="flex gap-2">
                                        <input type="text" value={plannerBaseInput} onChange={e => setPlannerBaseInput(e.target.value)} className="flex-1 min-w-0 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg outline-none focus:border-purple-500 dark:bg-slate-700 dark:text-white" placeholder="0" />
                                        <button onClick={savePlannerBase} className="shrink-0 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm">Sauvegarder</button>
                                    </div>
                                    <div className={`mt-3 p-2 rounded-lg text-xs ${neededToReachBase > 0 ? 'bg-red-50 text-red-600 dark:bg-red-900/20' : 'bg-green-50 text-green-600 dark:bg-green-900/20'}`}>
                                        {neededToReachBase > 0 ? `⚠️ Manque ${formatCurrency(neededToReachBase)} sur ce compte` : "✅ Sécurité atteinte sur ce compte"}
                                    </div>
                                </div>
                                <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-purple-100 dark:border-slate-700 shadow-sm">
                                    <h3 className="font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2"><Plus size={18} className="text-purple-600"/> Ajouter une envie</h3>
                                    <div className="space-y-3">
                                        <input type="text" value={plannerItemName} onChange={e => setPlannerItemName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg outline-none dark:bg-slate-700 dark:text-white text-sm" placeholder="Nom (ex: PS5, Voyage...)" />
                                        <input type="text" value={plannerItemCost} onChange={e => setPlannerItemCost(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg outline-none dark:bg-slate-700 dark:text-white text-sm" placeholder="Coût (€)" />
                                        <div>
                                            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block uppercase">Compte à débiter</label>
                                            <select value={plannerItemAccount} onChange={(e) => setPlannerItemAccount(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg outline-none focus:border-purple-500 dark:bg-slate-700 dark:text-white text-sm">
                                                {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                                            </select>
                                        </div>
                                        <button onClick={addPlannerItem} className="w-full py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 text-sm">Ajouter à la liste</button>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-4 lg:col-span-2">
                                <h3 className="font-bold text-gray-800 dark:text-white text-lg">Liste de souhaits (Par priorité)</h3>
                                {processedPlannerItems.length === 0 ? (
                                    <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-gray-300 dark:border-slate-700">
                                        <PiggyBank size={48} className="mx-auto text-purple-200 mb-2"/>
                                        <p className="text-gray-400">Aucune envie pour le moment.</p>
                                    </div>
                                ) : (
                                    processedPlannerItems.map((item, index) => (
                                        <div key={item.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 flex flex-col sm:flex-row gap-4 items-center">
                                            <div className="flex flex-col gap-1">
                                                <button onClick={() => movePlannerItem(index, 'up')} disabled={index === 0} className="p-1 text-gray-400 hover:text-purple-600 disabled:opacity-30"><ChevronUp size={18}/></button>
                                                <button onClick={() => movePlannerItem(index, 'down')} disabled={index === processedPlannerItems.length - 1} className="p-1 text-gray-400 hover:text-purple-600 disabled:opacity-30"><ChevronDown size={18}/></button>
                                            </div>
                                            <div className="flex-1 w-full">
                                                <div className="flex justify-between items-center mb-1">
                                                    <h4 className="font-bold text-gray-800 dark:text-white">{item.name}</h4>
                                                    <span className="font-bold text-gray-600 dark:text-gray-300">{formatCurrency(item.cost)}</span>
                                                </div>
                                                <div className="flex items-center gap-2 mb-2 text-xs text-gray-400">
                                                    <Wallet size={12}/> <span>Sur : <strong>{item.targetAccName}</strong></span>
                                                </div>
                                                <div className="relative w-full h-3 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden mb-2">
                                                    <div className={`absolute top-0 left-0 h-full transition-all duration-500 ${item.pct >= 100 ? 'bg-green-500' : 'bg-purple-500'}`} style={{ width: `${item.pct}%` }}></div>
                                                </div>
                                                <div className="flex justify-between items-center text-xs">
                                                    <span className="text-gray-500 dark:text-gray-400">Dispo : <strong>{formatCurrency(item.allocated)}</strong></span>
                                                    <span className={`font-medium px-2 py-0.5 rounded ${item.pct >= 100 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300'}`}>{item.dateStr}</span>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                {item.pct >= 100 ? (
                                                    <button onClick={() => buyPlannerItem(item)} className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-sm transition-all active:scale-95" title="Acheter maintenant">
                                                        <ShoppingCart size={18} /> <span className="text-sm font-bold">Acheter</span>
                                                    </button>
                                                ) : (
                                                    <div className="w-[90px] flex justify-center items-center text-xs text-gray-400 italic">En attente...</div>
                                                )}
                                                <button onClick={() => deletePlannerItem(item.id)} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"><Trash2 size={18}/></button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {['add-transaction', 'add-scheduled', 'add-recurring'].includes(activeTab) && (
                    <div className="p-6 bg-gray-50 dark:bg-slate-800">
                        <h3 className="font-bold text-gray-700 dark:text-gray-200 mb-4">{activeTab === 'add-transaction' && "Transaction immédiate"}{activeTab === 'add-scheduled' && "Planifié"}{activeTab === 'add-recurring' && "Récurrent"}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div className="flex gap-2 p-1 bg-white dark:bg-slate-700 rounded-lg border border-gray-200 dark:border-slate-600 w-fit">
                                <button onClick={() => setType('expense')} className={`px-4 py-1 rounded-md text-sm font-medium transition-colors ${type === 'expense' ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-200' : 'text-gray-500 dark:text-gray-400'}`}>Dépense</button>
                                <button onClick={() => setType('income')} className={`px-4 py-1 rounded-md text-sm font-medium transition-colors ${type === 'income' ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-200' : 'text-gray-500 dark:text-gray-400'}`}>Revenu</button>
                                <button onClick={() => setType('transfer')} className={`px-4 py-1 rounded-md text-sm font-medium transition-colors ${type === 'transfer' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-200' : 'text-gray-500 dark:text-gray-400'}`}>Virement</button>
                            </div>
                            <div>
                                {type === 'transfer' ? (
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                            <label className="text-[10px] text-gray-400 uppercase font-bold dark:text-gray-500">De</label>
                                            <select value={selectedAccountId} onChange={e => setSelectedAccountId(e.target.value)} className="w-full px-2 py-2 border border-gray-300 dark:border-slate-600 rounded-lg outline-none focus:border-blue-500 bg-white dark:bg-slate-700 dark:text-white text-sm">{accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}</select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] text-gray-400 uppercase font-bold dark:text-gray-500">Vers</label>
                                            <select value={targetAccountId} onChange={e => setTargetAccountId(e.target.value)} className="w-full px-2 py-2 border border-gray-300 dark:border-slate-600 rounded-lg outline-none focus:border-blue-500 bg-white dark:bg-slate-700 dark:text-white text-sm">{accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}</select>
                                        </div>
                                    </div>
                                ) : (
                                    <select value={selectedAccountId} onChange={e => setSelectedAccountId(e.target.value)} className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg outline-none focus:border-blue-500 bg-white dark:bg-slate-700 dark:text-white text-sm">{accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}</select>
                                )}
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input type="text" placeholder="Description" value={desc} onChange={e => setDesc(e.target.value)} className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg outline-none dark:bg-slate-700 dark:text-white" />
                            <input type="text" placeholder="Montant (€)" value={amount} onChange={e => setAmount(e.target.value)} className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg outline-none dark:bg-slate-700 dark:text-white" />
                            {activeTab === 'add-scheduled' && <input type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg outline-none dark:bg-slate-700 dark:text-white" />}
                            {activeTab === 'add-recurring' && (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-gray-600 dark:text-gray-400 text-sm">Le</span>
                                        <input type="number" min="1" max="31" value={recurDay} onChange={e => setRecurDay(e.target.value)} className="w-16 px-2 py-2 border border-gray-300 dark:border-slate-600 rounded-lg outline-none dark:bg-slate-700 dark:text-white" />
                                        <span className="text-gray-600 dark:text-gray-400 text-sm">du mois</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <label className="text-xs text-gray-500 dark:text-gray-400 mb-1">Date de fin (Optionnel)</label>
                                        <input type="date" value={recurEndDate} onChange={e => setRecurEndDate(e.target.value)} className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg outline-none text-sm text-gray-600 dark:text-gray-300 dark:bg-slate-700" />
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="mt-4 text-right">
                            <button onClick={activeTab === 'add-transaction' ? addTransaction : activeTab === 'add-scheduled' ? addScheduled : activeTab === 'add-recurring' ? addRecurring : () => {}} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">Confirmer</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}