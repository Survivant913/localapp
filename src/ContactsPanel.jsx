import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { X, UserPlus, MessageCircle, Check, Clock, UserMinus } from 'lucide-react';

export default function ContactsPanel({ isOpen, onClose, user, onStartChat, onlineUsers }) {
    const [contacts, setContacts] = useState([]);
    const [newEmail, setNewEmail] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isOpen || !user) return;
        fetchContacts();
    }, [isOpen, user]);

    const fetchContacts = async () => {
        if (!user) return;
        // Contacts où l'utilisateur est le propriétaire (user_id)
        const { data: myContacts } = await supabase.from('contacts').select('*').eq('user_id', user.id);
        // Contacts où l'utilisateur a été ajouté (contact_email)
        const { data: requests } = await supabase.from('contacts').select('*').eq('contact_email', user.email);
        
        setContacts([...(myContacts || []), ...(requests || [])]);
    };

    const handleAddContact = async (e) => {
        e.preventDefault();
        if (!newEmail.trim() || newEmail === user.email) return;
        
        setLoading(true);
        try {
            const { error } = await supabase.from('contacts').insert([
                { user_id: user.id, contact_email: newEmail.trim().toLowerCase(), status: 'pending', sender_email: user.email }
            ]);
            if (error) throw error;
            
            // Envoyer une notification à la personne invitée
            await supabase.from('notifications').insert([{
                user_email: newEmail.trim().toLowerCase(),
                title: 'Nouvelle demande d\'ami',
                message: `${user.email} souhaite vous ajouter à ses contacts.`,
                type: 'system',
                is_read: false
            }]);

            setNewEmail('');
            fetchContacts();
        } catch (err) {
            alert("Erreur lors de l'ajout (Vérifiez que le script SQL a bien été exécuté) : " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAccept = async (contactId, contactEmail) => {
        const { data, error } = await supabase.from('contacts').update({ status: 'accepted' }).eq('id', contactId).select();
        if (error) {
            alert("Erreur lors de l'acceptation. Détail: " + error.message);
            return;
        }
        
        if (!data || data.length === 0) {
            alert("Attention: L'action a été bloquée silencieusement par la base de données. C'est un problème de permissions (RLS). Veuillez vous assurer d'avoir exécuté le script 'fix_contacts_rls.sql' dans Supabase !");
            return;
        }

        // Envoyer une notification à l'expéditeur
        if (contactEmail) {
            await supabase.from('notifications').insert([{
                user_email: contactEmail,
                title: 'Demande d\'ami acceptée',
                message: `${user.email} a accepté votre demande de contact !`,
                type: 'system',
                is_read: false
            }]);
        }
        
        fetchContacts();
    };

    const handleDelete = async (contactId) => {
        const { data, error } = await supabase.from('contacts').delete().eq('id', contactId).select();
        if (error) {
            alert("Erreur lors de la suppression: " + error.message);
            return;
        }
        if (!data || data.length === 0) {
            alert("Attention: La suppression a été bloquée (RLS). Avez-vous exécuté 'fix_contacts_rls.sql' ?");
            return;
        }
        fetchContacts();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-y-0 right-0 w-full md:w-96 bg-white/90 dark:bg-slate-900/90 backdrop-blur-3xl shadow-2xl z-[100] flex flex-col border-l border-slate-200 dark:border-slate-800 animate-slide-in-right">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-widest flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
                        <UserPlus size={20} />
                    </div>
                    Contacts
                </h2>
                <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-800 dark:hover:text-white bg-slate-100 dark:bg-slate-800 rounded-xl transition-all">
                    <X size={20} />
                </button>
            </div>

            <div className="p-6">
                <form onSubmit={handleAddContact} className="flex gap-2">
                    <input 
                        type="email" 
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="Email du contact..."
                        className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-800 dark:text-white outline-none focus:border-indigo-500"
                        required
                    />
                    <button type="submit" disabled={loading} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-900/20 transition-all disabled:opacity-50">
                        Ajouter
                    </button>
                </form>
            </div>

            <div className="flex-1 overflow-y-auto p-6 pt-0 space-y-6 scrollbar-hide">
                {/* Demandes reçues */}
                {contacts.filter(c => c.contact_email === user.email && c.status === 'pending').length > 0 && (
                    <div>
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Demandes reçues</h3>
                        <div className="space-y-2">
                            {contacts.filter(c => c.contact_email === user.email && c.status === 'pending').map(c => (
                                <div key={c.id} className="p-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                                    <span className="text-sm font-medium dark:text-white truncate">
                                        De : {c.sender_email || 'Utilisateur inconnu'}
                                    </span>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleAccept(c.id, c.sender_email)} className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-200"><Check size={14}/></button>
                                        <button onClick={() => handleDelete(c.id)} className="p-1.5 bg-rose-100 text-rose-600 rounded-lg hover:bg-rose-200"><X size={14}/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Mes Contacts */}
                <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Mes Amis</h3>
                    <div className="space-y-2">
                        {contacts.filter(c => c.status === 'accepted').length === 0 ? (
                            <p className="text-sm text-slate-500 italic">Aucun contact pour le moment.</p>
                        ) : (
                            contacts.filter(c => c.status === 'accepted').map(c => {
                                const isMe = c.user_id === user.id;
                                const friendEmail = isMe ? c.contact_email : (c.sender_email || 'Ami');
                                const isOnline = onlineUsers.has(friendEmail);

                                return (
                                    <div key={c.id} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700/50 flex items-center gap-3 group">
                                        <div className="relative">
                                            <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center rounded-xl font-bold uppercase">
                                                {friendEmail.substring(0,2)}
                                            </div>
                                            <span className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 ${isOnline ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{friendEmail}</p>
                                            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">{isOnline ? 'En ligne' : 'Hors ligne'}</p>
                                        </div>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => { onStartChat(friendEmail); onClose(); }} className="p-2 bg-blue-500 text-white rounded-lg shadow-md hover:bg-blue-400" title="Discuter">
                                                <MessageCircle size={16} />
                                            </button>
                                            <button onClick={() => handleDelete(c.id)} className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg" title="Supprimer">
                                                <UserMinus size={16} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Demandes envoyées */}
                {contacts.filter(c => c.user_id === user.id && c.status === 'pending').length > 0 && (
                    <div>
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Demandes envoyées</h3>
                        <div className="space-y-2">
                            {contacts.filter(c => c.user_id === user.id && c.status === 'pending').map(c => (
                                <div key={c.id} className="p-3 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-700/30 flex items-center justify-between opacity-70">
                                    <div className="flex items-center gap-2">
                                        <Clock size={14} className="text-slate-400" />
                                        <span className="text-sm font-medium text-slate-500 truncate">{c.contact_email}</span>
                                    </div>
                                    <button onClick={() => handleDelete(c.id)} className="p-1.5 text-rose-400 hover:text-rose-500 rounded-lg"><X size={14}/></button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
