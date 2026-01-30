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

        // MISE À JOUR INSTANTANNÉE DE L'UI (On utilise my_status pour l'utilisateur actuel)
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
            
        // Si c'est un refus, l'événement disparaîtra via le filtre d'App.jsx
        if (newStatus === 'declined' || applyToSeries) {
            setSelectedEvent(null);
        }
        setConfirmMode(null);
    };

    // --- GREFFE : ANNULER L'INVITATION POUR UN EMAIL PRÉCIS ---
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
        if (!window.confirm("Annuler TOUTES les invitations ? L'événement redeviendra privé.")) return;
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
        // SÉCURITÉ : Seul le propriétaire peut redimensionner
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
        // SÉCURITÉ : Seul le propriétaire peut déplacer
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
        <div className="fade-in flex flex-col md:flex-row h-full w-full overflow-hidden bg-gray-50 dark:bg-slate-950 font-sans">
            <div className="flex-1 p-4 md:p-6 overflow-hidden flex flex-col min-w-0 transition-all duration-300">
                <div className="flex-1 bg-white dark:bg-slate-900 rounded-3xl border border-gray-200 dark:border-slate-800 shadow-xl flex flex-col overflow-hidden relative">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur z-30 sticky top-0">
                        <div className="flex items-center gap-4 md:gap-6">
                            <h2 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white capitalize flex items-center gap-2"><Calendar className="text-blue-500" size={24}/>{format(currentWeekStart, 'MMMM yyyy', { locale: fr })}</h2>
                            <div className="flex items-center bg-gray-100 dark:bg-slate-800 rounded-xl p-1 shadow-inner border border-gray-200 dark:border-slate-700">
                                <button onClick={handlePreviousWeek} className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg shadow-sm text-slate-600 dark:text-slate-400"><ChevronLeft size={18}/></button>
                                <button onClick={handleToday} className="px-4 text-xs font-bold text-slate-600 dark:text-slate-300 mx-1">Aujourd'hui</button>
                                <button onClick={handleNextWeek} className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg shadow-sm text-slate-600 dark:text-slate-400"><ChevronRight size={18}/></button>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={cleanPastEvents} className="flex items-center gap-2 px-3 py-2 text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl font-bold text-xs transition-colors border border-transparent hover:border-red-200" title="Nettoyer l'historique"><Trash2 size={16}/> Nettoyer</button>
                            <button onClick={() => openCreateModal()} className="py-2 px-4 bg-slate-900 dark:bg-white text-white dark:text-black rounded-xl font-bold text-xs hover:shadow-lg transition-all flex items-center justify-center gap-2"><Plus size={16}/> Planifier</button>
                        </div>
                    </div>

                    {/* FIX DARK MODE : bg-white -> dark:bg-slate-900 */}
                    <div className="flex-1 overflow-y-auto relative custom-scrollbar select-none bg-white dark:bg-slate-900">
                        <div className="flex w-full h-full min-h-[1440px]">
                            <div className="w-16 flex-shrink-0 border-r border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900 sticky left-0 z-20">
                                <div className="h-14 border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900"></div>
                                <div className="h-24 border-b-4 border-gray-200 dark:border-slate-800 flex flex-col justify-center items-center p-2 text-[10px] font-bold text-slate-400 bg-white dark:bg-slate-900 shadow-sm z-10"><span>ALL</span><span>DAY</span></div>
                                {Array.from({length: 24}).map((_, i) => (<div key={i} className="h-[60px] relative w-full border-b border-transparent"><span className="absolute -top-2.5 right-2 text-xs font-bold text-slate-400">{i}:00</span></div>))}
                            </div>

                            <div className="flex-1 grid grid-cols-7 divide-x divide-gray-200 dark:divide-slate-800">
                                {weekDays.map((day, dayIndex) => {
                                    const isToday = isSameDay(day, new Date());
                                    const rawEvents = events.filter(e => isSameDay(parseISO(e.start_time), day)).map(e => ({ data: e, startStr: e.start_time, endStr: e.end_time }));
                                    const layoutItems = getLayoutForDay(rawEvents);
                                    return (
                                        <div key={dayIndex} className="relative min-w-0 bg-white dark:bg-slate-900">
                                            <div className={`h-14 flex flex-col items-center justify-center border-b border-gray-200 dark:border-slate-800 sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur z-30 ${isToday ? 'bg-blue-50/80 dark:bg-blue-900/20' : ''}`}>
                                                <span className={`text-[10px] font-bold uppercase tracking-wider ${isToday ? 'text-blue-600' : 'text-slate-400'}`}>{format(day, 'EEE', { locale: fr })}</span>
                                                <span className={`text-lg font-bold mt-0.5 ${isToday ? 'bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/30' : 'text-slate-800 dark:text-white'}`}>{format(day, 'd')}</span>
                                            </div>
                                            <div className={`h-24 border-b-4 border-gray-200 dark:border-slate-800 bg-gray-50/30 dark:bg-slate-800/20 p-1 flex flex-col gap-1 overflow-y-auto custom-scrollbar transition-colors ${draggedItem ? 'hover:bg-blue-50/50 dark:hover:bg-blue-900/20' : ''}`} onDragOver={e => { if (draggedItem && !draggedItem.data.is_all_day) return; e.preventDefault(); }} 
                                              onDrop={e => { e.preventDefault(); if (draggedItem?.data.is_all_day) { const st = setMinutes(setHours(day, 0), 0); const et = setMinutes(setHours(day, 23), 59); updateData({ ...data, calendar_events: events.map(ev => String(ev.id) === String(draggedItem.data.id) ? { ...ev, start_time: st.toISOString(), end_time: et.toISOString() } : ev) }, { table: 'calendar_events', id: draggedItem.data.id, action: 'update', data: { start_time: st.toISOString(), end_time: et.toISOString(), is_all_day: true } }); } setDraggedItem(null); }}>
                                                {rawEvents.filter(i => isItemAllDay(i)).map(item => {
                                                    const isOwner = item.data.user_id === data.profile?.id;
                                                    const colorClass = item.data.color === 'green' ? 'bg-emerald-100 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 border-l-emerald-500' : item.data.color === 'gray' ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 border-l-slate-500' : 'bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300 border-l-blue-500';
                                                    const isPending = (item.data.my_status || item.data.status) === 'pending' && !isOwner;
                                                    return (<div key={item.data.id} draggable={isOwner} onDragStart={(e) => onDragStart(e, item.data)} onClick={(e) => handleEventClick(e, item.data)} className={`text-[10px] font-bold px-2 py-1 rounded border border-l-4 truncate cursor-pointer hover:opacity-80 transition-all ${colorClass} ${isPending ? 'border-dashed opacity-70' : ''}`}>{isPending && '🔔 '}{item.data.title}</div>);
                                                })}
                                            </div>
                                            <div className={`relative h-[1440px] transition-colors bg-white dark:bg-slate-900 ${draggedItem && previewSlot?.dayIndex !== dayIndex ? 'hover:bg-slate-50 dark:hover:bg-slate-800/50' : ''}`} onDragOver={(e) => onDragOverGrid(e, dayIndex)} onDrop={(e) => onDropGrid(e, day)}>
                                                {Array.from({length: 24}).map((_, i) => <div key={i} className="absolute w-full border-t border-gray-100 dark:border-slate-800/60 h-[60px]" style={{ top: `${i*60}px` }}></div>)}
                                                {isToday && (<div className="absolute w-full border-t-2 border-red-500 z-10 pointer-events-none flex items-center" style={{ top: `${(getHours(new Date()) * 60 + getMinutes(new Date()))}px` }}><div className="w-2 h-2 bg-red-500 rounded-full -ml-1"></div></div>)}
                                                {previewSlot && previewSlot.dayIndex === dayIndex && (<div className="absolute z-0 rounded-lg bg-blue-500/10 border-2 border-blue-500 border-dashed pointer-events-none flex items-center justify-center text-xs font-bold text-blue-600" style={{ top: `${previewSlot.top}px`, height: `${previewSlot.height}px`, left: '2px', right: '2px' }}>{previewSlot.timeLabel}</div>)}
                                                {layoutItems.map((item) => {
                                                    const dataItem = item.data; 
                                                    const isOwner = dataItem.user_id === data.profile?.id;
                                                    const isPending = (dataItem.my_status || dataItem.status) === 'pending' && !isOwner;
                                                    const colorClass = dataItem.color === 'green' ? 'bg-white dark:bg-slate-800 border-l-emerald-500 text-emerald-900 dark:text-emerald-100' : dataItem.color === 'gray' ? 'bg-white dark:bg-slate-800 border-l-slate-500 text-slate-700 dark:text-slate-300' : 'bg-white dark:bg-slate-800 border-l-blue-600 text-blue-900 dark:text-blue-100';
                                                    return (
                                                        <div key={item.data.id} style={{ ...item.style, opacity: (isPending ? 0.6 : 1) }} draggable={isOwner && !resizeRef.current} onDragStart={(e) => onDragStart(e, dataItem)} onClick={(e) => handleEventClick(e, dataItem)} className={`absolute rounded-r-lg rounded-l-sm p-2 text-xs cursor-pointer hover:brightness-95 dark:hover:brightness-125 hover:z-30 transition-all z-10 overflow-hidden flex flex-col group/item select-none shadow-sm border border-gray-200 dark:border-slate-700 border-l-4 ${colorClass} ${isPending ? 'border-dashed' : ''}`}>
                                                            <span className="font-bold truncate leading-tight text-[11px] flex items-center gap-1">{isPending && <Bell size={10} className="text-blue-500"/>}{dataItem.title}</span>
                                                            <div className="flex items-center gap-1 mt-auto pt-1 opacity-80 mb-1"><span className="text-[10px] font-mono font-semibold">{format(parseISO(item.startStr), 'HH:mm')}</span>{!!dataItem.recurrence_group_id && <Repeat size={10} />}</div>
                                                            {/* RÉSULTAT DU VERROU : OnMouseDown est seulement pour le proprio */}
                                                            {isOwner && !isPending && (<div className="absolute bottom-0 left-0 w-full h-3 cursor-s-resize hover:bg-black/5 dark:hover:bg-white/10 transition-colors z-50 flex items-center justify-center opacity-0 group-hover/item:opacity-100" onMouseDown={(e) => startResize(e, dataItem)}><div className="w-8 h-1 bg-black/20 dark:bg-white/30 rounded-full"></div></div>)}
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

            {/* MODALS */}
            {isCreating && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-2xl w-full max-w-sm border border-slate-200 dark:border-slate-700 animate-in zoom-in-95">
                        {confirmMode === 'ask_update' ? (
                            <div className="text-center space-y-4">
                                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-2"><Repeat size={24}/></div>
                                <h3 className="font-bold text-lg dark:text-white">Modifier la récurrence ?</h3>
                                <div className="grid gap-3">
                                    <button onClick={() => applyUpdate(eventForm.id, pendingUpdate.newStart, pendingUpdate.newEnd, pendingUpdate, 'single')} className="w-full py-3 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-700 dark:text-white">Juste celui-là</button>
                                    <button onClick={() => applyUpdate(eventForm.id, pendingUpdate.newStart, pendingUpdate.newEnd, pendingUpdate, 'series')} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700">Toute la série</button>
                                    <button onClick={() => setIsCreating(false)} className="text-xs text-slate-400 hover:underline mt-2">Annuler</button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <h3 className="text-xl font-bold mb-6 text-slate-800 dark:text-white flex items-center gap-2"><Calendar className="text-blue-500"/>{eventForm.id ? 'Modifier' : 'Planifier'}</h3>
                                <div className="space-y-4">
                                    <div><label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Titre</label><input autoFocus type="text" value={eventForm.title} onChange={e => setEventForm({...eventForm, title: e.target.value})} className="w-full mt-1.5 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 outline-none focus:border-blue-500 dark:text-white" placeholder="Titre..." /></div>
                                    {!eventForm.recurrence && !eventForm.recurrenceGroupId && (
                                        <div><label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Inviter (Emails, virgule)</label><div className="relative"><UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/><input type="text" value={eventForm.invitedEmail} onChange={e => setEventForm({...eventForm, invitedEmail: e.target.value})} className="w-full mt-1.5 pl-10 pr-3 py-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 outline-none focus:border-blue-500 dark:text-white text-sm" placeholder="ami1@test.com, ami2@test.com" /></div></div>
                                    )}
                                    <div><label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Date</label><input type="date" value={eventForm.date} onChange={e => setEventForm({...eventForm, date: e.target.value})} className="w-full mt-1.5 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-sm dark:text-white outline-none"/></div>
                                    <div className="flex items-center gap-2 py-2"><input type="checkbox" id="allDay" checked={eventForm.isAllDay} onChange={e => setEventForm({...eventForm, isAllDay: e.target.checked})} className="w-5 h-5 text-blue-600 rounded"/><label htmlFor="allDay" className="text-sm font-bold text-slate-700 dark:text-slate-300">Toute la journée</label></div>
                                    {!eventForm.isAllDay && (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div><label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Heure</label><div className="flex gap-2"><select value={eventForm.startHour} onChange={e => setEventForm({...eventForm, startHour: parseInt(e.target.value)})} className="w-full mt-1.5 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-sm dark:text-white outline-none">{Array.from({length: 24}).map((_, i) => <option key={i} value={i}>{i}h</option>)}</select><select value={eventForm.startMin} onChange={e => setEventForm({...eventForm, startMin: parseInt(e.target.value)})} className="w-full mt-1.5 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-sm dark:text-white outline-none"><option value={0}>00</option><option value={15}>15</option><option value={30}>30</option><option value={45}>45</option></select></div></div>
                                            <div><label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Durée</label><select value={eventForm.duration} onChange={e => setEventForm({...eventForm, duration: parseInt(e.target.value)})} className="w-full mt-1.5 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-sm dark:text-white outline-none">{durationOptions}</select></div>
                                        </div>
                                    )}
                                    {!eventForm.id && (
                                        <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700"><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={eventForm.recurrence} onChange={e => setEventForm({...eventForm, recurrence: e.target.checked, invitedEmail: e.target.checked ? '' : eventForm.invitedEmail})} className="w-4 h-4 rounded text-blue-600"/><span className="text-sm font-bold text-slate-700 dark:text-slate-300">Répéter (Hebdo)</span></label>{eventForm.recurrence && (<div className="flex items-center gap-2 mt-2"><span className="text-xs text-slate-500">Pendant</span><input type="number" min="1" max="52" value={eventForm.recurrenceWeeks} onChange={e => setEventForm({...eventForm, recurrenceWeeks: e.target.value})} className="w-16 p-1 text-center bg-white dark:bg-slate-800 border rounded text-sm dark:text-white"/><span className="text-xs text-slate-500">semaines</span></div>)}</div>
                                    )}
                                    <div className="flex gap-3 pt-2">{['blue', 'green', 'gray'].map(c => (<button key={c} onClick={() => setEventForm({...eventForm, color: c})} className={`flex-1 h-8 rounded-lg border-2 transition-all ${eventForm.color === c ? 'border-slate-800 dark:border-white' : 'border-transparent opacity-40'} ${c === 'blue' ? 'bg-blue-500' : c === 'green' ? 'bg-emerald-500' : 'bg-slate-500'}`}></button>))}</div>
                                    <div className="flex gap-3 pt-4"><button onClick={() => setIsCreating(false)} className="flex-1 py-3 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl font-bold text-sm">Annuler</button><button onClick={handleSave} className="flex-1 py-3 bg-slate-900 dark:bg-white text-white dark:text-black rounded-xl font-bold text-sm">{eventForm.id ? 'Sauver' : 'Créer'}</button></div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {selectedEvent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-2xl w-full max-w-sm border border-slate-200 dark:border-slate-700 animate-in zoom-in-95">
                        <div className="flex justify-between items-start mb-6"><h3 className="text-xl font-bold text-slate-800 dark:text-white leading-tight pr-4">{selectedEvent.data.title}</h3><button onClick={() => setSelectedEvent(null)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full"><X size={20} className="text-slate-400"/></button></div>
                        
                        {/* LOGIQUE D'INVITATION : INSTANTANÉITÉ CHEZ L'INVITÉ */}
                        {(selectedEvent.data.my_status || selectedEvent.data.status) === 'pending' && selectedEvent.data.invited_email?.toLowerCase().includes(data.profile?.email?.toLowerCase()) ? (
                            <div className="space-y-6">
                                <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-xl text-sm flex gap-3 text-blue-700 dark:text-blue-300"><Bell size={20}/><span>Invitation reçue de <strong>{selectedEvent.data.organizer_email || 'un collaborateur'}</strong>.</span></div>
                                <div className="grid gap-3">
                                    {selectedEvent.data.recurrence_group_id ? (
                                        <><button onClick={() => handleInvitation(selectedEvent.data, 'accepted', true)} className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-colors"><Check size={18}/> Accepter toute la série</button><button onClick={() => handleInvitation(selectedEvent.data, 'accepted', false)} className="w-full py-3 border border-emerald-600 text-emerald-600 rounded-xl font-bold hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors">Juste ce jour</button><button onClick={() => handleInvitation(selectedEvent.data, 'declined', true)} className="w-full py-3 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-xl font-bold hover:bg-red-100 transition-colors">Refuser tout</button></>
                                    ) : (
                                        <><button onClick={() => handleInvitation(selectedEvent.data, 'accepted', false)} className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-colors"><Check size={18}/> Accepter l'invitation</button><button onClick={() => handleInvitation(selectedEvent.data, 'declined', false)} className="w-full py-3 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-100 transition-colors"><Ban size={18}/> Refuser</button></>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 flex gap-4 items-center"><div className="p-3 bg-white dark:bg-slate-800 rounded-lg shadow-sm text-blue-600"><Clock size={24}/></div><div><p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Horaire</p><p className="text-sm font-medium text-slate-700 dark:text-slate-300">{selectedEvent.data.is_all_day ? "Toute la journée" : format(parseISO(selectedEvent.data.start_time), 'EEEE d MMMM HH:mm', { locale: fr })}</p></div></div>
                                <div className="mb-6 space-y-4">
                                    <div className="flex items-center gap-2 text-xs text-slate-500"><Users size={14}/><span>Organisé par : <strong>{selectedEvent.data.organizer_email || 'Collaborateur'}</strong></span></div>
                                    
                                    {selectedEvent.data.invited_email && (
                                        <div className="flex flex-col gap-2 border-t border-slate-100 dark:border-slate-700 pt-4">
                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Participants :</div>
                                            <div className="space-y-2">
                                                {selectedEvent.data.invited_email.split(',').map((email, idx) => {
                                                    const cleanEmail = email.trim().toLowerCase();
                                                    const part = (selectedEvent.data.participants || []).find(p => p.user_email.toLowerCase() === cleanEmail);
                                                    const status = part ? part.status : 'pending';
                                                    
                                                    return (
                                                        <div key={idx} className="flex items-center justify-between group/user">
                                                            <div className="flex items-center gap-2">
                                                                <div className={`p-1 rounded-full ${status === 'accepted' ? 'bg-emerald-100 text-emerald-600' : status === 'declined' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                                                                    {status === 'accepted' ? <Check size={10}/> : status === 'declined' ? <X size={10}/> : <Clock size={10}/>}
                                                                </div>
                                                                <span className={`text-[11px] font-medium truncate max-w-[150px] ${status === 'declined' ? 'line-through text-slate-400' : 'dark:text-slate-300'}`}>{cleanEmail}</span>
                                                            </div>
                                                            {selectedEvent.data.user_id === data.profile?.id && (
                                                                <button onClick={() => handleUninviteSingle(selectedEvent.data, cleanEmail)} className="opacity-0 group-hover/user:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-all" title="Retirer l'invité">
                                                                    <UserX size={14}/>
                                                                </button>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="flex gap-3">
                                    {/* VERROU : Seul l'organisateur peut modifier */}
                                    {selectedEvent.data.user_id === data.profile?.id && (
                                        <button onClick={() => openEditModal(selectedEvent.data)} className="flex-1 py-3 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"><Pencil size={16}/> Modifier</button>
                                    )}
                                    <button onClick={() => handleDeleteRequest(selectedEvent.data)} className="flex-1 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-100 transition-colors"><Trash2 size={18}/> {selectedEvent.data.user_id === data.profile?.id ? 'Supprimer' : 'Quitter'}</button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}