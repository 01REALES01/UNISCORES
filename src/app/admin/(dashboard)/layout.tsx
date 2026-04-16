"use client";

import { useState, useEffect, useLayoutEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Trophy, LayoutDashboard, Calendar, Users, LogOut, Menu, X, Zap, Shield, BarChart3, Newspaper, Loader2, Upload, ListOrdered, Shuffle, ClipboardList, BookOpen, CalendarDays, Swords } from "lucide-react";
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
    const primaryScrollRef = useRef<HTMLDivElement>(null);
    const bodyScrollYRef = useRef(0);

    // Redirect to login if not authenticated or not staff
    useEffect(() => {
        // Only redirect if we are SURE loading is finished and there's no user
        if (!loading && !user) {
            // Include original path for redirect memory
            const currentPath = window.location.pathname;
            router.push(`/login?redirect=${encodeURIComponent(currentPath)}`);
        }
    }, [loading, user, router]);

    /** Bloquea el scroll del documento (evita 2ª barra). El único scroll vertical es #admin-primary-scroll. */
    useLayoutEffect(() => {
        if (loading || !user) return;
        if (profileLoading && !profile) return;
        if (!profile || !isStaff) return;

        bodyScrollYRef.current = window.scrollY;
        const body = document.body;
        const html = document.documentElement;
        body.style.position = "fixed";
        body.style.top = `-${bodyScrollYRef.current}px`;
        body.style.left = "0";
        body.style.right = "0";
        body.style.width = "100%";
        body.style.overflow = "hidden";
        html.style.overflow = "hidden";

        return () => {
            body.style.position = "";
            body.style.top = "";
            body.style.left = "";
            body.style.right = "";
            body.style.width = "";
            body.style.overflow = "";
            html.style.overflow = "";
            window.scrollTo(0, bodyScrollYRef.current);
        };
    }, [loading, user, profile, profileLoading, isStaff]);

    /**
     * Si el navegador aún entrega wheel al documento, reenvía al panel principal
     * (no roba eventos de inputs ni de regiones con data-nested-scroll).
     */
    useEffect(() => {
        if (loading || !user || !profile || !isStaff) return;

        const isTextInput = (el: EventTarget | null) => {
            if (!(el instanceof HTMLElement)) return false;
            const tag = el.tagName;
            if (tag === "TEXTAREA") return true;
            if (tag === "INPUT") {
                const type = (el as HTMLInputElement).type || "text";
                return ["text", "search", "email", "password", "url", "tel", "number"].includes(type);
            }
            if (el.isContentEditable) return true;
            return false;
        };

        const hasNestedScrollParent = (start: HTMLElement | null, stop: HTMLElement | null) => {
            let node: HTMLElement | null = start;
            while (node && node !== stop) {
                if (node.hasAttribute("data-nested-scroll")) return true;
                const { overflowY } = getComputedStyle(node);
                if (
                    (overflowY === "auto" || overflowY === "scroll") &&
                    node.scrollHeight > node.clientHeight + 1
                ) {
                    return true;
                }
                node = node.parentElement;
            }
            return false;
        };

        const onWheel = (e: WheelEvent) => {
            if (isTextInput(e.target)) return;
            const panel = primaryScrollRef.current;
            if (!panel) return;
            const t = e.target;
            if (!(t instanceof HTMLElement)) return;
            // Sidebar: deja que haga scroll su propio nav / drawer
            if (t.closest("[data-admin-sidebar]")) return;
            if (panel.contains(t)) {
                if (hasNestedScrollParent(t, panel)) return;
                return;
            }
            if (panel.scrollHeight <= panel.clientHeight + 1) return;
            e.preventDefault();
            panel.scrollTop += e.deltaY;
        };

        document.addEventListener("wheel", onWheel, { passive: false, capture: true });
        return () => document.removeEventListener("wheel", onWheel, { capture: true } as AddEventListenerOptions);
    }, [loading, user, profile, isStaff]);

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
            { name: "Tenis", href: "/admin/tenis", icon: Swords },
            { name: "Importar", href: "/admin/importar", icon: Upload },
            ...(isAdmin ? [{ name: "Usuarios", href: "/admin/usuarios", icon: Users }] : []),
        ];

    return (
        <div
            data-admin-root
            className="fixed inset-0 z-20 flex min-h-0 max-h-[100dvh] w-full flex-col overflow-hidden bg-background text-slate-200 selection:bg-violet-500/30 md:flex-row"
        >
            <div data-admin-sidebar className="contents md:block md:shrink-0">
            <Sidebar open={open} setOpen={setOpen}>
                <SidebarBody className="justify-between gap-10">
                    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                        {/* Logo Area */}
                        <div className="flex shrink-0 py-3 border-b border-white/8 items-center justify-center">
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
                        <nav className="admin-sidebar-nav flex min-h-0 flex-1 flex-col gap-0.5 overflow-x-hidden overflow-y-auto overscroll-y-contain px-1 py-4 items-stretch [-webkit-overflow-scrolling:touch] md:min-h-0 md:[scrollbar-width:none] md:[&::-webkit-scrollbar]:hidden">
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
            </div>

            {/* Único scroll vertical explícito: #admin-primary-scroll (body queda fijo) */}
            <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                <div className="z-30 flex shrink-0 items-center justify-between border-b border-white/5 bg-zinc-950/95 px-4 py-3 backdrop-blur-md md:px-6">
                    <AdminGlobalSearch />
                    <div className="hidden md:flex items-center gap-4">
                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Sistema Online</span>
                        </div>
                    </div>
                </div>

                <div
                    id="admin-primary-scroll"
                    ref={primaryScrollRef}
                    className="admin-primary-scroll min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain p-4 pb-10 [-webkit-overflow-scrolling:touch] md:p-6 md:pb-12"
                >
                    <main className="min-w-0">{children}</main>
                </div>
            </div>
        </div>
    );
}
