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
    <div className="min-h-screen w-full bg-[#020617] flex flex-col items-center justify-center p-4 font-sans text-slate-200 relative overflow-hidden selection:bg-indigo-500/30">
      
      {/* Effets de fond (Lueurs) */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Carte Large pour le titre Arabe */}
      <div className="w-full max-w-[500px] animate-in fade-in zoom-in duration-700 relative z-10">
        
        {/* Carte Glassmorphism */}
        <div className="backdrop-blur-2xl bg-white/[0.03] border border-white/[0.08] rounded-3xl p-8 md:p-10 shadow-2xl shadow-black/50 ring-1 ring-white/5">
            
            {/* En-tête Épuré */}
            <div className="text-center mb-10 mt-2">
                <h1 className="text-3xl font-bold text-white tracking-tight drop-shadow-sm whitespace-nowrap">
                Mon Espace Personnel
                </h1>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
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

        {/* Footer Signature & Logo Dragon */}
        <div className="mt-10 flex flex-col items-center gap-8 cursor-default pointer-events-none">
            
            {/* Ligne de séparation */}
            <div className="h-px w-24 bg-gradient-to-r from-transparent via-slate-700 to-transparent"></div>
            
            <p className="text-[10px] text-slate-500 font-medium tracking-[0.2em] uppercase opacity-60">
                Created by Henni Mohammed Al Amine
            </p>

            {/* LE DRAGON : INDIGO, DISCRET, ANCRÉ (Masque CSS) */}
            <div 
                className="w-40 h-40 bg-indigo-500 transition-all duration-500"
                style={{
                    maskImage: 'url(/dragon.png)',
                    WebkitMaskImage: 'url(/dragon.png)',
                    maskSize: 'contain',
                    WebkitMaskSize: 'contain',
                    maskPosition: 'center',
                    WebkitMaskPosition: 'center',
                    maskRepeat: 'no-repeat',
                    WebkitMaskRepeat: 'no-repeat',
                    opacity: 0.15 // Très discret (15% d'opacité) pour faire "filigrane"
                }}
            ></div>

        </div>

      </div>
    </div>
  );
}