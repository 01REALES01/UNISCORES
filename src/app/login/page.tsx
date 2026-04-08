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

    // If already logged in, redirect to home
    useEffect(() => {
        if (!authLoading && user) {
            router.replace("/");
        }
    }, [authLoading, user, router]);

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
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 -z-10 overflow-hidden bg-background">
                <SmokeyBackground className="absolute inset-0 opacity-80" color1="#DB1406" color2="#FFC000" backdropBlurAmount="xl" />
                <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{
                    backgroundImage: 'linear-gradient(rgba(255,192,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,192,0,0.1) 1px, transparent 1px)',
                    backgroundSize: '60px 60px'
                }} />
            </div>

            <div className="w-full max-w-md">
                {/* Logo & Title */}
                <div className="text-center mb-8 flex flex-col items-center">
                    <div className="relative mb-6">
                        <img src="/uninorte_logo.png" alt="Uninorte 60 Años Logo" className="h-[180px] w-auto object-contain drop-shadow-[0_0_30px_rgba(219,20,6,0.3)] transition-transform hover:scale-105 duration-500" />
                        <div className="absolute top-4 -right-2 w-4 h-4 bg-green-400 rounded-full border-2 border-[#17130D] animate-pulse" />
                    </div>
                    <h1 className="text-3xl font-extrabold tracking-tight mb-1 bg-gradient-to-r from-white to-[#FFC000]/80 inline-block text-transparent bg-clip-text">
                        Olimpiadas Uninorte
                    </h1>
                    <h2 className="text-2xl font-black tracking-tighter text-white/40 mb-2" style={{ fontFamily: 'Arial Black, Impact, sans-serif' }}>
                        2026
                    </h2>
                    <div className="h-px w-12 bg-gradient-to-r from-transparent via-[#FFC000]/50 to-transparent my-4" />
                    <p className="text-[#FFC000]/70 text-[10px] font-bold uppercase tracking-widest">
                        Plataforma de Competencias Universitarias
                    </p>
                </div>

                {/* Card */}
                <div className="bg-background/95 backdrop-blur-3xl rounded-3xl p-8 border border-[#FFC000]/20 shadow-[0_0_50px_rgba(0,0,0,0.8)] relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#DB1406] via-[#FFC000] to-[#DB1406] opacity-50" />
                    
                    <div className="space-y-6">
                        <div className="text-center space-y-2">
                            <h3 className="text-lg font-bold text-white">Acceso Institucional</h3>
                            <p className="text-white/50 text-xs">
                                Utiliza tu cuenta de la Universidad del Norte para acceder a la plataforma.
                            </p>
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="p-4 rounded-xl bg-[#DB1406]/10 border border-[#DB1406]/30 text-[#DB1406] text-sm font-medium flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Microsoft Login Button */}
                        <div className="pt-2">
                            <button
                                onClick={handleMicrosoftLogin}
                                disabled={loading}
                                className="w-full relative group p-4 rounded-xl border border-white/20 bg-white/5 shadow-[0_4px_20px_rgba(0,0,0,0.4)] hover:bg-white/10 hover:border-[#FFC000]/50 transition-all duration-300 ease-in-out overflow-hidden flex items-center justify-center gap-4 disabled:opacity-50"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-[#DB1406]/5 via-[#FFC000]/10 to-[#DB1406]/5 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out" />
                                
                                {loading ? (
                                    <Loader2 size={24} className="animate-spin text-[#FFC000]" />
                                ) : (
                                    <svg className="w-6 h-6 shrink-0" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
                                        <path fill="#f25022" d="M0 0h10v10H0z" />
                                        <path fill="#7fba00" d="M11 0h10v10H11z" />
                                        <path fill="#00a4ef" d="M0 11h10v10H0z" />
                                        <path fill="#ffb900" d="M11 11h10v10H11z" />
                                    </svg>
                                )}
                                
                                <span className="relative text-white font-black uppercase tracking-widest text-sm">
                                    {loading ? 'Conectando...' : 'Entrar con Microsoft'}
                                </span>
                            </button>
                        </div>

                        <div className="flex items-center gap-3 py-2">
                            <div className="h-px flex-1 bg-white/5" />
                            <ShieldCheck size={16} className="text-[#FFC000]/40" />
                            <div className="h-px flex-1 bg-white/5" />
                        </div>

                        <div className="bg-[#FFC000]/5 rounded-xl p-4 border border-[#FFC000]/10">
                            <ul className="space-y-2">
                                <li className="flex items-center gap-2 text-[10px] text-white/40 font-bold uppercase tracking-widest">
                                    <div className="w-1 h-1 rounded-full bg-[#FFC000]" />
                                    Exclusivo para @uninorte.edu.co
                                </li>
                                <li className="flex items-center gap-2 text-[10px] text-white/40 font-bold uppercase tracking-widest">
                                    <div className="w-1 h-1 rounded-full bg-[#FFC000]" />
                                    Sin contraseñas adicionales
                                </li>
                            </ul>
                        </div>
                    </div>

                    {/* Back to Home */}
                    <div className="mt-8 pt-6 border-t border-white/10 text-center">
                        <Link href="/" className="text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-[#FFC000] transition-colors inline-flex items-center gap-1.5 hover:gap-2.5">
                            ← Volver a la página principal
                        </Link>
                    </div>
                </div>

                {/* Security Badge */}
                <div className="mt-8 text-center space-y-3">
                    <p className="text-[10px] text-white/40 font-bold flex items-center justify-center gap-2 uppercase tracking-widest">
                        <Lock size={12} className="text-[#FFC000]/60" />
                        Autenticación Segura Institucional
                    </p>
                    <div className="flex items-center justify-center gap-4 opacity-30 grayscale contrast-125">
                         <img src="/uninorte_logo.png" alt="Uninorte" className="h-6 w-auto" />
                         <div className="w-px h-4 bg-white/20" />
                         <span className="text-[10px] font-black text-white">MICROSOFT AZURE</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
