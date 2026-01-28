import { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, Send, Plus, User, Check, X, Clock, 
  MoreVertical, Search, AlertCircle 
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
    
    // Formulaire Nouveau Chat
    const [newChatName, setNewChatName] = useState('');
    const [inviteEmail, setInviteEmail] = useState('');
    
    const messagesEndRef = useRef(null);

    // --- 1. CHARGEMENT DES DISCUSSIONS ---
    useEffect(() => {
        fetchRooms();
        
        // Souscription aux changements de statut (invitations)
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
        
        // On récupère les ID des salles où je suis participant
        const { data: myParticipations, error } = await supabase
            .from('chat_participants')
            .select('room_id, status, chat_rooms(name, created_by)')
            .eq('user_email', user.email);

        if (error) console.error("Erreur fetch rooms:", error);
        
        if (myParticipations) {
            // On formate un peu les données pour l'affichage
            const formattedRooms = myParticipations.map(p => ({
                id: p.room_id,
                name: p.chat_rooms?.name || "Discussion sans titre",
                status: p.status, // 'pending' ou 'accepted'
                isOwner: p.chat_rooms?.created_by === user.id
            }));
            setRooms(formattedRooms);
        }
    };

    // --- 2. CHARGEMENT DES MESSAGES & TEMPS RÉEL ---
    useEffect(() => {
        if (!activeRoom) return;
        if (activeRoom.status === 'pending') return; // Pas de messages si pas accepté

        fetchMessages(activeRoom.id);

        // ABONNEMENT TEMPS RÉEL (La magie Supabase)
        const messageSubscription = supabase
            .channel(`room-${activeRoom.id}`)
            .on('postgres_changes', { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'chat_messages',
                filter: `room_id=eq.${activeRoom.id}` 
            }, (payload) => {
                setMessages(current => [...current, payload.new]);
                scrollToBottom();
            })
            .subscribe();

        return () => { supabase.removeChannel(messageSubscription); };
    }, [activeRoom]);

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
        setNewMessage(''); // Reset input immédiat

        const { error } = await supabase
            .from('chat_messages')
            .insert([{
                room_id: activeRoom.id,
                sender_id: user.id,
                content: text
            }]);

        if (error) {
            alert("Erreur envoi message");
            setNewMessage(text); // Remettre le texte si échec
        }
    };

    const createChat = async () => {
        if (!inviteEmail || !newChatName) return alert("Email et Nom requis");

        try {
            // 1. Créer la Room
            const { data: roomData, error: roomError } = await supabase
                .from('chat_rooms')
                .insert([{ name: newChatName, created_by: user.id }])
                .select()
                .single();

            if (roomError) throw roomError;

            // 2. Ajouter les participants
            // Moi (accepté d'office) + Invité (pending)
            const participants = [
                { room_id: roomData.id, user_email: user.email, user_id: user.id, status: 'accepted' },
                { room_id: roomData.id, user_email: inviteEmail, status: 'pending' }
            ];

            const { error: partError } = await supabase.from('chat_participants').insert(participants);
            if (partError) throw partError;

            // Reset et Refresh
            setIsCreating(false);
            setInviteEmail('');
            setNewChatName('');
            fetchRooms();
            alert("Invitation envoyée !");

        } catch (err) {
            console.error(err);
            alert("Erreur création: " + err.message);
        }
    };

    const handleInvitation = async (roomId, accept) => {
        if (accept) {
            await supabase.from('chat_participants')
                .update({ status: 'accepted', user_id: user.id })
                .match({ room_id: roomId, user_email: user.email });
        } else {
            // Refus = on supprime sa participation
            await supabase.from('chat_participants')
                .delete()
                .match({ room_id: roomId, user_email: user.email });
        }
        fetchRooms();
        setActiveRoom(null);
    };

    // --- RENDER ---
    return (
        <div className="flex h-full w-full bg-slate-50 dark:bg-slate-950 overflow-hidden">
            
            {/* LISTE DES CONVERSATIONS (Sidebar Gauche) */}
            <div className="w-80 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                    <h2 className="font-bold text-lg dark:text-white">Messages</h2>
                    <button onClick={() => setIsCreating(true)} className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400 transition-colors"><Plus size={20}/></button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {rooms.map(room => (
                        <div 
                            key={room.id}
                            onClick={() => setActiveRoom(room)}
                            className={`p-3 rounded-xl cursor-pointer transition-all border ${activeRoom?.id === room.id ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800' : 'bg-white border-transparent hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800'}`}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <span className={`font-bold truncate ${activeRoom?.id === room.id ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-200'}`}>{room.name}</span>
                                {room.status === 'pending' && <span className="bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5 rounded-full font-bold">Invité</span>}
                            </div>
                            <div className="text-xs text-slate-400 flex items-center gap-1">
                                <User size={12}/> Participant
                            </div>
                        </div>
                    ))}
                    {rooms.length === 0 && <div className="text-center text-slate-400 text-sm mt-10">Aucune discussion</div>}
                </div>
            </div>

            {/* ZONE DE CHAT (Droite) */}
            <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 relative">
                {activeRoom ? (
                    <>
                        {/* Header Chat */}
                        <div className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center px-6 justify-between shrink-0">
                            <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                                <MessageSquare size={20} className="text-indigo-500"/>
                                {activeRoom.name}
                            </h3>
                            {activeRoom.status === 'pending' && <span className="text-xs bg-amber-100 text-amber-800 px-3 py-1 rounded-full font-bold">Invitation en attente</span>}
                        </div>

                        {/* Contenu Chat */}
                        {activeRoom.status === 'accepted' ? (
                            <>
                                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                                    {messages.map(msg => {
                                        const isMe = msg.sender_id === user.id;
                                        return (
                                            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`max-w-[70%] p-3 rounded-2xl shadow-sm text-sm ${isMe ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none border border-slate-100 dark:border-slate-700'}`}>
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

                                {/* Input Bar */}
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
                            /* Écran Invitation */
                            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                                <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-4"><Clock size={32}/></div>
                                <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Invitation reçue</h2>
                                <p className="text-slate-500 max-w-md mb-8">Vous avez été invité à rejoindre la discussion <strong>"{activeRoom.name}"</strong>. Souhaitez-vous accepter ?</p>
                                <div className="flex gap-4">
                                    <button onClick={() => handleInvitation(activeRoom.id, false)} className="px-6 py-3 border border-slate-300 dark:border-slate-600 rounded-xl font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Refuser</button>
                                    <button onClick={() => handleInvitation(activeRoom.id, true)} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 dark:shadow-none transition-colors">Accepter & Rejoindre</button>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    /* Écran vide */
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-300 dark:text-slate-700">
                        <MessageSquare size={64} className="opacity-20 mb-4"/>
                        <p>Sélectionnez une discussion</p>
                    </div>
                )}
            </div>

            {/* MODAL CRÉATION */}
            {isCreating && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-xl w-full max-w-sm animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold dark:text-white">Nouvelle discussion</h3>
                            <button onClick={() => setIsCreating(false)}><X size={20} className="text-slate-400"/></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nom du groupe / projet</label>
                                <input type="text" value={newChatName} onChange={e => setNewChatName(e.target.value)} className="w-full p-2 bg-slate-100 dark:bg-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" placeholder="Ex: Projet Web"/>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email de l'invité</label>
                                <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} className="w-full p-2 bg-slate-100 dark:bg-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" placeholder="client@email.com"/>
                                <p className="text-[10px] text-slate-400 mt-1">L'utilisateur doit déjà être inscrit sur la plateforme.</p>
                            </div>
                            <button onClick={createChat} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 mt-2">Envoyer l'invitation</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}