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
import GoalsManager from './GoalsManager'; 
import JournalManager from './JournalManager';
import PlanningManager from './PlanningManager';
import HabitTracker from './HabitTracker'; 
import ChatManager from './ChatManager'; 
import { Loader2, Lock } from 'lucide-react';

// --- AJOUT 1 : LE SON ---
const POP_SOUND = "data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4LjIwLjEwMAAAAAAAAAAAAAAA//OEAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAEAAABIwAAERERERERERERERERERERMzMzMzMzMzMzMzMzMzMzMzMzREREREREREREREREREREREREZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZm//OEAAAAAAAAAAAAAAAAAAAAAAAATGF2YzU4LjM1LjEwMAAAAAAAAAAAAAAAJAAAAAAAAAAAASNmNs4AAAAAAAAB//OEZAAAAAAABAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAQAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAf/7kmRAAAAAAABAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAABAAABAAAAAAAAAAAAAAAAAAAAAAAAAAA//uSZAADAAAAAAABAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAQAAAAAAAAAAAAAAAAAAAAAAAAAA";

// --- NOUVEAU : PALETTE DE COULEURS ---
const THEME_COLORS = {
 blue:    { primary: '#2563eb', hover: '#1d4ed8', light: '#eff6ff', text: '#2563eb', textLight: '#3b82f6', border: '#bfdbfe', badge: '#dbeafe' },
 violet:  { primary: '#7c3aed', hover: '#6d28d9', light: '#f5f3ff', text: '#7c3aed', textLight: '#8b5cf6', border: '#ddd6fe', badge: '#ede9fe' },
 emerald: { primary: '#059669', hover: '#047857', light: '#ecfdf5', text: '#059669', textLight: '#10b981', border: '#a7f3d0', badge: '#d1fae5' },
 amber:   { primary: '#d97706', hover: '#b45309', light: '#fffbeb', text: '#d97706', textLight: '#f59e0b', border: '#fde68a', badge: '#fef3c7' },
 rose:    { primary: '#e11d48', hover: '#be123c', light: '#fff1f2', text: '#e11d48', textLight: '#f43f5e', border: '#fecdd3', badge: '#ffe4e6' },
 indigo:  { primary: '#4f46e5', hover: '#4338ca', light: '#eef2ff', text: '#4f46e5', textLight: '#6366f1', border: '#c7d2fe', badge: '#e0e7ff' },
};

