"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { AlertTriangle, Lock, Mail, Key, Loader2, ArrowLeft, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SmokeyBackground } from "@/components/ui/login-form";

/**
 * EMERGENCY LOGIN PAGE
 * Used when Microsoft OAuth is failing.
 * Requires an admin email and a password set manually in auth.users.
 */
export default function EmergencyLoginPage() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const router = useRouter();

    const handleEmergencyLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { data, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (authError) {
                setError(authError.message);
                setLoading(false);
                return;
            }

            if (data?.user) {
                setSuccess(true);
                // Wait a moment for session to propagate
                setTimeout(() => {
                    router.push("/admin");
                    router.refresh();
                }, 1000);
            }
        } catch (err) {
            setError("Error inesperado en el sistema.");
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#0A0505]">
            {/* Background Aesthetics */}
            <div className="absolute inset-0 -z-10 overflow-hidden">
                <SmokeyBackground 
                    className="absolute inset-0 opacity-40" 
                    color1="#FF0000" 
                    color2="#440000" 
                    backdropBlurAmount="2xl" 
                />
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
                    backgroundImage: 'radial-gradient(#ff0000 0.5px, transparent 0.5px)',
                    backgroundSize: '30px 30px'
                }} />
            </div>

            <div className="w-full max-w-md">
                {/* Header */}
                <div className="text-center mb-8 flex flex-col items-center animate-in fade-in slide-in-from-top-4 duration-700">
                    <div className="relative mb-6 group">
                        <div className="absolute inset-0 bg-red-600 blur-2xl opacity-20 group-hover:opacity-40 transition-opacity" />
                        <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center shadow-2xl border border-red-500/50">
                            <ShieldAlert size={40} className="text-white animate-pulse" />
                        </div>
                    </div>
                    <h1 className="text-2xl font-black tracking-[0.2em] text-white uppercase">
                        Acceso de Emergencia
                    </h1>
                    <div className="h-0.5 w-16 bg-red-600 mt-4" />
                    <p className="text-red-500/60 text-[10px] font-bold uppercase tracking-widest mt-4">
                        Panel de Administración • Modo de Bypass
                    </p>
                </div>

                {/* Main Card */}
                <div className="bg-black/40 backdrop-blur-xl rounded-[2rem] p-8 border border-red-900/30 shadow-[0_0_80px_rgba(255,0,0,0.1)] relative overflow-hidden animate-in fade-in zoom-in-95 duration-500">
                    <div className="absolute top-0 right-0 p-4">
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                    </div>

                    <form onSubmit={handleEmergencyLogin} className="space-y-6">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Email Corporativo</label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-red-500 transition-colors" size={18} />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="admin@uninorte.edu.co"
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-white/10 focus:outline-none focus:ring-2 focus:ring-red-600/50 focus:border-red-600/50 transition-all font-medium"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Clave de Emergencia</label>
                            <div className="relative group">
                                <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-red-500 transition-colors" size={18} />
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-white/10 focus:outline-none focus:ring-2 focus:ring-red-600/50 focus:border-red-600/50 transition-all"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-600/10 border border-red-600/20 text-red-500 text-xs font-bold uppercase tracking-tight animate-in shake-1">
                                <AlertTriangle size={16} className="shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        {success ? (
                            <div className="bg-green-600 text-white rounded-2xl py-4 flex items-center justify-center gap-3 font-black uppercase tracking-widest text-sm shadow-[0_0_30px_rgba(22,163,74,0.4)]">
                                <Loader2 className="animate-spin" size={20} />
                                Accediendo...
                            </div>
                        ) : (
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-red-600 hover:bg-red-700 text-white rounded-2xl py-4 font-black uppercase tracking-[0.2em] text-sm shadow-[0_10px_30px_rgba(220,38,38,0.3)] transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
                            >
                                {loading && <Loader2 className="animate-spin" size={18} />}
                                {loading ? 'Validando' : 'Entrar Ahora'}
                            </button>
                        )}
                    </form>

                    <div className="mt-8 pt-6 border-t border-white/5 space-y-4">
                        <div className="bg-red-950/20 rounded-xl p-4 border border-red-900/20">
                            <p className="text-[9px] text-white/30 font-bold uppercase tracking-widest leading-relaxed">
                                <span className="text-red-500">Importante:</span> Si no tienes una contraseña establecida, usa el SQL Editor de Supabase para asignar una temporal a tu cuenta de admin.
                            </p>
                        </div>
                        <Link href="/login" className="flex items-center justify-center gap-2 text-[10px] text-white/40 hover:text-white font-black uppercase tracking-widest transition-colors group">
                            <ArrowLeft size={12} className="group-hover:-translate-x-1 transition-transform" />
Volver al Login Estándar
                        </Link>
                    </div>
                </div>

                {/* Footer instructions */}
                <div className="mt-8 px-4 py-3 bg-white/5 rounded-2xl border border-white/10 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-2 duration-1000">
                    <div className="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center text-red-500 border border-red-500/20">
                        <Lock size={16} />
                    </div>
                    <div className="flex-1">
                        <p className="text-[9px] text-white/40 font-bold uppercase tracking-tighter">Acceso Restringido</p>
                        <p className="text-[10px] text-white/60 font-medium">Bypass solo para Staff Autorizado</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
