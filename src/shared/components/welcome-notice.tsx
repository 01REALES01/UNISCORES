"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Edit3 } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

export function WelcomeNotice() {
    const router = useRouter();
    const { user } = useAuth();
    const [isVisible, setIsVisible] = useState(false);
    const [userCount, setUserCount] = useState<number | null>(null);
    const DURATION = 10000; // 10 segundos para leer bien

    useEffect(() => {
        // Fetch real user count
        const fetchUserCount = async () => {
            const { count, error } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true });
            
            if (!error && count !== null) {
                setUserCount(count);
            }
        };
        fetchUserCount();

        const hasSeenNotice = sessionStorage.getItem('welcome-notice-seen');
        if (hasSeenNotice) return;

        // Sincronizar con el final de la Splash (aprox 3.8s para ser inmediato al fadeout)
        const timer = setTimeout(() => setIsVisible(true), 3800);
        
        const autoClose = setTimeout(() => {
            setIsVisible(false);
            sessionStorage.setItem('welcome-notice-seen', 'true');
        }, DURATION + 3800);

        return () => {
            clearTimeout(timer);
            clearTimeout(autoClose);
        };
    }, []);

    const handleClose = () => {
        setIsVisible(false);
        sessionStorage.setItem('welcome-notice-seen', 'true');
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6">
                    {/* Backdrop with Blur */}
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/60 backdrop-blur-md"
                        onClick={handleClose}
                    />

                    <motion.div
                        initial={{ y: 50, opacity: 0, scale: 0.8, rotateX: 20 }}
                        animate={{ y: 0, opacity: 1, scale: 1, rotateX: 0 }}
                        exit={{ y: 20, opacity: 0, scale: 0.9, filter: "blur(10px)" }}
                        transition={{ type: "spring", damping: 20, stiffness: 100 }}
                        className="relative w-full max-w-sm cursor-pointer"
                        style={{ perspective: "1000px" }}
                        onClick={() => {
                            handleClose();
                            if (!user) {
                                router.push('/login');
                            } else {
                                router.push('/perfil');
                            }
                        }}
                    >
                        <div className="relative group overflow-hidden rounded-[4rem] border border-white/10 bg-black/60 backdrop-blur-3xl p-10 shadow-[0_40px_100px_rgba(0,0,0,0.9),0_0_40px_rgba(139,92,246,0.1)] ring-1 ring-white/5 transition-all hover:scale-[1.02]">
                            {/* Top Accent Line - Premium Violet Glow */}
                            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-violet-600 via-indigo-500 to-emerald-500 shadow-[0_0_15px_rgba(124,58,237,0.5)]" />
                            
                            {/* Orbital Glow */}
                            <div className="absolute -top-32 -right-32 w-80 h-80 bg-violet-600/15 rounded-full blur-[100px] pointer-events-none" />
                            <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />
                            
                            <div className="relative z-10">
                                <div className="flex justify-between items-start mb-10">
                                    <div className="p-6 rounded-[2.5rem] bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-2xl shadow-violet-600/40 transform -rotate-6 group-hover:rotate-0 transition-all duration-700">
                                        <Edit3 size={36} strokeWidth={2.5} />
                                    </div>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleClose(); }}
                                        className="p-3 rounded-2xl text-white/20 hover:text-white hover:bg-white/10 transition-all active:scale-90"
                                    >
                                        <X size={24} strokeWidth={3} />
                                    </button>
                                </div>
                                
                                <div className="space-y-5">
                                    <h3 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tighter font-display leading-[0.85] text-balance mb-2">
                                        Personaliza <br/>
                                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-emerald-400 drop-shadow-sm">Tu Historia</span>
                                    </h3>
                                    <p className="text-base sm:text-lg font-bold text-white/50 leading-relaxed font-sans mt-4">
                                        ¡Actualiza tu perfil ahora! Sube tu foto y define tu disciplina para destacar en el medallero oficial.
                                    </p>
                                </div>

                                <div className="mt-10 pt-8 border-t border-white/10 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="flex -space-x-3">
                                            {[1, 2, 3].map(i => (
                                                <div key={i} className="w-10 h-10 rounded-full border-2 border-black bg-zinc-800 flex items-center justify-center overflow-hidden shadow-lg">
                                                    <div className="w-full h-full bg-gradient-to-br from-white/30 to-transparent" />
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-black font-display text-white leading-none">
                                                {userCount !== null ? `+${userCount}` : "..." }
                                            </span>
                                            <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mt-1 font-display">Atletas Reales</span>
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-black text-violet-400/50 uppercase tracking-[0.5em] text-right font-display items-end flex flex-col justify-end leading-none">
                                        Uninorte <br/><span className="text-white/20 mt-1">2026</span>
                                    </span>
                                </div>
                            </div>

                            {/* Synchronized Progress Bar - Premium Emerald */}
                            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/5 overflow-hidden">
                                <motion.div 
                                    initial={{ width: "100%" }}
                                    animate={{ width: "0%" }}
                                    transition={{ duration: DURATION / 1000, ease: "linear" }}
                                    className="h-full bg-gradient-to-r from-emerald-500 to-violet-600 shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                                />
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
