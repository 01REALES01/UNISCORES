"use client";

import { useState } from "react";
import { Button, Input } from "@/components/ui-primitives";
import { supabase } from "@/lib/supabase";
import { Lock, Trophy, Mail, Loader2, ArrowRight, UserPlus, LogIn, Eye, EyeOff, CheckCircle, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type AuthMode = 'login' | 'register';

export default function LoginPage() {
    const [mode, setMode] = useState<AuthMode>('login');
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [fullName, setFullName] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const router = useRouter();

    const resetForm = () => {
        setError(null);
        setSuccess(null);
        setPassword("");
        setConfirmPassword("");
    };

    const switchMode = (newMode: AuthMode) => {
        resetForm();
        setMode(newMode);
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                if (error.message.includes('Invalid login credentials')) {
                    throw new Error('Email o contraseña incorrectos');
                }
                throw error;
            }

            router.push("/admin");
            router.refresh();
        } catch (err: any) {
            setError(err.message || "Error al iniciar sesión");
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            // Validaciones
            if (password.length < 6) {
                throw new Error('La contraseña debe tener al menos 6 caracteres');
            }
            if (password !== confirmPassword) {
                throw new Error('Las contraseñas no coinciden');
            }
            if (!fullName.trim()) {
                throw new Error('Ingresa tu nombre completo');
            }

            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                    }
                }
            });

            if (error) {
                if (error.message.includes('already registered')) {
                    throw new Error('Este email ya está registrado. Intenta iniciar sesión.');
                }
                throw error;
            }

            setSuccess('¡Cuenta creada exitosamente! Puedes iniciar sesión ahora.');
            setTimeout(() => {
                switchMode('login');
            }, 2000);

        } catch (err: any) {
            setError(err.message || "Error al registrar usuario");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 -z-10 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-gradient-to-b from-primary/15 to-transparent rounded-full blur-[100px]" />
                <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-gradient-to-t from-orange-500/10 to-transparent rounded-full blur-[80px]" />
                <div className="absolute top-1/3 right-0 w-[300px] h-[300px] bg-gradient-to-l from-blue-500/10 to-transparent rounded-full blur-[80px]" />

                {/* Subtle grid pattern */}
                <div className="absolute inset-0 opacity-[0.03]" style={{
                    backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
                    backgroundSize: '60px 60px'
                }} />
            </div>

            <div className="w-full max-w-md">
                {/* Logo & Title */}
                <div className="text-center mb-8">
                    <div className="inline-flex p-5 rounded-3xl bg-gradient-to-br from-primary via-primary to-orange-500 text-white mb-5 shadow-2xl shadow-primary/30 relative">
                        <Trophy size={44} strokeWidth={1.5} />
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-slate-900 animate-pulse" />
                    </div>
                    <h1 className="text-3xl font-extrabold tracking-tight mb-2 bg-gradient-to-r from-white to-white/60 inline-block text-transparent bg-clip-text">
                        Olimpiadas Uninorte
                    </h1>
                    <p className="text-muted-foreground/80 text-sm font-medium">
                        Sistema de Gestión Deportiva 2026
                    </p>
                </div>

                {/* Mode Toggle */}
                <div className="flex bg-slate-800/50 p-1.5 rounded-2xl border border-border/30 mb-6 backdrop-blur-sm">
                    <button
                        onClick={() => switchMode('login')}
                        className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 ${mode === 'login'
                                ? 'bg-primary text-white shadow-lg shadow-primary/30'
                                : 'text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        <LogIn size={16} />
                        Iniciar Sesión
                    </button>
                    <button
                        onClick={() => switchMode('register')}
                        className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 ${mode === 'register'
                                ? 'bg-primary text-white shadow-lg shadow-primary/30'
                                : 'text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        <UserPlus size={16} />
                        Registrarse
                    </button>
                </div>

                {/* Card */}
                <div className="bg-slate-800/30 backdrop-blur-xl rounded-3xl p-8 border border-border/30 shadow-2xl shadow-black/20">
                    <form onSubmit={mode === 'login' ? handleLogin : handleRegister} className="space-y-5">

                        {/* Error */}
                        {error && (
                            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                                <AlertCircle size={18} className="shrink-0" />
                                {error}
                            </div>
                        )}

                        {/* Success */}
                        {success && (
                            <div className="p-4 rounded-2xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-medium flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                                <CheckCircle size={18} className="shrink-0" />
                                {success}
                            </div>
                        )}

                        {/* Name (register only) */}
                        {mode === 'register' && (
                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                <label className="text-sm font-semibold text-foreground/70 flex items-center gap-2">
                                    <UserPlus size={14} className="text-primary" />
                                    Nombre Completo
                                </label>
                                <Input
                                    type="text"
                                    placeholder="Jean Reales"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    required
                                    disabled={loading}
                                    className="bg-slate-700/30 border-border/40 h-12 rounded-xl focus:ring-2 focus:ring-primary/30 transition-all"
                                />
                            </div>
                        )}

                        {/* Email */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-foreground/70 flex items-center gap-2">
                                <Mail size={14} className="text-primary" />
                                Correo Electrónico
                            </label>
                            <Input
                                type="email"
                                placeholder="usuario@uninorte.edu.co"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                disabled={loading}
                                className="bg-slate-700/30 border-border/40 h-12 rounded-xl focus:ring-2 focus:ring-primary/30 transition-all"
                            />
                        </div>

                        {/* Password */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-foreground/70 flex items-center gap-2">
                                <Lock size={14} className="text-primary" />
                                Contraseña
                            </label>
                            <div className="relative">
                                <Input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    disabled={loading}
                                    className="bg-slate-700/30 border-border/40 h-12 rounded-xl focus:ring-2 focus:ring-primary/30 transition-all pr-12"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all"
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            {mode === 'register' && password.length > 0 && (
                                <div className="flex items-center gap-2 mt-1">
                                    <div className={`h-1 flex-1 rounded-full transition-all ${password.length >= 6 ? 'bg-green-500' : 'bg-red-500/50'}`} />
                                    <div className={`h-1 flex-1 rounded-full transition-all ${password.length >= 8 ? 'bg-green-500' : 'bg-slate-700'}`} />
                                    <div className={`h-1 flex-1 rounded-full transition-all ${password.length >= 10 ? 'bg-green-500' : 'bg-slate-700'}`} />
                                    <span className="text-[10px] text-muted-foreground ml-1">
                                        {password.length < 6 ? 'Muy corta' : password.length < 8 ? 'Aceptable' : password.length < 10 ? 'Buena' : 'Fuerte'}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Confirm Password (register only) */}
                        {mode === 'register' && (
                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                <label className="text-sm font-semibold text-foreground/70 flex items-center gap-2">
                                    <Lock size={14} className="text-primary" />
                                    Confirmar Contraseña
                                </label>
                                <Input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    disabled={loading}
                                    className={`bg-slate-700/30 border-border/40 h-12 rounded-xl focus:ring-2 focus:ring-primary/30 transition-all ${confirmPassword && confirmPassword !== password ? 'border-red-500/50 focus:ring-red-500/30' : ''
                                        }`}
                                />
                                {confirmPassword && confirmPassword !== password && (
                                    <p className="text-red-400 text-xs flex items-center gap-1">
                                        <AlertCircle size={12} /> Las contraseñas no coinciden
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Submit Button */}
                        <Button
                            type="submit"
                            disabled={loading || (mode === 'register' && password !== confirmPassword)}
                            className="w-full h-13 rounded-xl text-base font-bold mt-4 shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
                            size="lg"
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={18} className="animate-spin mr-2" />
                                    {mode === 'login' ? 'Verificando...' : 'Creando cuenta...'}
                                </>
                            ) : (
                                <>
                                    {mode === 'login' ? (
                                        <>
                                            Ingresar al Panel
                                            <ArrowRight size={18} className="ml-2" />
                                        </>
                                    ) : (
                                        <>
                                            <UserPlus size={18} className="mr-2" />
                                            Crear Cuenta
                                        </>
                                    )}
                                </>
                            )}
                        </Button>
                    </form>

                    {/* Divider */}
                    <div className="mt-6 pt-6 border-t border-border/30 text-center">
                        <Link href="/" className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1.5 hover:gap-2.5">
                            ← Volver a la página principal
                        </Link>
                    </div>
                </div>

                {/* Security Badge */}
                <div className="mt-6 text-center space-y-2">
                    <p className="text-xs text-muted-foreground/50 flex items-center justify-center gap-1.5">
                        <Lock size={10} />
                        Conexión segura con Supabase Auth
                    </p>
                    <p className="text-[10px] text-muted-foreground/30">
                        Universidad del Norte — Barranquilla, Colombia
                    </p>
                </div>
            </div>
        </div>
    );
}
