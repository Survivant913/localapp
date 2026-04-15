import { useState, useEffect, useMemo } from 'react';
import { 
    Wallet, TrendingUp, TrendingDown, CreditCard, PiggyBank, LineChart, 
    ShieldCheck, Plus, ChevronUp, ChevronDown, ShoppingCart, Trash2, 
    Edit, CheckCircle2, X, Repeat, CalendarClock, List, Archive, AlertCircle, ArrowRightLeft,
    PieChart, Home, Navigation, Heart, Coffee, Laptop, Building, MoreHorizontal, Battery, ArrowDownCircle, ArrowUpCircle
} from 'lucide-react';

const CATEGORIES = [
    { id: 'alim', label: 'Alimentation & Courses', icon: ShoppingCart, color: 'text-orange-500 bg-orange-100 dark:bg-orange-900/30', hex: '#f97316' },
    { id: 'logement', label: 'Logement & Charges', icon: Home, color: 'text-blue-500 bg-blue-100 dark:bg-blue-900/30', hex: '#3b82f6' },
    { id: 'abos', label: 'Abonnements & Logiciels', icon: Repeat, color: 'text-purple-500 bg-purple-100 dark:bg-purple-900/30', hex: '#a855f7' },
    { id: 'transports', label: 'Transports & Essence', icon: Navigation, color: 'text-teal-500 bg-teal-100 dark:bg-teal-900/30', hex: '#14b8a6' },
    { id: 'sante', label: 'Santé & Mutuelle', icon: Heart, color: 'text-red-500 bg-red-100 dark:bg-red-900/30', hex: '#ef4444' },
    { id: 'loisirs', label: 'Loisirs & Restaurants', icon: Coffee, color: 'text-yellow-500 bg-yellow-100 dark:bg-yellow-900/30', hex: '#eab308' },
    { id: 'matos', label: 'Matériel Pro', icon: Laptop, color: 'text-indigo-500 bg-indigo-100 dark:bg-indigo-900/30', hex: '#6366f1' },
    { id: 'urssaf', label: 'URSSAF & Impôts', icon: Building, color: 'text-gray-500 bg-gray-100 dark:bg-slate-800', hex: '#6b7280' },
    { id: 'frais_bancaires', label: 'Frais bancaires', icon: CreditCard, color: 'text-slate-500 bg-slate-100 dark:bg-slate-800', hex: '#64748b' },
    { id: 'autre', label: 'Autre Dépense', icon: MoreHorizontal, color: 'text-slate-400 bg-slate-100 dark:bg-slate-800', hex: '#94a3b8' },
    { id: 'salaire', label: 'Revenu / Chiffre d\'Affaires', icon: Wallet, color: 'text-green-500 bg-green-100 dark:bg-green-900/30', hex: '#22c55e' }
];

