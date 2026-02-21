"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui-primitives";
import { toast } from "sonner";
import { Loader2, Mail, ArrowLeft, User, Lock, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SmokeyBackground } from "@/components/ui/login-form";
import { AnimatedFormField, ModernButton, SocialButton } from "@/components/ui/sign-in-flo";

export default function LoginPage() {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState("");
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        // Intento de login con Magic Link (más fácil que password)
        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                emailRedirectTo: `${window.location.origin}/auth/callback`,
            },
        });

        if (error) {
            toast.error("Error al enviar el link", { description: error.message });
        } else {
            toast.success("¡Link enviado!", { description: "Revisa tu correo para iniciar sesión." });
        }
        setLoading(false);
    };

    const handleGoogleLogin = async () => {
        setLoading(true);
        const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        });
        if (error) toast.error("Error de conexión con Google", { description: error.message });
        setLoading(false);
    };

    return (
        <main className="relative min-h-screen bg-[#17130D] flex items-center justify-center p-4 overflow-hidden">
            {/* The interactive WebGL background with Uninorte Red & Gold base */}
            <SmokeyBackground className="absolute inset-0" color1="#DB1406" color2="#FFC000" backdropBlurAmount="md" />

            {/* Foreground Login Card */}
            <div className="relative z-10 w-full max-w-sm p-8 space-y-4 bg-[#0a0805]/80 backdrop-blur-xl rounded-3xl border border-[#FFC000]/20 shadow-[0_0_50px_rgba(0,0,0,0.8)]">

                <Link href="/" className="inline-flex items-center gap-2 text-white/50 hover:text-[#FFC000] transition-colors mb-2 text-xs font-bold uppercase tracking-widest">
                    <ArrowLeft size={16} /> Volver al Inicio
                </Link>

                <div className="text-center mb-8 flex flex-col items-center">
                    <img src="/uninorte_logo.png" alt="Uninorte 60 Años Logo" className="h-40 w-auto object-contain mb-4 drop-shadow-[0_0_25px_rgba(219,20,6,0.3)] transition-transform hover:scale-105 duration-500" />
                    <h2 className="text-4xl font-black text-white">Olimpiadas</h2>
                    <h3 className="text-xl font-black tracking-tighter text-white/50 mt-1" style={{ fontFamily: 'Arial Black, Impact, sans-serif' }}>UNINORTE</h3>
                    <p className="mt-3 text-[10px] font-bold text-[#FFC000] uppercase tracking-widest">Inicia sesión para jugar</p>
                </div>

                <form className="space-y-6" onSubmit={handleLogin}>

                    <AnimatedFormField
                        type="email"
                        placeholder="Email Institucional"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        icon={<User size={18} />}
                        required
                        disabled={loading}
                    />

                    <div className="flex items-center justify-between px-1">
                        <a href="#" className="text-xs text-white/50 hover:text-white transition font-bold tracking-widest">AYUDA</a>
                    </div>

                    <ModernButton type="submit" disabled={loading || !email}>
                        {loading ? <Loader2 className="animate-spin mr-2" size={20} /> : "Link Mágico"}
                        {!loading && <ArrowRight className="ml-2 h-5 w-5 transform group-hover:translate-x-1 transition-transform" />}
                    </ModernButton>

                    {/* Divider */}
                    <div className="relative flex py-2 items-center">
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

                </form>

                <p className="text-center text-[10px] text-white/30 pt-6 mt-4 uppercase tracking-widest border-t border-white/5">
                    Al continuar, aceptas participar en los rankings.
                </p>
            </div>
        </main>
    );
}
