import React, { useState } from 'react';
import { X, Users, Mail, Trash2, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { supabase } from './supabaseClient';

export default function ShareProjectModal({ project, shares, onClose, updateData, data }) {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleInvite = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        if (!email.includes('@')) {
            setError('Adresse email invalide');
            setLoading(false);
            return;
        }

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Non connecté");

            if (email.toLowerCase() === user.email.toLowerCase()) {
                setError("Vous ne pouvez pas vous inviter vous-même");
                setLoading(false);
                return;
            }

            const { error: dbError } = await supabase
                .from('project_shares')
                .insert([
                    { project_id: project.id, user_email: email.toLowerCase(), owner_id: user.id }
                ]);

            if (dbError) {
                if (dbError.code === '23505') {
                    setError('Cet utilisateur est déjà invité');
                } else {
                    throw dbError;
                }
            } else {
                setSuccess('Invitation envoyée !');
                setEmail('');
            }
        } catch (err) {
            console.error(err);
            setError('Erreur lors de l\'invitation');
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveShare = async (shareId) => {
        try {
            await supabase.from('project_shares').delete().eq('id', shareId);
            if (updateData && data) {
                const newShares = (data.project_shares || []).filter(s => s.id !== shareId);
                updateData({ ...data, project_shares: newShares }, { table: 'project_shares', id: shareId, action: 'delete' });
            }
        } catch (err) {
            console.error('Erreur lors de la suppression du partage:', err);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-[#111113] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-zinc-200 dark:border-zinc-800 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-5 border-b border-zinc-200 dark:border-zinc-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-zinc-100 dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white rounded-xl">
                            <Users size={18} />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-zinc-900 dark:text-white">Partager le Projet</h2>
                            <p className="text-xs text-zinc-500 truncate max-w-[200px]">{project.title}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6">
                    <div className="mb-6">
                        <label className="block text-xs font-mono uppercase tracking-wider text-zinc-500 mb-2">Inviter quelqu'un</label>
                        <form onSubmit={handleInvite} className="flex gap-2">
                            <div className="relative flex-1">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail size={15} className="text-zinc-500" />
                                </div>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Adresse email..."
                                    className="w-full pl-9 pr-4 py-2.5 bg-zinc-50 dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-xl focus:border-zinc-500 outline-none text-sm text-zinc-900 dark:text-white transition-all"
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading || !email}
                                className="px-4 py-2.5 bg-zinc-900 dark:bg-white hover:opacity-90 disabled:opacity-40 text-white dark:text-[#09090b] text-sm font-semibold rounded-xl transition-all"
                            >
                                {loading ? '...' : 'Inviter'}
                            </button>
                        </form>
                        {error && <p className="text-red-500 text-xs mt-2 flex items-center gap-1"><X size={12}/> {error}</p>}
                        {success && <p className="text-emerald-500 text-xs mt-2 flex items-center gap-1"><CheckCircle2 size={12} /> {success}</p>}
                    </div>

                    <div>
                        <h3 className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider mb-3">Membres actuels</h3>
                        <div className="space-y-2">
                            {/* Le créateur (Vous) */}
                            <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-[#09090b] rounded-xl border border-zinc-200 dark:border-zinc-800">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-zinc-900 dark:bg-white flex items-center justify-center text-white dark:text-[#09090b] font-bold text-xs">
                                        Moi
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-zinc-900 dark:text-white">Vous</p>
                                        <p className="text-xs text-zinc-500">Propriétaire</p>
                                    </div>
                                </div>
                                <ShieldAlert size={15} className="text-zinc-400" />
                            </div>

                            {/* Les invités */}
                            {shares.map(share => (
                                <div key={share.id} className="flex items-center justify-between p-3 bg-white dark:bg-[#141416] rounded-xl border border-zinc-200 dark:border-zinc-800">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 font-bold text-xs uppercase">
                                            {share.user_email.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-zinc-900 dark:text-white truncate max-w-[150px]">{share.user_email}</p>
                                            <p className="text-xs text-zinc-500">Invité</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleRemoveShare(share.id)}
                                        className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                        title="Retirer l'accès"
                                    >
                                        <Trash2 size={15} />
                                    </button>
                                </div>
                            ))}
                            {shares.length === 0 && (
                                <p className="text-xs text-center text-zinc-500 py-4">
                                    Ce projet n'est partagé avec personne pour le moment.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
