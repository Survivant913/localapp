import { useState, useEffect, useRef } from 'react';
import { 
  Book, Folder, FileText, ChevronRight, ChevronDown, Plus, 
  Search, Trash2, Edit2, Bold, Italic, List, CheckSquare, 
  Heading, Type, Underline, Strikethrough,
  ArrowLeft, Star, Loader2, Calendar, Printer, FolderPlus, AlignLeft, AlignCenter,
  PanelLeft, Highlighter, Quote, AlignRight, AlignJustify, X, Home, Pilcrow, Clock, Pencil, Broom
} from 'lucide-react';
import { supabase } from './supabaseClient';
import { format, parseISO, startOfWeek, addDays, startOfDay, addMinutes, isSameDay, getHours, getMinutes, setHours, setMinutes, addWeeks } from 'date-fns';
import { fr } from 'date-fns/locale';

// --- COMPOSANT INTERNE : GESTIONNAIRE DE PLANNING ---
export default function PlanningManager({ data, updateData }) {
    // --- ÉTATS ---
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState([]);
    const [draggedItem, setDraggedItem] = useState(null);
    const [isCreating, setIsCreating] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [confirmMode, setConfirmMode] = useState(null); // 'ask_delete' | 'ask_update'
    const [pendingUpdate, setPendingUpdate] = useState(null);
    const [viewMode, setViewMode] = useState('week'); // 'week' only for now

    // Formulaire Création / Edition
    const [eventForm, setEventForm] = useState({ 
        id: null, title: '', start: '', end: '', 
        color: 'blue', isAllDay: false, 
        recurrence: false, recurrenceWeeks: 1, recurrenceGroupId: null 
    });

    const containerRef = useRef(null);
    const resizeRef = useRef(null);

    // --- CHARGEMENT ---
    useEffect(() => {
        // On charge les événements depuis les props (data) ou on initialise
        if (data && data.calendar_events) {
            setEvents(data.calendar_events);
        }
    }, [data]);

    // --- SAUVEGARDE GLOBALE ---
    const saveEvents = (updatedEvents) => {
        setEvents(updatedEvents);
        // Sauvegarde dans le JSON global (App.jsx)
        updateData({ ...data, calendar_events: updatedEvents });
        
        // Sauvegarde Robuste en Base de Données (Optionnel si updateData le fait déjà, mais sécurité double)
        // Ici on part du principe que updateData gère la persistance principale.
    };

    // --- NAVIGATION ---
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));

    const nextWeek = () => setCurrentDate(addDays(currentDate, 7));
    const prevWeek = () => setCurrentDate(addDays(currentDate, -7));
    const goToToday = () => setCurrentDate(new Date());

    // --- NETTOYAGE INTELLIGENT (NOUVEAU) ---
    const cleanPastEvents = async () => {
        const now = new Date();
        // On filtre : on garde ceux qui finissent APRES maintenant
        // (Donc on supprime ceux qui ont fini AVANT maintenant)
        const activeEvents = events.filter(ev => {
            const endDate = parseISO(ev.end_time);
            return endDate > now; 
        });

        const deletedCount = events.length - activeEvents.length;

        if (deletedCount === 0) {
            alert("Votre agenda est déjà propre ! Aucun événement passé à supprimer.");
            return;
        }

        if (window.confirm(`Voulez-vous supprimer ${deletedCount} événement(s) passé(s) ?\n\nCela n'affectera PAS les événements futurs (même récurrents).\nCette action est irréversible.`)) {
            // Mise à jour locale
            saveEvents(activeEvents);
            
            // Mise à jour DB (Suppression des vieux IDs)
            // Note: On envoie la nouvelle liste "propre" via updateData, 
            // ce qui devrait suffire si la logique parente remplace tout.
            // Sinon, pour être chirurgical avec Supabase :
            const pastEventsIds = events
                .filter(ev => parseISO(ev.end_time) <= now)
                .map(ev => ev.id);
            
            if (pastEventsIds.length > 0) {
                try {
                    await supabase.from('calendar_events').delete().in('id', pastEventsIds);
                } catch (err) {
                    console.error("Erreur nettoyage DB:", err);
                }
            }
        }
    };

    // --- GESTION ÉVÉNEMENTS ---
    const handleSlotClick = (day, hour) => {
        const start = setMinutes(setHours(day, hour), 0);
        const end = addMinutes(start, 60);
        setEventForm({ 
            id: null, title: '', start: format(start, "yyyy-MM-dd'T'HH:mm"), end: format(end, "yyyy-MM-dd'T'HH:mm"), 
            color: 'blue', isAllDay: false, recurrence: false, recurrenceWeeks: 1, recurrenceGroupId: null 
        });
        setIsCreating(true);
        setSelectedEvent(null);
    };

    const openEditModal = (evt) => {
        setEventForm({
            id: evt.id,
            title: evt.title,
            start: evt.start_time.substring(0, 16),
            end: evt.end_time.substring(0, 16),
            color: evt.color || 'blue',
            isAllDay: evt.is_all_day || false,
            recurrence: false, // On n'édite pas la récurrence par défaut, on gère ça au save
            recurrenceWeeks: 1,
            recurrenceGroupId: evt.recurrence_group_id
        });
        setIsCreating(true);
    };

    const handleSave = async () => {
        if (!eventForm.title) return alert("Le titre est obligatoire");

        // Récupération User
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return alert("Erreur: Non connecté");

        const newStart = parseISO(eventForm.start);
        const newEnd = parseISO(eventForm.end);
        
        // Logique Création vs Modification
        if (!eventForm.id) {
            // --- CRÉATION ---
            const groupId = eventForm.recurrence ? Date.now().toString() : null;
            let newEvents = [];
            
            // Base de l'objet événement
            const createEventObj = (start, end, idOffset = 0) => ({
                id: Date.now() + idOffset, // ID Unique forcé
                user_id: user.id,
                title: eventForm.title,
                start_time: start.toISOString(),
                end_time: end.toISOString(),
                color: eventForm.color,
                is_all_day: eventForm.isAllDay,
                recurrence_group_id: groupId,
                recurrence_type: eventForm.recurrence ? 'weekly' : null
            });

            if (eventForm.recurrence) {
                const weeks = parseInt(eventForm.recurrenceWeeks) || 1;
                for (let i = 0; i < weeks; i++) {
                    const s = addWeeks(newStart, i);
                    const e = addWeeks(newEnd, i);
                    newEvents.push(createEventObj(s, e, i));
                }
            } else {
                newEvents.push(createEventObj(newStart, newEnd));
            }

            // Sauvegarde DB
            const { error } = await supabase.from('calendar_events').insert(newEvents);
            if (error) { alert("Erreur sauvegarde: " + error.message); return; }

            // Mise à jour UI
            saveEvents([...events, ...newEvents]);
            setIsCreating(false);

        } else {
            // --- MODIFICATION ---
            if (eventForm.recurrenceGroupId) {
                // Demander si on modifie juste celui-là ou la série
                setPendingUpdate({ newStart, newEnd, ...eventForm });
                setConfirmMode('ask_update');
                // La modal reste ouverte, on attend la réponse dans l'interface Confirm
            } else {
                // Modif simple
                await applyUpdate(eventForm.id, newStart, newEnd, eventForm, 'single');
            }
        }
    };

    const applyUpdate = async (targetId, startObj, endObj, formData, mode) => {
        let eventsToUpdate = [];
        let updatedLocalEvents = [...events];

        if (mode === 'series' && formData.recurrenceGroupId) {
            // Calcul du delta pour appliquer aux autres
            const targetDay = startObj.getDay();
            const targetH = getHours(startObj);
            const targetM = getMinutes(startObj);
            const duration = (endObj - startObj);

            // On identifie les événements à modifier
            updatedLocalEvents = updatedLocalEvents.map(ev => {
                if (ev.recurrence_group_id === formData.recurrenceGroupId) {
                    // Logique complexe de décalage pour garder la cohérence des dates
                    let evStart = parseISO(ev.start_time);
                    // On garde le jour de la semaine original de l'occurrence, ou on force le nouveau ?
                    // Pour simplifier : on recalcule l'heure sur la date existante
                    let newS = setMinutes(setHours(evStart, targetH), targetM);
                    
                    // Si on a changé de jour de semaine (ex: Lundi -> Mardi), c'est plus complexe.
                    // Ici on suppose un décalage horaire simple ou rename.
                    
                    let newE = new Date(newS.getTime() + duration);
                    
                    const updated = { 
                        ...ev, 
                        title: formData.title, 
                        color: formData.color,
                        start_time: newS.toISOString(),
                        end_time: newE.toISOString(),
                        is_all_day: formData.isAllDay
                    };
                    eventsToUpdate.push(updated);
                    return updated;
                }
                return ev;
            });
        } else {
            // Single
            const updated = {
                ...events.find(e => e.id === targetId),
                title: formData.title,
                color: formData.color,
                start_time: startObj.toISOString(),
                end_time: endObj.toISOString(),
                is_all_day: formData.isAllDay,
                recurrence_group_id: null // Détachement de la série
            };
            eventsToUpdate.push(updated);
            updatedLocalEvents = updatedLocalEvents.map(e => e.id === targetId ? updated : e);
        }

        // Sauvegarde DB
        for (const ev of eventsToUpdate) {
            await supabase.from('calendar_events').update({
                title: ev.title,
                start_time: ev.start_time,
                end_time: ev.end_time,
                color: ev.color,
                is_all_day: ev.is_all_day,
                recurrence_group_id: ev.recurrence_group_id
            }).eq('id', ev.id);
        }

        saveEvents(updatedLocalEvents);
        setConfirmMode(null);
        setPendingUpdate(null);
        setIsCreating(false);
    };

    const handleDelete = async (evt, mode = 'single') => {
        let newEventsList = [...events];
        
        if (mode === 'series' && evt.recurrence_group_id) {
            const idsToDelete = events.filter(e => e.recurrence_group_id === evt.recurrence_group_id).map(e => e.id);
            newEventsList = newEventsList.filter(e => e.recurrence_group_id !== evt.recurrence_group_id);
            await supabase.from('calendar_events').delete().in('id', idsToDelete);
        } else {
            newEventsList = newEventsList.filter(e => e.id !== evt.id);
            await supabase.from('calendar_events').delete().eq('id', evt.id);
        }

        saveEvents(newEventsList);
        setSelectedEvent(null);
        setConfirmMode(null);
    };


    // --- RENDU ---
    return (
        <div className="h-full flex flex-col bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-6 overflow-hidden">
            
            {/* Header */}
            <div className="flex justify-between items-center mb-6 shrink-0">
                <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-bold capitalize flex items-center gap-2">
                        <Calendar className="text-indigo-600"/>
                        {format(currentDate, 'MMMM yyyy', { locale: fr })}
                    </h2>
                    <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                        <button onClick={prevWeek} className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded shadow-sm transition-all"><ChevronRight className="rotate-180" size={20}/></button>
                        <button onClick={goToToday} className="px-3 text-xs font-bold uppercase hover:bg-white dark:hover:bg-slate-700 rounded shadow-sm transition-all">Auj.</button>
                        <button onClick={nextWeek} className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded shadow-sm transition-all"><ChevronRight size={20}/></button>
                    </div>
                </div>
                
                <div className="flex gap-2">
                    {/* BOUTON NETTOYAGE */}
                    <button 
                        onClick={cleanPastEvents}
                        className="flex items-center gap-2 px-3 py-2 text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-sm font-medium"
                        title="Supprimer les événements passés"
                    >
                        <Broom size={18}/> Nettoyer l'historique
                    </button>

                    <button 
                        onClick={() => { setEventForm({ ...eventForm, id: null, title: '', start: format(new Date(), "yyyy-MM-dd'T'09:00"), end: format(new Date(), "yyyy-MM-dd'T'10:00") }); setIsCreating(true); }}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md shadow-indigo-200 dark:shadow-none transition-all"
                    >
                        <Plus size={20}/> Nouvel Événement
                    </button>
                </div>
            </div>

            {/* Grille Semaine */}
            <div className="flex-1 flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50 dark:bg-slate-900/50">
                
                {/* En-têtes Jours */}
                <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pr-[17px]"> {/* pr pour scrollbar */}
                    <div className="w-16 shrink-0 border-r border-slate-200 dark:border-slate-800"></div>
                    {weekDays.map((day, i) => (
                        <div key={i} className={`flex-1 py-3 text-center border-r border-slate-200 dark:border-slate-800 last:border-0 ${isSameDay(day, new Date()) ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}`}>
                            <div className={`text-xs uppercase font-bold mb-1 ${isSameDay(day, new Date()) ? 'text-indigo-600' : 'text-slate-400'}`}>{format(day, 'EEE', { locale: fr })}</div>
                            <div className={`text-xl font-black ${isSameDay(day, new Date()) ? 'text-indigo-600' : 'text-slate-700 dark:text-slate-200'}`}>{format(day, 'd')}</div>
                        </div>
                    ))}
                </div>

                {/* Corps Grille (Scrollable) */}
                <div ref={containerRef} className="flex-1 overflow-y-auto relative bg-white dark:bg-slate-900">
                    <div className="flex min-h-[1440px]"> {/* 24h * 60px */}
                        
                        {/* Colonne Heures */}
                        <div className="w-16 shrink-0 flex flex-col border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 z-10 sticky left-0">
                            {Array.from({ length: 24 }).map((_, i) => (
                                <div key={i} className="h-[60px] text-xs text-slate-400 text-right pr-2 pt-1 -mt-2.5 relative">
                                    {i}:00
                                </div>
                            ))}
                        </div>

                        {/* Colonnes Jours */}
                        {weekDays.map((day, dIndex) => (
                            <div key={dIndex} className="flex-1 relative border-r border-slate-200 dark:border-slate-800 last:border-0">
                                {/* Lignes Horaires (Background) */}
                                {Array.from({ length: 24 }).map((_, h) => (
                                    <div 
                                        key={h} 
                                        className="h-[60px] border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                                        onClick={() => handleSlotClick(day, h)}
                                    ></div>
                                ))}

                                {/* Événements */}
                                {events
                                    .filter(ev => isSameDay(parseISO(ev.start_time), day) && !ev.is_all_day)
                                    .map(ev => {
                                        const start = parseISO(ev.start_time);
                                        const end = parseISO(ev.end_time);
                                        const top = (getHours(start) * 60) + getMinutes(start);
                                        const height = Math.max(30, (end - start) / (1000 * 60)); // Min 30min height
                                        
                                        const colorClasses = {
                                            blue: 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200',
                                            green: 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200',
                                            red: 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200',
                                            purple: 'bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200',
                                            orange: 'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200',
                                        }[ev.color || 'blue'];

                                        return (
                                            <div
                                                key={ev.id}
                                                onClick={(e) => { e.stopPropagation(); setSelectedEvent(ev); }}
                                                className={`absolute left-1 right-1 rounded-md border p-1 text-xs cursor-pointer shadow-sm transition-all overflow-hidden ${colorClasses}`}
                                                style={{ top: `${top}px`, height: `${height}px` }}
                                            >
                                                <div className="font-bold truncate">{ev.title}</div>
                                                <div className="opacity-75 text-[10px]">{format(start, 'HH:mm')} - {format(end, 'HH:mm')}</div>
                                                {ev.recurrence_group_id && <div className="absolute top-1 right-1 opacity-50"><Clock size={10}/></div>}
                                            </div>
                                        );
                                    })}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* MODAL CRÉATION / MODIFICATION */}
            {isCreating && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
                        
                        {confirmMode === 'ask_update' ? (
                            <div className="p-6 text-center">
                                <h3 className="text-xl font-bold mb-4">Modifier l'événement récurrent</h3>
                                <p className="text-slate-500 mb-6">Cet événement fait partie d'une série. Que voulez-vous modifier ?</p>
                                <div className="flex flex-col gap-3">
                                    <button onClick={() => applyUpdate(eventForm.id, pendingUpdate.newStart, pendingUpdate.newEnd, pendingUpdate, 'single')} className="p-3 bg-white border border-slate-200 rounded-xl font-bold hover:bg-slate-50 text-slate-700">Juste cet événement</button>
                                    <button onClick={() => applyUpdate(eventForm.id, pendingUpdate.newStart, pendingUpdate.newEnd, pendingUpdate, 'series')} className="p-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700">Toute la série (et futurs)</button>
                                    <button onClick={() => { setConfirmMode(null); setIsCreating(false); }} className="mt-2 text-slate-400 text-sm hover:underline">Annuler</button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                                    <h3 className="font-bold text-lg">{eventForm.id ? 'Modifier' : 'Nouvel événement'}</h3>
                                    <button onClick={() => setIsCreating(false)}><X size={20} className="text-slate-400 hover:text-slate-600"/></button>
                                </div>
                                
                                <div className="p-6 space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Titre</label>
                                        <input 
                                            autoFocus
                                            type="text" 
                                            value={eventForm.title} 
                                            onChange={e => setEventForm({...eventForm, title: e.target.value})}
                                            className="w-full text-lg font-bold border-b-2 border-slate-200 dark:border-slate-700 bg-transparent outline-none focus:border-indigo-500 py-1"
                                            placeholder="Ex: Réunion Client"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Début</label>
                                            <input type="datetime-local" value={eventForm.start} onChange={e => setEventForm({...eventForm, start: e.target.value})} className="w-full bg-slate-100 dark:bg-slate-800 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"/>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Fin</label>
                                            <input type="datetime-local" value={eventForm.end} onChange={e => setEventForm({...eventForm, end: e.target.value})} className="w-full bg-slate-100 dark:bg-slate-800 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"/>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 py-2">
                                        <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                                            <input type="checkbox" checked={eventForm.isAllDay} onChange={e => setEventForm({...eventForm, isAllDay: e.target.checked})} className="rounded text-indigo-600 focus:ring-indigo-500"/>
                                            Toute la journée
                                        </label>
                                        
                                        {!eventForm.id && ( // On ne change pas la récurrence d'un existant pour simplifier
                                            <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                                                <input type="checkbox" checked={eventForm.recurrence} onChange={e => setEventForm({...eventForm, recurrence: e.target.checked})} className="rounded text-indigo-600 focus:ring-indigo-500"/>
                                                Répéter (Hebdo)
                                            </label>
                                        )}
                                    </div>

                                    {eventForm.recurrence && !eventForm.id && (
                                        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-lg flex items-center gap-3">
                                            <span className="text-sm font-medium">Pendant</span>
                                            <input type="number" min="1" max="52" value={eventForm.recurrenceWeeks} onChange={e => setEventForm({...eventForm, recurrenceWeeks: e.target.value})} className="w-16 p-1 text-center rounded border border-indigo-200 font-bold"/>
                                            <span className="text-sm font-medium">semaines</span>
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Couleur</label>
                                        <div className="flex gap-2">
                                            {['blue', 'green', 'red', 'purple', 'orange'].map(c => (
                                                <button 
                                                    key={c}
                                                    onClick={() => setEventForm({...eventForm, color: c})}
                                                    className={`w-8 h-8 rounded-full border-2 ${eventForm.color === c ? 'border-slate-600 scale-110' : 'border-transparent'} transition-all`}
                                                    style={{ backgroundColor: `var(--color-${c}-400)` }} // Utilise classes Tailwind via style simulé ou classe directe
                                                >
                                                    <div className={`w-full h-full rounded-full ${c === 'blue' ? 'bg-blue-400' : c === 'green' ? 'bg-green-400' : c === 'red' ? 'bg-red-400' : c === 'purple' ? 'bg-purple-400' : 'bg-orange-400'}`}></div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <button onClick={handleSave} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 dark:shadow-none mt-4">
                                        {eventForm.id ? 'Enregistrer les modifications' : 'Créer l\'événement'}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* MODAL DETAIL / SUPPRESSION */}
            {selectedEvent && !isCreating && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl shadow-2xl p-6 animate-in zoom-in-95">
                        <div className="flex justify-between items-start mb-6">
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white leading-tight pr-4">{selectedEvent.title}</h3>
                            <button onClick={() => setSelectedEvent(null)} className="p-1 hover:bg-slate-100 rounded-full"><X size={20} className="text-slate-400"/></button>
                        </div>
                        
                        <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 flex gap-4 items-center">
                            <div className="p-3 bg-white dark:bg-slate-800 rounded-lg shadow-sm text-blue-600"><Clock size={24}/></div>
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Horaire</p>
                                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                    {selectedEvent.is_all_day ? "Toute la journée" : format(parseISO(selectedEvent.start_time), 'EEEE d MMMM HH:mm', { locale: fr })}
                                </p>
                            </div>
                        </div>

                        {selectedEvent.recurrence_group_id ? (
                            <div className="space-y-3">
                                <p className="text-xs font-bold text-slate-400 text-center mb-2">Élément d'une série</p>
                                <div className="flex gap-2">
                                    <button onClick={() => openEditModal(selectedEvent)} className="flex-1 py-2 border border-slate-200 rounded-lg text-sm font-bold hover:bg-slate-50">Modifier</button>
                                    <button onClick={() => handleDelete(selectedEvent, 'single')} className="flex-1 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-bold hover:bg-red-100">Supprimer (Juste lui)</button>
                                </div>
                                <button onClick={() => handleDelete(selectedEvent, 'series')} className="w-full py-2 text-red-600 border border-red-100 rounded-lg text-sm font-bold hover:bg-red-50">Supprimer toute la série</button>
                            </div>
                        ) : (
                            <div className="flex gap-3">
                                <button onClick={() => openEditModal(selectedEvent)} className="flex-1 py-3 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center gap-2"><Pencil size={16}/> Modifier</button>
                                <button onClick={() => handleDelete(selectedEvent)} className="flex-1 py-3 bg-red-50 text-red-600 rounded-xl font-bold text-sm hover:bg-red-100 flex items-center justify-center gap-2 transition-colors"><Trash2 size={18}/> Supprimer</button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}