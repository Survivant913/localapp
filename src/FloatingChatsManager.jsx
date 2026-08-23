import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import { X, Minus, Send } from 'lucide-react';

// FloatingChat represente une seule fenêtre de discussion
function FloatingChat({ friendEmail, user, onClose }) {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [isMinimized, setIsMinimized] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const messagesEndRef = useRef(null);
    const prevMessagesLength = useRef(0);

    useEffect(() => {
        if (!isMinimized) {
            setUnreadCount(0);
        }
    }, [isMinimized]);

    useEffect(() => {
        if (isMinimized && messages.length > prevMessagesLength.current) {
            const lastMsg = messages[messages.length - 1];
            if (lastMsg && lastMsg.sender_email === friendEmail) {
                setUnreadCount(c => c + 1);
            }
        }
        prevMessagesLength.current = messages.length;
    }, [messages, isMinimized, friendEmail]);

    useEffect(() => {
        fetchMessages();
        checkContactStatus();
        
        // S'abonner uniquement aux messages directs
        const subscription = supabase.channel(`public:direct_messages`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages' }, (payload) => {
                const msg = payload.new;
                // Ignorer les messages de plus de 24h
                const msgDate = new Date(msg.created_at);
                const isRecent = (new Date() - msgDate) < 24 * 60 * 60 * 1000;
                
                if (isRecent && (
                    (msg.sender_email === user.email && msg.receiver_email === friendEmail) ||
                    (msg.sender_email === friendEmail && msg.receiver_email === user.email)
                )) {
                    setMessages(prev => [...prev, msg]);
                }
            })
            .subscribe();

        // S'abonner aux suppressions de contacts pour fermer la bulle automatiquement
        const contactSub = supabase.channel(`public:contacts`)
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'contacts' }, () => {
                checkContactStatus();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
            supabase.removeChannel(contactSub);
        };
    }, [friendEmail, user.email]);

    const checkContactStatus = async () => {
        // Vérifier si le contact existe toujours et est accepté
        // On cherche un contact où (user=moi ET contact=lui) OU (user=lui ET contact=moi)
        const { data, error } = await supabase.from('contacts')
            .select('status, user_id, contact_email')
            .or(`contact_email.eq.${friendEmail},contact_email.eq.${user.email}`);
            
        if (data) {
            // Chercher la ligne qui nous relie
            const isStillFriend = data.some(c => 
                (c.user_id === user.id && c.contact_email === friendEmail && c.status === 'accepted') ||
                (c.contact_email === user.email && c.status === 'accepted') // Si c'est lui qui m'a ajouté, son user_id sera différent mais contact_email = mon email
            );
            
            if (!isStillFriend) {
                onClose(); // Ferme la bulle
            }
        } else {
            onClose();
        }
    };

    useEffect(() => {
        if (!isMinimized) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isMinimized]);

    const fetchMessages = async () => {
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data, error } = await supabase
            .from('direct_messages')
            .select('*')
            .or(`and(sender_email.eq.${user.email},receiver_email.eq.${friendEmail}),and(sender_email.eq.${friendEmail},receiver_email.eq.${user.email})`)
            .gte('created_at', twentyFourHoursAgo)
            .order('created_at', { ascending: true });
            
        if (data && !error) {
            setMessages(data);
        }
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        const payload = {
            sender_email: user.email,
            receiver_email: friendEmail,
            content: newMessage.trim(),
            created_at: new Date().toISOString()
        };

        setNewMessage('');
        const { error } = await supabase.from('direct_messages').insert([payload]);
        if (error) {
            alert("Erreur d'envoi du message: " + error.message);
        }
    };

    if (isMinimized) {
        return (
            <div 
                onClick={() => setIsMinimized(false)}
                className="w-14 h-14 bg-indigo-600 rounded-full shadow-2xl flex items-center justify-center cursor-pointer hover:scale-110 active:scale-95 transition-all relative group"
            >
                <div className="text-white font-bold text-lg">{friendEmail.substring(0, 2).toUpperCase()}</div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-sm flex items-center justify-center text-[8px] text-white font-bold opacity-0 group-hover:opacity-100 transition-opacity z-10" onClick={(e) => { e.stopPropagation(); onClose(); }}>
                    <X size={10} />
                </div>
                {unreadCount > 0 && (
                    <div className="absolute -top-1 -left-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white shadow-sm flex items-center justify-center text-[10px] text-white font-bold animate-bounce z-10">
                        {unreadCount}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="w-80 h-96 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl flex flex-col border border-slate-200 dark:border-slate-800 overflow-hidden animate-slide-up">
            {/* Header */}
            <div className="px-4 py-3 bg-indigo-600 flex justify-between items-center text-white shrink-0">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center font-bold text-xs uppercase">
                        {friendEmail.substring(0, 2)}
                    </div>
                    <span className="font-bold text-sm truncate max-w-[150px]">{friendEmail}</span>
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={() => setIsMinimized(true)} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"><Minus size={16} /></button>
                    <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"><X size={16} /></button>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 dark:bg-slate-900/50">
                {messages.map((m, i) => {
                    const isMe = m.sender_email === user.email;
                    return (
                        <div key={m.id || i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${isMe ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-tl-sm shadow-sm'}`}>
                                {m.content}
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0">
                <form onSubmit={handleSend} className="flex gap-2">
                    <input 
                        type="text" 
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Aa"
                        className="flex-1 bg-slate-100 dark:bg-slate-800 border-none rounded-full px-4 py-2 text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/50"
                    />
                    <button type="submit" disabled={!newMessage.trim()} className="p-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-full transition-colors flex items-center justify-center shrink-0">
                        <Send size={16} />
                    </button>
                </form>
            </div>
        </div>
    );
}

export default function FloatingChatsManager({ activeChats, user, onCloseChat }) {
    if (!activeChats || activeChats.length === 0) return null;

    return (
        <div className="fixed bottom-6 right-6 z-[100] flex items-end gap-4 pointer-events-none">
            {activeChats.map(friendEmail => (
                <div key={friendEmail} className="pointer-events-auto">
                    <FloatingChat 
                        friendEmail={friendEmail} 
                        user={user} 
                        onClose={() => onCloseChat(friendEmail)} 
                    />
                </div>
            ))}
        </div>
    );
}
