"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Trophy, LayoutDashboard, Calendar, Users, LogOut, Menu, X, Zap, Shield, Loader2, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [profileTimeout, setProfileTimeout] = useState(false);
    const pathname = usePathname();
    const router = useRouter();
    const { user, profile, loading, isStaff, isAdmin, signOut } = useAuth();

    // Timeout for profile loading — if profile doesn't load in 5 seconds, stop waiting
    useEffect(() => {
        if (user && !profile && !profileTimeout) {
            const timer = setTimeout(() => {
                setProfileTimeout(true);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [user, profile, profileTimeout]);

    // Redirect to login if not authenticated or not staff
    useEffect(() => {
        if (!loading && !user) {
            router.push("/admin/login");
        }
    }, [loading, user, router]);

    const handleLogout = async () => {
        await signOut();
        router.push("/admin/login");
    };

    // Show loading while checking auth
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-primary to-secondary text-white shadow-lg shadow-primary/30">
                        <Trophy size={32} />
                    </div>
                    <Loader2 size={24} className="animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Verificando acceso...</p>
                </div>
            </div>
        );
    }

    // Not authenticated
    if (!user) {
        return null; // Will redirect via useEffect
    }

    // Authenticated but profile not loaded yet — keep showing loader
    // This prevents showing "Acceso Restringido" before the profile fetch completes
    if (user && !profile && !profileTimeout) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-primary to-secondary text-white shadow-lg shadow-primary/30">
                        <Trophy size={32} />
                    </div>
                    <Loader2 size={24} className="animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Cargando perfil...</p>
                </div>
            </div>
        );
    }

    // Authenticated but no staff role — show access denied
    if (!isStaff) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-4">
                <div className="max-w-md w-full text-center space-y-6">
                    <div className="inline-flex p-5 rounded-3xl bg-orange-500/10 border border-orange-500/20 text-orange-500 mb-2">
                        <Shield size={48} strokeWidth={1.5} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-extrabold tracking-tight mb-2">Acceso Restringido</h1>
                        <p className="text-muted-foreground">
                            Tu cuenta <span className="text-foreground font-semibold">{user.email}</span> no tiene permisos de administrador.
                        </p>
                    </div>
                    <div className="bg-muted/10 rounded-2xl p-4 border border-border/20">
                        <p className="text-sm text-muted-foreground">
                            Contacta a un administrador para que te asigne el rol de <span className="text-primary font-bold">admin</span> o <span className="text-blue-400 font-bold">data_entry</span>.
                        </p>
                    </div>
                    <div className="flex gap-3 justify-center">
                        <button
                            onClick={handleLogout}
                            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-all"
                        >
                            Cerrar Sesión
                        </button>
                        <Link
                            href="/"
                            className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary/90 transition-all shadow-lg shadow-primary/25"
                        >
                            Ir a Inicio
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const menuItems = [
        { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
        { name: "Partidos", href: "/admin/partidos", icon: Calendar },
        { name: "Estadísticas", href: "/admin/estadisticas", icon: BarChart3 },
        ...(isAdmin ? [{ name: "Usuarios", href: "/admin/usuarios", icon: Users }] : []),
    ];

    return (
        <div className="min-h-screen flex bg-[#030711] text-slate-200 selection:bg-indigo-500/30">
            {/* Ambient Background - Global */}
            <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[800px] h-[800px] bg-indigo-600/10 rounded-full blur-[120px] mix-blend-screen animate-pulse" style={{ animationDuration: '8s' }} />
                <div className="absolute bottom-[-10%] left-[-5%] w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[100px] mix-blend-screen" />
            </div>
            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={cn(
                    "fixed inset-y-0 left-0 z-50 w-72 transition-transform duration-300 md:relative md:translate-x-0",
                    "bg-[#0a0f1c]/90 backdrop-blur-2xl border-r border-white/5 shadow-2xl shadow-indigo-900/10",
                    isSidebarOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                {/* Sidebar Background Gradient */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
                    <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-indigo-500/5 to-transparent" />
                    <div className="absolute bottom-0 right-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
                </div>
                {/* Logo */}
                {/* Logo Area */}
                <div className="flex h-20 items-center px-6 border-b border-white/10 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                    <div className="relative p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 via-primary to-purple-600 text-white mr-3 shadow-lg shadow-indigo-500/30 group-hover:scale-105 transition-transform duration-300">
                        <Trophy size={22} className="drop-shadow-md" />
                        <div className="absolute inset-0 bg-white/20 rounded-xl animate-pulse delay-75" />
                    </div>

                    <div className="relative z-10">
                        <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">Olimpiadas</span>
                        <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <p className="text-[10px] font-bold text-indigo-200/70 uppercase tracking-widest">Admin Panel</p>
                        </div>
                    </div>

                    <button
                        className="ml-auto md:hidden text-white/50 hover:text-white transition-colors"
                        onClick={() => setIsSidebarOpen(false)}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Navigation */}
                {/* Navigation */}
                <nav className="flex-1 space-y-1.5 px-4 py-8">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-200/30 px-4 mb-4 select-none">Menu Principal</p>
                    {menuItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setIsSidebarOpen(false)}
                                className={cn(
                                    "group relative flex items-center gap-3.5 px-4 py-3.5 text-sm font-medium rounded-2xl transition-all duration-300 overflow-hidden",
                                    isActive
                                        ? "text-white shadow-lg shadow-indigo-500/20"
                                        : "text-slate-400 hover:text-white hover:bg-white/5"
                                )}
                            >
                                {/* Active Background Gradient */}
                                {isActive && (
                                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-violet-600 opacity-100" />
                                )}

                                {/* Hover Glow for non-active */}
                                {!isActive && (
                                    <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                )}

                                <div className="relative z-10 flex items-center gap-3.5 w-full">
                                    <item.icon className={cn(
                                        "h-5 w-5 transition-all duration-300",
                                        isActive ? "text-white scale-110" : "text-slate-500 group-hover:text-indigo-400 group-hover:scale-110"
                                    )} />
                                    <span>{item.name}</span>

                                    {isActive && (
                                        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
                                    )}

                                    {item.name === "Partidos" && !isActive && (
                                        <span className="ml-auto px-2 py-0.5 text-[9px] font-bold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-pulse">
                                            LIVE
                                        </span>
                                    )}

                                    {/* Arrow on hover */}
                                    {!isActive && (
                                        <div className="ml-auto opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 text-indigo-400">
                                            →
                                        </div>
                                    )}
                                </div>
                            </Link>
                        );
                    })}
                </nav>

                {/* User Info + Logout */}
                <div className="p-4 border-t border-white/5 space-y-3 relative overflow-hidden">
                    {/* Glow effect at bottom */}
                    <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-indigo-500/5 to-transparent pointer-events-none" />

                    {/* Current User */}
                    <div className="px-4 py-3 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-sm">
                        <p className="text-sm font-bold truncate text-slate-200">{profile?.full_name || user?.email}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                            <span className={cn(
                                "flex h-2 w-2 rounded-full shadow-[0_0_8px_currentColor]",
                                isAdmin ? "text-purple-400 bg-purple-400" : "text-blue-400 bg-blue-400"
                            )} />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                {profile?.role || 'public'}
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="group flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-rose-400 rounded-2xl hover:bg-rose-500/10 hover:text-rose-300 transition-all duration-300"
                    >
                        <LogOut className="h-5 w-5 transition-transform group-hover:-translate-x-1" />
                        Cerrar Sesión
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
                {/* Mobile Header */}
                <header className="flex h-16 items-center justify-between border-b border-border/50 px-4 md:hidden glass sticky top-0 z-30">
                    <button onClick={() => setIsSidebarOpen(true)} className="p-2 rounded-lg hover:bg-muted/50 text-muted-foreground">
                        <Menu size={22} />
                    </button>
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-gradient-to-br from-primary to-secondary text-white">
                            <Trophy size={14} />
                        </div>
                        <span className="font-bold text-sm">Olimpiadas Admin</span>
                    </div>
                    <div className="w-10" /> {/* Spacer */}
                </header>

                <main className="flex-1 overflow-y-auto p-4 md:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}
