"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Trophy, LayoutDashboard, Calendar, Users, LogOut, Menu, X, Zap, Shield, BarChart3, Newspaper, Loader2, Upload, ListOrdered, Shuffle, ClipboardList, BookOpen } from "lucide-react";
import UniqueLoading from "@/components/ui/morph-loading";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

import { Sidebar, SidebarBody, SidebarLink } from "@/components/ui/sidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    const pathname = usePathname();
    const router = useRouter();
    const { user, profile, loading, isStaff, isAdmin, isPeriodista, signOut, profileLoading } = useAuth();

    // Redirect to login if not authenticated or not staff
    useEffect(() => {
        if (!loading && !user) {
            router.push("/login");
        }
    }, [loading, user, router]);

    const handleLogout = async () => {
        await signOut();
        router.push("/login");
    };

    // Show loading while checking auth
    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-background">
                <UniqueLoading size="lg" />
            </div>
        );
    }

    // Not authenticated
    if (!user) {
        return null; // Will redirect via useEffect
    }

    // Authenticated but profile still loading and no cached profile yet
    // Only block if we haven't loaded the profile AND it's still loading
    if (profileLoading && !profile) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-background">
                <UniqueLoading size="lg" />
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
                            Contacta a un administrador para que te asigne el rol de <span className="text-purple-400 font-bold">admin</span>, <span className="text-rose-400 font-bold">data_entry</span> o <span className="text-blue-400 font-bold">periodista</span>.
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

    const menuItems = isPeriodista
        ? [
            { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
            { name: "Noticias", href: "/admin/noticias", icon: Newspaper },
        ]
        : [
            { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
            { name: "Partidos", href: "/admin/partidos", icon: Calendar },
            { name: "Noticias", href: "/admin/noticias", icon: Newspaper },
            { name: "Estadísticas", href: "/admin/estadisticas", icon: BarChart3 },
            { name: "Puntos", href: "/admin/puntos", icon: Trophy },
            { name: "Fixture", href: "/admin/fixture", icon: ListOrdered },
            { name: "Sorteo", href: "/admin/sorteo", icon: Shuffle },
            { name: "Inscripciones", href: "/admin/inscripciones", icon: ClipboardList },
            { name: "Directorio", href: "/admin/directorio", icon: BookOpen },
            { name: "Importar", href: "/admin/importar", icon: Upload },
            ...(isAdmin ? [{ name: "Usuarios", href: "/admin/usuarios", icon: Users }] : []),
        ];

    return (
        <div className="min-h-screen flex flex-col md:flex-row bg-background text-slate-200 selection:bg-red-500/30">
            {/* Ambient Background - Global */}
            <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[800px] h-[800px] bg-red-600/10 rounded-full blur-[120px] mix-blend-screen animate-pulse" style={{ animationDuration: '8s' }} />
                <div className="absolute bottom-[-10%] left-[-5%] w-[600px] h-[600px] bg-red-600/10 rounded-full blur-[100px] mix-blend-screen" />
            </div>
            <Sidebar open={open} setOpen={setOpen}>
                <SidebarBody className="justify-between gap-10">
                    <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
                        {/* Logo Area */}
                        <div className="flex px-0 py-6 border-b border-white/10 relative overflow-hidden group items-center justify-center">
                            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <div className="flex flex-col items-center justify-center w-full relative z-10 transition-transform duration-500 group-hover:scale-[1.03]">
                                {open ? (
                                    <>
                                        <img src="/uninorte_logo.png" alt="Uninorte 60 Años Logo" className="h-28 w-auto object-contain mb-3 drop-shadow-[0_0_15px_rgba(255,192,0,0.1)]" />
                                        <h1 className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-white to-[#FFC000]/80 bg-clip-text text-transparent mb-1">
                                            Olimpiadas Admin
                                        </h1>
                                        <h2 className="text-xl leading-none font-black tracking-tighter text-white/30" style={{ fontFamily: 'Arial Black, Impact, sans-serif' }}>
                                            UNINORTE
                                        </h2>
                                    </>
                                ) : (
                                    <img src="/uninorte_logo.png" alt="Uninorte 60 Años Logo" className="h-8 max-w-[40px] px-1 object-contain drop-shadow-[0_0_15px_rgba(255,192,0,0.1)]" />
                                )}
                            </div>
                        </div>

                        {/* Navigation */}
                        <nav className="flex-1 space-y-2 px-2 py-8 flex flex-col items-stretch">
                            {open ? (
                                <p className="text-[10px] font-bold uppercase tracking-widest text-red-200/30 px-3 mb-4 select-none">Menu Principal</p>
                            ) : (
                                <div className="h-6 w-full" />
                            )}
                            {menuItems.map((item) => {
                                const isActive = pathname === item.href;
                                return (
                                    <SidebarLink
                                        key={item.href}
                                        link={{
                                            label: item.name,
                                            href: item.href,
                                            icon: (
                                                <item.icon className={cn(
                                                    "h-5 w-5 transition-all duration-300",
                                                    isActive ? "text-white scale-110" : "text-slate-500 group-hover:text-red-400 group-hover:scale-110"
                                                )} />
                                            )
                                        }}
                                        className={cn(
                                            "mb-1 flex items-center transition-all",
                                            !open ? "justify-center px-0 w-12 mx-auto rounded-2xl aspect-square" : "px-4 w-full",
                                            isActive ? "bg-gradient-to-r from-red-600 to-orange-600 shadow-lg shadow-red-500/20 text-white hover:text-white" : ""
                                        )}
                                        onClick={() => setOpen(false)}
                                    />
                                );
                            })}
                        </nav>
                    </div>

                    {/* User Info & View Site Area */}
                    <div className="flex flex-col gap-4 mt-auto">
                        <div className="px-2 w-full flex justify-center">
                            <Link
                                href="/"
                                className={cn("group flex items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-500/10 to-teal-500/5 hover:from-emerald-500/20 hover:to-teal-500/10 border border-emerald-500/20 transition-all duration-300 shadow-lg shadow-emerald-900/5 hover:shadow-emerald-900/10", open ? "justify-between px-4 py-3 w-full" : "w-12 aspect-square")}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 group-hover:scale-110 transition-transform flex items-center justify-center">
                                        <Zap size={16} fill="currentColor" />
                                    </div>
                                    {open && <span className="text-sm font-bold text-emerald-100 group-hover:text-white">Ver Sitio Web</span>}
                                </div>
                                {open && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse" />}
                            </Link>
                        </div>

                        {/* Current User */}
                        <div className="p-4 border-t border-white/5 space-y-3 relative overflow-hidden flex flex-col items-center">
                            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-red-500/5 to-transparent pointer-events-none" />
                            {open ? (
                                <div className="px-3 py-3 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-sm">
                                    <p className="text-sm font-bold truncate text-slate-200">{profile?.full_name || user?.email}</p>
                                    <div className="flex items-center gap-2 mt-1.5">
                                        <span className={cn(
                                            "flex h-2 w-2 rounded-full shadow-[0_0_8px_currentColor]",
                                            isAdmin ? "text-purple-400 bg-purple-400" : "text-red-400 bg-red-400"
                                        )} />
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                            {(profile?.roles || ['public']).join(' / ')}
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex justify-center p-2 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-sm">
                                    <span className={cn(
                                        "flex h-3 w-3 rounded-full shadow-[0_0_8px_currentColor]",
                                        isAdmin ? "text-purple-400 bg-purple-400" : "text-red-400 bg-red-400"
                                    )} />
                                </div>
                            )}
                            <button
                                onClick={handleLogout}
                                className={cn("group flex items-center justify-center gap-3 text-sm font-medium text-rose-400 rounded-2xl hover:bg-rose-500/10 hover:text-rose-300 transition-all duration-300 mx-auto", open ? "justify-start px-4 py-3 w-full" : "w-12 aspect-square")}
                            >
                                <div className="flex items-center justify-center">
                                    <LogOut className="h-5 w-5 transition-transform group-hover:-translate-x-1" />
                                </div>
                                {open && <span>Cerrar Sesión</span>}
                            </button>
                        </div>
                    </div>
                </SidebarBody>
            </Sidebar>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden relative">


                <main className="flex-1 overflow-y-auto p-4 md:p-8 mt-16 md:mt-0">
                    {children}
                </main>
            </div>
        </div>
    );
}
