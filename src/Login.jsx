import { useState } from 'react';
import { supabase } from './supabaseClient';
import { Loader2, ArrowRight, Lock, Mail, LayoutDashboard } from 'lucide-react';

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
    <div className="min-h-screen w-full bg-[#020617] flex flex-col items-center justify-center p-4 font-sans text-slate-200 relative overflow-hidden selection:bg-indigo-500/30">
      
      {/* Effets de fond (Lueurs) */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-sm animate-in fade-in zoom-in duration-700 relative z-10">
        
        {/* Carte Glassmorphism */}
        <div className="backdrop-blur-2xl bg-white/[0.03] border border-white/[0.08] rounded-3xl p-8 shadow-2xl shadow-black/50 ring-1 ring-white/5">
            
            {/* En-tête */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-white/10 to-white/0 border border-white/10 mb-6 shadow-inner">
                <LayoutDashboard size={26} className="text-indigo-400 drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]" />
              </div>
              
              <div className="flex flex-col items-center gap-1">
                <h1 className="text-2xl font-bold text-white tracking-tight">Freelance Cockpit</h1>
                <p className="text-slate-500 text-xs font-medium tracking-widest uppercase">
                    Système de gestion
                </p>
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
                {/* Input Email */}
                <div className="group relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                        <Mail size={18} />
                    </div>
                    <input
                        type="email"
                        placeholder="Identifiant"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-slate-950/50 border border-slate-800 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 text-white placeholder-slate-600 rounded-xl pl-12 pr-4 py-3.5 outline-none transition-all text-sm shadow-inner"
                        required
                    />
                </div>

                {/* Input Password */}
                <div className="group relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                        <Lock size={18} />
                    </div>
                    <input
                        type="password"
                        placeholder="Mot de passe"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-slate-950/50 border border-slate-800 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 text-white placeholder-slate-600 rounded-xl pl-12 pr-4 py-3.5 outline-none transition-all text-sm shadow-inner"
                        required
                    />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-white hover:bg-slate-100 text-slate-950 font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-6 shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)] hover:shadow-[0_0_25px_-5px_rgba(255,255,255,0.5)]"
                >
                  {loading ? (
                      <Loader2 size={18} className="animate-spin"/> 
                  ) : (
                      <span className="flex items-center gap-2">
                          Initialiser <ArrowRight size={16}/>
                      </span>
                  )}
                </button>
            </form>
        </div>

        {/* Footer Signature */}
        <div className="mt-12 text-center space-y-2 opacity-40 hover:opacity-80 transition-opacity cursor-default">
            <div className="h-px w-12 bg-gradient-to-r from-transparent via-slate-500 to-transparent mx-auto mb-4"></div>
            <p className="text-[10px] text-slate-400 font-medium tracking-widest uppercase">
                Created by Henni Mohammed Al Amine
            </p>
        </div>

      </div>
    </div>
  );
}