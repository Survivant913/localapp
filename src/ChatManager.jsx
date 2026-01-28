import { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, Send, Plus, User, Check, X, Clock, 
  Trash2, Search, AlertCircle, Ban, Users, PanelLeft,
  LogOut, MoreVertical, Settings, UserPlus, Pencil, Edit2
} from 'lucide-react';
import { supabase } from './supabaseClient';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function ChatManager({ user }) {
    // --- ÉTATS ---
    const [rooms, setRooms] = useState([]);
    const [activeRoom, setActiveRoom] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [participants, setParticipants] = useState([]); 
    
    // États pour l'édition
    const [editingMessageId, setEditingMessageId] = useState(null); 

    // État Présence
    const [onlineUsers, setOnlineUsers] = useState(new Set());
    
    // UI States
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [showGroupDetails, setShowGroupDetails] = useState(false);

    // Formulaires
    const [newChatName, setNewChatName] = useState('');
    const [inviteEmails, setInviteEmails] = useState('');
    const [newMemberEmail, setNewMemberEmail] = useState('');
    
    const messagesEndRef = useRef(null);

    // --- 1. CHARGEMENT DES DISCUSSIONS ---
    useEffect(() => {
        fetchRooms();
        // Écoute globale pour la liste des rooms (sidebar)
        const roomSubscription = supabase
            .channel('room-updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_participants' }, () => { fetchRooms(); })
            .subscribe();
        return () => { supabase.removeChannel(roomSubscription); };
    }, [user]);

    const fetchRooms = async () => {
        if (!user) return;
        const { data: myParticipations } = await supabase
            .from('chat_participants')
            .select('room_id, status, chat_rooms(name, created_by)')
            .eq('user_email', user.email);
        
        if (myParticipations) {
            const validRooms = myParticipations
                .filter(p => p.chat_rooms) 
                .map(p => ({
                    id: p.room_id,
                    name: p.chat_rooms.name || "Discussion sans titre",
                    status: p.status,
                    isOwner: p.chat_rooms.created_by === user.id
                }));
            setRooms(validRooms);
        }
    };

    // --- 2. LOGIQUE ACTIVE ROOM (MESSAGES + PARTICIPANTS + PRÉSENCE) ---
    useEffect(() => {
        if (!activeRoom) return;
        
        // Reset des états au changement de salle
        fetchParticipants(activeRoom.id);
        setShowGroupDetails(false); 
        setNewMemberEmail('');
        setOnlineUsers(new Set());
        setEditingMessageId(null);
        setNewMessage('');

        // SI JE SUIS JUSTE INVITÉ (PENDING) : JE NE CHARGE PAS LES MESSAGES NI LA PRÉSENCE
        if (activeRoom.status === 'pending') {
            setMessages([]); // On vide les messages par sécurité
            return; 
        }

        // SI JE SUIS ACCEPTÉ : JE CHARGE TOUT
        fetchMessages(activeRoom.id);

        const channel = supabase.channel(`room-${activeRoom.id}`, {
            config: { presence: { key: user.id } },
        });

        channel
            // A. MESSAGES (Insert, Update, Delete)
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'chat_messages',
                filter: `room_id=eq.${activeRoom.id}` 
            }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    setMessages(current => {
                        if (current.some(m => m.id === payload.new.id)) return current;
                        return [...current, payload.new];
                    });
                    scrollToBottom();
                } 
                else if (payload.eventType === 'DELETE') {
                    setMessages(current => current.filter(msg => msg.id !== payload.old.id));
                }
                else if (payload.eventType === 'UPDATE') {
                    setMessages(current => current.map(msg => msg.id === payload.new.id ? payload.new : msg));
                }
            })
            // B. PARTICIPANTS (Mise à jour en temps réel des statuts "Pending" -> "Accepted")
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'chat_participants', 
                filter: `room_id=eq.${activeRoom.id}` 
            }, () => {
                // Dès qu'un participant change (accepte, quitte, est viré), on recharge la liste
                fetchParticipants(activeRoom.id);
            })
            // C. PRÉSENCE (Seulement si accepté)
            .on('presence', { event: 'sync' }, () => {
                const newState = channel.presenceState();
                setOnlineUsers(new Set(Object.keys(newState)));
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await channel.track({ online_at: new Date().toISOString() });
                }
            });

        return () => { channel.unsubscribe(); };
    }, [activeRoom]);

    const fetchParticipants = async (roomId) => {
        const { data } = await supabase.from('chat_participants').select('*').eq('room_id', roomId);
        setParticipants(data || []);
    };

    const fetchMessages = async (roomId) => {
        const { data } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('room_id', roomId)
            .order('created_at', { ascending: true });
        if (data) {
            setMessages(data);
            scrollToBottom();
        }
    };

    const scrollToBottom = () => {
        setTimeout(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, 100);
    };

    // --- 3. ACTIONS ---
    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !activeRoom) return;

        const text = newMessage;
        
        if (editingMessageId) {
            // EDIT OPTIMISTE
            const oldMessages = [...messages];
            setMessages(current => current.map(msg => msg.id === editingMessageId ? { ...msg, content: text } : msg));
            setEditingMessageId(null);
            setNewMessage('');

            const { error } = await supabase.from('chat_messages').update({ content: text }).eq('id', editingMessageId);
            if (error) { alert("Erreur modification"); setMessages(oldMessages); }
        } else {
            // SEND STANDARD
            setNewMessage(''); 
            const { error } = await supabase.from('chat_messages').insert([{ room_id: activeRoom.id, sender_id: user.id, content: text }]);
            if (error) { alert("Erreur envoi"); setNewMessage(text); }
            else { fetchMessages(activeRoom.id); }
        }
    };

    const handleDeleteMessage = async (messageId) => {
        if (!window.confirm("Supprimer ce message ?")) return;
        // DELETE OPTIMISTE
        const oldMessages = [...messages];
        setMessages(current => current.filter(msg => msg.id !== messageId));
        const { error } = await supabase.from('chat_messages').delete().eq('id', messageId);
        if (error) { alert("Erreur suppression"); setMessages(oldMessages); }
    };

    const startEditing = (msg) => {
        setEditingMessageId(msg.id);
        setNewMessage(msg.content);
    };

    const cancelEditing = () => {
        setEditingMessageId(null);
        setNewMessage('');
    };

    const createChat = async () => {
        if (!inviteEmails || !newChatName) return alert("Champs requis");
        const emailList = inviteEmails.split(',').map(e => e.trim()).filter(e => e.length > 0);
        if (emailList.length === 0) return alert("Aucun email valide");
        try {
            const { data: roomData, error: roomError } = await supabase.from('chat_rooms').insert([{ name: newChatName, created_by: user.id }]).select().single();
            if (roomError) throw roomError;
            const participantsToAdd = [{ room_id: roomData.id, user_email: user.email, user_id: user.id, status: 'accepted' }];
            emailList.forEach(email => participantsToAdd.push({ room_id: roomData.id, user_email: email, status: 'pending' }));
            await supabase.from('chat_participants').insert(participantsToAdd);
            setIsCreating(false); setInviteEmails(''); setNewChatName(''); fetchRooms();
        } catch (err) { alert("Erreur: " + err.message); }
    };

    const handleAddMember = async () => {
        if (!newMemberEmail.trim()) return;
        if (participants.some(p => p.user_email === newMemberEmail.trim())) return alert("Déjà membre");
        try {
            await supabase.from('chat_participants').insert([{ room_id: activeRoom.id, user_email: newMemberEmail.trim(), status: 'pending' }]);
            setNewMemberEmail(''); 
            // Pas besoin de fetchParticipants ici, le realtime s'en charge
        } catch (err) { alert("Erreur: " + err.message); }
    };

    const handleInvitation = async (roomId, accept) => {
        if (accept) {
            await supabase.from('chat_participants').update({ status: 'accepted', user_id: user.id }).match({ room_id: roomId, user_email: user.email });
            // On force un refresh immédiat de la room active pour activer la connexion
            const updatedRoom = { ...activeRoom, status: 'accepted' };
            setActiveRoom(updatedRoom);
            fetchRooms();
        }
        else {
            await supabase.from('chat_participants').delete().match({ room_id: roomId, user_email: user.email });
            fetchRooms(); setActiveRoom(null);
        }
    };

    const handleDeleteRoom = async (roomId) => {
        if (!window.confirm("Supprimer la discussion ?")) return;
        await supabase.from('chat_rooms').delete().eq('id', roomId);
        setActiveRoom(null); fetchRooms();
    };

    const handleLeaveRoom = async () => {
        if (!window.confirm("Quitter le groupe ?")) return;
        await supabase.from('chat_participants').delete().match({ room_id: activeRoom.id, user_email: user.email });
        setActiveRoom(null); fetchRooms();
    };

    const handleKickParticipant = async (pId) => {
        if (!window.confirm("Retirer ce membre ?")) return;
        await supabase.from('chat_participants').delete().eq('id', pId);
        // Pas besoin de fetchParticipants ici, le realtime s'en charge
    };

    // --- RENDER ---
    return (
        <div className="flex h-full w-full bg-slate-50 dark:bg-slate-950 overflow-hidden">
            
            {/* SIDEBAR */}
            <div className={`${isSidebarOpen ? 'w-80' : 'w-0'} bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 flex flex-col shrink-0 overflow-hidden`}>
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center shrink-0">
                    <h2 className="font-bold text-lg dark:text-white truncate">Discussions</h2>
                    <button onClick={() => setIsCreating(true)} className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400 shrink-0"><Plus size={20}/></button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {rooms.map(room => (
                        <div key={room.id} onClick={() => { setActiveRoom(room); if (window.innerWidth < 768) setIsSidebarOpen(false); }} className={`p-3 rounded-xl cursor-pointer transition-all border ${activeRoom?.id === room.id ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800' : 'bg-white border-transparent hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800'}`}>
                            <div className="flex justify-between items-start mb-1 pr-6">
                                <span className={`font-bold truncate ${activeRoom?.id === room.id ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-200'}`}>{room.name}</span>
                                {room.status === 'pending' && <span className="bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5 rounded-full font-bold">Invité</span>}
                            </div>
                            <div className="text-xs text-slate-400 flex items-center gap-1">
                                {room.isOwner ? <User size={12}/> : <Users size={12}/>} {room.isOwner ? 'Propriétaire' : 'Participant'}
                            </div>
                        </div>
                    ))}
                    {rooms.length === 0 && <div className="text-center text-slate-400 text-sm mt-10">Aucune discussion</div>}
                </div>
            </div>

            {/* TOGGLE */}
            <div className="flex flex-col items-center py-4 bg-slate-50 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 w-4 shrink-0 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer transition-colors z-10" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                <div className="w-1 h-8 bg-slate-300 dark:bg-slate-700 rounded-full my-auto"></div>
            </div>

            {/* CHAT */}
            <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 relative min-w-0">
                {activeRoom ? (
                    <>
                        <div className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center px-4 justify-between shrink-0 z-20">
                            <div className="flex items-center gap-3 overflow-hidden">
                                {!isSidebarOpen && <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 text-slate-400 hover:text-slate-600"><PanelLeft size={20}/></button>}
                                <div className="flex flex-col truncate">
                                    <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2 truncate">
                                        <MessageSquare size={20} className="text-indigo-500 shrink-0"/> <span className="truncate">{activeRoom.name}</span>
                                    </h3>
                                    {/* MASQUER LA PRÉSENCE SI STATUS PENDING */}
                                    {activeRoom.status === 'accepted' && (
                                        <span className="text-xs text-slate-400 flex items-center gap-1">
                                            <div className={`w-2 h-2 rounded-full ${onlineUsers.size > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></div> {onlineUsers.size} en ligne
                                        </span>
                                    )}
                                </div>
                            </div>
                            {/* BOUTON MEMBRES TOUJOURS VISIBLE MAIS CONTENU MODAL ADAPTÉ */}
                            <button onClick={() => setShowGroupDetails(true)} className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full relative">
                                <Users size={20}/>
                                {participants.some(p => p.status === 'pending') && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-amber-500 rounded-full border-2 border-white dark:border-slate-900"></span>}
                            </button>
                        </div>

                        {activeRoom.status === 'accepted' ? (
                            <>
                                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                                    {messages.map(msg => {
                                        const isMe = msg.sender_id === user.id;
                                        const sender = participants.find(p => p.user_id === msg.sender_id);
                                        const senderName = sender ? sender.user_email.split('@')[0] : 'Inconnu';
                                        const avatarColor = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-amber-500', 'bg-rose-500'][senderName.length % 5];

                                        return (
                                            <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group`}>
                                                {!isMe && (
                                                    <div className="flex items-center gap-2 ml-1 mb-1">
                                                        <div className={`w-4 h-4 rounded-full ${avatarColor} flex items-center justify-center text-[8px] text-white font-bold uppercase`}>{senderName[0]}</div>
                                                        <span className="text-[10px] text-slate-400 font-medium">{senderName}</span>
                                                    </div>
                                                )}
                                                
                                                <div className="relative max-w-[75%] md:max-w-[60%]">
                                                    <div className={`p-3 rounded-2xl shadow-sm text-sm break-words ${isMe ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none border border-slate-100 dark:border-slate-700'}`}>
                                                        <p>{msg.content}</p>
                                                        <div className={`text-[10px] mt-1 text-right ${isMe ? 'text-indigo-200' : 'text-slate-400'}`}>
                                                            {format(new Date(msg.created_at), 'HH:mm')}
                                                        </div>
                                                    </div>

                                                    {isMe && (
                                                        <div className="absolute -left-14 top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button onClick={() => startEditing(msg)} className="p-1.5 bg-white dark:bg-slate-800 text-slate-500 hover:text-indigo-600 rounded-full shadow border border-slate-200 dark:border-slate-700"><Pencil size={12}/></button>
                                                            <button onClick={() => handleDeleteMessage(msg.id)} className="p-1.5 bg-white dark:bg-slate-800 text-slate-500 hover:text-red-600 rounded-full shadow border border-slate-200 dark:border-slate-700"><Trash2 size={12}/></button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <div ref={messagesEndRef} />
                                </div>

                                <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
                                    {editingMessageId && (
                                        <div className="flex items-center justify-between bg-indigo-50 dark:bg-indigo-900/20 px-4 py-2 rounded-t-xl text-xs text-indigo-600 dark:text-indigo-400">
                                            <span className="flex items-center gap-1"><Edit2 size={12}/> Modification du message</span>
                                            <button onClick={cancelEditing}><X size={14}/></button>
                                        </div>
                                    )}
                                    <form onSubmit={handleSendMessage} className={`flex gap-2 ${editingMessageId ? 'bg-indigo-50 dark:bg-indigo-900/20 p-2 rounded-b-xl' : ''}`}>
                                        <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Écrivez votre message..." className="flex-1 bg-slate-100 dark:bg-slate-800 border-transparent focus:bg-white dark:focus:bg-slate-950 focus:border-indigo-500 border rounded-xl px-4 py-3 outline-none transition-all dark:text-white"/>
                                        <button type="submit" className={`p-3 text-white rounded-xl transition-colors ${editingMessageId ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                                            {editingMessageId ? <Check size={20}/> : <Send size={20}/>}
                                        </button>
                                    </form>
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                                <h2 className="text-2xl font-bold dark:text-white mb-4">Invitation reçue</h2>
                                <p className="text-slate-500 mb-6 max-w-md">Vous devez accepter l'invitation pour voir les messages et les membres en ligne.</p>
                                <div className="flex gap-4">
                                    <button onClick={() => handleInvitation(activeRoom.id, false)} className="px-6 py-3 border border-slate-300 rounded-xl font-bold">Refuser</button>
                                    <button onClick={() => handleInvitation(activeRoom.id, true)} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold">Accepter</button>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-300">
                        <MessageSquare size={64} className="opacity-20 mb-4"/>
                        <p>Sélectionnez une discussion</p>
                    </div>
                )}
            </div>

            {/* MODAL MEMBRES */}
            {showGroupDetails && activeRoom && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-xl w-full max-w-sm animate-in zoom-in-95 flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold dark:text-white">Membres</h3>
                            <button onClick={() => setShowGroupDetails(false)}><X size={20} className="text-slate-400"/></button>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-3 mb-4 custom-scrollbar">
                            {participants.map(p => {
                                const isMe = p.user_email === user.email;
                                const isOnline = p.user_id && onlineUsers.has(p.user_id);
                                // AFFICHER "EN ATTENTE" SI PENDING
                                const statusText = p.status === 'pending' ? 'En attente...' : (isOnline ? 'En ligne' : 'Hors ligne');
                                const statusColor = p.status === 'pending' ? 'text-amber-500' : (isOnline ? 'text-emerald-600' : 'text-slate-400');
                                const statusDot = p.status === 'pending' ? 'bg-amber-400' : (isOnline ? 'bg-emerald-500' : 'bg-slate-300');

                                return (
                                    <div key={p.id} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <div className="relative w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">
                                                {p.user_email[0].toUpperCase()}
                                                {/* SI LE USER EST MOI ET QUE JE SUIS PENDING, JE NE DOIS PAS VOIR LE STATUT DES AUTRES. MAIS ICI JE VOIS LA LISTE. C'EST OK, JE VOIS JUSTE QUI EST DANS LE GROUPE. */}
                                                <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${statusDot}`}></div>
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium dark:text-white">{p.user_email} {isMe && "(Moi)"}</p>
                                                <p className={`text-[10px] ${statusColor}`}>{statusText}</p>
                                            </div>
                                        </div>
                                        {activeRoom.isOwner && p.user_email !== user.email && <button onClick={() => handleKickParticipant(p.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded"><Ban size={16}/></button>}
                                    </div>
                                );
                            })}
                        </div>
                        {activeRoom.isOwner && (
                            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 mb-4 flex gap-2">
                                <input type="email" value={newMemberEmail} onChange={e => setNewMemberEmail(e.target.value)} placeholder="Ajouter email..." className="flex-1 p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm dark:text-white"/>
                                <button onClick={handleAddMember} className="p-2 bg-indigo-600 text-white rounded-lg"><UserPlus size={18}/></button>
                            </div>
                        )}
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                             {activeRoom.isOwner ? 
                                <button onClick={() => handleDeleteRoom(activeRoom.id)} className="w-full p-3 text-red-600 bg-red-50 rounded-xl font-bold text-sm">Supprimer</button> :
                                <button onClick={handleLeaveRoom} className="w-full p-3 text-slate-500 bg-slate-100 rounded-xl font-bold text-sm">Quitter</button>
                             }
                        </div>
                    </div>
                </div>
            )}
            
            {/* MODAL CREATION (Identique) */}
            {isCreating && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-xl w-full max-w-sm">
                        <h3 className="text-lg font-bold mb-4 dark:text-white">Nouveau Groupe</h3>
                        <input type="text" value={newChatName} onChange={e => setNewChatName(e.target.value)} className="w-full p-2 mb-2 bg-slate-100 dark:bg-slate-800 rounded-lg dark:text-white" placeholder="Nom"/>
                        <input type="text" value={inviteEmails} onChange={e => setInviteEmails(e.target.value)} className="w-full p-2 mb-4 bg-slate-100 dark:bg-slate-800 rounded-lg dark:text-white" placeholder="Emails (séparés par virgule)"/>
                        <div className="flex gap-2">
                            <button onClick={() => setIsCreating(false)} className="flex-1 py-3 border rounded-xl">Annuler</button>
                            <button onClick={createChat} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl">Créer</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}