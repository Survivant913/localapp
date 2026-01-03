import { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import Login from './Login';
import Sidebar from './Sidebar';
import Dashboard from './Dashboard';
import CalendarView from './CalendarView';
import ProjectsManager from './ProjectsManager';
import BudgetManager from './BudgetManager';
import NotesManager from './NotesManager';
import TodoList from './TodoList';
import DataSettings from './DataSettings';
import ClientHub from './ClientHub';
import ZenMode from './ZenMode';
import Workspace from './Workspace'; 
import { Loader2, Lock } from 'lucide-react';

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setView] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [notifMessage, setNotifMessage] = useState(null);
  const isLoaded = useRef(false);
  
  const getInitialTheme = () => {
    if (typeof window !== 'undefined') return localStorage.getItem('localAppTheme') || 'light';
    return 'light';
  };

  const [data, setData] = useState({
    todos: [], projects: [], 
    budget: { transactions: [], recurring: [], scheduled: [], accounts: [], planner: { base: 0, items: [] } },
    events: [], notes: [], mainNote: "", settings: { theme: getInitialTheme() }, customLabels: {},
    clients: [], quotes: [], invoices: [], catalog: [], profile: {},
    ventures: [] 
  });

  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // --- UTILS ---
  const parseLocalDate = (dateStr) => {
    if (!dateStr) return new Date();
    try {
        if (typeof dateStr === 'string' && dateStr.includes('-')) {
            const parts = dateStr.split('T')[0].split('-');
            if (parts.length === 3) return new Date(parts[0], parts[1] - 1, parts[2]);
        }
        return new Date(dateStr);
    } catch(e) { return new Date(); }
  };

  const isDatePastOrToday = (dateStr) => {
      if (!dateStr) return false;
      const today = new Date();
      today.setHours(0,0,0,0);
      const checkDate = parseLocalDate(dateStr); 
      checkDate.setHours(0,0,0,0);
      return checkDate <= today;
  };

  // --- BATCH SAVE ---
  const upsertInBatches = async (table, items, batchSize = 50, mapFunction) => {
    if (!items || items.length === 0) return;
    const validItems = items.filter(i => i && i.id);
    const mappedItems = validItems.map(mapFunction);
    for (let i = 0; i < mappedItems.length; i += batchSize) {
      const batch = mappedItems.slice(i, i + batchSize);
      await supabase.from(table).upsert(batch);
    }
  };

  const toggleTheme = () => {
    const newTheme = data.settings?.theme === 'dark' ? 'light' : 'dark';
    const newData = { ...data, settings: { ...data.settings, theme: newTheme } };
    setData(newData);
    localStorage.setItem('localAppTheme', newTheme);
    if (newTheme === 'dark') document.documentElement.classList.add('dark'); else document.documentElement.classList.remove('dark');
    updateData(newData); 
  };

  useEffect(() => {
    const theme = data.settings?.theme || 'light';
    if (theme === 'dark') document.documentElement.classList.add('dark'); else document.documentElement.classList.remove('dark');
    localStorage.setItem('localAppTheme', theme);
  }, [data.settings?.theme]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) initDataLoad(session.user.id); else setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session && !isLoaded.current) initDataLoad(session.user.id); else if (!session) setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  const initDataLoad = async (userId) => {
    if (isLoaded.current) return;
    isLoaded.current = true;
    setLoading(true);

    try {
      const results = await Promise.all([
        supabase.from('profiles').select('*').single(),
        supabase.from('todos').select('*'),
        supabase.from('notes').select('*'),
        supabase.from('projects').select('*'),
        supabase.from('accounts').select('*'),
        supabase.from('transactions').select('*'),
        supabase.from('recurring').select('*'),
        supabase.from('scheduled').select('*'),
        supabase.from('events').select('*'),
        supabase.from('planner_items').select('*'),
        supabase.from('safety_bases').select('*'),
        supabase.from('clients').select('*'),
        supabase.from('quotes').select('*'),
        supabase.from('invoices').select('*'),
        supabase.from('catalog_items').select('*'),
        supabase.from('ventures').select('*')
      ]);

      const [
        { data: profile }, { data: todos }, { data: notes }, { data: projects },
        { data: accounts }, { data: transactions }, { data: recurring }, 
        { data: scheduled }, { data: events }, { data: plannerItems }, { data: safetyBases },
        { data: clients }, { data: quotes }, { data: invoices }, { data: catalog },
        { data: ventures }
      ] = results;

      // --- CATCH-UP ENGINE ---
      let newDBTransactions = [];
      let updatedDBScheduled = [];
      let updatedDBRecurring = [];
      
      const validAccounts = accounts || [];
      const defaultAccountId = validAccounts.length > 0 ? validAccounts[0].id : 'offline-account';

      // 1. Scheduled Catch-up
      (scheduled || []).forEach(s => {
          if (s.status === 'pending' && isDatePastOrToday(s.date)) {
              const baseId = Date.now() + Math.floor(Math.random() * 1000000);
              const accId = validAccounts.find(a => a.id === s.account_id) ? s.account_id : s.account_id;
              
              const common = { 
                  id: baseId, user_id: userId, amount: s.amount, date: s.date, archived: false, 
                  type: s.type, description: s.description, account_id: accId 
              };

              if (s.type === 'transfer' && s.target_account_id) {
                  const targetAccId = s.target_account_id;
                  const sourceName = validAccounts.find(a => a.id === accId)?.name || 'Source';
                  const targetName = validAccounts.find(a => a.id === targetAccId)?.name || 'Cible';
                  newDBTransactions.push({ ...common, type: 'expense', description: `Virement vers ${targetName} : ${s.description}`, account_id: accId });
                  newDBTransactions.push({ ...common, id: baseId + 1, type: 'income', description: `Virement reçu de ${sourceName} : ${s.description}`, account_id: targetAccId });
              } else { 
                  newDBTransactions.push(common); 
              }
              updatedDBScheduled.push({ ...s, status: 'executed' });
          }
      });

      // 2. Recurring Catch-up
      (recurring || []).forEach(r => {
          let hasChanged = false;
          let tempR = { ...r };
          if (!tempR.next_due_date) {
              const d = new Date(); d.setDate(tempR.day_of_month);
              if (d < new Date()) d.setMonth(d.getMonth() + 1);
              tempR.next_due_date = d.toISOString();
              hasChanged = true;
          }
          let loopSafety = 0;
          while (isDatePastOrToday(tempR.next_due_date) && loopSafety < 12) {
              const nextDueObj = parseLocalDate(tempR.next_due_date);
              const baseId = Date.now() + Math.floor(Math.random() * 1000000) + loopSafety * 10;
              const accId = validAccounts.find(a => a.id === tempR.account_id) ? tempR.account_id : (tempR.account_id || defaultAccountId);
              
              const common = { 
                  id: baseId, user_id: userId, amount: tempR.amount, date: tempR.next_due_date, archived: false, 
                  type: tempR.type, description: tempR.description, account_id: accId 
              };

              if (tempR.type === 'transfer' && tempR.target_account_id) {
                  newDBTransactions.push({ ...common, type: 'expense', description: `Virement (Rec.) : ${tempR.description}`, account_id: accId });
                  newDBTransactions.push({ ...common, id: baseId + 1, type: 'income', description: `Virement reçu (Rec.) : ${tempR.description}`, account_id: tempR.target_account_id });
              } else { 
                  newDBTransactions.push(common); 
              }
              
              let nextMonth = nextDueObj.getMonth() + 1;
              let nextYear = nextDueObj.getFullYear();
              if (nextMonth > 11) { nextMonth = 0; nextYear++; }
              const daysInNextMonth = new Date(nextYear, nextMonth + 1, 0).getDate();
              const targetDay = Math.min(tempR.day_of_month, daysInNextMonth);
              const newDate = new Date(nextYear, nextMonth, targetDay);
              
              if (tempR.end_date && parseLocalDate(tempR.end_date) < newDate) break;
              tempR.next_due_date = newDate.toISOString();
              hasChanged = true;
              loopSafety++;
          }
          if (hasChanged) updatedDBRecurring.push(tempR);
      });

      let finalTransactions = [...(transactions || []), ...newDBTransactions];
      let finalScheduled = (scheduled || []).map(s => { const updated = updatedDBScheduled.find(u => u.id == s.id); return updated || s; });
      let finalRecurring = (recurring || []).map(r => { const updated = updatedDBRecurring.find(u => u.id == r.id); return updated || r; });

      if (newDBTransactions.length > 0 || updatedDBScheduled.length > 0 || updatedDBRecurring.length > 0) {
          const syncAsync = async () => {
             try {
                 if (newDBTransactions.length > 0) await upsertInBatches('transactions', newDBTransactions, 50, t => t);
                 if (updatedDBScheduled.length > 0) await supabase.from('scheduled').upsert(updatedDBScheduled);
                 if (updatedDBRecurring.length > 0) await supabase.from('recurring').upsert(updatedDBRecurring);
             } catch (err) {
                 console.error("Erreur Sync Rattrapage:", err);
                 setUnsavedChanges(true); 
             }
          };
          syncAsync();
      }

      const mappedTransactions = finalTransactions.map(t => ({ ...t, accountId: t.account_id }));
      const mappedRecurring = finalRecurring.map(r => ({ ...r, accountId: r.account_id, targetAccountId: r.target_account_id, nextDueDate: r.next_due_date, dayOfMonth: r.day_of_month, endDate: r.end_date }));
      const mappedScheduled = finalScheduled.map(s => ({ ...s, accountId: s.account_id, targetAccountId: s.target_account_id }));
      const mappedPlannerItems = (plannerItems || []).map(i => ({ ...i, targetAccountId: i.target_account_id }));
      const plannerBases = {}; (safetyBases || []).forEach(b => plannerBases[b.account_id] = b.amount);
      const mappedProjects = (projects || []).map(p => ({ ...p, linkedAccountId: p.linked_account_id }));
      const mappedNotes = (notes || []).map(n => ({ ...n, linkedProjectId: n.linked_project_id, isPinned: n.is_pinned }));
      
      const loadedTheme = localStorage.getItem('localAppTheme') || profile?.settings?.theme || 'light';
      
      const newData = {
        todos: todos || [], notes: mappedNotes, projects: mappedProjects, events: events || [],
        budget: {
          accounts: validAccounts, 
          transactions: mappedTransactions.sort((a,b) => new Date(b.date) - new Date(a.date)),
          recurring: mappedRecurring, scheduled: mappedScheduled,
          planner: { base: 0, items: mappedPlannerItems, safetyBases: plannerBases }
        },
        clients: clients || [], quotes: quotes || [], invoices: invoices || [], catalog: catalog || [],
        ventures: ventures || [], 
        profile: profile || {},
        settings: { ...(profile?.settings || {}), theme: loadedTheme },
        customLabels: profile?.custom_labels || {}, mainNote: ""
      };

      setData(newData);
      if (newData.settings?.pin) setIsLocked(true);

    } catch (error) { console.error("Erreur chargement:", error); } finally { setLoading(false); }
  };

  const updateData = async (newData, deleteRequest = null) => {
    setData(newData);
    setUnsavedChanges(true);
    if (deleteRequest) {
      const { table, id } = deleteRequest;
      if (table && id) try { await supabase.from(table).delete().eq('id', id); } catch (e) { console.error("Erreur suppression", e); }
    }
  };

  useEffect(() => {
    if (!unsavedChanges) return;
    const timer = setTimeout(() => { saveDataToSupabase(); }, 3000);
    return () => clearTimeout(timer);
  }, [data, unsavedChanges]);

  const saveDataToSupabase = async () => {
    if (!session) return;
    setIsSaving(true);
    try {
      const { user } = session;
      await supabase.from('profiles').upsert({ 
          id: user.id, settings: data.settings, custom_labels: data.customLabels,
          company_name: data.profile?.company_name, siret: data.profile?.siret, 
          address: data.profile?.address, email_contact: data.profile?.email_contact, 
          phone_contact: data.profile?.phone_contact, iban: data.profile?.iban, 
          bic: data.profile?.bic, tva_number: data.profile?.tva_number, logo: data.profile?.logo
      });
      await upsertInBatches('accounts', data.budget.accounts.filter(a => a && a.name && a.id).map(a => ({ id: a.id, user_id: user.id, name: a.name })), 50, a => a);
      await upsertInBatches('transactions', data.budget.transactions, 50, t => ({ id: t.id, user_id: user.id, amount: t.amount, type: t.type, description: t.description, date: t.date, account_id: t.accountId || t.account_id, archived: t.archived }));
      await upsertInBatches('clients', data.clients, 50, c => ({ id: c.id, user_id: user.id, name: c.name, contact_person: c.contact_person, email: c.email, phone: c.phone, address: c.address, status: c.status }));
      await upsertInBatches('quotes', data.quotes, 50, q => ({ id: q.id, user_id: user.id, number: q.number, client_id: q.client_id, client_name: q.client_name, client_address: q.client_address, date: q.date, due_date: q.dueDate, items: q.items, total: q.total, status: q.status, notes: q.notes }));
      await upsertInBatches('invoices', data.invoices, 50, i => ({ id: i.id, user_id: user.id, number: i.number, client_id: i.client_id, client_name: i.client_name, client_address: i.client_address, date: i.date, due_date: i.dueDate, items: i.items, total: i.total, status: i.status, target_account_id: i.target_account_id, notes: i.notes }));
      await upsertInBatches('catalog_items', data.catalog, 50, c => ({ id: c.id, user_id: user.id, name: c.name, price: c.price }));
      await upsertInBatches('todos', data.todos, 50, t => ({ id: t.id, user_id: user.id, text: t.text, completed: t.completed, status: t.status, priority: t.priority, deadline: t.deadline }));
      await upsertInBatches('notes', data.notes, 50, n => ({ id: n.id, user_id: user.id, title: n.title, content: n.content, color: n.color, is_pinned: n.isPinned, linked_project_id: n.linkedProjectId, created_at: n.created_at || new Date().toISOString() }));
      await upsertInBatches('projects', data.projects, 50, p => ({ id: p.id, user_id: user.id, title: p.title, description: p.description, status: p.status, priority: p.priority, deadline: p.deadline, progress: p.progress, cost: p.cost, linked_account_id: p.linkedAccountId, objectives: p.objectives, internal_notes: p.notes }));
      await upsertInBatches('recurring', data.budget.recurring, 50, r => ({ id: r.id, user_id: user.id, amount: r.amount, type: r.type, description: r.description, day_of_month: r.dayOfMonth, end_date: r.endDate, next_due_date: r.nextDueDate, account_id: r.accountId, target_account_id: r.targetAccountId }));
      await upsertInBatches('scheduled', data.budget.scheduled, 50, s => ({ id: s.id, user_id: user.id, amount: s.amount, type: s.type, description: s.description, date: s.date, status: s.status, account_id: s.accountId, target_account_id: s.targetAccountId }));
      await upsertInBatches('planner_items', data.budget.planner.items, 50, i => ({ id: i.id, user_id: user.id, name: i.name, cost: i.cost, target_account_id: i.targetAccountId }));
      const bases = data.budget.planner.safetyBases;
      const basesSQL = Object.keys(bases).map(accId => ({ user_id: user.id, account_id: accId, amount: bases[accId] }));
      if (basesSQL.length > 0) await supabase.from('safety_bases').upsert(basesSQL, { onConflict: 'user_id, account_id' });
      setUnsavedChanges(false);
      setNotifMessage(null);
    } catch (err) { 
        console.error("Erreur sauvegarde critique", err); 
        setNotifMessage("Erreur : " + (err.message || "Sauvegarde échouée")); 
    } finally { setIsSaving(false); }
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-900 text-white"><Loader2 className="animate-spin w-10 h-10 text-blue-500"/></div>;
  if (!session) return <Login />;

  const renderContent = () => {
    switch(currentView) {
      case 'dashboard': return <Dashboard data={data} updateData={updateData} setView={setView} />;
      case 'calendar': return <CalendarView data={data} updateData={updateData} />;
      case 'projects': return <ProjectsManager data={data} updateData={updateData} />;
      case 'budget': return <BudgetManager data={data} updateData={updateData} />;
      case 'notes': return <NotesManager data={data} updateData={updateData} />;
      case 'todo': return <TodoList data={data} updateData={updateData} />;
      case 'clients': return <ClientHub data={data} updateData={updateData} />;
      case 'workspace': return <Workspace data={data} updateData={updateData} />;
      case 'settings': return <DataSettings data={data} loadExternalData={updateData} darkMode={data.settings?.theme === 'dark'} toggleTheme={toggleTheme} />;
      default: return <Dashboard data={data} updateData={updateData} setView={setView} />;
    }
  };

  // CORRECTIF POUR LE LAYOUT PLEIN ECRAN
  const isWorkspace = currentView === 'workspace';

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300">
      
      <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2 pointer-events-none">
        {(isSaving || unsavedChanges) && <div className={`w-3 h-3 rounded-full shadow-sm transition-all duration-500 ${isSaving ? 'bg-blue-500 animate-pulse' : 'bg-orange-400'}`}></div>}
        {notifMessage && notifMessage.includes('Erreur') && (
            <div className="px-3 py-1.5 rounded-lg border shadow-xl text-xs font-medium animate-in slide-in-from-bottom-2 fade-in bg-red-900 border-red-700 text-red-100">
                {notifMessage}
            </div>
        )}
      </div>

      {isLocked && (
        <div className="fixed inset-0 z-[100] bg-slate-900 flex flex-col items-center justify-center p-4">
           <div className="mb-4 bg-blue-600 p-4 rounded-full"><Lock size={32} className="text-white"/></div>
           <input type="password" maxLength="4" className="text-center text-2xl tracking-widest p-2 rounded bg-slate-800 text-white border border-slate-700 w-40 outline-none" onChange={(e) => { if(e.target.value === data.settings.pin) setIsLocked(false); }} autoFocus />
        </div>
      )}

      {currentView === 'zen' && <ZenMode data={data} updateData={updateData} close={() => setView('dashboard')} />}
      
      <Sidebar currentView={currentView} setView={setView} isMobileOpen={isMobileMenuOpen} toggleMobile={() => setIsMobileMenuOpen(!isMobileMenuOpen)} labels={data.customLabels} darkMode={data.settings?.theme === 'dark'} toggleTheme={toggleTheme} />
      
      <div className="flex-1 flex flex-col h-full w-full overflow-hidden relative">
        <header className="md:hidden bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 p-4 flex justify-between items-center z-20">
          <h1 className="font-bold text-lg text-gray-800 dark:text-white">{data.customLabels?.appName || 'LocalApp'}</h1>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 rounded-lg">Menu</button>
        </header>
        
        {/* CORRECTIF LAYOUT : Suppression padding si Workspace */}
        <main className={`flex-1 overflow-y-auto custom-scrollbar ${isWorkspace ? 'p-0 overflow-hidden' : ''}`}>
          <div className={`w-full ${isWorkspace ? 'h-full' : 'max-w-7xl mx-auto'}`}> 
            {renderContent()} 
          </div>
        </main>
      </div>
    </div>
  );
}