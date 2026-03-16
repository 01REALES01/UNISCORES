"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Edit3 } from "lucide-react";
import { supabase } from "@/lib/supabase";

export function WelcomeNotice() {
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
                        className="relative w-full max-w-sm"
                        style={{ perspective: "1000px" }}
                    >
                        <div className="relative group overflow-hidden rounded-[3rem] border border-white/20 bg-zinc-900/90 backdrop-blur-3xl p-8 shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
                            {/* Top Accent Line */}
                            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-red-600 via-amber-500 to-red-600" />
                            
                            {/* Orbital Glow */}
                            <div className="absolute -top-24 -right-24 w-60 h-60 bg-red-600/10 rounded-full blur-[80px] animate-pulse" />
                            
                            <div className="relative z-10">
                                <div className="flex justify-between items-start mb-8">
                                    <div className="p-5 rounded-[2rem] bg-gradient-to-br from-red-600 to-orange-500 text-white shadow-xl shadow-red-600/40 transform -rotate-3 group-hover:rotate-0 transition-transform duration-500">
                                        <Edit3 size={32} strokeWidth={2.5} />
                                    </div>
                                    <button 
                                        onClick={handleClose}
                                        className="p-3 rounded-2xl text-white/20 hover:text-white hover:bg-white/10 transition-all active:scale-90"
                                    >
                                        <X size={24} strokeWidth={3} />
                                    </button>
                                </div>
                                
                                <div className="space-y-4">
                                    <h3 className="text-3xl font-black text-white uppercase tracking-tighter font-outfit leading-[0.9] text-balance">
                                        Personaliza <br/>
                                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-amber-400">Tu Historia Atleta</span>
                                    </h3>
                                    <p className="text-base font-bold text-white/60 leading-relaxed font-outfit italic">
                                        ¡Edita tu perfil ahora! Sube tu mejor foto, define tu disciplina y destaca en el medallero olímpico.
                                    </p>
                                </div>

                                <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="flex -space-x-2">
                                            {[1, 2, 3].map(i => (
                                                <div key={i} className="w-8 h-8 rounded-full border-2 border-zinc-900 bg-zinc-800 flex items-center justify-center overflow-hidden">
                                                    <div className="w-full h-full bg-gradient-to-br from-white/20 to-transparent" />
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-xs font-black text-white leading-none">
                                                {userCount !== null ? `+${userCount}` : "..." }
                                            </span>
                                            <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Atletas</span>
                                        </div>
                                    </div>
                                    <span className="text-[8px] font-black text-white/20 uppercase tracking-[0.4em] text-right">
                                        Uninorte <br/> 2026
                                    </span>
                                </div>
                            </div>

                            {/* Synchronized Progress Bar */}
                            <div className="absolute bottom-0 left-0 right-0 h-2 bg-white/5 overflow-hidden">
                                <motion.div 
                                    initial={{ width: "100%" }}
                                    animate={{ width: "0%" }}
                                    transition={{ duration: DURATION / 1000, ease: "linear" }}
                                    className="h-full bg-gradient-to-r from-red-600 to-amber-500"
                                />
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
