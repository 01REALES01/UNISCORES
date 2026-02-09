"use client";

import { useState } from "react";
import { Button, Input } from "@/components/ui-primitives";
import { supabase } from "@/lib/supabase";
import { Lock, Trophy, Mail, Loader2, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log('🔐 Login attempt:', { email, password: '***' });
        setLoading(true);
        setError(null);

        try {
            console.log('📡 Calling Supabase auth...');
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            console.log('📡 Supabase response:', { data: !!data, error });

            if (error) throw error;

            console.log('✅ Auth successful, checking profile...');
            // Verificar rol del usuario
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', data.user.id)
                .single();

            console.log('👤 Profile:', { profile, profileError });

            if (!profile || (profile.role !== 'admin' && profile.role !== 'data_entry')) {
                await supabase.auth.signOut();
                throw new Error('No tienes permisos de administrador');
            }

            console.log('✅ Access granted! Redirecting...');
            router.push("/admin");
            router.refresh();
        } catch (err: any) {
            console.error('❌ Login error:', err);
            setError(err.message || "Error al iniciar sesión");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Gradient Orbs */}
            <div className="absolute inset-0 -z-10 overflow-hidden">
                <div className="absolute top-1/4 -left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-1/4 -right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
            </div>

            <div className="w-full max-w-md">
                {/* Logo & Title */}
                <div className="text-center mb-8">
                    <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-primary to-secondary text-white mb-4 shadow-2xl shadow-primary/30">
                        <Trophy size={40} />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2">Portal Administrativo</h1>
                    <p className="text-muted-foreground">Olimpiadas Universitarias UNINORTE 2026</p>
                </div>

                {/* Login Card */}
                <div className="glass rounded-2xl p-8 border border-border/50 shadow-2xl">
                    <form onSubmit={handleLogin} className="space-y-5">
                        {error && (
                            <div className="p-4 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm font-medium text-center animate-in fade-in slide-in-from-top-2">
                                {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-foreground/80 flex items-center gap-2">
                                <Mail size={14} />
                                Correo Institucional
                            </label>
                            <Input
                                type="email"
                                placeholder="usuario@uninorte.edu.co"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                disabled={loading}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-foreground/80 flex items-center gap-2">
                                <Lock size={14} />
                                Contraseña
                            </label>
                            <Input
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                disabled={loading}
                            />
                        </div>

                        <Button type="submit" disabled={loading} className="w-full mt-6" size="lg">
                            {loading ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    Verificando...
                                </>
                            ) : (
                                <>
                                    Ingresar
                                    <ArrowRight size={18} />
                                </>
                            )}
                        </Button>
                    </form>

                    <div className="mt-6 pt-6 border-t border-border/50 text-center">
                        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1">
                            ← Volver a la página principal
                        </Link>
                    </div>
                </div>

                {/* Security Badge */}
                <div className="mt-6 text-center">
                    <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
                        <Lock size={12} />
                        Conexión segura con Supabase Auth
                    </p>
                </div>
            </div>
        </div>
    );
}
