import { useState, useRef, useEffect } from 'react';
import { 
    Coffee, Palette, Eye, EyeOff, LogOut, Save, 
    Play, Pause, RotateCcw, Target, Sparkles 
} from 'lucide-react';

export default function ZenMode({ data, updateData, close }) {
    // --- ETATS ---
    const [text, setText] = useState(data.settings?.zenNote || "");
    const [reveal, setReveal] = useState(true); 
    const [themeKey, setThemeKey] = useState('minimal');
    const [isSaving, setIsSaving] = useState(false);
    
    // Timer Pomodoro
    const [timeLeft, setTimeLeft] = useState(25 * 60);
    const [isTimerActive, setIsTimerActive] = useState(false);
    const [goal, setGoal] = useState("");

    // Refs
    const scrollRef = useRef(null);
    const textareaRef = useRef(null);

    // --- CONFIGURATION THEMES ---
    const themes = {
        minimal: { 
            name: 'Focus', 
            bg: 'bg-slate-900', 
            text: 'text-slate-300', 
            caret: 'caret-slate-500', 
            border: 'border-slate-700',
            font: 'font-sans'
        },
        paper: { 
            name: 'Papier', 
            bg: 'bg-[#f4ecd8]', 
            text: 'text-stone-800', 
            caret: 'caret-stone-800', 
            border: 'border-stone-400',
            font: 'font-serif'
        },
        hacker: { 
            name: 'Matrix', 
            bg: 'bg-black', 
            text: 'text-green-500', 
            caret: 'caret-green-500', 
            border: 'border-green-800',
            font: 'font-mono' 
        },
        midnight: { 
            name: 'Minuit', 
            bg: 'bg-[#0f172a]', 
            text: 'text-indigo-200', 
            caret: 'caret-indigo-400', 
            border: 'border-indigo-900',
            font: 'font-sans' 
        }
    };

    const currentTheme = themes[themeKey];

    // --- LOGIQUE TIMER ---
    useEffect(() => {
        let interval = null;
        if (isTimerActive && timeLeft > 0) {
            interval = setInterval(() => setTimeLeft(t => t - 1), 1000);
        } else if (timeLeft === 0) {
            setIsTimerActive(false);
        }
        return () => clearInterval(interval);
    }, [isTimerActive, timeLeft]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const toggleTimer = () => setIsTimerActive(!isTimerActive);
    const resetTimer = () => { setIsTimerActive(false); setTimeLeft(25 * 60); };

    // --- SAUVEGARDE INTELLIGENTE ---
    useEffect(() => {
        const timer = setTimeout(() => {
            if (text !== (data.settings?.zenNote || "")) {
                setIsSaving(true);
                updateData({ ...data, settings: { ...data.settings, zenNote: text } });
                setTimeout(() => setIsSaving(false), 1000);
            }
        }, 1500);
        return () => clearTimeout(timer);
    }, [text]);

    // --- ACTIONS ---
    const cycleTheme = () => { 
        const keys = Object.keys(themes); 
        setThemeKey(keys[(keys.indexOf(themeKey) + 1) % keys.length]); 
    };

    // --- MOTEUR DE CRYPTAGE (ALIGNE PARFAITEMENT) ---
    const scramble = (str) => {
        return str.split('').map(char => {
            if (char === '\n') return '\n';
            if (char === ' ') return ' ';
            // On décale le code ASCII pour l'effet visuel
            return String.fromCharCode(char.charCodeAt(0) + 3);
        }).join('');
    };

    // Synchronisation du scroll entre les deux calques
    const handleScroll = (e) => {
        if (scrollRef.current) scrollRef.current.scrollTop = e.target.scrollTop;
    };

    return (
        <div className={`fixed inset-0 z-[100] flex flex-col transition-colors duration-700 animate-in fade-in zoom-in-95 ${currentTheme.bg} ${currentTheme.text}`}>
            
            {/* CSS INJECTÉ : Cache la scrollbar tout en permettant le scroll */}
            <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>

            {/* --- EN-TÊTE FLOTTANT (Auto-hide) --- */}
            <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start opacity-0 hover:opacity-100 transition-opacity duration-500 z-50 bg-gradient-to-b from-black/20 to-transparent">
                
                {/* Timer & Objectif */}
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-4">
                        <div className={`text-4xl font-mono font-bold tracking-tighter tabular-nums ${isTimerActive ? 'opacity-100' : 'opacity-60'}`}>
                            {formatTime(timeLeft)}
                        </div>
                        <div className="flex gap-1">
                            <button onClick={toggleTimer} className={`p-2 rounded-full border ${currentTheme.border} hover:bg-white/10 transition-colors`}>
                                {isTimerActive ? <Pause size={16}/> : <Play size={16}/>}
                            </button>
                            <button onClick={resetTimer} className={`p-2 rounded-full border ${currentTheme.border} hover:bg-white/10 transition-colors`}>
                                <RotateCcw size={16}/>
                            </button>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm opacity-70 group">
                        <Target size={14}/>
                        <input 
                            type="text" 
                            value={goal}
                            onChange={(e) => setGoal(e.target.value)}
                            placeholder="Mon objectif unique..." 
                            className="bg-transparent outline-none w-64 placeholder:text-current/30"
                        />
                    </div>
                </div>

                {/* Outils Droite */}
                <div className="flex flex-col items-end gap-2">
                    <div className="flex gap-2">
                        {isSaving && <span className="text-xs animate-pulse mr-2 my-auto">Sauvegarde...</span>}
                        
                        <button onClick={cycleTheme} title="Thème" className={`p-3 rounded-xl border ${currentTheme.border} hover:bg-white/10 transition-all`}>
                            <Palette size={20}/>
                        </button>
                        
                        <button onClick={() => setReveal(!reveal)} title="Mode Discret" className={`p-3 rounded-xl border ${currentTheme.border} hover:bg-white/10 transition-all`}>
                            {reveal ? <Eye size={20}/> : <EyeOff size={20}/>}
                        </button>
                        
                        <button onClick={close} title="Quitter" className="p-3 rounded-xl border border-red-500/30 text-red-500 hover:bg-red-500/20 transition-all">
                            <LogOut size={20}/>
                        </button>
                    </div>
                    <div className="text-[10px] uppercase tracking-widest opacity-30 font-bold flex items-center gap-2">
                        <Coffee size={12}/> Zen Mode
                    </div>
                </div>
            </div>

            {/* --- ZONE D'ÉCRITURE PRINCIPALE --- */}
            <div className="flex-1 relative flex justify-center items-center overflow-hidden pt-20 pb-10 px-4 md:px-20">
                
                <div className="relative w-full h-full max-w-5xl">
                    
                    {/* CALQUE 1 : TEXTE CRYPTÉ (Arrière-plan) */}
                    {/* Note: pointer-events-none permet de cliquer au travers */}
                    <div 
                        ref={scrollRef}
                        className={`
                            absolute inset-0 w-full h-full p-8 md:p-12
                            whitespace-pre-wrap break-words 
                            text-lg md:text-2xl leading-loose
                            pointer-events-none overflow-hidden
                            ${currentTheme.font}
                            transition-opacity duration-500
                            ${reveal ? 'opacity-0' : 'opacity-50 blur-[1px]'}
                        `}
                    >
                        {scramble(text)}
                    </div>

                    {/* CALQUE 2 : VRAIE ZONE DE SAISIE (Premier plan) */}
                    <textarea 
                        ref={textareaRef}
                        value={text} 
                        onChange={(e) => setText(e.target.value)} 
                        onScroll={handleScroll}
                        autoFocus 
                        spellCheck="false"
                        placeholder="Qu'avez-vous en tête ?"
                        className={`
                            absolute inset-0 z-10 w-full h-full p-8 md:p-12
                            bg-transparent resize-none outline-none 
                            text-lg md:text-2xl leading-loose
                            ${currentTheme.font} ${currentTheme.caret}
                            transition-colors duration-300 no-scrollbar
                            ${reveal ? 'text-current' : 'text-transparent selection:bg-white/10 selection:text-transparent'}
                        `} 
                    />
                    
                    {/* Barre latérale décorative (Focus line) */}
                    <div className={`absolute left-0 top-12 bottom-12 w-1 rounded-full opacity-20 ${currentTheme.text.replace('text', 'bg')}`}></div>
                </div>

            </div>

            {/* Compteur de mots discret en bas */}
            {text.length > 0 && (
                <div className="absolute bottom-4 right-6 text-xs opacity-20 font-mono">
                    {text.length} car. | {text.split(/\s+/).filter(w => w.length > 0).length} mots
                </div>
            )}
        </div>
    );
}