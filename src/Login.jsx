import { useState } from 'react';
import { supabase } from '../supabaseClient'; // Vérifie bien ce chemin (../ ou ./)
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
      
      {/* --- FOND DRAGON GÉANT (Ancré & Discret) --- */}
      {/* On utilise un z-0 pour qu'il soit derrière tout. On force la couleur Indigo pour éviter le "gris dégueulasse". */}
      <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none overflow-hidden">
         <div 
            className="w-[120vh] h-[120vh] bg-indigo-600 transition-all duration-1000 opacity-[0.08]" 
            style={{
                maskImage: 'url(/dragon.png)',
                WebkitMaskImage: 'url(/dragon.png)',
                maskSize: 'contain',
                WebkitMaskSize: 'contain',
                maskPosition: 'center',
                WebkitMaskPosition: 'center',
                maskRepeat: 'no-repeat',
                WebkitMaskRepeat: 'no-repeat',
            }}
         />
      </div>

      {/* Effets de lueurs supplémentaires par-dessus le dragon pour l'ambiance */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none z-0" />

      {/* Carte de Connexion (z-10 pour passer DEVANT le dragon) */}
      <div className="w-full max-w-[500px] animate-in fade-in zoom-in duration-700 relative z-10">
        
        {/* Carte Glassmorphism */}
        <div className="backdrop-blur-xl bg-slate-950/40 border border-white/[0.08] rounded-3xl p-8 md:p-10 shadow-2xl shadow-black/80 ring-1 ring-white/5">
            
            {/* En-tête */}
            <div className="text-center mb-10 mt-2">
                <h1 className="text-3xl font-bold text-white tracking-tight drop-shadow-sm whitespace-nowrap">
                    أهلاً بك في مساحتك الشخصية
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
                        className="w-full bg-slate-950/60 border border-slate-800 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 text-white placeholder-slate-600 rounded-xl pl-12 pr-4 py-3.5 outline-none transition-all text-sm shadow-inner"
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
                        className="w-full bg-slate-950/60 border border-slate-800 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 text-white placeholder-slate-600 rounded-xl pl-12 pr-4 py-3.5 outline-none transition-all text-sm shadow-inner"
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

        {/* Footer Signature (Plus de logo ici, il est en fond géant) */}
        <div className="mt-8 flex flex-col items-center gap-4 opacity-40 hover:opacity-80 transition-opacity duration-500 cursor-default">
            <div className="h-px w-24 bg-gradient-to-r from-transparent via-slate-600 to-transparent"></div>
            <p className="text-[10px] text-slate-400 font-medium tracking-[0.2em] uppercase">
                Created by Henni Mohammed Al Amine
            </p>
        </div>

      </div>
    </div>
  );
}