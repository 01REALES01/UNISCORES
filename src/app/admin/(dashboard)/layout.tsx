"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Trophy, LayoutDashboard, Calendar, Users, LogOut, Menu, X, Zap, Shield, BarChart3, Newspaper, Loader2, Upload, ListOrdered, Shuffle, ClipboardList, BookOpen, CalendarDays } from "lucide-react";
import UniqueLoading from "@/components/ui/morph-loading";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

import { Sidebar, SidebarBody, SidebarLink } from "@/components/ui/sidebar";
import { AdminGlobalSearch } from "@/modules/admin/components/admin-global-search";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    const pathname = usePathname();
    const router = useRouter();
    const { user, profile, loading, isStaff, isAdmin, isPeriodista, signOut, profileLoading } = useAuth();

    // Redirect to login if not authenticated or not staff
    useEffect(() => {
        // Only redirect if we are SURE loading is finished and there's no user
        if (!loading && !user) {
            // Include original path for redirect memory
            const currentPath = window.location.pathname;
            router.push(`/login?redirect=${encodeURIComponent(currentPath)}`);
        }
    }, [loading, user, router]);

    const handleLogout = async () => {
        await signOut();
        router.push("/login");
    };

    // 1. Initial Auth Check (Global Spinner)
    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-background">
                <UniqueLoading size="lg" />
            </div>
        );
    }

    // 2. Not authenticated — will be handled by useEffect redirect
    if (!user) {
        return null; 
    }

    // 3. Authenticated but profile logic is still in flight
    // If we have a user but profile is null AND profileLoading is true, it's the first fetch
    if (profileLoading && !profile) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-6">
                <UniqueLoading size="lg" />
                <div className="text-center space-y-2 animate-pulse">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-red-500/60">Verificando Credenciales</p>
                    <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">{user.email}</p>
                </div>
            </div>
        );
    }

    // 4. Case where profile fetch finished but returned null (rare but possible if user deleted)
    // or if we have a user but no staff roles.
    if (!profile || !isStaff) {
        // If it's still profileLoading, wait a bit more (safety)
        if (profileLoading) return null; 

        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-4">
                <div className="max-w-md w-full text-center space-y-6">
                    <div className="inline-flex p-5 rounded-3xl bg-orange-500/10 border border-orange-500/20 text-orange-500 mb-2">
                        <Shield size={48} strokeWidth={1.5} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-extrabold tracking-tight mb-2">Acceso Restringido</h1>
                        <p className="text-muted-foreground">
                            Tu cuenta <span className="text-foreground font-semibold">{user.email}</span> no tiene permisos de administrador registrados.
                        </p>
                    </div>
                    <div className="bg-muted/10 rounded-2xl p-4 border border-border/20">
                        <p className="text-sm text-muted-foreground">
                            Si eres parte de la organización, contacta a un administrador para que te asigne el rol de <span className="text-purple-400 font-bold">admin</span>, <span className="text-rose-400 font-bold">data_entry</span> o <span className="text-blue-400 font-bold">periodista</span>.
                        </p>
                    </div>
                    <div className="flex gap-3 justify-center">
                        <button
                            onClick={handleLogout}
                            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-all font-display uppercase tracking-widest"
                        >
                            Cerrar Sesión
                        </button>
                        <Link
                            href="/"
                            className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary/90 transition-all shadow-lg shadow-primary/25 font-display uppercase tracking-widest"
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
            { name: "Jornadas", href: "/admin/jornadas", icon: CalendarDays },
            { name: "Noticias", href: "/admin/noticias", icon: Newspaper },
            { name: "Estadísticas", href: "/admin/estadisticas", icon: BarChart3 },
            { name: "Puntos", href: "/admin/puntos", icon: Trophy },
            { name: "Fixture", href: "/admin/fixture", icon: ListOrdered },
            { name: "Sorteo", href: "/admin/sorteo", icon: Shuffle },
            { name: "Inscripciones", href: "/admin/inscripciones", icon: ClipboardList },
            { name: "Directorio", href: "/admin/directorio", icon: BookOpen },
            { name: "Jugadores", href: "/admin/jugadores", icon: Users },
            { name: "Importar", href: "/admin/importar", icon: Upload },
            ...(isAdmin ? [{ name: "Usuarios", href: "/admin/usuarios", icon: Users }] : []),
        ];

    return (
        <div className="min-h-screen flex flex-col md:flex-row bg-background text-slate-200 selection:bg-violet-500/30">
            <Sidebar open={open} setOpen={setOpen}>
                <SidebarBody className="justify-between gap-10">
                    <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
                        {/* Logo Area */}
                        <div className="flex py-3 border-b border-white/8 items-center justify-center">
                            <div className="flex flex-col items-center justify-center w-full">
                                {open ? (
                                    <>
                                        <img src="/uninorte_logo.png" alt="Uninorte 60 Años Logo" className="h-16 w-auto object-contain mb-2" />
                                        <p className="text-xs font-bold tracking-wide text-white/60">Olimpiadas Admin</p>
                                    </>
                                ) : (
                                    <img src="/uninorte_logo.png" alt="Uninorte 60 Años Logo" className="h-7 max-w-[36px] px-0.5 object-contain" />
                                )}
                            </div>
                        </div>

                        {/* Navigation */}
                        <nav className="flex-1 px-1 py-4 flex flex-col items-stretch gap-0.5">
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
                                                    "h-4 w-4 shrink-0",
                                                    isActive ? "text-violet-400" : "text-slate-500"
                                                )} />
                                            )
                                        }}
                                        className={cn(
                                            "flex items-center",
                                            !open ? "justify-center px-0 w-10 mx-auto rounded-lg aspect-square" : "px-2.5 w-full",
                                            isActive ? "bg-white/8 text-white border-l-2 border-violet-500 rounded-l-none" : ""
                                        )}
                                        onClick={() => setOpen(false)}
                                    />
                                );
                            })}
                        </nav>
                    </div>

                    {/* User Info & View Site Area */}
                    <div className="flex flex-col gap-2 mt-auto">
                        <div className="px-1 w-full flex justify-center">
                            <Link
                                href="/"
                                className={cn("flex items-center justify-center rounded-lg border border-white/8 hover:bg-white/5 transition-colors", open ? "gap-2 px-3 py-2 w-full" : "w-10 aspect-square")}
                            >
                                <Zap size={14} className="text-emerald-400 shrink-0" />
                                {open && <span className="text-xs font-semibold text-slate-300">Ver Sitio</span>}
                            </Link>
                        </div>

                        {/* Current User */}
                        <div className="p-2 border-t border-white/8 space-y-1 flex flex-col items-center">
                            {open ? (
                                <div className="px-2.5 py-2 rounded-lg w-full">
                                    <p className="text-xs font-semibold truncate text-slate-300">{profile?.full_name || user?.email}</p>
                                    <div className="flex items-center gap-1.5 mt-1">
                                        <span className={cn(
                                            "flex h-1.5 w-1.5 rounded-full",
                                            isAdmin ? "bg-violet-400" : "bg-slate-400"
                                        )} />
                                        <span className="text-[9px] font-semibold uppercase tracking-widest text-slate-500">
                                            {(profile?.roles || ['public']).join(' / ')}
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex justify-center py-1">
                                    <span className={cn(
                                        "flex h-2 w-2 rounded-full",
                                        isAdmin ? "bg-violet-400" : "bg-slate-500"
                                    )} />
                                </div>
                            )}
                            <button
                                onClick={handleLogout}
                                className={cn("flex items-center justify-center gap-2 text-xs font-medium text-slate-500 rounded-lg hover:bg-white/5 hover:text-rose-400 transition-colors mx-auto", open ? "justify-start px-2.5 py-2 w-full" : "w-10 aspect-square")}
                            >
                                <LogOut className="h-3.5 w-3.5 shrink-0" />
                                {open && <span>Cerrar Sesión</span>}
                            </button>
                        </div>
                    </div>
                </SidebarBody>
            </Sidebar>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden relative">


                <div className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-white/5 bg-background/50 backdrop-blur-md sticky top-16 md:top-0 z-40">
                    <AdminGlobalSearch />
                    <div className="hidden md:flex items-center gap-4">
                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Sistema Online</span>
                        </div>
                    </div>
                </div>

                <main className="flex-1 overflow-y-auto p-4 md:p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
