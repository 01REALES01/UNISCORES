"use client";

import { useState, useEffect } from "react";
import { Button, Input } from "@/components/ui-primitives";
import { supabase } from "@/lib/supabase";
import { Lock, Trophy, Mail, Loader2, ArrowRight, UserPlus, LogIn, Eye, EyeOff, CheckCircle, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import { SmokeyBackground } from "@/components/ui/login-form";
import { AnimatedFormField, ModernButton, SocialButton } from "@/components/ui/sign-in-flo";

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
    const { user, loading: authLoading } = useAuth();

    // If already logged in, redirect to home
    useEffect(() => {
        if (!authLoading && user) {
            router.replace("/");
        }
    }, [authLoading, user, router]);

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
            const { error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (authError) {
                if (authError.message.includes('Invalid login credentials')) {
                    throw new Error('Email o contraseña incorrectos');
                }
                if (authError.message.includes('Email not confirmed') || authError.message.includes('email_not_confirmed')) {
                    throw new Error('Tu email no está confirmado. Revisa tu bandeja de entrada o contacta a un administrador.');
                }
                throw new Error(authError.message);
            }

            // useAuth will detect the session change and update user state
            // The useEffect above will then redirect to "/"

        } catch (err: any) {
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
                setSuccess('¡Cuenta creada exitosamente! Ya puedes iniciar sesión.');
                setTimeout(() => {
                    switchMode('login');
                }, 3000);
            }

        } catch (err: any) {
            setError(err.message || "Error al registrar usuario");
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setLoading(true);
        const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        });
        if (error) {
            setError("Error de conexión con Google: " + error.message);
        }
        setLoading(false);
    };

    const handleMicrosoftLogin = async () => {
        setLoading(true);
        const { error } = await supabase.auth.signInWithOAuth({
            provider: "azure",
            options: {
                scopes: "email profile",
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        });
        if (error) {
            setError("Error de conexión con Microsoft: " + error.message);
        }
        setLoading(false);
    };

    // Show loading if checking existing auth
    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#17130D]">
                <Loader2 size={32} className="animate-spin text-[#FFC000]" />
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
                        Olimpiadas Uninorte
                    </h1>
                    <h2 className="text-2xl font-black tracking-tighter text-white/40 mb-2" style={{ fontFamily: 'Arial Black, Impact, sans-serif' }}>
                        2026
                    </h2>
                    <p className="text-[#FFC000]/70 text-[10px] font-bold uppercase tracking-widest mt-2">
                        Inicia sesión para continuar
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
                                                Iniciar Sesión
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

                    {/* Google Login Divider */}
                    <div className="relative flex py-5 items-center mt-4">
                        <div className="flex-grow border-t border-white/10"></div>
                        <span className="flex-shrink mx-4 text-white/40 text-[10px] font-bold uppercase tracking-widest">O CONTINÚA CON</span>
                        <div className="flex-grow border-t border-white/10"></div>
                    </div>

                    {/* Google Login Button */}
                    <SocialButton
                        name="Google"
                        onClick={handleGoogleLogin}
                        disabled={loading}
                        icon={
                            <svg className="w-5 h-5" viewBox="0 0 48 48">
                                <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039L38.802 8.841C34.553 4.806 29.613 2.5 24 2.5C11.983 2.5 2.5 11.983 2.5 24s9.483 21.5 21.5 21.5S45.5 36.017 45.5 24c0-1.538-.135-3.022-.389-4.417z"></path><path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12.5 24 12.5c3.059 0 5.842 1.154 7.961 3.039l5.839-5.841C34.553 4.806 29.613 2.5 24 2.5C16.318 2.5 9.642 6.723 6.306 14.691z"></path><path fill="#4CAF50" d="M24 45.5c5.613 0 10.553-2.306 14.802-6.341l-5.839-5.841C30.842 35.846 27.059 38 24 38c-5.039 0-9.345-2.608-11.124-6.481l-6.571 4.819C9.642 41.277 16.318 45.5 24 45.5z"></path><path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l5.839 5.841C44.196 35.123 45.5 29.837 45.5 24c0-1.538-.135-3.022-.389-4.417z"></path>
                            </svg>
                        }
                    />

                    {/* Microsoft Login Button */}
                    <div className="mt-3">
                        <SocialButton
                            name="Microsoft"
                            onClick={handleMicrosoftLogin}
                            disabled={loading}
                            icon={
                                <svg className="w-5 h-5" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
                                    <path fill="#f25022" d="M0 0h10v10H0z" />
                                    <path fill="#7fba00" d="M11 0h10v10H11z" />
                                    <path fill="#00a4ef" d="M0 11h10v10H0z" />
                                    <path fill="#ffb900" d="M11 11h10v10H11z" />
                                </svg>
                            }
                        />
                    </div>

                    {/* Back to Home */}
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
