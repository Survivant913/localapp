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
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 dark:border-slate-700 animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
                            <Users size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Partager le Projet</h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]">{project.title}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-xl transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6">
                    <div className="mb-6">
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Inviter quelqu'un</label>
                        <form onSubmit={handleInvite} className="flex gap-2">
                            <div className="relative flex-1">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail size={16} className="text-gray-400" />
                                </div>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Adresse email..."
                                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm text-gray-900 dark:text-white transition-all"
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading || !email}
                                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-bold rounded-xl transition-colors shadow-sm"
                            >
                                {loading ? '...' : 'Inviter'}
                            </button>
                        </form>
                        {error && <p className="text-red-500 text-xs mt-2 flex items-center gap-1"><X size={12}/> {error}</p>}
                        {success && <p className="text-green-500 text-xs mt-2 flex items-center gap-1"><CheckCircle2 size={12} /> {success}</p>}
                    </div>

                    <div>
                        <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Membres actuels</h3>
                        <div className="space-y-2">
                            {/* Le créateur (Vous) */}
                            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-900/50 rounded-xl border border-gray-100 dark:border-slate-700">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-xs">
                                        Moi
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">Vous</p>
                                        <p className="text-xs text-gray-500">Propriétaire</p>
                                    </div>
                                </div>
                                <ShieldAlert size={16} className="text-blue-500" />
                            </div>

                            {/* Les invités */}
                            {shares.map(share => (
                                <div key={share.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold text-xs uppercase">
                                            {share.user_email.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[150px]">{share.user_email}</p>
                                            <p className="text-xs text-gray-500">Invité</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleRemoveShare(share.id)}
                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                        title="Retirer l'accès"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                            {shares.length === 0 && (
                                <p className="text-sm text-center text-gray-500 dark:text-gray-400 py-4 italic">
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
