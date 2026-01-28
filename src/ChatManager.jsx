import { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, Send, Plus, User, Check, X, Clock, 
  Trash2, Search, AlertCircle, Ban, Users, PanelLeft,
  LogOut, MoreVertical, Settings, UserPlus
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
    
    // NOUVEAU : État pour suivre les utilisateurs en ligne
    const [onlineUsers, setOnlineUsers] = useState(new Set());
    
    // UI States
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [showGroupDetails, setShowGroupDetails] = useState(false);

    // Formulaire Nouveau Chat
    const [newChatName, setNewChatName] = useState('');
    const [inviteEmails, setInviteEmails] = useState('');

    // Formulaire Ajout Membre
    const [newMemberEmail, setNewMemberEmail] = useState('');
    
    const messagesEndRef = useRef(null);

    // --- 1. CHARGEMENT DES DISCUSSIONS ---
    useEffect(() => {
        fetchRooms();
        
        const roomSubscription = supabase
            .channel('room-updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_participants' }, () => {
                fetchRooms();
            })
            .subscribe();

        return () => { supabase.removeChannel(roomSubscription); };
    }, [user]);

    const fetchRooms = async () => {
        if (!user) return;
        
        const { data: myParticipations, error } = await supabase
            .from('chat_participants')
            .select('room_id, status, chat_rooms(name, created_by)')
            .eq('user_email', user.email);

        if (error) console.error("Erreur fetch rooms:", error);
        
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

    // --- 2. CHARGEMENT MESSAGES, PARTICIPANTS & PRÉSENCE (TEMPS RÉEL) ---
    useEffect(() => {
        if (!activeRoom) return;
        
        fetchParticipants(activeRoom.id);
        setShowGroupDetails(false); 
        setNewMemberEmail('');
        setOnlineUsers(new Set()); // Reset online users quand on change de room

        if (activeRoom.status === 'pending') return;

        fetchMessages(activeRoom.id);

        // --- CONFIGURATION DU CANAL (Messages + Présence) ---
        const channel = supabase.channel(`room-${activeRoom.id}`, {
            config: {
                presence: {
                    key: user.id, // On s'identifie avec notre ID
                },
            },
        });

        channel
            // A. Écoute des messages (Base de données)
            .on('postgres_changes', { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'chat_messages',
                filter: `room_id=eq.${activeRoom.id}` 
            }, (payload) => {
                setMessages(current => [...current, payload.new]);
                scrollToBottom();
            })
            // B. Écoute de la PRÉSENCE (Qui est là ?)
            .on('presence', { event: 'sync' }, () => {
                const newState = channel.presenceState();
                const onlineIds = new Set(Object.keys(newState));
                setOnlineUsers(onlineIds);
            })
            // C. Connexion
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    // On dit "Je suis là !"
                    await channel.track({ online_at: new Date().toISOString() });
                }
            });

        return () => { 
            channel.unsubscribe(); // Important : on se déconnecte quand on change de salle
        };
    }, [activeRoom]);

    const fetchParticipants = async (roomId) => {
        const { data } = await supabase
            .from('chat_participants')
            .select('*')
            .eq('room_id', roomId);
        setParticipants(data || []);
    };

    const fetchMessages = async (roomId) => {
        const { data, error } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('room_id', roomId)
            .order('created_at', { ascending: true });

        if (error) console.error("Erreur messages:", error);
        else {
            setMessages(data);
            scrollToBottom();
        }
    };

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
    };

    // --- 3. ACTIONS ---
    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !activeRoom) return;

        const text = newMessage;
        setNewMessage(''); 

        const { error } = await supabase
            .from('chat_messages')
            .insert([{
                room_id: activeRoom.id,
                sender_id: user.id,
                content: text
            }]);

        if (error) {
            console.error(error);
            alert("Erreur envoi message : " + error.message);
            setNewMessage(text); 
        } else {
            fetchMessages(activeRoom.id);
        }
    };

    const createChat = async () => {
        if (!inviteEmails || !newChatName) return alert("Emails et Nom requis");

        const emailList = inviteEmails.split(',').map(e => e.trim()).filter(e => e.length > 0);
        if (emailList.length === 0) return alert("Aucun email valide");

        try {
            const { data: roomData, error: roomError } = await supabase
                .from('chat_rooms')
                .insert([{ name: newChatName, created_by: user.id }])
                .select()
                .single();

            if (roomError) throw roomError;

            const participantsToAdd = [
                { room_id: roomData.id, user_email: user.email, user_id: user.id, status: 'accepted' }
            ];

            emailList.forEach(email => {
                participantsToAdd.push({ 
                    room_id: roomData.id, 
                    user_email: email, 
                    status: 'pending' 
                });
            });

            const { error: partError } = await supabase.from('chat_participants').insert(participantsToAdd);
            if (partError) throw partError;

            setIsCreating(false);
            setInviteEmails('');
            setNewChatName('');
            fetchRooms();
            alert(`Invitation envoyée à ${emailList.length} personnes !`);

        } catch (err) {
            console.error(err);
            alert("Erreur création: " + err.message);
        }
    };

    const handleAddMember = async () => {
        if (!newMemberEmail.trim()) return;
        if (participants.some(p => p.user_email === newMemberEmail.trim())) {
            return alert("Cette personne est déjà dans le groupe.");
        }

        try {
            const { error } = await supabase.from('chat_participants').insert([{
                room_id: activeRoom.id,
                user_email: newMemberEmail.trim(),
                status: 'pending'
            }]);

            if (error) throw error;
            setNewMemberEmail('');
            fetchParticipants(activeRoom.id);
            alert("Invitation envoyée !");
        } catch (err) {
            alert("Erreur ajout : " + err.message);
        }
    };

    const handleInvitation = async (roomId, accept) => {
        if (accept) {
            await supabase.from('chat_participants')
                .update({ status: 'accepted', user_id: user.id })
                .match({ room_id: roomId, user_email: user.email });
        } else {
            await supabase.from('chat_participants')
                .delete()
                .match({ room_id: roomId, user_email: user.email });
        }
        fetchRooms();
        setActiveRoom(null);
    };

    const handleDeleteRoom = async (roomId) => {
        if (!window.confirm("Supprimer définitivement cette discussion pour tout le monde ?")) return;
        try {
            const { error } = await supabase.from('chat_rooms').delete().eq('id', roomId);
            if (error) throw error;
            setActiveRoom(null);
            fetchRooms();
        } catch (err) {
            alert("Erreur suppression: " + err.message);
        }
    };

    const handleLeaveRoom = async () => {
        if (!window.confirm("Voulez-vous vraiment quitter ce groupe ?")) return;
        try {
            await supabase.from('chat_participants')
                .delete()
                .match({ room_id: activeRoom.id, user_email: user.email });
            setActiveRoom(null);
            fetchRooms();
        } catch (err) {
            alert("Erreur : " + err.message);
        }
    };

    const handleKickParticipant = async (participantId, participantEmail) => {
        if (!window.confirm(`Retirer ${participantEmail} du groupe ?`)) return;
        try {
            await supabase.from('chat_participants').delete().eq('id', participantId);
            fetchParticipants(activeRoom.id);
        } catch (err) {
            alert("Erreur : " + err.message);
        }
    };

    // --- RENDER ---
    return (
        <div className="flex h-full w-full bg-slate-50 dark:bg-slate-950 overflow-hidden">
            
            {/* SIDEBAR */}
            <div className={`${isSidebarOpen ? 'w-80' : 'w-0'} bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 flex flex-col shrink-0 overflow-hidden`}>
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center shrink-0">
                    <h2 className="font-bold text-lg dark:text-white truncate">Discussions</h2>
                    <button onClick={() => setIsCreating(true)} className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400 transition-colors shrink-0"><Plus size={20}/></button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {rooms.map(room => (
                        <div 
                            key={room.id}
                            onClick={() => { setActiveRoom(room); if (window.innerWidth < 768) setIsSidebarOpen(false); }}
                            className={`group relative p-3 rounded-xl cursor-pointer transition-all border ${activeRoom?.id === room.id ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800' : 'bg-white border-transparent hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800'}`}
                        >
                            <div className="flex justify-between items-start mb-1 pr-6">
                                <span className={`font-bold truncate ${activeRoom?.id === room.id ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-200'}`}>{room.name}</span>
                                {room.status === 'pending' && <span className="bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5 rounded-full font-bold">Invité</span>}
                            </div>
                            <div className="text-xs text-slate-400 flex items-center gap-1">
                                {room.isOwner ? <User size={12}/> : <Users size={12}/>} 
                                {room.isOwner ? 'Propriétaire' : 'Participant'}
                            </div>
                        </div>
                    ))}
                    {rooms.length === 0 && <div className="text-center text-slate-400 text-sm mt-10">Aucune discussion</div>}
                </div>
            </div>

            {/* TOGGLE */}
            <div 
                className="flex flex-col items-center py-4 bg-slate-50 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 w-4 shrink-0 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer transition-colors z-10" 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
                <div className="w-1 h-8 bg-slate-300 dark:bg-slate-700 rounded-full my-auto"></div>
            </div>

            {/* CHAT */}
            <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 relative min-w-0">
                {activeRoom ? (
                    <>
                        {/* Header */}
                        <div className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center px-4 justify-between shrink-0 z-20">
                            <div className="flex items-center gap-3 overflow-hidden">
                                {!isSidebarOpen && (
                                    <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 text-slate-400 hover:text-slate-600"><PanelLeft size={20}/></button>
                                )}
                                <div className="flex flex-col truncate">
                                    <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2 truncate">
                                        <MessageSquare size={20} className="text-indigo-500 shrink-0"/>
                                        <span className="truncate">{activeRoom.name}</span>
                                    </h3>
                                    {/* INDICATEUR EN LIGNE HEADER */}
                                    <span className="text-xs text-slate-400 flex items-center gap-1">
                                        <div className={`w-2 h-2 rounded-full ${onlineUsers.size > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></div>
                                        {onlineUsers.size} en ligne
                                    </span>
                                </div>
                            </div>
                            <button 
                                onClick={() => setShowGroupDetails(true)} 
                                className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors relative"
                                title="Gérer les membres"
                            >
                                <Users size={20}/>
                                {participants.some(p => p.status === 'pending') && (
                                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-amber-500 rounded-full border-2 border-white dark:border-slate-900"></span>
                                )}
                            </button>
                        </div>

                        {/* Contenu */}
                        {activeRoom.status === 'accepted' ? (
                            <>
                                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                                    {messages.map(msg => {
                                        const isMe = msg.sender_id === user.id;
                                        const sender = participants.find(p => p.user_id === msg.sender_id);
                                        const senderName = sender ? sender.user_email.split('@')[0] : 'Inconnu';
                                        const avatarColor = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-amber-500', 'bg-rose-500'][senderName.length % 5];

                                        return (
                                            <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                                {!isMe && (
                                                    <div className="flex items-center gap-2 ml-1 mb-1">
                                                        <div className={`w-4 h-4 rounded-full ${avatarColor} flex items-center justify-center text-[8px] text-white font-bold uppercase`}>{senderName[0]}</div>
                                                        <span className="text-[10px] text-slate-400 font-medium">{senderName}</span>
                                                    </div>
                                                )}
                                                <div className={`max-w-[75%] md:max-w-[60%] p-3 rounded-2xl shadow-sm text-sm break-words ${isMe ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none border border-slate-100 dark:border-slate-700'}`}>
                                                    <p>{msg.content}</p>
                                                    <div className={`text-[10px] mt-1 text-right ${isMe ? 'text-indigo-200' : 'text-slate-400'}`}>
                                                        {format(new Date(msg.created_at), 'HH:mm')}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <div ref={messagesEndRef} />
                                </div>

                                <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
                                    <form onSubmit={handleSendMessage} className="flex gap-2">
                                        <input 
                                            type="text" 
                                            value={newMessage}
                                            onChange={e => setNewMessage(e.target.value)}
                                            placeholder="Écrivez votre message..." 
                                            className="flex-1 bg-slate-100 dark:bg-slate-800 border-transparent focus:bg-white dark:focus:bg-slate-950 focus:border-indigo-500 border rounded-xl px-4 py-3 outline-none transition-all dark:text-white"
                                        />
                                        <button type="submit" className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                                            <Send size={20}/>
                                        </button>
                                    </form>
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                                <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-4"><Clock size={32}/></div>
                                <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Invitation reçue</h2>
                                <div className="flex gap-4">
                                    <button onClick={() => handleInvitation(activeRoom.id, false)} className="px-6 py-3 border border-slate-300 rounded-xl font-bold text-slate-600">Refuser</button>
                                    <button onClick={() => handleInvitation(activeRoom.id, true)} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold">Accepter</button>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-300 dark:text-slate-700">
                        <MessageSquare size={64} className="opacity-20 mb-4"/>
                        <p>Sélectionnez une discussion</p>
                    </div>
                )}
            </div>

            {/* MODAL GESTION MEMBRES */}
            {showGroupDetails && activeRoom && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-xl w-full max-w-sm animate-in zoom-in-95 flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-center mb-4 shrink-0">
                            <h3 className="text-lg font-bold dark:text-white">Membres du groupe</h3>
                            <button onClick={() => setShowGroupDetails(false)}><X size={20} className="text-slate-400"/></button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-2 custom-scrollbar">
                            {participants.map(p => {
                                const isMe = p.user_email === user.email;
                                const isOwner = activeRoom.isOwner;
                                // VÉRIFICATION EN LIGNE (Pour les users ayant un ID Supabase)
                                const isOnline = p.user_id && onlineUsers.has(p.user_id);

                                return (
                                    <div key={p.id} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className="relative">
                                                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center font-bold text-xs shrink-0">
                                                    {p.user_email[0].toUpperCase()}
                                                </div>
                                                {/* INDICATEUR EN LIGNE (PASTILLE) */}
                                                <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-800 ${isOnline ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-slate-800 dark:text-white truncate">
                                                    {p.user_email} {isMe && "(Moi)"}
                                                </p>
                                                <p className={`text-[10px] ${isOnline ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
                                                    {p.status === 'pending' ? 'Invité (En attente)' : (isOnline ? 'En ligne' : 'Hors ligne')}
                                                </p>
                                            </div>
                                        </div>
                                        {isOwner && !isMe && (
                                            <button onClick={() => handleKickParticipant(p.id, p.user_email)} className="p-1.5 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded">
                                                <Ban size={16}/>
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* AJOUT DE MEMBRE */}
                        {activeRoom.isOwner && (
                            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 mb-4">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Ajouter un membre</label>
                                <div className="flex gap-2">
                                    <input 
                                        type="email" 
                                        value={newMemberEmail}
                                        onChange={e => setNewMemberEmail(e.target.value)}
                                        placeholder="email@exemple.com"
                                        className="flex-1 p-2 bg-slate-100 dark:bg-slate-800 rounded-lg outline-none text-sm dark:text-white"
                                    />
                                    <button onClick={handleAddMember} disabled={!newMemberEmail} className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                                        <UserPlus size={18}/>
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 shrink-0">
                            {activeRoom.isOwner ? (
                                <button onClick={() => handleDeleteRoom(activeRoom.id)} className="w-full flex items-center justify-center gap-2 p-3 text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/10 rounded-xl font-bold text-sm">
                                    <Trash2 size={16}/> Supprimer le groupe
                                </button>
                            ) : (
                                <button onClick={handleLeaveRoom} className="w-full flex items-center justify-center gap-2 p-3 text-slate-500 hover:text-red-600 bg-slate-100 hover:bg-red-50 dark:bg-slate-800 rounded-xl font-bold text-sm">
                                    <LogOut size={16}/> Quitter le groupe
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL CRÉATION (Inchangé visuellement, mais code complet ici pour copier-coller) */}
            {isCreating && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-xl w-full max-w-sm animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold dark:text-white">Nouveau Groupe</h3>
                            <button onClick={() => setIsCreating(false)}><X size={20} className="text-slate-400"/></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nom du groupe</label>
                                <input type="text" value={newChatName} onChange={e => setNewChatName(e.target.value)} className="w-full p-2 bg-slate-100 dark:bg-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" placeholder="Ex: Projet Web"/>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Emails des invités</label>
                                <input type="text" value={inviteEmails} onChange={e => setInviteEmails(e.target.value)} className="w-full p-2 bg-slate-100 dark:bg-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" placeholder="email1@test.com, email2@test.com"/>
                            </div>
                            <button onClick={createChat} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 mt-2">Envoyer</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}