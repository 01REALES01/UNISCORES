"use client";

import { useState, useEffect, Suspense } from "react";
import { supabase } from "@/lib/supabase";
import { Lock, AlertCircle, Loader2, ShieldCheck } from "lucide-react";
import UniqueLoading from "@/components/ui/morph-loading";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import { SmokeyBackground } from "@/components/ui/login-form";

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex flex-col items-center justify-center bg-background">
                <UniqueLoading size="lg" />
            </div>
        }>
            <LoginPageContent />
        </Suspense>
    );
}

function LoginPageContent() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, loading: authLoading } = useAuth();

    // Show error from auth callback redirect
    useEffect(() => {
        const callbackError = searchParams.get('error');
        if (callbackError) {
            const messages: Record<string, string> = {
                auth_callback_failed: 'Error al autenticar con Microsoft. Intenta de nuevo.',
                otp_failed: 'El enlace de verificación ha expirado o es inválido.',
                domain_not_allowed: 'Solo se permiten correos institucionales (@uninorte.edu.co).',
            };
            setError(messages[callbackError] || 'Ocurrió un error durante la autenticación.');
        }
    }, [searchParams]);

    // If already logged in, redirect to intended destination or home
    useEffect(() => {
        if (!authLoading && user) {
            const dest = searchParams.get('redirect') || "/";
            router.replace(dest);
        }
    }, [authLoading, user, router, searchParams]);

    const handleMicrosoftLogin = async () => {
        setLoading(true);
        setError(null);
        const { error } = await supabase.auth.signInWithOAuth({
            provider: "azure",
            options: {
                scopes: "openid email",
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        });
        if (error) {
            setError("Error de conexión con Microsoft: " + error.message);
            setLoading(false);
        }
        // Redirect happens automatically
    };

    // Show loading if checking existing auth
    if (authLoading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-background">
                <UniqueLoading size="lg" />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden font-sans selection:bg-amber-500/30">
            {/* ── Background Atmosphere ────────────────────────────────────────── */}
            <div className="absolute inset-0 -z-10 overflow-hidden bg-[#0A0705]">
                <SmokeyBackground className="absolute inset-0 opacity-70" color1="#DB1406" color2="#FFC000" backdropBlurAmount="xl" />
                
                {/* Orbital Glows */}
                <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-amber-500/20 blur-[120px] rounded-full animate-pulse" />
                <div className="absolute -bottom-[10%] -right-[10%] w-[50%] h-[50%] bg-red-600/10 blur-[150px] rounded-full" />
                
                {/* Grid Overlay */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
                    backgroundImage: 'linear-gradient(rgba(255,192,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,192,0,0.1) 1px, transparent 1px)',
                    backgroundSize: '40px 40px'
                }} />
            </div>

            <div className="w-full max-w-md relative z-10">
                {/* ── Header ─────────────────────────────────────────────────── */}
                <div className="text-center mb-10 flex flex-col items-center">
                    <div className="relative mb-8 group">
                        {/* Glow effect for logo */}
                        <div className="absolute inset-0 bg-amber-500/20 blur-3xl rounded-full scale-75 group-hover:scale-110 transition-transform duration-1000" />
                        
                        <img 
                            src="/uninorte_logo.png" 
                            alt="Uninorte 60 Años Logo" 
                            className="h-[160px] w-auto object-contain relative z-10 drop-shadow-[0_10px_40px_rgba(219,20,6,0.3)] transition-all duration-700 group-hover:drop-shadow-[0_10px_60px_rgba(255,192,0,0.4)] group-hover:scale-105" 
                        />
                    </div>

                    <h1 className="text-4xl font-black tracking-tighter mb-1 bg-gradient-to-b from-white via-white to-white/60 inline-block text-transparent bg-clip-text drop-shadow-sm uppercase">
                        Olimpiadas
                    </h1>
                    <div className="flex items-center gap-3">
                        <div className="h-px w-8 bg-gradient-to-r from-transparent to-amber-500/50" />
                        <h2 className="text-2xl font-black tracking-[0.2em] text-amber-500/90" style={{ fontFamily: 'Arial Black, Impact, sans-serif' }}>
                            2026
                        </h2>
                        <div className="h-px w-8 bg-gradient-to-l from-transparent to-amber-500/50" />
                    </div>
                </div>

                {/* ── Card ───────────────────────────────────────────────────── */}
                <div className="group/card bg-[#120D0A]/60 backdrop-blur-3xl rounded-[32px] p-8 border border-white/5 shadow-[0_30px_100px_rgba(0,0,0,0.6)] relative overflow-hidden transition-all duration-500 hover:border-amber-500/20">
                    {/* Animated top border */}
                    <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-amber-500 to-transparent scale-x-50 group-hover/card:scale-x-100 transition-transform duration-700" />
                    
                    <div className="space-y-8">
                        <div className="text-center space-y-3">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-amber-500/5 border border-amber-500/10 mb-2">
                                <ShieldCheck size={14} className="text-amber-500" />
                                <span className="text-[10px] font-black text-amber-500/80 uppercase tracking-widest">Acceso Seguro</span>
                            </div>
                            <h3 className="text-2xl font-black text-white tracking-tight uppercase">Portal de Olimpiadas</h3>
                            <p className="text-white/40 text-sm font-medium leading-relaxed">
                                Bienvenido a la plataforma oficial. Por favor identifícate con tu cuenta institucional.
                            </p>
                        </div>

                        {/* ⚠️ CRITICAL NOTICE: Uninorte Only */}
                        <div className="relative p-6 rounded-2xl bg-amber-500/[0.05] border border-amber-500/20 overflow-hidden group/warning transition-all hover:bg-amber-500/10 text-center">
                            <div className="absolute inset-0 bg-gradient-to-b from-amber-500/[0.02] to-transparent pointer-events-none" />
                            
                            <div className="relative z-10 flex flex-col items-center gap-3">
                                <div className="flex items-center gap-2 text-amber-500 bg-amber-500/10 px-4 py-1.5 rounded-full border border-amber-500/20">
                                    <AlertCircle size={14} className="shrink-0" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Restricción de Acceso</span>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-amber-400 text-sm font-black uppercase tracking-wider leading-tight">
                                        SOLO USUARIOS @UNINORTE.EDU.CO
                                    </p>
                                    <p className="text-amber-100/40 text-[10px] font-medium leading-relaxed max-w-[240px] mx-auto">
                                        El registro está limitado estrictamente a correos institucionales de la Universidad del Norte.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Error Handling */}
                        {error && (
                            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-sm font-medium flex items-center justify-center gap-3 animate-in fade-in slide-in-from-top-2">
                                <AlertCircle size={18} className="shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Microsoft Login Button */}
                        <div className="relative pt-2">
                            {/* Visual highlight behind button */}
                            <div className="absolute inset-0 bg-amber-500/10 blur-2xl opacity-0 group-hover/card:opacity-100 transition-opacity duration-1000" />
                            
                            <button
                                onClick={handleMicrosoftLogin}
                                disabled={loading}
                                className="w-full relative group/btn p-5 rounded-2xl border border-white/10 bg-white/5 shadow-[0_10px_40px_rgba(0,0,0,0.3)] hover:bg-white/10 hover:border-amber-500/40 transition-all duration-500 ease-out overflow-hidden flex items-center justify-center gap-5 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                            >
                                {/* Animated scanline */}
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover/btn:animate-[shimmer_2s_infinite]" />
                                
                                {loading ? (
                                    <Loader2 size={24} className="animate-spin text-amber-500" />
                                ) : (
                                    <div className="relative h-6 w-6">
                                        <svg className="w-full h-full drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
                                            <path fill="#f25022" d="M0 0h10v10H0z" />
                                            <path fill="#7fba00" d="M11 0h10v10H11z" />
                                            <path fill="#00a4ef" d="M0 11h10v10H0z" />
                                            <path fill="#ffb900" d="M11 11h10v10H11z" />
                                        </svg>
                                    </div>
                                )}
                                
                                <span className="relative text-white font-black uppercase tracking-[0.2em] text-sm">
                                    {loading ? 'Validando...' : 'Iniciar Sesión'}
                                </span>
                            </button>
                        </div>
                    </div>

                    {/* Back to Home */}
                    <div className="mt-10 pt-6 border-t border-white/5 text-center">
                        <Link href="/" className="group/back text-[11px] font-black uppercase tracking-[0.25em] text-amber-500/60 hover:text-amber-400 transition-all inline-flex items-center gap-2 drop-shadow-[0_0_10px_rgba(245,158,11,0)] hover:drop-shadow-[0_0_15px_rgba(245,158,11,0.4)]">
                            <span className="group-hover/back:-translate-x-1 transition-transform">←</span>
                            Regresar Inicio
                        </Link>
                    </div>
                </div>

                {/* ── Security Footnote ────────────────────────────────────────── */}
                <div className="mt-10 text-center space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
                    <p className="text-[10px] text-white/20 font-bold flex items-center justify-center gap-3 uppercase tracking-[0.25em]">
                        <Lock size={12} className="text-amber-500/40" />
                        Auth Protocol 2.0 • Uninorte Identity
                    </p>
                    <div className="flex items-center justify-center gap-5 opacity-20 grayscale hover:opacity-40 transition-opacity duration-500">
                         <img src="/uninorte_logo.png" alt="Uninorte" className="h-4 w-auto" />
                         <div className="w-px h-3 bg-white/20" />
                         <span className="text-[9px] font-black text-white tracking-[0.3em]">MICROSOFT CLOUD</span>
                    </div>
                </div>
            </div>

            {/* Shimmer animation for the button */}
            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes shimmer {
                    100% { transform: translateX(100%); }
                }
            ` }} />
        </div>
    );
}