export default function BudgetManager({ data, updateData }) {
    if (!data) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-400 animate-pulse">Chargement des finances...</div>
            </div>
        );
    }

    const budgetData = data?.budget || { transactions: [], recurring: [], scheduled: [], planner: { base: 0, items: [] }, accounts: [] };
    
    const transactionsList = Array.isArray(budgetData.transactions) ? budgetData.transactions : [];
    const recurringList = Array.isArray(budgetData.recurring) ? budgetData.recurring : [];
    const scheduledList = Array.isArray(budgetData.scheduled) ? budgetData.scheduled : [];
    const accounts = (Array.isArray(budgetData.accounts) && budgetData.accounts.length > 0) 
        ? budgetData.accounts 
        : [{ id: '1', name: "Compte Courant" }];
    
    const planner = { items: [], safetyBases: {}, ...budgetData.planner };

    const [activeTab, setActiveTab] = useState('dashboard');
    
    const [amount, setAmount] = useState('');
    const [desc, setDesc] = useState('');
    const [type, setType] = useState('expense');
    const [category, setCategory] = useState('autre'); 
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

    const [showArchived, setShowArchived] = useState(false);
    const [forecastAccount, setForecastAccount] = useState('total');
    const [historyLimit, setHistoryLimit] = useState(5);

    const [statsPeriod, setStatsPeriod] = useState(30);
    const [statsAccountId, setStatsAccountId] = useState('total');

    useEffect(() => {
        const val = planner.safetyBases?.[plannerTargetId] || 0;
        setPlannerBaseInput(val === 0 ? '' : val);
    }, [plannerTargetId, planner.safetyBases]);

    useEffect(() => {
        if (type === 'income') setCategory('salaire');
        else if (type === 'expense' && category === 'salaire') setCategory('autre');
    }, [type]);

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

    useEffect(() => {}, [scheduledList.length, recurringList.length]);

    const getBalanceForAccount = (accId) => {
        const bal = transactionsList
            .filter(t => String(t.accountId || (t.accountId ? t.accountId : accounts[0].id)) === String(accId))
            .reduce((acc, t) => t.type === 'income' ? acc + parseFloat(t.amount || 0) : acc - parseFloat(t.amount || 0), 0);
        return round2(bal);
    };

    const currentTotalBalance = round2(transactionsList.reduce((acc, t) => t.type === 'income' ? acc + parseFloat(t.amount || 0) : acc - parseFloat(t.amount || 0), 0));

    const endOfMonthForecast = useMemo(() => {
        const today = new Date();
        const currentDay = today.getDate();
        const endOfMonthDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        const lastDay = endOfMonthDate.getDate();

        let projected = 0;
        if (forecastAccount === 'total') {
            projected = currentTotalBalance;
        } else {
            projected = getBalanceForAccount(forecastAccount);
        }

        recurringList.forEach(r => {
            if (r.endDate && parseLocalDate(r.endDate) < today) return;
            const effectiveDay = Math.min(r.dayOfMonth, lastDay);

            if (effectiveDay > currentDay) {
                const amt = parseFloat(r.amount || 0);
                if (r.type === 'transfer') {
                    if (forecastAccount === 'total') return;
                    if (String(r.accountId) === String(forecastAccount)) projected -= amt;
                    if (String(r.targetAccountId) === String(forecastAccount)) projected += amt;
                } else {
                    if (forecastAccount !== 'total' && String(r.accountId) !== String(forecastAccount)) return;
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
                    if (String(s.accountId) === String(forecastAccount)) projected -= amt;
                    if (String(s.targetAccountId) === String(forecastAccount)) projected += amt;
                } else {
                    if (forecastAccount !== 'total' && String(s.accountId) !== String(forecastAccount)) return;
                    projected += (s.type === 'income' ? amt : -amt);
                }
            }
        });
        return round2(projected);
    }, [budgetData, forecastAccount, currentTotalBalance]);

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
                const currentRealBalance = getBalanceForAccount(targetAcc);
                const safetyTarget = planner.safetyBases?.[targetAcc] || 0;
                let securityDrag = 0;
                if (currentRealBalance < safetyTarget) securityDrag = safetyTarget - currentRealBalance;
                
                let remainingToSave = (cost - allocated) + Math.max(0, securityDrag);
                let simulationDate = new Date();
                let monthsPassed = 0;
                let isPossible = false;

                while (monthsPassed < 120) {
                    monthsPassed++;
                    simulationDate.setMonth(simulationDate.getMonth() + 1);
                    let monthlyIn = 0;
                    let monthlyOut = 0;

                    recurringList.forEach(r => {
                        const isActive = !r.endDate || parseLocalDate(r.endDate) >= simulationDate;
                        if (isActive) {
                            const amt = parseFloat(r.amount || 0);
                            if (r.type === 'income') {
                                if (String(r.accountId) === String(targetAcc) || (!r.accountId && String(targetAcc) === String(accounts[0].id))) monthlyIn += amt;
                            } else if (r.type === 'expense') {
                                if (String(r.accountId) === String(targetAcc)) monthlyOut += amt;
                            } else if (r.type === 'transfer') {
                                if (String(r.accountId) === String(targetAcc)) monthlyOut += amt;
                                if (String(r.targetAccountId) === String(targetAcc)) monthlyIn += amt;
                            }
                        }
                    });

                    scheduledList.forEach(s => {
                        const sDate = parseLocalDate(s.date);
                        if (s.status === 'pending' && sDate.getMonth() === simulationDate.getMonth() && sDate.getFullYear() === simulationDate.getFullYear()) {
                            const amt = parseFloat(s.amount || 0);
                            if (s.type === 'income') {
                                if (String(s.accountId) === String(targetAcc) || (!s.accountId && String(targetAcc) === String(accounts[0].id))) monthlyIn += amt;
                            } else if (s.type === 'expense') {
                                if (String(s.accountId) === String(targetAcc)) monthlyOut += amt;
                            } else if (s.type === 'transfer') {
                                if (String(s.accountId) === String(targetAcc)) monthlyOut += amt;
                                if (String(s.targetAccountId) === String(targetAcc)) monthlyIn += amt;
                            }
                        }
                    });

                    let monthlySavings = monthlyIn - monthlyOut;
                    if (monthlySavings > 0) remainingToSave -= monthlySavings;
                    if (remainingToSave <= 0) { isPossible = true; break; }
                }

                if (isPossible) dateStr = simulationDate.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
                else dateStr = "Impossible (Revenus insuffisants)";
            }
            return { ...item, allocated: round2(allocated), pct: round2(pct), dateStr, targetAccName: accounts.find(a=>a.id === targetAcc)?.name };
        });
    }, [planner.items, planner.safetyBases, budgetData.transactions, budgetData.recurring, budgetData.scheduled, accounts]);

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
                const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
                const clampedDay = Math.min(r.dayOfMonth, daysInMonth);
                const occurrenceDate = new Date(year, monthIndex, clampedDay);
                if (r.endDate && parseLocalDate(r.endDate) < occurrenceDate) return;
                const amt = parseFloat(r.amount || 0);
                if (r.type === 'transfer') {
                    if (forecastAccount === 'total') return;
                    if (String(r.accountId) === String(forecastAccount)) monthlyChange -= amt;
                    if (String(r.targetAccountId) === String(forecastAccount)) monthlyChange += amt;
                } else {
                    if (forecastAccount !== 'total' && String(r.accountId) !== String(forecastAccount)) return;
                    monthlyChange += (r.type === 'income' ? amt : -amt);
                }
            });

            scheduledList.forEach(s => {
                if (s.status !== 'pending') return;
                const sDate = parseLocalDate(s.date);
                if (sDate.getMonth() === monthIndex && sDate.getFullYear() === year) {
                    const amt = parseFloat(s.amount || 0);
                    if (s.type === 'transfer') {
                        if (forecastAccount === 'total') return;
                        if (String(s.accountId) === String(forecastAccount)) monthlyChange -= amt;
                        if (String(s.targetAccountId) === String(forecastAccount)) monthlyChange += amt;
                    } else {
                        if (forecastAccount !== 'total' && String(s.accountId) !== String(forecastAccount)) return;
                        monthlyChange += (s.type === 'income' ? amt : -amt);
                    }
                }
            });

            projectedBalance += monthlyChange;
            monthsData.push({ label: monthName, endBalance: round2(projectedBalance), change: round2(monthlyChange) });
        }
        return monthsData;
    }, [budgetData, forecastAccount, endOfMonthForecast]);


    const evolutionChartData = useMemo(() => {
        const today = new Date();
        today.setHours(0,0,0,0);
        
        let baseBalance = statsAccountId === 'total' ? currentTotalBalance : getBalanceForAccount(statsAccountId);
        
        let minBal = baseBalance;
        let maxBal = baseBalance;

        const pastBalances = [];
        let tempBal = baseBalance;
        
        for (let i = 0; i <= 30; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() - i); 
            
            pastBalances.unshift({ date: new Date(d), balance: tempBal, isFuture: false });
            
            const dayTx = transactionsList.filter(t => {
                const tDate = parseLocalDate(t.date);
                return tDate.getDate() === d.getDate() && tDate.getMonth() === d.getMonth() && tDate.getFullYear() === d.getFullYear();
            });
            
            let dayChange = 0;
            dayTx.forEach(t => {
                if (statsAccountId !== 'total' && String(t.accountId || accounts[0].id) !== String(statsAccountId)) return;
                if (t.type === 'income') dayChange += parseFloat(t.amount || 0);
                else dayChange -= parseFloat(t.amount || 0);
            });
            
            tempBal -= dayChange; 
        }

        const futureBalances = [];
        tempBal = baseBalance; 
        
        for (let i = 1; i <= 30; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() + i);
            
            let dayChange = 0;
            recurringList.forEach(r => {
                if (r.endDate && parseLocalDate(r.endDate) < d) return;
                const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
                const effectiveDay = Math.min(r.dayOfMonth, daysInMonth);
                if (effectiveDay === d.getDate()) {
                    const amt = parseFloat(r.amount || 0);
                    if (r.type === 'transfer') {
                        if (statsAccountId !== 'total') {
                            if (String(r.accountId) === String(statsAccountId)) dayChange -= amt;
                            if (String(r.targetAccountId) === String(statsAccountId)) dayChange += amt;
                        }
                    } else {
                        if (statsAccountId === 'total' || String(r.accountId) === String(statsAccountId)) {
                            dayChange += (r.type === 'income' ? amt : -amt);
                        }
                    }
                }
            });

            scheduledList.forEach(s => {
                if (s.status !== 'pending') return;
                const sDate = parseLocalDate(s.date);
                if (sDate.getDate() === d.getDate() && sDate.getMonth() === d.getMonth() && sDate.getFullYear() === d.getFullYear()) {
                    const amt = parseFloat(s.amount || 0);
                    if (s.type === 'transfer') {
                        if (statsAccountId !== 'total') {
                            if (String(s.accountId) === String(statsAccountId)) dayChange -= amt;
                            if (String(s.targetAccountId) === String(statsAccountId)) dayChange += amt;
                        }
                    } else {
                        if (statsAccountId === 'total' || String(s.accountId) === String(statsAccountId)) {
                            dayChange += (s.type === 'income' ? amt : -amt);
                        }
                    }
                }
            });

            tempBal += dayChange;
            futureBalances.push({ date: new Date(d), balance: tempBal, isFuture: true });
        }

        const combined = [...pastBalances, ...futureBalances];
        combined.forEach(pt => {
            if (pt.balance < minBal) minBal = pt.balance;
            if (pt.balance > maxBal) maxBal = pt.balance;
        });
        
        const padding = Math.max((maxBal - minBal) * 0.1, 100);
        return { points: combined, min: minBal - padding, max: maxBal + padding, todayIndex: 30 };
    }, [transactionsList, recurringList, scheduledList, statsAccountId, currentTotalBalance, accounts]);

    const bezierCommand = (point, i, a) => {
        const line = (pointA, pointB) => {
            const lengthX = pointB[0] - pointA[0];
            const lengthY = pointB[1] - pointA[1];
            return { length: Math.sqrt(Math.pow(lengthX, 2) + Math.pow(lengthY, 2)), angle: Math.atan2(lengthY, lengthX) };
        };
        const controlPoint = (current, previous, next, reverse) => {
            const p = previous || current;
            const n = next || current;
            const smoothing = 0.15;
            const o = line(p, n);
            const angle = o.angle + (reverse ? Math.PI : 0);
            const length = o.length * smoothing;
            return [current[0] + Math.cos(angle) * length, current[1] + Math.sin(angle) * length];
        };
        
        const cps = controlPoint(a[i - 1], a[i - 2], point);
        const cpe = controlPoint(point, a[i - 1], a[i + 1], true);
        return `C ${cps[0]},${cps[1]} ${cpe[0]},${cpe[1]} ${point[0]},${point[1]}`;
    };


    const analyticsData = useMemo(() => {
        const today = new Date();
        const pastDate = new Date();
        pastDate.setDate(today.getDate() - statsPeriod);

        const filteredTransactions = transactionsList.filter(t => {
            const tDate = parseLocalDate(t.date);
            if (tDate < pastDate || tDate > today) return false;
            if (statsAccountId !== 'total' && String(t.accountId || accounts[0].id) !== String(statsAccountId)) return false;
            return true;
        });

        let totalIn = 0;
        let totalOut = 0;
        const categoryTotals = {};

        filteredTransactions.forEach(t => {
            const amt = parseFloat(t.amount || 0);
            if (t.type === 'income') {
                totalIn += amt;
            } else if (t.type === 'expense') {
                totalOut += amt;
                const cat = t.category || 'autre';
                categoryTotals[cat] = (categoryTotals[cat] || 0) + amt;
            }
        });

        const sortedCategories = Object.keys(categoryTotals)
            .map(cat => {
                const conf = CATEGORIES.find(c => c.id === cat) || CATEGORIES.find(c => c.id === 'autre');
                return { id: cat, amount: categoryTotals[cat], ...conf };
            })
            .sort((a, b) => b.amount - a.amount);

        const top5 = filteredTransactions
            .filter(t => t.type === 'expense')
            .sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount))
            .slice(0, 5);

        const currentBalance = statsAccountId === 'total' ? currentTotalBalance : getBalanceForAccount(statsAccountId);
        const monthlyBurnRate = statsPeriod > 0 ? (totalOut / statsPeriod) * 30 : 0;
        const runwayMonths = monthlyBurnRate > 0 ? round2(currentBalance / monthlyBurnRate) : 999;

        return { totalIn, totalOut, sortedCategories, top5, runwayMonths, currentBalance, monthlyBurnRate };
    }, [transactionsList, statsPeriod, statsAccountId, currentTotalBalance, accounts]);

    const getNoonDate = (dateObj = new Date()) => {
        const d = new Date(dateObj);
        d.setHours(12, 0, 0, 0);
        return d.toISOString();
    };

    const addAccount = () => { 
        if(!newAccountName.trim()) return;
        const newAcc = { id: Date.now().toString(), name: newAccountName };
        updateData({ ...data, budget: { ...budgetData, accounts: [...accounts, newAcc] } }, { table: 'accounts', data: newAcc, action: 'insert' }); 
        setNewAccountName(''); 
    };

    const deleteAccount = (id) => { 
        if (accounts.length <= 1) return; 
        updateData({ ...data, budget: { ...budgetData, accounts: accounts.filter(a => a.id !== id) } }, { table: 'accounts', id: id, action: 'delete' }); 
        setDeletingAccountId(null); 
    };

    const startEditAccount = (acc) => { setEditingAccountId(acc.id); setEditingAccountName(acc.name); };
    
    const saveEditAccount = () => { 
        updateData({ 
            ...data, 
            budget: { ...budgetData, accounts: accounts.map(a => a.id === editingAccountId ? { ...a, name: editingAccountName } : a) } 
        }, {
            table: 'accounts', id: editingAccountId, data: { name: editingAccountName }, action: 'update' 
        }); 
        setEditingAccountId(null); 
    };

    const addTransaction = () => {
        if(!amount || !desc) return;
        let newTransactions = [];
        const commonData = { id: Date.now(), amount: parseAmount(amount), date: getNoonDate(), archived: false, category };
        
        let dbActionData = null; 

        if (type === 'transfer') {
            if (selectedAccountId === targetAccountId) { alert("Veuillez sélectionner deux comptes différents pour un virement."); return; }
            const sourceName = accounts.find(a => a.id === selectedAccountId)?.name;
            const targetName = accounts.find(a => a.id === targetAccountId)?.name;
            
            const t1 = { ...commonData, id: Date.now(), type: 'expense', description: `Virement vers ${targetName} : ${desc}`, accountId: selectedAccountId };
            const t2 = { ...commonData, id: Date.now() + 1, type: 'income', description: `Virement reçu de ${sourceName} : ${desc}`, accountId: targetAccountId };
            
            newTransactions.push(t1, t2);
        } else {
            const t = { ...commonData, type, description: desc, accountId: selectedAccountId };
            newTransactions.push(t);
            dbActionData = { table: 'transactions', data: { ...t, account_id: t.accountId }, action: 'insert' };
        }
        
        updateData(
            { ...data, budget: { ...budgetData, transactions: [...newTransactions, ...transactionsList] } },
            dbActionData
        );
        setAmount(''); setDesc(''); setActiveTab('dashboard');
    };

    const addScheduled = () => { 
        if(!amount || !desc || !scheduleDate) return; 
        if (type === 'transfer' && selectedAccountId === targetAccountId) {
            alert("Veuillez sélectionner deux comptes différents pour un virement.");
            return;
        }

        const newSch = { 
            id: Date.now(), type, amount: parseAmount(amount), description: desc, category,
            date: scheduleDate, 
            status: 'pending', accountId: selectedAccountId, 
            targetAccountId: type === 'transfer' ? targetAccountId : null,
            target_account_id: type === 'transfer' ? targetAccountId : null 
        }; 
        
        updateData(
            { ...data, budget: { ...budgetData, scheduled: [...scheduledList, newSch].sort((a,b) => new Date(a.date) - new Date(b.date)) } },
            { table: 'scheduled', data: { ...newSch, account_id: newSch.accountId, target_account_id: newSch.targetAccountId }, action: 'insert' }
        ); 
        setAmount(''); setDesc(''); setScheduleDate(''); setActiveTab('dashboard'); 
    };
    
    const addRecurring = () => { 
        if(!amount || !desc) return;
        if (type === 'transfer' && selectedAccountId === targetAccountId) {
            alert("Veuillez sélectionner deux comptes différents pour un virement.");
            return;
        }
        
        const today = new Date();
        const currentDay = today.getDate();
        const targetDay = parseInt(recurDay);
        
        let targetYear = today.getFullYear();
        let targetMonth = today.getMonth();

        if (targetDay < currentDay) {
            targetMonth++;
            if (targetMonth > 11) { targetMonth = 0; targetYear++; }
        }
        
        const daysInTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
        const dayToSet = Math.min(targetDay, daysInTargetMonth);
        
        const initialNextDate = new Date(targetYear, targetMonth, dayToSet, 12, 0, 0);

        const newRec = { 
            id: Date.now(), 
            type, 
            amount: parseAmount(amount), 
            description: desc, category, 
            dayOfMonth: targetDay, 
            endDate: recurEndDate || null, 
            accountId: selectedAccountId, 
            targetAccountId: type === 'transfer' ? targetAccountId : null, 
            target_account_id: type === 'transfer' ? targetAccountId : null, 
            nextDueDate: initialNextDate.toISOString() 
        }; 
        
        updateData(
            { ...data, budget: { ...budgetData, recurring: [...recurringList, newRec].sort((a,b) => a.dayOfMonth - b.dayOfMonth) } },
            { table: 'recurring', data: { ...newRec, account_id: newRec.accountId, target_account_id: newRec.targetAccountId, day_of_month: newRec.dayOfMonth, end_date: newRec.endDate, next_due_date: newRec.nextDueDate }, action: 'insert' }
        ); 
        setAmount(''); setDesc(''); setRecurEndDate(''); setActiveTab('dashboard'); 
    };

    const deleteItem = (collection, id) => { 
        const map = { 'transactions': 'transactions', 'recurring': 'recurring', 'scheduled': 'scheduled' };
        const targetList = Array.isArray(budgetData[collection]) ? budgetData[collection] : [];
        updateData({ ...data, budget: { ...budgetData, [collection]: targetList.filter(i => i.id !== id) } }, { table: map[collection], id: id, action: 'delete' }); 
    };
    
    const archiveTransaction = (id) => { 
        const newTransactions = transactionsList.map(t => t.id === id ? { ...t, archived: !t.archived } : t); 
        const target = newTransactions.find(t => t.id === id);
        updateData(
            { ...data, budget: { ...budgetData, transactions: newTransactions } },
            { table: 'transactions', id: id, data: { archived: target.archived }, action: 'update' }
        ); 
    };
    
    const savePlannerBase = () => { 
        const newBases = { ...planner.safetyBases, [plannerTargetId]: parseAmount(plannerBaseInput) || 0 }; 
        updateData({ ...data, budget: { ...budgetData, planner: { ...planner, safetyBases: newBases } } }); 
    };

    const addPlannerItem = () => { 
        if (!plannerItemName || !plannerItemCost) return; 
        const newItem = { id: Date.now(), name: plannerItemName, cost: parseAmount(plannerItemCost), targetAccountId: plannerItemAccount };
        updateData(
            { ...data, budget: { ...budgetData, planner: { ...planner, items: [...planner.items, newItem] } } },
            { table: 'planner_items', data: { ...newItem, target_account_id: newItem.targetAccountId }, action: 'insert' }
        ); 
        setPlannerItemName(''); setPlannerItemCost(''); 
    };

    const deletePlannerItem = (id) => { 
        updateData({ ...data, budget: { ...budgetData, planner: { ...planner, items: planner.items.filter(i => i.id !== id) } } }, { table: 'planner_items', id: id, action: 'delete' }); 
    };

    const movePlannerItem = (index, direction) => { 
        const items = [...planner.items]; 
        if (direction === 'up' && index > 0) { [items[index], items[index - 1]] = [items[index - 1], items[index]]; } 
        else if (direction === 'down' && index < items.length - 1) { [items[index], items[index + 1]] = [items[index + 1], items[index]]; } 
        updateData({ ...data, budget: { ...budgetData, planner: { ...planner, items } } }); 
    };

    const buyPlannerItem = (item) => { 
        if(window.confirm(`Confirmer l'achat de "${item.name}" pour ${formatCurrency(item.cost)} ?`)) { 
            const newTransaction = { 
                id: Date.now(), 
                amount: item.cost, 
                date: getNoonDate(), 
                archived: false, 
                type: 'expense', 
                description: `Achat planifié : ${item.name}`, 
                accountId: item.targetAccountId || accounts[0].id,
                category: 'autre'
            }; 
            
            const newTransactions = [newTransaction, ...transactionsList]; 
            const newItems = planner.items.filter(i => i.id !== item.id); 
            
            updateData(
                { ...data, budget: { ...budgetData, transactions: newTransactions, planner: { ...planner, items: newItems } } }, 
                { table: 'planner_items', id: item.id, action: 'delete' } 
            ); 
        } 
    };
    
    const neededToReachBase = Math.max(0, (planner.safetyBases?.[plannerTargetId] || 0) - getBalanceForAccount(plannerTargetId));
    
    const visibleTransactions = transactionsList
        .filter(t => showArchived ? true : !t.archived)
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    const displayedTransactions = visibleTransactions.slice(0, historyLimit);
    const visibleScheduled = scheduledList.filter(s => s.status === 'pending');

    return (
        <div className="space-y-6 fade-in w-full pb-20">
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

                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Prévision fin de mois</p>
                                <select 
                                    value={forecastAccount} 
                                    onChange={(e) => setForecastAccount(e.target.value)} 
                                    className="text-[10px] bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded outline-none border border-transparent focus:border-blue-500 cursor-pointer shadow-sm"
                                >
                                    <option value="total">Global</option>
                                    {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                                </select>
                            </div>
                            <h3 className={`text-2xl font-bold mt-1 ${endOfMonthForecast >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                {formatCurrency(endOfMonthForecast)}
                            </h3>
                        </div>
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg shrink-0"><TrendingUp size={24}/></div>
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">Projection incluant les opérations à venir ce mois-ci.</p>
                </div>
            </div>

            {/* 2. MENU ONGLETS */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
                <div className="flex border-b border-gray-100 dark:border-slate-700 overflow-x-auto">
                    <button onClick={() => setActiveTab('dashboard')} className={`flex-1 py-3 px-4 text-sm font-medium whitespace-nowrap ${activeTab === 'dashboard' ? 'bg-gray-50 dark:bg-slate-700 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'}`}>Vue d'ensemble</button>
                    <button onClick={() => setActiveTab('accounts')} className={`flex-1 py-3 px-4 text-sm font-medium whitespace-nowrap flex items-center justify-center gap-2 ${activeTab === 'accounts' ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-b-2 border-orange-600' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'}`}><CreditCard size={16} /> Comptes</button>
                    <button onClick={() => setActiveTab('planner')} className={`flex-1 py-3 px-4 text-sm font-medium whitespace-nowrap flex items-center justify-center gap-2 ${activeTab === 'planner' ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-b-2 border-purple-600' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'}`}><PiggyBank size={16} /> Planificateur</button>
                    <button onClick={() => setActiveTab('analytics')} className={`flex-1 py-3 px-4 text-sm font-medium whitespace-nowrap flex items-center justify-center gap-2 ${activeTab === 'analytics' ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border-b-2 border-rose-600' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'}`}><PieChart size={16} /> Analyses</button>
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
                                        {recurringList.map(r => {
                                            const catDef = CATEGORIES.find(c => c.id === r.category) || CATEGORIES.find(c => c.id === 'autre');
                                            const CatIcon = catDef.icon;
                                            return (
                                            <li key={r.id} className="flex justify-between items-center text-sm p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-1.5 rounded-full ${r.type === 'income' ? 'bg-green-100 text-green-600' : r.type === 'transfer' ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'}`}>
                                                        {r.type === 'income' ? <TrendingUp size={14}/> : r.type === 'transfer' ? <ArrowRightLeft size={14}/> : <TrendingDown size={14}/>}
                                                    </div>
                                                    <div>
                                                        <span className="font-medium text-gray-700 dark:text-gray-200">{r.description}</span>
                                                        <div className="flex flex-col">
                                                            <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                                                <CatIcon size={10}/> Le {r.dayOfMonth} du mois
                                                            </span>
                                                            {r.endDate && <span className="text-[10px] text-orange-500">Jusqu'au {new Date(r.endDate).toLocaleDateString()}</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="font-bold text-gray-700 dark:text-gray-200">{formatCurrency(parseFloat(r.amount))}</span>
                                                    <button onClick={() => deleteItem('recurring', r.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={14}/></button>
                                                </div>
                                            </li>
                                        )})}
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
                                        {visibleScheduled.map(s => {
                                            const catDef = CATEGORIES.find(c => c.id === s.category) || CATEGORIES.find(c => c.id === 'autre');
                                            const CatIcon = catDef.icon;
                                            return (
                                            <li key={s.id} className="flex justify-between items-center text-sm p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-1.5 rounded-full ${s.type === 'income' ? 'bg-green-100 text-green-600' : s.type === 'transfer' ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'}`}>
                                                        {s.type === 'income' ? <TrendingUp size={14}/> : s.type === 'transfer' ? <ArrowRightLeft size={14}/> : <TrendingDown size={14}/>}
                                                    </div>
                                                    <div>
                                                        <span className="font-medium text-gray-700 dark:text-gray-200">{s.description}</span>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                                            <CatIcon size={10}/> {parseLocalDate(s.date).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="font-bold text-gray-700 dark:text-gray-200">{formatCurrency(parseFloat(s.amount))}</span>
                                                    <button onClick={() => deleteItem('scheduled', s.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={14}/></button>
                                                </div>
                                            </li>
                                        )})}
                                    </ul>
                                </div>
                            </div>

                            {/* COLONNE DROITE : Historique */}
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 h-fit">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                        <List size={18} className="text-blue-500"/> Historique
                                    </h3>
                                    <button onClick={() => { setShowArchived(!showArchived); setHistoryLimit(5); }} className={`text-xs px-2 py-1 rounded border transition-colors ${showArchived ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-300'}`}>
                                        {showArchived ? 'Masquer archives' : 'Voir archives'}
                                    </button>
                                </div>
                                
                                {(!transactionsList || transactionsList.length === 0) && (
                                    <p className="text-gray-400 text-sm text-center py-4">Aucune transaction.</p>
                                )}

                                <div className="max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                                    <ul className="space-y-3 mb-4">
                                        {displayedTransactions.map(t => {
                                            const catDef = CATEGORIES.find(c => c.id === t.category) || CATEGORIES.find(c => c.id === 'autre');
                                            const CatIcon = catDef.icon;
                                            return (
                                            <li key={t.id} className={`flex justify-between items-center p-3 border-b border-gray-50 dark:border-slate-700 last:border-0 ${t.archived ? 'opacity-50 grayscale' : ''}`}>
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2 rounded-full ${catDef.color}`}>
                                                        <CatIcon size={14} />
                                                    </div>
                                                    <div>
                                                        <span className="block font-medium text-gray-700 dark:text-gray-200 text-sm">{t.description} {t.archived && '(Archivé)'}</span>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs text-gray-400">{parseLocalDate(t.date).toLocaleDateString()}</span>
                                                            <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-slate-700 rounded text-gray-500 dark:text-gray-400">{accounts.find(a => a.id === t.accountId)?.name || 'Compte Inconnu'}</span>
                                                        </div>
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
                                        )})}
                                    </ul>
                                </div>

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

                {/* --- ONGLET ANALYSES ET STATISTIQUES --- */}
                {activeTab === 'analytics' && (
                    <div className="p-6 bg-rose-50/30 dark:bg-rose-900/10">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                            <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2 text-xl">
                                <PieChart size={24} className="text-rose-600"/> Statistiques Financières
                            </h3>
                            <div className="flex flex-wrap gap-3">
                                <select value={statsPeriod} onChange={(e) => setStatsPeriod(parseInt(e.target.value))} className="px-3 py-2 border border-rose-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white outline-none focus:border-rose-500 shadow-sm cursor-pointer">
                                    <option value={30}>30 derniers jours</option>
                                    <option value={60}>60 derniers jours</option>
                                    <option value={90}>90 derniers jours</option>
                                    <option value={365}>Cette année</option>
                                </select>
                                <select value={statsAccountId} onChange={(e) => setStatsAccountId(e.target.value)} className="px-3 py-2 border border-rose-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white outline-none focus:border-rose-500 shadow-sm cursor-pointer">
                                    <option value="total">Total (Tous les comptes)</option>
                                    {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* GRAPHIQUE VECTORIEL : Évolution -30j / +30j */}
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 mb-6">
                            <h4 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                                <LineChart size={16} className="text-blue-500"/>
                                Évolution de la trésorerie (60 jours)
                            </h4>
                            {evolutionChartData.points.length > 0 && (
                                <div className="w-full relative h-[240px] select-none">
                                    {/* Grille de fond (Lignes verticales pour marquer les semaines) */}
                                    <div className="absolute inset-0 flex justify-between pointer-events-none opacity-5 dark:opacity-10">
                                        {[...Array(9)].map((_, i) => (
                                            <div key={i} className="h-full border-l border-slate-500 border-dashed"></div>
                                        ))}
                                    </div>
                                    
                                    <svg viewBox="0 0 800 200" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                                        {/* Ligne Zéro (si le solde est passé dans le négatif) */}
                                        {evolutionChartData.min < 0 && evolutionChartData.max > 0 && (
                                            <line x1="0" y1={200 - ((0 - evolutionChartData.min) / (evolutionChartData.max - evolutionChartData.min)) * 200} x2="800" y2={200 - ((0 - evolutionChartData.min) / (evolutionChartData.max - evolutionChartData.min)) * 200} stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4 4" className="opacity-40"/>
                                        )}
                                        
                                        {/* Dégradé lissé pour le passé */}
                                        <defs>
                                            <linearGradient id="pastGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4"/>
                                                <stop offset="70%" stopColor="#3b82f6" stopOpacity="0.05"/>
                                                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0"/>
                                            </linearGradient>
                                        </defs>
                                        
                                        {(() => {
                                            const range = evolutionChartData.max - evolutionChartData.min;
                                            const getX = (i) => (i / 60) * 800;
                                            const getY = (val) => range === 0 ? 100 : 200 - ((val - evolutionChartData.min) / range) * 200;
                                            
                                            const pastPoints = evolutionChartData.points.slice(0, 31).map((p, i) => [getX(i), getY(p.balance)]);
                                            const futurePoints = evolutionChartData.points.slice(30).map((p, i) => [getX(i + 30), getY(p.balance)]);

                                            // Construction des courbes de Bézier
                                            let pastPath = `M ${pastPoints[0][0]},${pastPoints[0][1]} `;
                                            for(let i = 1; i < pastPoints.length; i++) pastPath += bezierCommand(pastPoints[i], i, pastPoints);

                                            let futurePath = `M ${futurePoints[0][0]},${futurePoints[0][1]} `;
                                            for(let i = 1; i < futurePoints.length; i++) futurePath += bezierCommand(futurePoints[i], i, futurePoints);

                                            const pastFill = `${pastPath} L ${getX(30)},200 L 0,200 Z`;

                                            return (
                                                <>
                                                    <path d={pastFill} fill="url(#pastGradient)" />
                                                    <path d={pastPath} fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                                                    <path d={futurePath} fill="none" stroke="#64748b" strokeWidth="3" strokeDasharray="6 6" strokeLinecap="round" strokeLinejoin="round" className="opacity-70" />
                                                </>
                                            );
                                        })()}
                                    </svg>
                                    
                                    <div className="absolute top-0 left-0 text-[10px] text-slate-500 dark:text-gray-400 -translate-y-6 flex items-center gap-2">
                                        <div className="w-4 h-px bg-gray-300 dark:bg-slate-600"></div>
                                        Max: {formatCurrency(evolutionChartData.max)}
                                    </div>
                                    <div className="absolute top-1/2 left-0 text-[10px] text-slate-500 dark:text-gray-400 -translate-y-1/2 flex items-center gap-2 opacity-50">
                                        <div className="w-4 h-px bg-gray-300 dark:bg-slate-600"></div>
                                        {formatCurrency((evolutionChartData.max + evolutionChartData.min) / 2)}
                                    </div>
                                    <div className="absolute bottom-0 left-0 text-[10px] text-slate-500 dark:text-gray-400 translate-y-4 flex items-center gap-2">
                                        <div className="w-4 h-px bg-gray-300 dark:bg-slate-600"></div>
                                        Min: {formatCurrency(evolutionChartData.min)}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* CASHFLOW */}
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 flex flex-col justify-center">
                                <h4 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-6">Flux de trésorerie</h4>
                                <div className="space-y-6">
                                    <div>
                                        <div className="flex justify-between items-end mb-2">
                                            <span className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300"><ArrowUpCircle size={16} className="text-green-500"/> Entrées</span>
                                            <span className="font-bold text-green-600 text-xl">{formatCurrency(analyticsData.totalIn)}</span>
                                        </div>
                                        <div className="w-full h-3 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                            <div className="h-full bg-green-500 rounded-full" style={{ width: analyticsData.totalIn === 0 && analyticsData.totalOut === 0 ? '0%' : `${(analyticsData.totalIn / (analyticsData.totalIn + analyticsData.totalOut)) * 100}%` }}></div>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between items-end mb-2">
                                            <span className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300"><ArrowDownCircle size={16} className="text-red-500"/> Sorties</span>
                                            <span className="font-bold text-red-600 text-xl">{formatCurrency(analyticsData.totalOut)}</span>
                                        </div>
                                        <div className="w-full h-3 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                            <div className="h-full bg-red-500 rounded-full" style={{ width: analyticsData.totalIn === 0 && analyticsData.totalOut === 0 ? '0%' : `${(analyticsData.totalOut / (analyticsData.totalIn + analyticsData.totalOut)) * 100}%` }}></div>
                                        </div>
                                    </div>
                                    <div className={`mt-4 p-4 rounded-xl text-center border ${analyticsData.totalIn >= analyticsData.totalOut ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'}`}>
                                        <p className="text-xs uppercase tracking-wide mb-1 font-bold opacity-70">Bilan sur {statsPeriod} jours</p>
                                        <p className={`text-2xl font-black ${analyticsData.totalIn >= analyticsData.totalOut ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                                            {analyticsData.totalIn >= analyticsData.totalOut ? '+' : ''}{formatCurrency(analyticsData.totalIn - analyticsData.totalOut)}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* JAUGE RUNWAY (Corrigée pour le mode clair) */}
                            <div className="bg-white dark:bg-gradient-to-br dark:from-slate-800 dark:to-slate-900 p-6 rounded-xl shadow-sm dark:shadow-lg border border-gray-200 dark:border-slate-700 text-slate-800 dark:text-white flex flex-col justify-center items-center text-center relative overflow-hidden">
                                <h4 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-6 w-full text-left z-10">Jauge de Survie (Runway)</h4>
                                
                                <div className="w-32 h-32 rounded-full border-8 border-slate-100 dark:border-slate-700 flex items-center justify-center mb-4 relative z-10"
                                     style={{ borderColor: analyticsData.runwayMonths < 1 ? '#ef4444' : analyticsData.runwayMonths < 3 ? '#f59e0b' : '#10b981' }}>
                                    <div className="flex flex-col items-center">
                                        <span className="text-4xl font-black">{analyticsData.runwayMonths === 999 ? '∞' : Math.floor(analyticsData.runwayMonths)}</span>
                                        <span className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold tracking-widest">{analyticsData.runwayMonths === 999 ? 'Infini' : 'Mois'}</span>
                                    </div>
                                </div>
                                <p className="text-sm text-slate-600 dark:text-slate-300 z-10">
                                    Si vos revenus s'arrêtent, vous tenez <strong className="text-slate-900 dark:text-white">{analyticsData.runwayMonths === 999 ? 'indéfiniment' : `${Math.floor(analyticsData.runwayMonths)} mois`}</strong> au rythme actuel.
                                </p>
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-4 z-10 uppercase tracking-wide">Basé sur une dépense de {formatCurrency(analyticsData.monthlyBurnRate)} / mois</p>
                            </div>

                            {/* TOP 5 GOUFFRES */}
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
                                <h4 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-6">Top 5 Dépenses</h4>
                                {analyticsData.top5.length === 0 ? (
                                    <p className="text-sm text-gray-400 text-center py-4">Aucune dépense sur la période.</p>
                                ) : (
                                    <ul className="space-y-4">
                                        {analyticsData.top5.map((t, i) => {
                                            const catDef = CATEGORIES.find(c => c.id === t.category) || CATEGORIES.find(c => c.id === 'autre');
                                            const CatIcon = catDef.icon;
                                            return (
                                                <li key={t.id} className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3 overflow-hidden">
                                                        <div className={`p-2 rounded-full font-bold text-xs ${i === 0 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500 dark:bg-slate-700'}`}>#{i+1}</div>
                                                        <div className="truncate">
                                                            <p className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate">{t.description}</p>
                                                            <p className="text-xs text-gray-400 flex items-center gap-1"><CatIcon size={10}/> {catDef.label}</p>
                                                        </div>
                                                    </div>
                                                    <span className="font-bold text-red-600 shrink-0 ml-2">{formatCurrency(parseFloat(t.amount))}</span>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </div>

                            {/* RÉPARTITION PAR CATÉGORIE */}
                            <div className="lg:col-span-3 bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
                                <h4 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-6">Répartition des sorties</h4>
                                {analyticsData.totalOut === 0 ? (
                                    <p className="text-sm text-gray-400 text-center py-8">Aucune donnée à analyser.</p>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {analyticsData.sortedCategories.map(cat => {
                                            const pct = (cat.amount / analyticsData.totalOut) * 100;
                                            const CatIcon = cat.icon;
                                            return (
                                                <div key={cat.id} className="space-y-2">
                                                    <div className="flex justify-between items-end">
                                                        <span className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                                                            <div className={`p-1.5 rounded-lg ${cat.color}`}><CatIcon size={14}/></div>
                                                            {cat.label}
                                                        </span>
                                                        <div className="text-right">
                                                            <span className="block font-bold text-gray-800 dark:text-white">{formatCurrency(cat.amount)}</span>
                                                            <span className="text-xs text-gray-400">{round2(pct)}%</span>
                                                        </div>
                                                    </div>
                                                    <div className="w-full h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: cat.hex }}></div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* --- PRÉVISIONS (RESTAURÉ EXACTEMENT COMME L'ORIGINAL) --- */}
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

                {/* --- FORMULAIRES DE SAISIE AVEC CATÉGORIES --- */}
                {['add-transaction', 'add-scheduled', 'add-recurring'].includes(activeTab) && (
                    <div className="p-6 bg-gray-50 dark:bg-slate-800">
                        <h3 className="font-bold text-gray-700 dark:text-gray-200 mb-4">{activeTab === 'add-transaction' && "Transaction immédiate"}{activeTab === 'add-scheduled' && "Planifié"}{activeTab === 'add-recurring' && "Récurrent"}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div className="flex gap-2 p-1 bg-white dark:bg-slate-700 rounded-lg border border-gray-200 dark:border-slate-600 w-fit h-fit">
                                <button onClick={() => setType('expense')} className={`px-4 py-1 rounded-md text-sm font-medium transition-colors ${type === 'expense' ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-200' : 'text-gray-500 dark:text-gray-400'}`}>Dépense</button>
                                <button onClick={() => setType('income')} className={`px-4 py-1 rounded-md text-sm font-medium transition-colors ${type === 'income' ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-200' : 'text-gray-500 dark:text-gray-400'}`}>Revenu</button>
                                <button onClick={() => setType('transfer')} className={`px-4 py-1 rounded-md text-sm font-medium transition-colors ${type === 'transfer' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-200' : 'text-gray-500 dark:text-gray-400'}`}>Virement</button>
                            </div>
                            
                            <div className="space-y-4">
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
                                        <div className="space-y-1">
                                            <label className="text-[10px] text-gray-400 uppercase font-bold dark:text-gray-500">Compte cible</label>
                                            <select value={selectedAccountId} onChange={e => setSelectedAccountId(e.target.value)} className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg outline-none focus:border-blue-500 bg-white dark:bg-slate-700 dark:text-white text-sm">{accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}</select>
                                        </div>
                                    )}
                                </div>

                                {type !== 'transfer' && (
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-gray-400 uppercase font-bold dark:text-gray-500">Catégorie</label>
                                        <select value={category} onChange={e => setCategory(e.target.value)} className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg outline-none focus:border-blue-500 bg-white dark:bg-slate-700 dark:text-white text-sm cursor-pointer">
                                            {CATEGORIES.filter(c => type === 'income' ? c.id === 'salaire' || c.id === 'autre' : c.id !== 'salaire').map(c => (
                                                <option key={c.id} value={c.id}>{c.label}</option>
                                            ))}
                                        </select>
                                    </div>
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