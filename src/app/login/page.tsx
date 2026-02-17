"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui-primitives";
import { toast } from "sonner";
import { Loader2, Mail, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
        <div className="min-h-screen bg-[#030711] text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none" />
            <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-rose-600/20 rounded-full blur-[100px]" />
            <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[100px]" />

            <div className="w-full max-w-md bg-white/5 border border-white/10 p-8 rounded-3xl backdrop-blur-xl relative z-10 shadow-2xl">
                <Link href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-8 text-sm">
                    <ArrowLeft size={16} /> Volver al Inicio
                </Link>

                <div className="text-center mb-8">
                    <h1 className="text-3xl font-black tracking-tighter mb-2">Bienvenido</h1>
                    <p className="text-slate-400">Ingresa para participar en la Quiniela y votar.</p>
                </div>

                <div className="space-y-4">
                    <Button
                        onClick={handleGoogleLogin}
                        className="w-full bg-white text-black hover:bg-slate-200 h-12 rounded-xl font-bold flex items-center justify-center gap-3"
                        disabled={loading}
                    >
                        {/* Google Logo SVG */}
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        Continuar con Google
                    </Button>

                    <div className="relative flex items-center py-2">
                        <div className="flex-grow border-t border-white/10"></div>
                        <span className="flex-shrink-0 mx-4 text-slate-500 text-xs uppercase tracking-widest">O usa tu correo</span>
                        <div className="flex-grow border-t border-white/10"></div>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Email Universitario</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                <input
                                    type="email"
                                    required
                                    placeholder="usuario@uninorte.edu.co"
                                    className="w-full bg-black/50 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        <Button
                            type="submit"
                            className="w-full bg-indigo-600 hover:bg-indigo-700 h-12 rounded-xl font-bold tracking-tight shadow-[0_0_20px_rgba(79,70,229,0.3)]"
                            disabled={loading || !email}
                        >
                            {loading ? <Loader2 className="animate-spin" /> : "Enviar Link Mágico"}
                        </Button>
                    </form>
                </div>
            </div>

            <p className="mt-8 text-slate-500 text-xs text-center max-w-sm">
                Al continuar, aceptas participar en la Quiniela y que tu nombre sea visible en los rankings públicos.
            </p>
        </div>
    );
}