export default function App() {
 const [session, setSession] = useState(null);
 const [loading, setLoading] = useState(true);
 const [currentView, setView] = useState('dashboard');
 const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
 const [isLocked, setIsLocked] = useState(false);
 const [notifMessage, setNotifMessage] = useState(null);
 const isLoaded = useRef(false);
 const loadSuccess = useRef(false); // --- SÉCURITÉ ANTI-EFFACEMENT ---
 
 // --- AJOUT 2 : ÉTATS POUR SON ET COMPTEUR ---
 const [unreadCount, setUnreadCount] = useState(0);
 const audioRef = useRef(typeof window !== 'undefined' ? new Audio(POP_SOUND) : null);

 const getInitialTheme = () => {
   if (typeof window !== 'undefined') return localStorage.getItem('freelanceCockpitTheme') || 'light';
   return 'light';
 };

 const [data, setData] = useState({
   todos: [], todoLists: [], projects: [], 
   goals: [], goal_milestones: [], 
   journal_folders: [], journal_pages: [],
   calendar_events: [], 
   budget: { transactions: [], recurring: [], scheduled: [], accounts: [], planner: { base: 0, items: [] } },
   events: [], notes: [], mainNote: "", settings: { theme: getInitialTheme(), accentColor: 'blue' }, customLabels: {},
   clients: [], quotes: [], invoices: [], catalog: [], profile: {},
   ventures: [] 
 });

 const [unsavedChanges, setUnsavedChanges] = useState(false);
 const [isSaving, setIsSaving] = useState(false);

 // --- NOUVEAU BLOC : CALCUL INITIAL DES MESSAGES NON LUS ---
 useEffect(() => {
   if (!session?.user?.email) return;

   const fetchInitialUnreadCount = async () => {
       const { data: participations } = await supabase
           .from('chat_participants')
           .select('room_id, last_read_at')
           .eq('user_email', session.user.email);

       if (!participations || participations.length === 0) return;

       const countPromises = participations.map(async (p) => {
           const { count } = await supabase
               .from('chat_messages')
               .select('*', { count: 'exact', head: true }) 
               .eq('room_id', p.room_id)
               .gt('created_at', p.last_read_at || '2000-01-01');
           
           return count || 0;
       });

       const counts = await Promise.all(countPromises);
       const totalUnread = counts.reduce((a, b) => a + b, 0);
       setUnreadCount(totalUnread);
   };

   fetchInitialUnreadCount();
 }, [session]); 

 // --- AJOUT 3 : ÉCOUTEUR GLOBAL DE MESSAGES + NOTIFICATIONS SYSTÈME ---
 useEffect(() => {
   if (!session) return;
   
   if ('Notification' in window && Notification.permission === 'default') {
       Notification.requestPermission();
   }

   if (currentView === 'chat') setUnreadCount(0);

   const channel = supabase.channel('global-chat-notifications')
       .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, (payload) => {
           if (payload.new.sender_id === session.user.id) return;
           
           if (currentView !== 'chat') {
               try { audioRef.current.currentTime = 0; audioRef.current.play().catch(() => {}); } catch(e) {}
               setUnreadCount(prev => prev + 1);

               if (Notification.permission === 'granted') {
                   new Notification("Nouveau Message", {
                       body: payload.new.content || "Vous avez reçu un message",
                       silent: true 
                   });
               }
           }
       })
       .subscribe();
   return () => { supabase.removeChannel(channel); };
 }, [session, currentView]);

 // --- GREFFE : ÉCOUTEUR TEMPS RÉEL CALENDRIER (SÉCURITÉ & DISPARITION INSTANTANÉE) ---
 useEffect(() => {
   if (!session || !session.user) return;
   const userEmail = session.user.email?.toLowerCase();
   const userId = session.user.id;

   const calendarChannel = supabase.channel('calendar-sync-master')
     .on('postgres_changes', { event: '*', schema: 'public', table: 'calendar_events' }, (payload) => {
       setData(prev => {
         let currentEvts = [...prev.calendar_events];
         if (payload.eventType === 'INSERT') {
           const isForMe = payload.new.user_id === userId || (payload.new.invited_email && payload.new.invited_email.toLowerCase().includes(userEmail));
           if (isForMe && !currentEvts.some(e => String(e.id) === String(payload.new.id))) {
               currentEvts.push({ ...payload.new, participants: [] });
           }
         } 
         else if (payload.eventType === 'UPDATE') {
           const isOwner = payload.new.user_id === userId;
           const isInvited = (payload.new.invited_email || "").toLowerCase().includes(userEmail);
           
           if (isOwner || isInvited) {
             const idx = currentEvts.findIndex(e => String(e.id) === String(payload.new.id));
             if (idx !== -1) {
                 currentEvts[idx] = { ...payload.new, participants: currentEvts[idx].participants || [], my_status: currentEvts[idx].my_status };
             } else {
                 currentEvts.push({ ...payload.new, participants: [] });
             }
           } else {
             // Si je suis retiré ou que je n'ai plus accès, suppression locale immédiate
             currentEvts = currentEvts.filter(e => String(e.id) !== String(payload.new.id));
           }
         } 
         else if (payload.eventType === 'DELETE') {
           currentEvts = currentEvts.filter(e => String(e.id) !== String(payload.old.id));
         }
         return { ...prev, calendar_events: currentEvts };
       });
     })
     // ÉCOUTE DES RÉPONSES POUR LA DISPARITION INSTANTANÉE DE L'INVITÉ
     .on('postgres_changes', { event: '*', schema: 'public', table: 'event_participants' }, (payload) => {
        setData(prev => ({
            ...prev,
            calendar_events: prev.calendar_events.map(ev => {
                const targetEventId = payload.new?.event_id || payload.old?.event_id;
                if (String(ev.id) !== String(targetEventId)) return ev;
                
                let newParts = [...(ev.participants || [])];
                if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                    const pIdx = newParts.findIndex(p => p.user_email.toLowerCase() === payload.new.user_email.toLowerCase());
                    if (pIdx !== -1) newParts[pIdx] = payload.new; else newParts.push(payload.new);
                } else if (payload.eventType === 'DELETE') {
                    newParts = newParts.filter(p => p.user_email.toLowerCase() !== payload.old.user_email.toLowerCase());
                }

                const myPart = newParts.find(p => p.user_email.toLowerCase() === userEmail);
                return { 
                    ...ev, 
                    participants: newParts, 
                    my_status: myPart ? myPart.status : (ev.user_id === userId ? 'accepted' : 'pending') 
                };
            }).filter(ev => {
                // LOGIQUE CRITIQUE : Si je suis invité (pas proprio) et que j'ai refusé, l'événement saute instantanément
                const isOwner = ev.user_id === userId;
                return isOwner || ev.my_status !== 'declined';
            })
        }));
     })
     .subscribe();

   return () => { supabase.removeChannel(calendarChannel); };
 }, [session]);

 // --- NOUVEAU : MOTEUR DE THÈME DYNAMIQUE ---
 useEffect(() => {
   const colorKey = data.settings?.accentColor || 'blue';
   
   if (colorKey === 'blue') {
       const existingStyle = document.getElementById('dynamic-theme-style');
       if (existingStyle) existingStyle.remove();
       return;
   }

   const theme = THEME_COLORS[colorKey];
   if (!theme) return;

   const css = `
     .bg-blue-600 { background-color: ${theme.primary} !important; }
     .hover\\:bg-blue-700:hover { background-color: ${theme.hover} !important; }
     .text-blue-600 { color: ${theme.text} !important; }
     .text-blue-500 { color: ${theme.textLight} !important; }
     .bg-blue-50 { background-color: ${theme.light} !important; }
     .border-blue-200 { border-color: ${theme.border} !important; }
     .bg-blue-100 { background-color: ${theme.badge} !important; }
     .text-blue-700 { color: ${theme.hover} !important; }
     .focus\\:border-blue-500:focus { border-color: ${theme.textLight} !important; }
     .ring-blue-500 { --tw-ring-color: ${theme.textLight} !important; }
   `;

   let style = document.getElementById('dynamic-theme-style');
   if (!style) {
       style = document.createElement('style');
       style.id = 'dynamic-theme-style';
       document.head.appendChild(style);
   }
   style.innerHTML = css;

 }, [data.settings?.accentColor]);

 // --- UTILS ---
 const parseLocalDate = (dateStr) => {
   if (!dateStr) return new Date();
   try {
       const d = new Date(dateStr);
       return new Date(d.getFullYear(), d.getMonth(), d.getDate());
   } catch(e) { return new Date(); }
 };

 // --- CORRECTION DU BUG DE DATE (+6H PRÉSERVÉ) ---
 const isDatePastOrToday = (dateStr) => {
      if (!dateStr) return false;
      const today = new Date();
      today.setHours(0,0,0,0);
      
      const d = new Date(dateStr);
      d.setHours(d.getHours() + 6);

      const checkDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
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
   localStorage.setItem('freelanceCockpitTheme', newTheme);
   if (newTheme === 'dark') document.documentElement.classList.add('dark'); else document.documentElement.classList.remove('dark');
   updateData(newData); 
 };

 useEffect(() => {
   const theme = data.settings?.theme || 'light';
   if (theme === 'dark') document.documentElement.classList.add('dark'); else document.documentElement.classList.remove('dark');
   localStorage.setItem('freelanceCockpitTheme', theme);
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

 // --- CHARGEMENT INITIAL (MOTEUR DE RATTRAPAGE ET +6H INTACTE) ---
 const initDataLoad = async (userId) => {
   if (isLoaded.current) return;
   isLoaded.current = true;
   setLoading(true);

   try {
     const { data: { user: currentUser } } = await supabase.auth.getUser();
     const userEmail = currentUser?.email;

     if (!userEmail) { isLoaded.current = false; setLoading(false); return; }

     const results = await Promise.all([
       supabase.from('profiles').select('*').single(),
       supabase.from('todos').select('*'),
       supabase.from('notes').select('*'),
       supabase.from('projects').select('*'),
       supabase.from('accounts').select('*'),
       supabase.from('transactions').select('*').limit(10000), 
       supabase.from('recurring').select('*'),
       supabase.from('scheduled').select('*'),
       supabase.from('events').select('*'),
       supabase.from('planner_items').select('*'),
       supabase.from('safety_bases').select('*'),
       supabase.from('clients').select('*'),
       supabase.from('quotes').select('*'),
       supabase.from('invoices').select('*'),
       supabase.from('catalog_items').select('*'),
       supabase.from('ventures').select('*'),
       supabase.from('goals').select('*'),
       supabase.from('goal_milestones').select('*'),
       supabase.from('journal_folders').select('*'),
       supabase.from('journal_pages').select('*'),
       supabase.from('calendar_events')
        .select('*')
        .or(`user_id.eq.${userId},invited_email.ilike.%${userEmail}%`),
       supabase.from('todo_lists').select('*'),
       supabase.from('event_participants').select('*') 
     ]);

     const [
       { data: profile }, { data: todos }, { data: notes }, { data: projects },
       { data: accounts }, { data: transactions }, { data: recurring }, 
       { data: scheduled }, { data: events }, { data: plannerItems }, { data: safetyBases },
       { data: clients }, { data: quotes }, { data: invoices }, { data: catalog },
       { data: ventures }, { data: goals }, { data: goal_milestones },
       { data: journal_folders }, { data: journal_pages },
       { data: calendar_events },
       { data: todo_lists },
       { data: all_participants }
     ] = results;

     let newDBTransactions = [];
     let updatedDBScheduled = [];
     let updatedDBRecurring = [];
     
     const validAccounts = accounts || [];
     const defaultAccountId = validAccounts.length > 0 ? validAccounts[0].id : 'offline-account';
     const existingTransactions = transactions || [];

     const isDuplicate = (desc, amount, dateStr) => {
         const targetDate = parseLocalDate(dateStr);
         const inDB = existingTransactions.some(t => {
             const tDate = parseLocalDate(t.date);
             return t.description === desc && 
                    Math.abs(parseFloat(t.amount) - parseFloat(amount)) < 0.01 &&
                    tDate.getFullYear() === targetDate.getFullYear() &&
                    tDate.getMonth() === targetDate.getMonth() &&
                    tDate.getDate() === targetDate.getDate();
         });
         const inQueue = newDBTransactions.some(t => {
             const tDate = parseLocalDate(t.date);
             return t.description === desc && 
                    Math.abs(parseFloat(t.amount) - parseFloat(amount)) < 0.01 &&
                    tDate.getFullYear() === targetDate.getFullYear() &&
                    tDate.getMonth() === targetDate.getMonth() &&
                    tDate.getDate() === targetDate.getDate();
         });
         return inDB || inQueue;
     };

     (scheduled || []).forEach(s => {
         if (s.status === 'pending' && isDatePastOrToday(s.date)) {
             if (!isDuplicate(s.description, s.amount, s.date)) {
                 const baseId = Date.now() + Math.floor(Math.random() * 1000000);
                 const accId = validAccounts.find(a => a.id === s.account_id) ? s.account_id : s.account_id;
                 const common = { id: baseId, user_id: userId, amount: s.amount, date: s.date, archived: false, type: s.type, description: s.description, account_id: accId };
                 if (s.type === 'transfer' && s.target_account_id) {
                     const targetAccId = s.target_account_id;
                     const sourceName = validAccounts.find(a => a.id === accId)?.name || 'Source';
                     const targetName = validAccounts.find(a => a.id === targetAccId)?.name || 'Cible';
                     newDBTransactions.push({ ...common, type: 'expense', description: `Virement vers ${targetName} : ${s.description}`, account_id: accId });
                     newDBTransactions.push({ ...common, id: baseId + 1, type: 'income', description: `Virement reçu de ${sourceName} : ${s.description}`, account_id: targetAccId });
                 } else { newDBTransactions.push(common); }
             }
             updatedDBScheduled.push({ ...s, status: 'executed' });
         }
     });

     (recurring || []).forEach(r => {
         let hasChanged = false;
         let tempR = { ...r };
         if (!tempR.next_due_date) {
             const d = new Date(); 
             const currentMonthMaxDays = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
             const safeDay = Math.min(tempR.day_of_month, currentMonthMaxDays);
             d.setDate(safeDay);
             if (d < new Date()) {
                 d.setMonth(d.getMonth() + 1);
                 const nextMonthMaxDays = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
                 const safeNextDay = Math.min(tempR.day_of_month, nextMonthMaxDays);
                 d.setDate(safeNextDay);
             }
             tempR.next_due_date = d.toISOString();
             hasChanged = true;
         }
         let loopSafety = 0;
         while (isDatePastOrToday(tempR.next_due_date) && loopSafety < 12) {
             const nextDueObj = parseLocalDate(tempR.next_due_date);
             if (!isDuplicate(tempR.description, tempR.amount, tempR.next_due_date)) {
                 const baseId = Date.now() + Math.floor(Math.random() * 1000000) + loopSafety * 10;
                 const accId = validAccounts.find(a => a.id === tempR.account_id) ? tempR.account_id : (tempR.account_id || defaultAccountId);
                 const common = { id: baseId, user_id: userId, amount: tempR.amount, date: tempR.next_due_date, archived: false, type: tempR.type, description: tempR.description, account_id: accId };
                 if (tempR.type === 'transfer' && tempR.target_account_id) {
                     newDBTransactions.push({ ...common, type: 'expense', description: `Virement (Rec.) : ${tempR.description}`, account_id: accId });
                     newDBTransactions.push({ ...common, id: baseId + 1, type: 'income', description: `Virement reçu (Rec.) : ${tempR.description}`, account_id: tempR.target_account_id });
                 } else { newDBTransactions.push(common); }
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

     if (newDBTransactions.length > 0 || updatedDBScheduled.length > 0 || updatedDBRecurring.length > 0) {
         const syncAsync = async () => {
             try {
                 if (newDBTransactions.length > 0) await upsertInBatches('transactions', newDBTransactions, 50, t => t);
                 if (updatedDBScheduled.length > 0) await supabase.from('scheduled').upsert(updatedDBScheduled);
                 if (updatedDBRecurring.length > 0) await supabase.from('recurring').upsert(updatedDBRecurring);
             } catch (err) { console.error("Erreur Sync Rattrapage:", err); setUnsavedChanges(true); }
         };
         syncAsync();
     }

     const mappedTransactions = (transactions || []).map(t => ({ ...t, accountId: t.account_id }));
     const mappedRecurring = (recurring || []).map(r => ({ ...r, accountId: r.account_id, targetAccountId: r.target_account_id, nextDueDate: r.next_due_date, dayOfMonth: r.day_of_month, endDate: r.end_date }));
     const mappedScheduled = (scheduled || []).map(s => ({ ...s, accountId: s.account_id, targetAccountId: s.target_account_id }));
     const mappedPlannerItems = (plannerItems || []).map(i => ({ ...i, targetAccountId: i.target_account_id }));
     const plannerBases = {}; (safetyBases || []).forEach(b => plannerBases[b.account_id] = b.amount);
     const mappedProjects = (projects || []).map(p => ({ ...p, linkedAccountId: p.linked_account_id }));
     const mappedNotes = (notes || []).map(n => ({ ...n, linkedProjectId: n.linked_project_id, isPinned: n.is_pinned }));
     
     const loadedTheme = localStorage.getItem('freelanceCockpitTheme') || profile?.settings?.theme || 'light';
     
     const newData = {
       todos: todos || [], 
       todoLists: todo_lists || [], 
       notes: mappedNotes, projects: mappedProjects, events: events || [],
       goals: goals || [], goal_milestones: goal_milestones || [], 
       journal_folders: journal_folders || [], journal_pages: journal_pages || [],
       calendar_events: (calendar_events || []).map(ev => {
          const parts = (all_participants || []).filter(p => String(p.event_id) === String(ev.id));
          const myPart = parts.find(p => p.user_email.toLowerCase() === userEmail.toLowerCase());
          return { ...ev, participants: parts, my_status: myPart ? myPart.status : (ev.user_id === userId ? 'accepted' : 'pending') };
       }).filter(ev => {
          const isOwner = ev.user_id === userId;
          // Sécurité de visibilité initiale
          return isOwner || ev.my_status !== 'declined';
       }), 
       budget: {
         accounts: validAccounts, 
         transactions: mappedTransactions.sort((a,b) => new Date(b.date) - new Date(a.date)),
         recurring: mappedRecurring, scheduled: mappedScheduled,
         planner: { base: 0, items: mappedPlannerItems, safetyBases: plannerBases }
       },
       clients: clients || [], quotes: quotes || [], invoices: invoices || [], catalog: catalog || [],
       ventures: ventures || [], 
       profile: { ...(profile || {}), email: userEmail }, 
       settings: { ...(profile?.settings || {}), theme: loadedTheme },
       customLabels: profile?.custom_labels || {}, mainNote: ""
     };

     setData(newData);
     loadSuccess.current = true; 
     if (newData.settings?.pin) setIsLocked(true);

   } catch (error) { console.error("Erreur chargement:", error); } finally { setLoading(false); }
 };

 const updateData = async (newData, dbRequest = null) => {
   setData(newData);
   setUnsavedChanges(true); 

   if (dbRequest) {
     const { table, id, data: payload, action, filter } = dbRequest; 
     try {
       if (action === 'insert' && table && payload) {
           const { data: { session } } = await supabase.auth.getSession();
           await supabase.from(table).insert({ ...payload, user_id: session?.user?.id });
       } 
       else if (action === 'update' && table && id && payload) {
           await supabase.from(table).update(payload).eq('id', id);
       }
       else if ((action === 'delete' || (!action && table && id)) || (filter)) {
           if (filter && filter.column && filter.value) {
               await supabase.from(table).delete().eq(filter.column, filter.value);
           } else if (table && id) {
               await supabase.from(table).delete().eq('id', id);
           }
       }
     } catch (e) { console.error("Erreur action DB immédiate", e); }
   }
 };

 useEffect(() => {
   if (!unsavedChanges) return;
   const timer = setTimeout(() => { saveDataToSupabase(); }, 3000);
   return () => clearTimeout(timer);
 }, [data, unsavedChanges]);

 // --- SAUVEGARDE INTÉGRALE DES 20+ TABLES (AUCUNE LIGNE EN MOINS) ---
 const saveDataToSupabase = async () => {
   if (!session || !loadSuccess.current) return; 
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
     await upsertInBatches('todos', data.todos, 50, t => ({ id: t.id, user_id: user.id, text: t.text, completed: t.completed, status: t.status, priority: t.priority, deadline: t.deadline, scheduled_date: t.scheduled_date, duration_minutes: t.duration_minutes, list_id: t.list_id || t.listId }));
     await upsertInBatches('todo_lists', data.todoLists, 50, l => ({ id: l.id, user_id: user.id, name: l.name, color: l.color })); 
     await upsertInBatches('notes', data.notes, 50, n => ({ id: n.id, user_id: user.id, title: n.title, content: n.content, color: n.color, is_pinned: n.isPinned, linked_project_id: n.linkedProjectId, created_at: n.created_at || new Date().toISOString() }));
     await upsertInBatches('projects', data.projects, 50, p => ({ id: p.id, user_id: user.id, title: p.title, description: p.description, status: p.status, priority: p.priority, deadline: p.deadline, progress: p.progress, cost: p.cost, linked_account_id: p.linkedAccountId, objectives: p.objectives, internal_notes: p.notes }));
     await upsertInBatches('recurring', data.budget.recurring, 50, r => ({ id: r.id, user_id: user.id, amount: r.amount, type: r.type, description: r.description, day_of_month: r.dayOfMonth, end_date: r.endDate, next_due_date: r.nextDueDate, account_id: r.accountId, target_account_id: r.targetAccountId }));
     await upsertInBatches('scheduled', data.budget.scheduled, 50, s => ({ id: s.id, user_id: user.id, amount: s.amount, type: s.type, description: s.description, date: s.date, status: s.status, account_id: s.accountId, target_account_id: s.target_account_id }));
     await upsertInBatches('planner_items', data.budget.planner.items, 50, i => ({ id: i.id, user_id: user.id, name: i.name, cost: i.cost, target_account_id: i.targetAccountId }));
     await upsertInBatches('goals', data.goals, 50, g => ({ id: g.id, user_id: user.id, title: g.title, deadline: g.deadline, status: g.status, is_favorite: g.is_favorite, category: g.category, priority: g.priority, motivation: g.motivation })); 
     await upsertInBatches('goal_milestones', data.goal_milestones, 50, m => ({ id: m.id, user_id: user.id, goal_id: m.goal_id, title: m.title, is_completed: m.is_completed }));
     await upsertInBatches('journal_folders', data.journal_folders, 50, f => ({ id: f.id, user_id: user.id, name: f.name, parent_id: f.parent_id }));
     await upsertInBatches('journal_pages', data.journal_pages, 50, p => ({ id: p.id, user_id: user.id, folder_id: p.folder_id, title: p.title, content: p.content, updated_at: p.updated_at }));
     await upsertInBatches('ventures', data.ventures, 50, v => ({ id: v.id, user_id: user.id, name: v.name, status: v.status, created_at: v.created_at || new Date().toISOString() }));
     await upsertInBatches('calendar_events', data.calendar_events, 50, e => ({ 
         id: e.id, user_id: e.user_id || user.id, title: e.title, start_time: e.start_time, 
         end_time: e.end_time, color: e.color, recurrence_type: e.recurrence_type,
         recurrence_group_id: e.recurrence_group_id, is_all_day: e.is_all_day,
         invited_email: e.invited_email, status: e.status, organizer_email: e.organizer_email || user.email 
     }));

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

 // --- RENDU CONTENT : TOUTES LES VUES RÉTABLIES (AUCUNE LIGNE EN MOINS) ---
 const renderContent = () => {
   switch(currentView) {
     case 'dashboard': return <Dashboard data={data} updateData={updateData} setView={setView} />;
     case 'calendar': return <CalendarView data={data} updateData={updateData} />;
     case 'projects': return <ProjectsManager data={data} updateData={updateData} />;
     case 'budget': return <BudgetManager data={data} updateData={updateData} />;
     case 'notes': return <NotesManager data={data} updateData={updateData} />;
     case 'todo': return <TodoList data={data} updateData={updateData} />;
     case 'goals': return <GoalsManager data={data} updateData={updateData} />;
     case 'journal': return <JournalManager data={data} updateData={updateData} />;
     case 'habits': return <HabitTracker data={data} updateData={updateData} />;
     case 'chat': return <ChatManager user={session.user} />; 
     case 'clients': return <ClientHub data={data} updateData={updateData} />;
     case 'workspace': return <Workspace data={data} updateData={updateData} />;
     case 'settings': return <DataSettings data={data} loadExternalData={updateData} darkMode={data.settings?.theme === 'dark'} toggleTheme={toggleTheme} />;
     case 'planning': return <PlanningManager data={data} updateData={updateData} />;
     default: return <Dashboard data={data} updateData={updateData} setView={setView} />;
   }
 };

 const isWorkspace = currentView === 'workspace' || currentView === 'planning' || currentView === 'journal' || currentView === 'habits' || currentView === 'chat'; 

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
     
     <Sidebar 
       currentView={currentView} 
       setView={setView} 
       isMobileOpen={isMobileMenuOpen} 
       toggleMobile={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
       labels={data.customLabels} 
       darkMode={data.settings?.theme === 'dark'} 
       toggleTheme={toggleTheme} 
       unreadCount={unreadCount} 
     />
     
     <div className="flex-1 flex flex-col h-full w-full overflow-hidden relative">
       <header className="md:hidden bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 p-4 flex justify-between items-center z-20">
         <h1 className="font-bold text-lg text-gray-800 dark:text-white">{data.customLabels?.appName || 'Freelance Cockpit'}</h1>
         <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 rounded-lg">Menu</button>
       </header>
       
       <main className={`flex-1 overflow-y-auto custom-scrollbar ${isWorkspace ? 'p-0 overflow-hidden' : ''}`}>
         <div className={`w-full ${isWorkspace ? 'h-full' : 'px-6'}`}> 
           {renderContent()} 
         </div>
       </main>
     </div>
   </div>
 );
}