import { useState } from 'react';
import { supabase } from './supabaseClient'; // CORRECTION ICI : ./ et pas ../
import { Loader2, ArrowRight, Lock, Mail } from 'lucide-react';

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
    <div className="min-h-screen w-full bg-[#09090b] flex flex-col items-center justify-center p-4 font-sans text-zinc-200 relative overflow-hidden selection:bg-white/20">

      {/* Carte Principale */}
      <div className="w-full max-w-[460px] animate-in fade-in zoom-in-95 duration-500 relative z-10">
        
        <div className="bg-[#111113] border border-zinc-800 rounded-2xl p-8 md:p-10">
            
            {/* En-tête Épuré */}
            <div className="text-center mb-8 mt-1">
                <h1 className="text-2xl font-bold text-white tracking-tight whitespace-nowrap">
                Mon Espace Personnel
                </h1>
                <p className="text-xs text-zinc-500 uppercase tracking-widest mt-2 font-mono">Authentification</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
                {/* Input Email */}
                <div className="group relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-white transition-colors">
                        <Mail size={17} />
                    </div>
                    <input
                        type="email"
                        placeholder="Identifiant"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-[#09090b] border border-zinc-800 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 text-white placeholder-zinc-600 rounded-xl pl-11 pr-4 py-3 outline-none transition-all text-sm"
                        required
                    />
                </div>

                {/* Input Password */}
                <div className="group relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-white transition-colors">
                        <Lock size={17} />
                    </div>
                    <input
                        type="password"
                        placeholder="Mot de passe"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-[#09090b] border border-zinc-800 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 text-white placeholder-zinc-600 rounded-xl pl-11 pr-4 py-3 outline-none transition-all text-sm"
                        required
                    />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-white hover:bg-zinc-200 text-[#09090b] font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-6 text-sm"
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
        <div className="mt-8 flex flex-col items-center gap-4 cursor-default pointer-events-none">
            <div className="h-px w-16 bg-zinc-800"></div>
            <p className="text-[10px] text-zinc-600 font-medium tracking-[0.2em] uppercase">
                Created by Henni Mohammed Al Amine
            </p>
        </div>

      </div>
    </div>
  );
}