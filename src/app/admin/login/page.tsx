"use client";

import { useState, useEffect } from "react";
import { Button, Input } from "@/components/ui-primitives";
import { supabase } from "@/lib/supabase";
import { Lock, Trophy, Mail, Loader2, ArrowRight, UserPlus, LogIn, Eye, EyeOff, CheckCircle, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import { SmokeyBackground } from "@/components/ui/login-form";
import { AnimatedFormField, ModernButton } from "@/components/ui/sign-in-flo";

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
    const { user, profile, loading: authLoading, isStaff } = useAuth();

    // If already logged in as staff, redirect to admin
    useEffect(() => {
        if (!authLoading && user && isStaff) {
            router.push("/admin");
        }
    }, [authLoading, user, isStaff, router]);

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

    // Get the user's role from profiles table
    const getUserRole = async (userId: string): Promise<{ role: string | null; error: string | null; debug: string }> => {
        try {
            const { data, error, status } = await supabase
                .from('profiles')
                .select('id, email, role')
                .eq('id', userId)
                .single();

            console.log('getUserRole result:', { data, error, status, userId });

            if (error) {
                return {
                    role: null,
                    error: error.message,
                    debug: `Query error (status ${status}): ${error.message} | userId: ${userId}`
                };
            }

            if (!data) {
                return {
                    role: null,
                    error: 'No profile found',
                    debug: `No profile row for userId: ${userId}`
                };
            }

            return {
                role: data.role,
                error: null,
                debug: `Found profile: email=${data.email}, role=${data.role}, id=${data.id}`
            };
        } catch (err: any) {
            if (err?.name === 'AbortError' || err?.message?.includes('abort')) {
                return { role: null, error: 'aborted', debug: 'Request aborted' };
            }
            return { role: null, error: err.message, debug: `Exception: ${err.message}` };
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { data, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (authError) {
                if (authError.message.includes('Invalid login credentials')) {
                    throw new Error('Email o contraseña incorrectos');
                }
                if (authError.message.includes('Email not confirmed') || authError.message.includes('email_not_confirmed')) {
                    throw new Error('Tu email no está confirmado. Ve a Supabase Dashboard → Authentication → Providers → Email → Desactiva "Confirm email" y vuelve a intentar.');
                }
                throw new Error(authError.message);
            }

            if (data.user) {
                // Check user role
                const result = await getUserRole(data.user.id);

                if (result.error === 'aborted') {
                    // Navigation in progress, ignore
                    return;
                }

                if (!result.role || result.role === 'public') {
                    setError('Tu cuenta no tiene permisos de administrador. Contacta a un admin para obtener acceso.');
                    await supabase.auth.signOut();
                    setLoading(false);
                    return;
                }

                // Role is admin or data_entry — redirect
                window.location.href = '/admin';
            }
        } catch (err: any) {
            // Ignore abort errors caused by navigation
            if (err?.name === 'AbortError' || err?.message?.includes('abort')) {
                return;
            }
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
            if (password.length < 6) {
                throw new Error('La contraseña debe tener al menos 6 caracteres');
            }
            if (password !== confirmPassword) {
                throw new Error('Las contraseñas no coinciden');
            }
            if (!fullName.trim()) {
                throw new Error('Ingresa tu nombre completo');
            }

            const { data, error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                    }
                }
            });

            if (authError) {
                if (authError.message.includes('already registered') || authError.message.includes('already been registered')) {
                    throw new Error('Este email ya está registrado. Intenta iniciar sesión.');
                }
                throw authError;
            }

            if (data.user) {
                // Sign out after registration — admin must approve
                await supabase.auth.signOut();
                setSuccess('¡Cuenta creada exitosamente! Un administrador debe asignarte permisos para acceder al panel.');
                setTimeout(() => {
                    switchMode('login');
                }, 4000);
            }

        } catch (err: any) {
            setError(err.message || "Error al registrar usuario");
        } finally {
            setLoading(false);
        }
    };

    // Show loading if checking existing auth
    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 size={32} className="animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 -z-10 overflow-hidden bg-[#17130D]">
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
                        Olimpiadas Admin
                    </h1>
                    <h2 className="text-2xl font-black tracking-tighter text-white/40 mb-2" style={{ fontFamily: 'Arial Black, Impact, sans-serif' }}>
                        UNINORTE
                    </h2>
                    <p className="text-[#FFC000]/70 text-[10px] font-bold uppercase tracking-widest mt-2">
                        Sistema de Gestión Deportiva
                    </p>
                </div>

                {/* Mode Toggle */}
                <div className="flex bg-[#0a0805]/80 p-1.5 rounded-2xl border border-white/10 mb-6 backdrop-blur-sm shadow-sm">
                    <button
                        onClick={() => switchMode('login')}
                        className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 ${mode === 'login'
                            ? 'bg-[#FFC000] text-black shadow-md'
                            : 'text-white/40 hover:text-[#FFC000]'
                            }`}
                    >
                        <LogIn size={16} />
                        Iniciar Sesión
                    </button>
                    <button
                        onClick={() => switchMode('register')}
                        className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 ${mode === 'register'
                            ? 'bg-[#FFC000] text-black shadow-md'
                            : 'text-white/40 hover:text-[#FFC000]'
                            }`}
                    >
                        <UserPlus size={16} />
                        Registrarse
                    </button>
                </div>

                {/* Card */}
                <div className="bg-[#0a0805]/95 backdrop-blur-3xl rounded-3xl p-8 border border-[#FFC000]/20 shadow-[0_0_50px_rgba(0,0,0,0.8)]">
                    <form onSubmit={mode === 'login' ? handleLogin : handleRegister} className="space-y-6">

                        {/* Error */}
                        {error && (
                            <div className="p-4 rounded-xl bg-[#DB1406]/10 border border-[#DB1406]/30 text-[#DB1406] text-sm font-medium flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Success */}
                        {success && (
                            <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-medium flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                                <CheckCircle size={18} className="shrink-0 mt-0.5" />
                                <span>{success}</span>
                            </div>
                        )}

                        {/* Name (register only) */}
                        {mode === 'register' && (
                            <AnimatedFormField
                                type="text"
                                placeholder="Nombre Completo"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                icon={<UserPlus size={18} />}
                                required
                                disabled={loading}
                            />
                        )}

                        {/* Email */}
                        <AnimatedFormField
                            type="email"
                            placeholder="Correo Electrónico"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            icon={<Mail size={18} />}
                            required
                            disabled={loading}
                        />

                        {/* Password */}
                        <div className="space-y-2">
                            <AnimatedFormField
                                type={showPassword ? "text" : "password"}
                                placeholder="Contraseña"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                icon={<Lock size={18} />}
                                showToggle
                                onToggle={() => setShowPassword(!showPassword)}
                                showPassword={showPassword}
                                required
                                disabled={loading}
                            />
                            {mode === 'register' && password.length > 0 && (
                                <div className="flex items-center gap-2 px-1">
                                    <div className={`h-1 flex-1 rounded-full transition-all ${password.length >= 6 ? 'bg-green-500' : 'bg-red-500/50'}`} />
                                    <div className={`h-1 flex-1 rounded-full transition-all ${password.length >= 8 ? 'bg-green-500' : 'bg-slate-700'}`} />
                                    <div className={`h-1 flex-1 rounded-full transition-all ${password.length >= 10 ? 'bg-green-500' : 'bg-slate-700'}`} />
                                    <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest ml-1">
                                        {password.length < 6 ? 'Corta' : password.length < 8 ? 'Ok' : password.length < 10 ? 'Buena' : 'Fuerte'}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Confirm Password (register only) */}
                        {mode === 'register' && (
                            <div className="space-y-2">
                                <AnimatedFormField
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Confirmar Contraseña"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    icon={<Lock size={18} />}
                                    required
                                    disabled={loading}
                                />
                                {confirmPassword && confirmPassword !== password && (
                                    <p className="text-[#DB1406] text-xs font-bold px-1 flex items-center gap-1">
                                        <AlertCircle size={12} /> Las contraseñas no coinciden
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Info text for register */}
                        {mode === 'register' && (
                            <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/10 text-red-400/80 text-xs font-bold flex items-start gap-2">
                                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                                <span>Después de registrarte, un administrador debe aprobar tu acceso al panel.</span>
                            </div>
                        )}

                        {/* Submit Button */}
                        <div className="pt-2">
                            <ModernButton type="submit" disabled={loading || (mode === 'register' && password !== confirmPassword)}>
                                {loading ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin mr-2" />
                                        {mode === 'login' ? 'Verificando...' : 'Creando...'}
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
                            </ModernButton>
                        </div>
                    </form>

                    {/* Divider */}
                    <div className="mt-8 pt-6 border-t border-white/10 text-center">
                        <Link href="/" className="text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-[#DB1406] transition-colors inline-flex items-center gap-1.5 hover:gap-2.5">
                            ← Volver a la página principal
                        </Link>
                    </div>
                </div>

                {/* Security Badge */}
                <div className="mt-6 text-center space-y-2">
                    <p className="text-[10px] text-white/40 font-bold flex items-center justify-center gap-1.5 uppercase tracking-widest">
                        <Lock size={12} />
                        Conexión segura con Supabase Auth
                    </p>
                    <p className="text-[10px] text-white/30">
                        Universidad del Norte — Barranquilla, Colombia
                    </p>
                </div>
            </div>
        </div>
    );
}
