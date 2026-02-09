"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Trophy, LayoutDashboard, Calendar, Users, LogOut, Menu, X, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const pathname = usePathname();
    const router = useRouter();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/admin/login");
    };

    const menuItems = [
        { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
        { name: "Partidos", href: "/admin/partidos", icon: Calendar },
        { name: "Usuarios", href: "/admin/usuarios", icon: Users },
    ];

    return (
        <div className="min-h-screen flex">
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
                    "fixed inset-y-0 left-0 z-50 w-72 bg-card/80 backdrop-blur-xl border-r border-border/50 transition-transform duration-300 md:relative md:translate-x-0",
                    isSidebarOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                {/* Logo */}
                <div className="flex h-16 items-center px-6 border-b border-border/50">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-secondary text-white mr-3 shadow-lg shadow-primary/30">
                        <Trophy size={20} />
                    </div>
                    <div>
                        <span className="font-bold text-lg tracking-tight">Olimpiadas</span>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Admin Panel</p>
                    </div>
                    <button
                        className="ml-auto md:hidden text-muted-foreground hover:text-foreground"
                        onClick={() => setIsSidebarOpen(false)}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 space-y-1 px-4 py-6">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-3 mb-3">Navegación</p>
                    {menuItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setIsSidebarOpen(false)}
                                className={cn(
                                    "group flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200",
                                    isActive
                                        ? "bg-gradient-to-r from-primary to-secondary text-white shadow-lg shadow-primary/25"
                                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                )}
                            >
                                <item.icon className={cn("h-5 w-5 transition-colors", isActive ? "text-white" : "text-muted-foreground group-hover:text-foreground")} />
                                {item.name}
                                {item.name === "Partidos" && (
                                    <span className={cn(
                                        "ml-auto px-2 py-0.5 text-[10px] font-bold rounded-full",
                                        isActive ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
                                    )}>
                                        <Zap size={10} className="inline mr-0.5" />Live
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Logout */}
                <div className="p-4 border-t border-border/50">
                    <button
                        onClick={handleLogout}
                        className="group flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-danger rounded-xl hover:bg-danger/10 transition-all"
                    >
                        <LogOut className="h-5 w-5" />
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
