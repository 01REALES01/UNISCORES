"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, UserCircle2, Edit3, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

export function WelcomeNotice() {
    const [isVisible, setIsVisible] = useState(false);
    const DURATION = 10000; // 10 segundos

    useEffect(() => {
        const hasSeenNotice = sessionStorage.getItem('welcome-notice-seen');
        if (hasSeenNotice) return;

        const timer = setTimeout(() => setIsVisible(true), 800);
        
        const autoClose = setTimeout(() => {
            setIsVisible(false);
            sessionStorage.setItem('welcome-notice-seen', 'true');
        }, DURATION + 800);

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
                <motion.div
                    initial={{ y: 100, opacity: 0, scale: 0.8, rotateX: 20 }}
                    animate={{ y: 0, opacity: 1, scale: 1, rotateX: 0 }}
                    exit={{ y: 50, opacity: 0, scale: 0.9, filter: "blur(10px)" }}
                    transition={{ type: "spring", damping: 20, stiffness: 100 }}
                    className="fixed bottom-6 right-6 z-[9999] w-[calc(100%-3rem)] max-w-sm"
                    style={{ perspective: "1000px" }}
                >
                    <div className="relative group overflow-hidden rounded-[2.5rem] border border-white/20 bg-zinc-900/80 backdrop-blur-3xl p-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                        {/* Background Ornament */}
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 via-amber-500 to-red-600 opacity-50" />
                        
                        {/* Subtle Mesh Glow */}
                        <div className="absolute -top-24 -right-24 w-48 h-48 bg-red-600/20 rounded-full blur-[60px] animate-pulse" />
                        
                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-6">
                                <div className="p-4 rounded-3xl bg-gradient-to-br from-red-600 to-orange-500 text-white shadow-lg shadow-red-600/40">
                                    <Edit3 size={28} strokeWidth={2.5} />
                                </div>
                                <button 
                                    onClick={handleClose}
                                    className="p-2 rounded-2xl text-white/30 hover:text-white hover:bg-white/10 transition-all active:scale-90"
                                >
                                    <X size={20} strokeWidth={3} />
                                </button>
                            </div>
                            
                            <div className="space-y-3">
                                <h3 className="text-2xl font-black text-white uppercase tracking-tighter font-outfit leading-none">
                                    Tu Atleta, <br/>
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-amber-400">Tu Identidad</span>
                                </h3>
                                <p className="text-sm font-bold text-white/50 leading-relaxed font-outfit italic">
                                    ¡Edita tu perfil ahora! Sube tu foto, ajusta tu disciplina y deja que todos vean quién manda en la cancha.
                                </p>
                            </div>

                            <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between">
                                <div className="flex -space-x-2">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="w-8 h-8 rounded-full border-2 border-zinc-900 bg-zinc-800 flex items-center justify-center overflow-hidden">
                                            <div className="w-full h-full bg-gradient-to-br from-white/10 to-transparent" />
                                        </div>
                                    ))}
                                    <div className="w-8 h-8 rounded-full border-2 border-zinc-900 bg-red-600 flex items-center justify-center text-[10px] font-black">
                                        +99
                                    </div>
                                </div>
                                <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Live Members</span>
                            </div>
                        </div>

                        {/* High-Contrast Progress Bar */}
                        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/5">
                            <motion.div 
                                initial={{ width: "100%" }}
                                animate={{ width: "0%" }}
                                transition={{ duration: DURATION / 1000, ease: "linear", delay: 0.8 }}
                                className="h-full bg-gradient-to-r from-red-600 to-amber-500"
                            />
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
