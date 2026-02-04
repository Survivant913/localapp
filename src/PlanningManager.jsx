import { useState, useEffect, useRef, useMemo } from 'react';
import { 
  ChevronLeft, ChevronRight, CheckCircle2, 
  Plus, Repeat, Trash2, GripVertical, 
  X, Clock, AlertTriangle, Pencil, RotateCcw, Calendar, UserPlus, Check, Ban, Bell, Users, UserMinus, UserX
} from 'lucide-react';
import { 
  format, addDays, startOfWeek, addWeeks, subWeeks, 
  isSameDay, parseISO, getHours, getMinutes, 
  setHours, setMinutes, addMinutes, differenceInMinutes, parse, isValid, startOfDay
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from './supabaseClient';

export default function PlanningManager({ data, updateData }) {
    const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [isCreating, setIsCreating] = useState(false);
    const [confirmMode, setConfirmMode] = useState(null); 
    const [pendingUpdate, setPendingUpdate] = useState(null); 
    
    // Drag & Drop
    const [draggedItem, setDraggedItem] = useState(null);
    const [previewSlot, setPreviewSlot] = useState(null);

    // Resize (RÉPARÉ : Logique de suivi en temps réel)
    const [resizingEvent, setResizingEvent] = useState(null); 
    const resizeRef = useRef(null);
    const ignoreNextClick = useRef(false);
    
    // ON NE PREND QUE LES ÉVÉNEMENTS
    const events = useMemo(() => Array.isArray(data.calendar_events) ? data.calendar_events : [], [data.calendar_events]);

    const [eventForm, setEventForm] = useState({ 
        id: null, title: '', date: format(new Date(), 'yyyy-MM-dd'),
        startHour: 9, startMin: 0, duration: 60, 
        type: 'event', recurrence: false, recurrenceWeeks: 12, recurrenceGroupId: null, color: 'blue',
        isAllDay: false, invitedEmail: '' 
    });

    const isItemAllDay = (item) => {
        if (!item || !item.data) return false;
        return item.data.is_all_day === true;
    };

    // --- LOGIQUE D'APPROBATION INSTANTANNÉE ---
    const handleInvitation = async (evt, newStatus, applyToSeries = false) => {
        const userEmail = data.profile?.email;
        if (!userEmail) return;

        let idsToUpdate = [evt.id];
        if (applyToSeries && evt.recurrence_group_id) {
            idsToUpdate = events
                .filter(ev => ev.recurrence_group_id === evt.recurrence_group_id)
                .map(ev => ev.id);
        }

        // MISE À JOUR INSTANTANNÉE DE L'UI
        const updatedEvents = events.map(ev => 
            idsToUpdate.includes(ev.id) ? { ...ev, my_status: newStatus, status: newStatus } : ev
        );
        
        updateData({ ...data, calendar_events: updatedEvents });
        
        // Enregistrement dans le registre individuel
        await supabase.from('event_participants')
            .upsert(
                idsToUpdate.map(id => ({
                    event_id: id,
                    user_email: userEmail.toLowerCase(),
                    status: newStatus
                })),
                { onConflict: 'event_id, user_email' }
            );
            
        setSelectedEvent(null);
        setConfirmMode(null);
    };

    // --- ANNULER L'INVITATION POUR UN EMAIL PRÉCIS ---
    const handleUninviteSingle = async (evt, emailToRemove) => {
        if (!window.confirm(`Retirer ${emailToRemove} de l'événement ?`)) return;
        
        const currentEmails = (evt.invited_email || "").split(',').map(s => s.trim().toLowerCase());
        const newEmails = currentEmails.filter(e => e !== emailToRemove.toLowerCase());
        const newEmailString = newEmails.join(', ');

        const updatedEvents = events.map(ev => 
            String(ev.id) === String(evt.id) ? { ...ev, invited_email: newEmailString } : ev
        );
        
        updateData({ ...data, calendar_events: updatedEvents }, { 
            table: 'calendar_events', 
            id: evt.id, 
            action: 'update', 
            data: { invited_email: newEmailString } 
        });

        await supabase.from('event_participants')
            .delete()
            .match({ event_id: evt.id, user_email: emailToRemove.toLowerCase() });

        if (selectedEvent) {
            setSelectedEvent({
                ...selectedEvent,
                data: { ...selectedEvent.data, invited_email: newEmailString }
            });
        }
    };

    const handleUninvite = async (evt) => {
        if (!window.confirm("Annuler TOUTES les invitations ?")) return;
        const updatedEvents = events.map(ev => String(ev.id) === String(evt.id) ? { ...ev, invited_email: '', status: 'accepted' } : ev);
        updateData({ ...data, calendar_events: updatedEvents }, { table: 'calendar_events', id: evt.id, action: 'update', data: { invited_email: '', status: 'accepted' } });
        await supabase.from('event_participants').delete().eq('event_id', evt.id);
        setSelectedEvent(null);
    };

    // --- NETTOYAGE INTELLIGENT ---
    const cleanPastEvents = async () => {
        const now = new Date();
        const activeEvents = events.filter(ev => {
            if (!ev.end_time) return false;
            const endDate = parseISO(ev.end_time);
            return endDate > now; 
        });
        const deletedCount = events.length - activeEvents.length;
        if (deletedCount === 0) return alert("Agenda déjà propre !");
        if (window.confirm(`⚠️ SUPPRIMER ${deletedCount} ÉVÉNEMENTS PASSÉS ?`)) {
            updateData({ ...data, calendar_events: activeEvents });
            const pastEventsIds = events.filter(ev => !ev.end_time || parseISO(ev.end_time) <= now).map(ev => ev.id);
            if (pastEventsIds.length > 0) {
                try { await supabase.from('calendar_events').delete().in('id', pastEventsIds); } catch (err) { console.error(err); }
            }
        }
    };

    // --- GESTION RESIZE ---
    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!resizeRef.current) return;
            const { startY, startDuration } = resizeRef.current;
            const deltaY = e.clientY - startY; 
            let newDuration = Math.max(15, Math.round((startDuration + deltaY) / 15) * 15);
            setResizingEvent(prev => prev ? ({ ...prev, currentDuration: newDuration }) : null);
            resizeRef.current.currentDurationTemp = newDuration;
        };
        const handleMouseUp = () => {
            if (!resizeRef.current) return;
            ignoreNextClick.current = true;
            setTimeout(() => { ignoreNextClick.current = false; }, 200);
            const finalDuration = resizeRef.current.currentDurationTemp;
            finishResize(resizeRef.current.event, finalDuration);
            setResizingEvent(null); resizeRef.current = null;
        };
        if (resizingEvent) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [resizingEvent]);

    const startResize = (e, evt) => {
        e.stopPropagation(); e.preventDefault(); 
        if (evt.is_all_day || evt.user_id !== data.profile?.id) return;
        let startTime = parseISO(evt.start_time); let endTime = parseISO(evt.end_time);
        let dur = differenceInMinutes(endTime, startTime);
        const initData = { id: evt.id, startY: e.clientY, startDuration: dur, currentDuration: dur, currentDurationTemp: dur, event: evt };
        setResizingEvent(initData); resizeRef.current = initData;
    };

    const finishResize = (evt, newDuration) => {
        const start = parseISO(evt.start_time); const newEnd = addMinutes(start, newDuration);
        if (evt.recurrence_group_id) {
            setEventForm({ ...eventForm, id: evt.id, title: evt.title, color: evt.color, recurrenceGroupId: evt.recurrence_group_id, duration: newDuration, date: format(start, 'yyyy-MM-dd'), startHour: getHours(start), startMin: getMinutes(start), recurrence: true });
            setPendingUpdate({ newStart: start, newEnd, title: evt.title, color: evt.color, recurrenceGroupId: evt.recurrence_group_id, duration: newDuration, isAllDay: false });
            setConfirmMode('ask_update'); setIsCreating(true);
        } else {
            const updated = events.map(ev => String(ev.id) === String(evt.id) ? { ...ev, end_time: newEnd.toISOString() } : ev);
            updateData({ ...data, calendar_events: updated }, { table: 'calendar_events', id: evt.id, action: 'update', data: { end_time: newEnd.toISOString() } });
        }
    };

    const handleEventClick = (e, itemData) => {
        e.stopPropagation();
        if (ignoreNextClick.current) { ignoreNextClick.current = false; return; }
        setSelectedEvent({ type: 'event', data: itemData });
    };

    const handlePreviousWeek = () => setCurrentWeekStart(subWeeks(currentWeekStart, 1));
    const handleNextWeek = () => setCurrentWeekStart(addWeeks(currentWeekStart, 1));
    const handleToday = () => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

    // --- LAYOUT ENGINE ---
    const getLayoutForDay = (dayItems) => {
        const timedItems = dayItems.filter(item => !isItemAllDay(item));
        const sorted = [...timedItems].sort((a, b) => parseISO(a.startStr) - parseISO(b.startStr));
        const columns = [];
        sorted.forEach((item) => {
            if(!item.startStr || !item.endStr) return;
            const start = parseISO(item.startStr); const end = parseISO(item.endStr);
            if (!isValid(start) || !isValid(end)) return;
            const startMin = getHours(start) * 60 + getMinutes(start);
            let duration = (resizingEvent && String(item.data.id) === String(resizingEvent.id)) ? resizingEvent.currentDuration : differenceInMinutes(end, start);
            const top = Math.max(0, startMin); let placed = false;
            for(let col of columns) {
                if (!col.some(ev => {
                    const evS = parseISO(ev.startStr); const evE = parseISO(ev.endStr);
                    let evD = (resizingEvent && String(ev.data.id) === String(resizingEvent.id)) ? resizingEvent.currentDuration : differenceInMinutes(evE, evS);
                    const otherTop = getHours(evS) * 60 + getMinutes(evS);
                    return (top < otherTop + evD && top + duration > otherTop);
                })) { col.push({ ...item, top, height: Math.max(15, duration) }); placed = true; break; }
            }
            if (!placed) columns.push([{ ...item, top, height: Math.max(15, duration) }]);
        });
        const result = [];
        columns.forEach((col, colIndex) => { col.forEach(item => { result.push({ ...item, style: { top: `${item.top}px`, height: `${item.height}px`, width: `${100 / columns.length}%`, left: `${(colIndex * 100) / columns.length}%`, position: 'absolute' } }); }); });
        return result;
    };

    // --- ACTIONS ---
    const openCreateModal = (dayOffset = 0, hour = 9, isAllDay = false, title = '') => {
        const targetDate = addDays(currentWeekStart, dayOffset);
        setEventForm({ id: null, title, date: format(targetDate, 'yyyy-MM-dd'), startHour: hour, startMin: 0, duration: 60, type: 'event', recurrence: false, recurrenceWeeks: 12, recurrenceGroupId: null, color: 'blue', isAllDay, invitedEmail: '' });
        setIsCreating(true); setSelectedEvent(null);
    };

    const openEditModal = (evt) => {
        const start = parseISO(evt.start_time); const end = parseISO(evt.end_time);
        const duration = evt.is_all_day ? 60 : differenceInMinutes(end, start);
        setEventForm({ id: evt.id, title: evt.title, date: format(start, 'yyyy-MM-dd'), startHour: getHours(start), startMin: getMinutes(start), duration, type: 'event', recurrence: !!evt.recurrence_group_id, recurrenceWeeks: 12, recurrenceGroupId: evt.recurrence_group_id, color: evt.color || 'blue', isAllDay: evt.is_all_day || false, invitedEmail: evt.invited_email || '' });
        setIsCreating(true); setSelectedEvent(null);
    };

    const handleSave = async () => {
        if (!eventForm.title) return alert("Titre requis");
        const baseDate = parse(eventForm.date, 'yyyy-MM-dd', new Date());
        let newStart, newEnd;
        if (eventForm.isAllDay) { newStart = setMinutes(setHours(baseDate, 0), 0); newEnd = setMinutes(setHours(baseDate, 23), 59); } 
        else { newStart = setMinutes(setHours(baseDate, eventForm.startHour), eventForm.startMin); newEnd = addMinutes(newStart, eventForm.duration); }
        const isRec = eventForm.recurrence || !!eventForm.recurrenceGroupId;
        const finalEmail = isRec ? '' : eventForm.invitedEmail;
        const invitedEmails = finalEmail ? finalEmail.split(',').map(e => e.trim().toLowerCase()).filter(Boolean) : [];

        if (!eventForm.id) {
            const groupId = eventForm.recurrence ? Date.now().toString() : null;
            const eventBase = { user_id: data.profile?.id, title: eventForm.title, color: eventForm.color, recurrence_group_id: groupId, recurrence_type: eventForm.recurrence ? 'weekly' : null, is_all_day: eventForm.isAllDay, invited_email: finalEmail, status: 'accepted', organizer_email: data.profile?.email };
            let newEvts = [];
            for (let i = 0; i < (eventForm.recurrence ? (parseInt(eventForm.recurrenceWeeks) || 1) : 1); i++) {
                newEvts.push({ ...eventBase, id: Date.now() + i, start_time: addWeeks(newStart, i).toISOString(), end_time: addWeeks(newEnd, i).toISOString() });
            }
            const { data: createdEvts } = await supabase.from('calendar_events').insert(newEvts).select();
            if (createdEvts && invitedEmails.length > 0) {
                const participants = [];
                createdEvts.forEach(evt => {
                    invitedEmails.forEach(email => { participants.push({ event_id: evt.id, user_email: email, status: 'pending' }); });
                });
                await supabase.from('event_participants').insert(participants);
            }
            updateData({ ...data, calendar_events: [...events, ...(createdEvts || newEvts)] });
            setIsCreating(false); return;
        }

        if (eventForm.recurrenceGroupId) {
            setPendingUpdate({ newStart, newEnd, ...eventForm, invitedEmail: finalEmail }); setConfirmMode('ask_update'); setIsCreating(true); 
        } else {
            applyUpdate(eventForm.id, newStart, newEnd, { ...eventForm, invitedEmail: finalEmail }, 'single');
        }
    };

    const applyUpdate = (targetId, startObj, endObj, formData, mode) => {
        let updated = [...events];
        const resetStat = formData.invitedEmail && (formData.invitedEmail !== events.find(e => String(e.id) === String(targetId))?.invited_email);
        if (mode === 'series' && formData.recurrenceGroupId) {
            updated = updated.map(ev => {
                if (ev.recurrence_group_id === formData.recurrenceGroupId) {
                    let s = parseISO(ev.start_time);
                    if (s.getDay() !== startObj.getDay()) { s = addDays(s, Math.round((startOfDay(startObj) - startOfDay(parseISO(events.find(e => String(e.id) === String(targetId)).start_time))) / 86400000)); }
                    let ns = formData.isAllDay ? setMinutes(setHours(s, 0), 0) : setMinutes(setHours(s, getHours(startObj)), getMinutes(startObj));
                    return { ...ev, title: formData.title, color: formData.color, start_time: ns.toISOString(), end_time: addMinutes(ns, formData.duration).toISOString(), is_all_day: formData.isAllDay, invited_email: '', status: 'accepted' };
                }
                return ev;
            });
        } else {
            updated = updated.map(ev => String(ev.id) === String(targetId) ? { ...ev, title: formData.title, color: formData.color, start_time: startObj.toISOString(), end_time: endObj.toISOString(), recurrence_group_id: null, is_all_day: formData.isAllDay, invited_email: formData.invitedEmail, status: resetStat ? 'pending' : ev.status } : ev);
        }
        updateData({ ...data, calendar_events: updated });
        const toSave = updated.filter(ev => String(ev.id) === String(targetId) || (mode === 'series' && ev.recurrence_group_id === formData.recurrenceGroupId));
        toSave.forEach(ev => supabase.from('calendar_events').update({ ...ev, organizer_email: data.profile?.email }).eq('id', ev.id).then());
        setConfirmMode(null); setIsCreating(false);
    };

    const handleDeleteRequest = (evt) => {
        const isOwner = evt.user_id === data.profile?.id;
        if (evt.recurrence_group_id) { setSelectedEvent({type: 'event', data: evt}); setConfirmMode(isOwner ? 'ask_delete' : 'ask_cancel_series'); } 
        else { if (isOwner) { if(window.confirm("Supprimer ?")) performDelete(evt, false); } else { if(window.confirm("Quitter cet événement ?")) handleInvitation(evt, 'declined', false); } }
    };

    const performDelete = (evt, series) => {
        const updated = events.filter(e => series ? e.recurrence_group_id !== evt.recurrence_group_id : String(e.id) !== String(evt.id));
        updateData({ ...data, calendar_events: updated }, series ? { table: 'calendar_events', filter: { column: 'recurrence_group_id', value: evt.recurrence_group_id } } : { table: 'calendar_events', id: evt.id });
        setSelectedEvent(null); setConfirmMode(null);
    };

    // --- DRAG HANDLERS ---
    const onDragStart = (e, item) => { 
        if (resizeRef.current || item.user_id !== data.profile?.id) return e.preventDefault(); 
        setDraggedItem({ type: 'event', data: item }); 
        e.dataTransfer.effectAllowed = "move"; 
        const img = new Image(); 
        img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'; 
        e.dataTransfer.setDragImage(img, 0, 0); 
    };
    const onDragOverGrid = (e, dayIdx) => { if (draggedItem?.data.is_all_day) return; e.preventDefault(); const rect = e.currentTarget.getBoundingClientRect(); const y = e.clientY - rect.top; let h = Math.floor(y / 60); let snap = Math.round((y % 60) / 15) * 15; if (snap === 60) { snap = 0; h++; } let dur = differenceInMinutes(parseISO(draggedItem.data.end_time), parseISO(draggedItem.data.start_time)); setPreviewSlot({ dayIndex: dayIdx, top: h * 60 + snap, height: Math.max(30, dur), timeLabel: `${h}:${snap.toString().padStart(2, '0')}` }); };
    const onDropGrid = (e, day) => { e.preventDefault(); setPreviewSlot(null); if (!draggedItem || draggedItem.data.is_all_day) return; const rect = e.currentTarget.getBoundingClientRect(); const y = e.clientY - rect.top; let h = Math.floor(y / 60); let m = Math.round((y % 60) / 15) * 15; if (m === 60) { m = 0; h++; } const start = setMinutes(setHours(day, h), m); const evt = draggedItem.data; const dur = differenceInMinutes(parseISO(evt.end_time), parseISO(evt.start_time)); const newEnd = addMinutes(start, dur);
        if (evt.recurrence_group_id) { setEventForm({ ...eventForm, id: evt.id, title: evt.title, color: evt.color, recurrenceGroupId: evt.recurrence_group_id, duration: dur, date: format(start, 'yyyy-MM-dd'), startHour: h, startMin: m, recurrence: true }); setPendingUpdate({ newStart: start, newEnd, title: evt.title, color: evt.color, recurrenceGroupId: evt.recurrence_group_id, duration: dur, isAllDay: false }); setConfirmMode('ask_update'); setIsCreating(true); } 
        else { updateData({ ...data, calendar_events: events.map(ev => String(ev.id) === String(evt.id) ? { ...ev, start_time: start.toISOString(), end_time: newEnd.toISOString() } : ev) }, { table: 'calendar_events', id: evt.id, action: 'update', data: { start_time: start.toISOString(), end_time: newEnd.toISOString(), is_all_day: false } }); } setDraggedItem(null); 
    };

    const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(currentWeekStart, i));
    const durationOptions = []; for (let m = 15; m <= 720; m += 15) { const h = Math.floor(m / 60); const min = m % 60; durationOptions.push(<option key={m} value={m}>{h > 0 ? `${h}h` : ''}{min > 0 ? ` ${min}` : h === 0 ? ' min' : ''}</option>); }

    return (
        <div className="fade-in flex flex-col h-full w-full overflow-hidden bg-slate-50/20 dark:bg-slate-950 font-sans p-6">
            <div className="flex-1 overflow-hidden flex flex-col min-w-0 transition-all duration-300">
                <div className="flex-1 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl rounded-[2.5rem] border border-white dark:border-white/5 shadow-2xl flex flex-col overflow-hidden relative">
                    
                    {/* --- HEADER MODERNISÉ & CENTRALISÉ --- */}
                    <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100 dark:border-white/5 bg-white/40 dark:bg-slate-900/40 backdrop-blur z-30 sticky top-0 group">
                        <div className="absolute -right-20 -top-20 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl group-hover:bg-blue-500/10 transition-all"></div>
                        
                        {/* GAUCHE : SELECTEUR COMPTE */}
                        <div className="flex items-center gap-4 relative z-10">
                            <select 
                                value={dashboardFilter} 
                                onChange={(e) => setDashboardFilter(e.target.value)} 
                                className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-[10px] font-black outline-none text-slate-800 dark:text-white shadow-sm ring-1 ring-white/10 uppercase tracking-widest"
                            >
                                <option value="total">GLOBAL</option>
                                {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                            </select>
                        </div>

                        {/* CENTRE : TITRE (SANS BONJOUR) */}
                        <div className="text-center relative z-10 flex-1">
                            <h2 className="text-2xl md:text-4xl font-black text-slate-800 dark:text-white tracking-tighter italic uppercase">
                                Tableau de Bord
                            </h2>
                            <div className="flex items-center justify-center gap-4 mt-2">
                                <button onClick={handlePreviousWeek} className="p-1 hover:text-blue-500 text-slate-400"><ChevronLeft size={16}/></button>
                                <span className="text-blue-600 dark:text-blue-400 text-[10px] font-bold uppercase tracking-[0.3em]">{format(currentWeekStart, 'MMMM yyyy', { locale: fr })}</span>
                                <button onClick={handleNextWeek} className="p-1 hover:text-blue-500 text-slate-400"><ChevronRight size={16}/></button>
                            </div>
                        </div>

                        {/* DROITE : ACTIONS SLIM CALÉES À DROITE */}
                        <div className="flex items-center gap-3 relative z-10">
                            <button onClick={handleToday} className="px-4 py-2 text-[10px] font-black text-slate-500 hover:text-blue-600 uppercase tracking-widest border border-slate-200 dark:border-slate-700 rounded-xl bg-white/50 dark:bg-slate-800 transition-all">Auj.</button>
                            <div className="w-[1px] h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>
                            <button onClick={cleanPastEvents} className="p-2.5 text-slate-400 hover:text-red-500 transition-all" title="Nettoyer l'historique"><Trash2 size={18}/></button>
                            <button onClick={() => openCreateModal()} className="p-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl shadow-lg hover:scale-110 active:scale-95 transition-all"><Plus size={20}/></button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto relative custom-scrollbar select-none bg-white/50 dark:bg-transparent">
                        <div className="flex w-full h-full min-h-[1440px]">
                            <div className="w-16 flex-shrink-0 border-r border-gray-100 dark:border-white/5 bg-slate-50/30 dark:bg-slate-900/30 sticky left-0 z-20">
                                <div className="h-14 border-b border-gray-100 dark:border-white/5"></div>
                                <div className="h-24 border-b-4 border-gray-100 dark:border-white/5 flex flex-col justify-center items-center p-2 text-[10px] font-black text-slate-400"><span>ALL</span><span>DAY</span></div>
                                {Array.from({length: 24}).map((_, i) => (<div key={i} className="h-[60px] relative w-full"><span className="absolute -top-2.5 right-2 text-[10px] font-bold text-slate-300 dark:text-slate-600">{i}:00</span></div>))}
                            </div>

                            <div className="flex-1 grid grid-cols-7 divide-x divide-gray-100 dark:divide-white/5">
                                {weekDays.map((day, dayIndex) => {
                                    const isToday = isSameDay(day, new Date());
                                    const rawEvents = events.filter(e => isSameDay(parseISO(e.start_time), day)).map(e => ({ data: e, startStr: e.start_time, endStr: e.end_time }));
                                    const layoutItems = getLayoutForDay(rawEvents);
                                    return (
                                        <div key={dayIndex} className="relative min-w-0">
                                            <div className={`h-14 flex flex-col items-center justify-center border-b border-gray-100 dark:border-white/5 sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur z-30 ${isToday ? 'bg-blue-50/80 dark:bg-blue-900/20' : ''}`}>
                                                <span className={`text-[9px] font-black uppercase tracking-tighter ${isToday ? 'text-blue-600' : 'text-slate-400'}`}>{format(day, 'EEEE', { locale: fr }).replace('.', '')}</span>
                                                <span className={`text-base font-black mt-0.5 ${isToday ? 'text-blue-600' : 'text-slate-800 dark:text-white'}`}>{format(day, 'd')}</span>
                                            </div>
                                            <div className={`h-24 border-b-4 border-gray-100 dark:border-white/5 bg-slate-50/30 dark:bg-slate-800/10 p-1 flex flex-col gap-1 overflow-y-auto custom-scrollbar`} onDragOver={e => { if (draggedItem && !draggedItem.data.is_all_day) return; e.preventDefault(); }} 
                                              onDrop={e => { e.preventDefault(); if (draggedItem?.data.is_all_day) { const st = setMinutes(setHours(day, 0), 0); const et = setMinutes(setHours(day, 23), 59); updateData({ ...data, calendar_events: events.map(ev => String(ev.id) === String(draggedItem.data.id) ? { ...ev, start_time: st.toISOString(), end_time: et.toISOString() } : ev) }, { table: 'calendar_events', id: draggedItem.data.id, action: 'update', data: { start_time: st.toISOString(), end_time: et.toISOString(), is_all_day: true } }); } setDraggedItem(null); }}>
                                                {rawEvents.filter(i => isItemAllDay(i)).map(item => {
                                                    const isOwner = item.data.user_id === data.profile?.id;
                                                    const colorClass = item.data.color === 'green' ? 'bg-emerald-500 text-white' : item.data.color === 'gray' ? 'bg-slate-500 text-white' : 'bg-blue-600 text-white';
                                                    const isPending = (item.data.my_status || item.data.status) === 'pending' && !isOwner;
                                                    return (<div key={item.data.id} draggable={isOwner} onDragStart={(e) => onDragStart(e, item.data)} onClick={(e) => handleEventClick(e, item.data)} className={`text-[9px] font-black px-2 py-1 rounded-lg truncate cursor-pointer hover:scale-[1.02] transition-all shadow-sm ${colorClass} ${isPending ? 'opacity-50' : ''}`}>{isPending && '🔔 '}{item.data.title}</div>);
                                                })}
                                            </div>
                                            <div className={`relative h-[1440px] transition-colors ${draggedItem ? 'hover:bg-blue-500/5' : ''}`} onDragOver={(e) => onDragOverGrid(e, dayIndex)} onDrop={(e) => onDropGrid(e, day)}>
                                                {Array.from({length: 24}).map((_, i) => <div key={i} className="absolute w-full border-t border-gray-100 dark:border-white/5 h-[60px]" style={{ top: `${i*60}px` }}></div>)}
                                                {isToday && (<div className="absolute w-full border-t-2 border-red-500 z-10 pointer-events-none flex items-center" style={{ top: `${(getHours(new Date()) * 60 + getMinutes(new Date()))}px` }}><div className="w-2 h-2 bg-red-500 rounded-full -ml-1"></div></div>)}
                                                {previewSlot && previewSlot.dayIndex === dayIndex && (<div className="absolute z-0 rounded-xl bg-blue-500/10 border-2 border-blue-500 border-dashed pointer-events-none flex items-center justify-center text-[10px] font-black text-blue-600" style={{ top: `${previewSlot.top}px`, height: `${previewSlot.height}px`, left: '4px', right: '4px' }}>{previewSlot.timeLabel}</div>)}
                                                {layoutItems.map((item) => {
                                                    const dataItem = item.data; 
                                                    const isOwner = dataItem.user_id === data.profile?.id;
                                                    const isPending = (dataItem.my_status || dataItem.status) === 'pending' && !isOwner;
                                                    const isDeclined = (dataItem.my_status || dataItem.status) === 'declined';
                                                    
                                                    {/* --- LOGIQUE COULEUR RÉPARÉE --- */}
                                                    const colorBase = dataItem.color === 'green' ? 'emerald' : dataItem.color === 'gray' ? 'slate' : 'blue';
                                                    const borderCol = dataItem.color === 'green' ? 'border-l-emerald-500' : dataItem.color === 'gray' ? 'border-l-slate-500' : 'border-l-blue-600';
                                                    
                                                    return (
                                                        <div key={item.data.id} style={{ ...item.style, opacity: (isDeclined ? 0.3 : isPending ? 0.6 : 1) }} draggable={isOwner && !resizeRef.current} onDragStart={(e) => onDragStart(e, dataItem)} onClick={(e) => handleEventClick(e, dataItem)} className={`absolute rounded-xl p-2.5 text-xs cursor-pointer hover:z-30 transition-all z-10 overflow-hidden flex flex-col group/item shadow-xl border border-white/50 dark:border-white/5 border-l-4 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm ${borderCol} ${isDeclined ? 'grayscale line-through' : ''}`}>
                                                            <span className="font-black truncate leading-tight text-[10px] text-slate-800 dark:text-white uppercase tracking-tighter flex items-center gap-1">{isPending && <Bell size={10} className="text-blue-500"/>}{dataItem.title}</span>
                                                            <div className="flex items-center gap-1 mt-auto pt-1 opacity-60 font-black text-[9px]"><span className="font-mono">{format(parseISO(item.startStr), 'HH:mm')}</span>{!!dataItem.recurrence_group_id && <Repeat size={10} />}</div>
                                                            {isOwner && !isPending && !isDeclined && (<div className="absolute bottom-0 left-0 w-full h-3 cursor-s-resize z-50 flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-opacity" onMouseDown={(e) => startResize(e, dataItem)}><div className="w-10 h-1 bg-slate-300 dark:bg-white/20 rounded-full"></div></div>)}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* MODALS - RÉPARÉES ET STYLÉES */}
            {isCreating && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-2xl w-full max-w-sm border border-white dark:border-white/5 animate-in zoom-in-95">
                        {confirmMode === 'ask_update' ? (
                            <div className="text-center space-y-6">
                                <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 text-blue-500 rounded-2xl flex items-center justify-center mx-auto"><Repeat size={32}/></div>
                                <h3 className="font-black text-xl dark:text-white uppercase tracking-tighter italic">Récurrence détectée</h3>
                                <div className="grid gap-3">
                                    <button onClick={() => applyUpdate(eventForm.id, pendingUpdate.newStart, pendingUpdate.newEnd, pendingUpdate, 'single')} className="w-full py-4 bg-slate-100 dark:bg-slate-700 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white transition-all">Juste celui-là</button>
                                    <button onClick={() => applyUpdate(eventForm.id, pendingUpdate.newStart, pendingUpdate.newEnd, pendingUpdate, 'series')} className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all">Toute la série</button>
                                    <button onClick={() => setIsCreating(false)} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:underline mt-4">Annuler</button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <h3 className="text-2xl font-black mb-8 text-slate-800 dark:text-white flex items-center gap-3 italic uppercase tracking-tighter"><Calendar className="text-blue-500"/>{eventForm.id ? 'Édition' : 'Planning'}</h3>
                                <div className="space-y-5">
                                    <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Titre</label><input autoFocus type="text" value={eventForm.title} onChange={e => setEventForm({...eventForm, title: e.target.value})} className="w-full mt-1.5 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700 outline-none focus:border-blue-500 font-bold dark:text-white" placeholder="Nom de l'événement..." /></div>
                                    {!eventForm.recurrence && !eventForm.recurrenceGroupId && (
                                        <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Inviter (Emails)</label><div className="relative"><UserPlus className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16}/><input type="text" value={eventForm.invitedEmail} onChange={e => setEventForm({...eventForm, invitedEmail: e.target.value})} className="w-full mt-1.5 pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700 outline-none focus:border-blue-500 font-bold dark:text-white text-sm" placeholder="user@mail.com" /></div></div>
                                    )}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</label><input type="date" value={eventForm.date} onChange={e => setEventForm({...eventForm, date: e.target.value})} className="w-full mt-1.5 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-700 text-sm font-bold dark:text-white outline-none"/></div>
                                        <div className="flex flex-col justify-end"><label className="flex items-center gap-3 cursor-pointer p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-700"><input type="checkbox" checked={eventForm.isAllDay} onChange={e => setEventForm({...eventForm, isAllDay: e.target.checked})} className="w-5 h-5 text-blue-600 rounded-lg"/><span className="text-xs font-black text-slate-600 uppercase tracking-tighter">Journée</span></label></div>
                                    </div>
                                    {!eventForm.isAllDay && (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Début</label><div className="flex gap-2"><select value={eventForm.startHour} onChange={e => setEventForm({...eventForm, startHour: parseInt(e.target.value)})} className="w-full mt-1.5 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-700 text-sm font-bold dark:text-white outline-none">{Array.from({length: 24}).map((_, i) => <option key={i} value={i}>{i}h</option>)}</select><select value={eventForm.startMin} onChange={e => setEventForm({...eventForm, startMin: parseInt(e.target.value)})} className="w-full mt-1.5 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-700 text-sm font-bold dark:text-white outline-none"><option value={0}>00</option><option value={15}>15</option><option value={30}>30</option><option value={45}>45</option></select></div></div>
                                            <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Durée</label><select value={eventForm.duration} onChange={e => setEventForm({...eventForm, duration: parseInt(e.target.value)})} className="w-full mt-1.5 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-700 text-sm font-bold dark:text-white outline-none">{durationOptions}</select></div>
                                        </div>
                                    )}
                                    {!eventForm.id && (
                                        <div className="p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/30"><label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={eventForm.recurrence} onChange={e => setEventForm({...eventForm, recurrence: e.target.checked})} className="w-5 h-5 rounded-lg text-blue-600"/><span className="text-xs font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest">Répéter Hebdo.</span></label>{eventForm.recurrence && (<div className="flex items-center gap-3 mt-3 ml-8"><input type="number" min="1" max="52" value={eventForm.recurrenceWeeks} onChange={e => setEventForm({...eventForm, recurrenceWeeks: e.target.value})} className="w-16 p-2 text-center bg-white dark:bg-slate-800 border rounded-xl text-sm font-bold dark:text-white"/><span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Semaines</span></div>)}</div>
                                    )}
                                    
                                    {/* --- SELECTEUR COULEUR RÉPARÉ --- */}
                                    <div className="flex gap-4 pt-2">
                                        {['blue', 'green', 'gray'].map(c => (
                                            <button 
                                                key={c} 
                                                type="button" 
                                                onClick={() => setEventForm({...eventForm, color: c})} 
                                                className={`flex-1 h-10 rounded-xl border-2 transition-all shadow-sm ${eventForm.color === c ? 'border-slate-900 dark:border-white scale-105' : 'border-transparent opacity-30 hover:opacity-100'} ${c === 'blue' ? 'bg-blue-600' : c === 'green' ? 'bg-emerald-500' : 'bg-slate-600'}`}
                                            ></button>
                                        ))}
                                    </div>
                                    
                                    <div className="flex gap-4 pt-6"><button onClick={() => setIsCreating(false)} className="flex-1 py-4 text-slate-400 hover:text-slate-600 font-black text-xs uppercase tracking-widest transition-all">Annuler</button><button onClick={handleSave} className="flex-1 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[1.2rem] font-black text-xs uppercase tracking-widest shadow-xl hover:scale-105 transition-all">{eventForm.id ? 'Sauvegarder' : 'Confirmer'}</button></div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {selectedEvent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-2xl w-full max-w-sm border border-white dark:border-white/5 animate-in zoom-in-95">
                        <div className="flex justify-between items-start mb-8"><h3 className="text-2xl font-black text-slate-800 dark:text-white leading-tight italic uppercase tracking-tighter">{selectedEvent.data.title}</h3><button onClick={() => setSelectedEvent(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-all"><X size={20} className="text-slate-400"/></button></div>
                        
                        {(selectedEvent.data.my_status || selectedEvent.data.status) === 'pending' && selectedEvent.data.invited_email?.toLowerCase().includes(data.profile?.email?.toLowerCase()) ? (
                            <div className="space-y-6">
                                <div className="p-5 bg-blue-50 dark:bg-blue-900/20 rounded-2xl text-xs flex gap-4 text-blue-700 dark:text-blue-300 font-bold border border-blue-100 dark:border-blue-900/50"><Bell size={20} className="shrink-0"/><span>Invitation reçue de <strong>{selectedEvent.data.organizer_email || 'un collaborateur'}</strong>.</span></div>
                                <div className="grid gap-3">
                                    {selectedEvent.data.recurrence_group_id ? (
                                        <><button onClick={() => handleInvitation(selectedEvent.data, 'accepted', true)} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-500/20">Accepter la série</button><button onClick={() => handleInvitation(selectedEvent.data, 'accepted', false)} className="w-full py-4 border border-emerald-600 text-emerald-600 rounded-2xl font-black text-xs uppercase tracking-widest">Juste ce jour</button><button onClick={() => handleInvitation(selectedEvent.data, 'declined', true)} className="w-full py-4 text-red-500 font-black text-xs uppercase tracking-widest">Refuser tout</button></>
                                    ) : (
                                        <><button onClick={() => handleInvitation(selectedEvent.data, 'accepted', false)} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-500/20">Accepter</button><button onClick={() => handleInvitation(selectedEvent.data, 'declined', false)} className="w-full py-4 text-red-500 font-black text-xs uppercase tracking-widest">Refuser</button></>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="mb-8 p-5 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 flex gap-5 items-center"><div className="p-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm text-blue-600"><Clock size={28}/></div><div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Calendrier</p><p className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tighter">{selectedEvent.data.is_all_day ? "Journée complète" : format(parseISO(selectedEvent.data.start_time), 'EEEE d MMMM HH:mm', { locale: fr })}</p></div></div>
                                <div className="mb-8 space-y-5">
                                    <div className="flex items-center gap-3 text-[10px] font-black text-slate-500 uppercase tracking-widest"><Users size={16}/><span>Hôte : {selectedEvent.data.organizer_email || 'Équipe'}</span></div>
                                    
                                    {selectedEvent.data.invited_email && (
                                        <div className="flex flex-col gap-3 border-t border-slate-100 dark:border-slate-700 pt-6">
                                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Participants :</div>
                                            <div className="space-y-3">
                                                {selectedEvent.data.invited_email.split(',').map((email, idx) => {
                                                    const cleanEmail = email.trim().toLowerCase();
                                                    const part = (selectedEvent.data.participants || []).find(p => p.user_email.toLowerCase() === cleanEmail);
                                                    const status = part ? part.status : 'pending';
                                                    return (
                                                        <div key={idx} className="flex items-center justify-between group/user bg-slate-50 dark:bg-slate-900/30 p-2 rounded-xl border border-transparent hover:border-slate-100 dark:hover:border-white/5 transition-all">
                                                            <div className="flex items-center gap-3">
                                                                <div className={`p-1.5 rounded-full ${status === 'accepted' ? 'bg-emerald-100 text-emerald-600' : status === 'declined' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                                                                    {status === 'accepted' ? <Check size={12}/> : status === 'declined' ? <X size={12}/> : <Clock size={12}/>}
                                                                </div>
                                                                <span className={`text-[11px] font-black truncate max-w-[150px] tracking-tight ${status === 'declined' ? 'line-through text-slate-400' : 'dark:text-slate-300 uppercase'}`}>{cleanEmail}</span>
                                                            </div>
                                                            {selectedEvent.data.user_id === data.profile?.id && (
                                                                <button onClick={() => handleUninviteSingle(selectedEvent.data, cleanEmail)} className="opacity-0 group-hover/user:opacity-100 p-1.5 text-slate-300 hover:text-red-500 transition-all"><UserX size={16}/></button>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="flex gap-3">
                                    {selectedEvent.data.user_id === data.profile?.id && (
                                        <button onClick={() => openEditModal(selectedEvent.data)} className="flex-1 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all">Modifier</button>
                                    )}
                                    <button onClick={() => handleDeleteRequest(selectedEvent.data)} className="flex-1 py-4 text-red-500 font-black text-xs uppercase tracking-widest hover:bg-red-50 dark:hover:bg-red-900/10 rounded-2xl transition-all"> {selectedEvent.data.user_id === data.profile?.id ? 'Supprimer' : 'Quitter'}</button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}