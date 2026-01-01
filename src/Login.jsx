import { useState } from 'react';
import { supabase } from './supabaseClient';
import { Loader2, ArrowRight, ShieldCheck, Lock, Mail } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const { error } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
    });

    if (error) {
        alert("Erreur : " + error.message);
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 flex flex-col items-center justify-center p-4 font-sans text-slate-200">
      
      <div className="w-full max-w-sm animate-in fade-in zoom-in duration-500">
        
        {/* En-tête */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 mb-6 shadow-2xl shadow-black">
            <ShieldCheck size={24} className="text-white" />
          </div>
          
          <div className="flex items-center justify-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-white tracking-tight">LocalApp</h1>
            {/* BADGE BETA */}
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500/10 text-orange-500 border border-orange-500/20 uppercase tracking-widest">
              BETA
            </span>
          </div>
          
          <p className="text-slate-500 text-sm">
            Accès réservé aux membres autorisés
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
            {/* Input Email */}
            <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                    <Mail size={18} />
                </div>
                <input
                    type="email"
                    placeholder="Identifiant"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-900/50 border border-slate-800 focus:border-slate-600 text-white placeholder-slate-600 rounded-xl pl-12 pr-4 py-3.5 outline-none transition-all text-sm"
                    required
                />
            </div>

            {/* Input Password */}
            <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                    <Lock size={18} />
                </div>
                <input
                    type="password"
                    placeholder="Mot de passe"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-900/50 border border-slate-800 focus:border-slate-600 text-white placeholder-slate-600 rounded-xl pl-12 pr-4 py-3.5 outline-none transition-all text-sm"
                    required
                />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white hover:bg-slate-200 text-black font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
            >
              {loading ? (
                  <Loader2 size={18} className="animate-spin"/> 
              ) : (
                  <span className="flex items-center gap-2">
                      Accéder à l'espace <ArrowRight size={16}/>
                  </span>
              )}
            </button>
        </form>

        {/* Footer avec TA SIGNATURE */}
        <div className="mt-12 text-center space-y-1 opacity-50 hover:opacity-80 transition-opacity">
            <p className="text-[10px] text-slate-600 uppercase tracking-widest">
                Private System v1.0
            </p>
            <p className="text-[10px] text-slate-500 font-medium">
                Created by Henni Mohammed Al Amine
            </p>
        </div>
      </div>
    </div>
  );
}