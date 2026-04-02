"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { User } from "@supabase/supabase-js";
import { AnimatePresence, m } from "framer-motion";
import { HomeIcon, Gamepad2, Newspaper, MapPin, Trophy, Tv, Shield, User as UserIcon, BarChart3, LogOut, Menu, X, Swords, Calendar as CalendarIcon, ChevronRight, Zap, TrendingUp, Heart } from "lucide-react";
import { ExpandableTabs } from "@/components/ui/expandable-tabs";
import { Button, Avatar } from "@/components/ui-primitives";
import { NotificationBell } from "@/components/notification-bell";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

interface MainNavbarProps {
    user: User | null;
    profile: any | null;
    isStaff: boolean;
}

export function MainNavbar({ user, profile, isStaff }: MainNavbarProps) {
    const router = useRouter();
    const pathname = usePathname();
    const [profileMenuOpen, setProfileMenuOpen] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const profileMenuRef = useRef<HTMLDivElement>(null);

    const getActiveIndex = () => {
        if (pathname === '/') return 0;
        if (pathname.startsWith('/calendario')) return 1;
        if (pathname.startsWith('/partidos')) return 2;
        if (pathname.startsWith('/noticias')) return 3;
        if (pathname.startsWith('/mapa')) return 4;
        if (pathname.startsWith('/medallero')) return 5;
        if (pathname.startsWith('/quiniela')) return 6;
        if (pathname.startsWith('/clasificacion')) return 7;
        if (pathname.startsWith('/estadisticas') || pathname.startsWith('/lideres')) return 8;
        // 9 is separator
        if (pathname.startsWith('/tv')) return 10;
        if (pathname.startsWith('/admin') && isStaff) return 11;
        return null;
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/login');
        router.refresh();
    };

    return (
        <>
            <header className="sticky top-0 z-50 w-full backdrop-blur-xl border-b border-white/5 bg-background/80">
                <div className="flex h-16 sm:h-18 items-center px-4 sm:px-6 w-full max-w-7xl mx-auto gap-4">
                    
                    {/* 1. LEFT: Menu + Logo (Mobile: Start, Desktop: Start) */}
                    <div className="flex-1 flex items-center justify-start order-1 gap-4">
                        {/* Mobile Menu Toggle */}
                        <div className="flex xl:hidden items-center mr-1">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-white hover:bg-white/10 rounded-full w-10 h-10 transition-colors"
                                onClick={() => setMobileMenuOpen(true)}
                            >
                                <Menu size={22} />
                            </Button>
                        </div>

                        {/* Logo (Visible on all views now) */}
                        <Link href="/">
                            <Image
                                src="/Logo Olimpiadas NEW.png"
                                alt="Olimpiadas Deportivas Interprogramas Uninorte"
                                width={280}
                                height={80}
                                className="h-10 sm:h-14 w-auto object-contain hover:opacity-80 transition-opacity"
                                priority
                            />
                        </Link>
                    </div>

                    {/* 2. CENTER: Navigation Dock (Hidden on mobile) */}
                    <div className="hidden xl:flex flex-shrink-0 items-center justify-center order-2 mx-2 max-w-[55%]">
                        <ExpandableTabs
                            activeColor="text-[#F5F5DC]"
                            activeItem={getActiveIndex()}
                            alwaysShowLabels={false}
                            tabs={[
                                { title: "Inicio", icon: HomeIcon },
                                { title: "Calendario", icon: CalendarIcon },
                                { title: "Partidos", icon: Gamepad2 },
                                { title: "Noticias", icon: Newspaper },
                                { title: "Mapa", icon: MapPin },
                                { title: "Medallería", icon: Trophy },
                                { title: "Acierta y Gana", icon: BarChart3 },
                                { title: "Clasificación", icon: Swords },
                                { title: "Líderes", icon: TrendingUp },
                                { type: "separator" },
                                { title: "TV", icon: Tv },
                                ...(isStaff ? [{ title: "Admin", icon: Shield }] : []),
                            ]}
                            onChange={(index) => {
                                if (index === 0) router.push('/');
                                if (index === 1) router.push('/calendario');
                                if (index === 2) router.push('/partidos');
                                if (index === 3) router.push('/noticias');
                                if (index === 4) router.push('/mapa');
                                if (index === 5) router.push('/medallero');
                                if (index === 6) router.push('/quiniela');
                                if (index === 7) router.push('/clasificacion');
                                if (index === 8) router.push('/estadisticas');
                                // index 9 is separator
                                if (index === 10) window.open('/tv', '_blank');
                                if (index === 11 && isStaff) router.push('/admin');
                            }}
                        />
                    </div>

                    {/* 3. RIGHT: User / Login Section (Mobile: End, Desktop: End) */}
                    <div className="flex-1 flex items-center justify-end order-3 gap-2">
                        {user && (
                            <>

                                <NotificationBell />
                            </>
                        )}
                        <div className="flex items-center gap-2">
                            {!user ? (
                                <Link href="/login">
                                    <Button variant="outline" className="rounded-full border-white/10 bg-white/5 hover:bg-white/10 text-[#F5F5DC] gap-2 hidden sm:flex font-medium">
                                        <UserIcon size={16} />
                                        Ingresar
                                    </Button>
                                    <Button variant="ghost" size="icon" className="sm:hidden text-white/80">
                                        <UserIcon size={20} />
                                    </Button>
                                </Link>
                            ) : (
                                <div className="relative" ref={profileMenuRef}>
                                    <div
                                        className="flex items-center gap-3 cursor-pointer group p-1 sm:pr-2 rounded-full hover:bg-white/5 transition-all duration-300"
                                        onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                                    >
                                        <div className="text-right hidden sm:block pl-2">
                                            <span className="block text-[9px] text-slate-500 font-black uppercase tracking-[0.2em] leading-none mb-1">¡Hola!</span>
                                            <p className="text-[13px] font-black text-white truncate max-w-[140px] tracking-tight group-hover:text-[#F5F5DC] transition-colors">
                                                {profile?.full_name?.split(' ')[0] || user.email?.split('@')[0]}
                                            </p>
                                        </div>

                                        {/* Premium Avatar with Ring */}
                                        <div className="relative">
                                            <div className="absolute inset-0 bg-gradient-to-br from-[#F5F5DC] to-white/50 rounded-full blur-[6px] opacity-40 group-hover:opacity-100 transition-opacity animate-pulse" />
                                            <div className="relative">
                                                <Avatar 
                                                    name={profile?.full_name || user.email} 
                                                    src={profile?.avatar_url}
                                                    size="default"
                                                    className="w-9 h-9 sm:w-10 sm:h-10 border-2 border-white/10 group-hover:scale-110 transition-transform duration-300"
                                                />
                                            </div>
                                            {/* Status Dot */}
                                            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-emerald-500 border-2 border-[#0a0805] shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                        </div>
                                    </div>

                                    {/* Profile Dropdown */}
                                    {profileMenuOpen && (
                                        <div className="absolute right-0 top-full mt-4 w-72 bg-background/95 backdrop-blur-3xl border border-white/10 rounded-[2rem] shadow-[0_30px_60px_rgba(0,0,0,0.9),0_0_20px_rgba(255,0,0,0.1)] overflow-hidden z-[100] animate-in fade-in slide-in-from-top-6 duration-300 origin-top-right ring-1 ring-white/5">
                                            
                                            {/* Header */}
                                            <div className="relative p-5 bg-gradient-to-br from-white/10 to-transparent border-b border-white/5 overflow-hidden group">
                                                <div className="absolute top-0 right-0 w-32 h-32 bg-[#F5F5DC]/10 blur-2xl rounded-full translate-x-1/2 -translate-y-1/2 transition-opacity group-hover:opacity-100 opacity-60" />
                                                <div className="relative z-10 flex items-center gap-4">
                                                    <Avatar name={profile?.full_name || user.email} src={profile?.avatar_url} className="w-12 h-12 border-2 border-white/10 rounded-full" />
                                                    <div className="flex flex-col flex-1 min-w-0">
                                                        <p className="text-sm font-black font-display text-white truncate drop-shadow-sm">{profile?.full_name || user.email?.split('@')[0]}</p>
                                                        <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider mt-0.5 truncate">{user.email}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Options */}
                                            <div className="p-3 space-y-1">
                                                {isStaff && (
                                                    <button onClick={() => { setProfileMenuOpen(false); router.push('/admin'); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-black font-display tracking-tight text-amber-400 hover:bg-amber-400/10 transition-all group/item">
                                                        <div className="w-9 h-9 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center group-hover/item:scale-110 group-hover/item:bg-amber-400/20 transition-all">
                                                            <Shield size={16} />
                                                        </div>
                                                        Admin Dashboard
                                                    </button>
                                                )}

                                                <button onClick={() => { setProfileMenuOpen(false); router.push('/perfil'); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-black font-display tracking-tight text-slate-300 hover:bg-white/5 hover:text-white transition-all group/item">
                                                    <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover/item:scale-110 group-hover/item:bg-white/10 transition-all">
                                                        <UserIcon size={16} />
                                                    </div>
                                                    Mi Perfil
                                                </button>

                                                <button onClick={() => { setProfileMenuOpen(false); router.push('/estadisticas'); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-black font-display tracking-tight text-rose-400 hover:bg-rose-500/10 transition-all group/item">
                                                    <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center group-hover/item:scale-110 group-hover/item:bg-rose-500/20 transition-all">
                                                        <Heart size={16} className="fill-current" />
                                                    </div>
                                                    Ranking de Popularidad
                                                </button>

                                                <button onClick={() => { setProfileMenuOpen(false); router.push('/quiniela'); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-black font-display tracking-tight text-indigo-400 hover:bg-indigo-500/10 transition-all group/item">
                                                    <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center group-hover/item:scale-110 group-hover/item:bg-indigo-500/20 transition-all">
                                                        <BarChart3 size={16} />
                                                    </div>
                                                    Acierta y Gana
                                                </button>
                                                
                                                <div className="my-2 mx-3 h-px bg-white/5" />
                                                
                                                <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-black font-display tracking-tight text-stone-400 hover:bg-stone-500/10 transition-all group/item">
                                                    <div className="w-9 h-9 rounded-xl bg-stone-500/10 border border-stone-500/20 flex items-center justify-center group-hover/item:scale-110 group-hover/item:bg-stone-500/20 transition-all">
                                                        <LogOut size={16} />
                                                    </div>
                                                    Cerrar Sesión
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </header>

            {/* Mobile Navigation Sidebar Animation - OUTSIDE HEADER */}
            <AnimatePresence>
                {mobileMenuOpen && (
                    <>
                        {/* Backdrop */}
                        <m.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setMobileMenuOpen(false)}
                            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9998] xl:hidden"
                        />
                        
                        {/* Sidebar */}
                        <m.div
                            initial={{ x: "-100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "-100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="fixed inset-y-0 left-0 w-[280px] sm:w-[320px] bg-background/95 backdrop-blur-3xl border-r border-white/10 z-[9999] flex flex-col xl:hidden shadow-[20px_0_50px_rgba(0,0,0,0.5)] overflow-hidden"
                        >
                            {/* Ambient background for sidebar */}
                            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-[300px] bg-gradient-to-b from-violet-600/10 to-transparent" />
                            </div>

                            {/* Sidebar Header */}
                            <div className="relative p-6 border-b border-white/5 flex items-center justify-between bg-black/40 backdrop-blur-md">
                                <Link href="/" onClick={() => setMobileMenuOpen(false)}>
                                    <Image src="/Logo Olimpiadas NEW.png" alt="Olimpiadas Deportivas" width={180} height={50} className="h-10 w-auto object-contain" />
                                </Link>
                                <button 
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 text-white/50 hover:text-white transition-all hover:bg-white/10"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Sidebar Navigation */}
                            <nav className="relative flex-1 overflow-y-auto p-4 space-y-1.5 custom-scrollbar">
                                {[
                                    ...(user ? [{ title: "Mi Perfil", icon: UserIcon, href: "/perfil" }] : []),
                                    { title: "Inicio", icon: HomeIcon, href: "/" },
                                    { title: "Calendario", icon: CalendarIcon, href: "/calendario" },
                                    { title: "Partidos", icon: Gamepad2, href: "/partidos" },
                                    { title: "Noticias", icon: Newspaper, href: "/noticias" },
                                    { title: "Mapa", icon: MapPin, href: "/mapa" },
                                    { title: "Medallería", icon: Trophy, href: "/medallero" },
                                    { title: "Acierta y Gana", icon: BarChart3, href: "/quiniela" },
                                    { title: "Clasificación", icon: Swords, href: "/clasificacion" },
                                    { title: "Líderes", icon: TrendingUp, href: "/estadisticas" },
                                    { title: "TV", icon: Tv, href: "/tv", external: true },
                                    ...(isStaff ? [{ title: "Admin Panel", icon: Shield, href: "/admin", special: true }] : []),
                                ].map((tab, idx) => {
                                    const isActive = pathname === tab.href || (tab.href !== '/' && pathname.startsWith(tab.href));
                                    
                                    return (
                                        <m.div
                                            key={tab.title}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.1 + (idx * 0.03) }}
                                        >
                                            <Link 
                                                href={tab.href}
                                                target={tab.external ? "_blank" : undefined}
                                                onClick={() => setMobileMenuOpen(false)}
                                                className={cn(
                                                    "flex items-center justify-between p-2.5 rounded-xl transition-all duration-300 group relative overflow-hidden",
                                                    isActive 
                                                        ? "bg-gradient-to-r from-violet-600/20 to-emerald-500/10 text-white border border-violet-500/30 shadow-lg" 
                                                        : tab.special 
                                                            ? "text-amber-500/80 hover:bg-amber-500/10 hover:text-amber-400 border border-transparent hover:border-amber-500/20" 
                                                            : "text-white/60 hover:bg-white/5 hover:text-white border border-transparent hover:border-white/5"
                                                )}
                                            >
                                                {/* Active background glow */}
                                                {isActive && (
                                                    <div className="absolute inset-0 bg-violet-600/10 blur-xl group-hover:bg-violet-600/20 transition-colors" />
                                                )}

                                                <div className="flex items-center gap-3.5 relative z-10">
                                                    <div className={cn(
                                                        "w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-300",
                                                        isActive 
                                                            ? "bg-gradient-to-br from-violet-600 to-emerald-500 text-white shadow-lg shadow-violet-600/40 rotate-0" 
                                                            : "bg-white/5 group-hover:bg-white/10 group-hover:scale-110 group-hover:rotate-3"
                                                    )}>
                                                        <tab.icon size={19} />
                                                    </div>
                                                    <span className={cn(
                                                        "font-display text-[13px] tracking-tight transition-all",
                                                        isActive ? "text-white" : "group-hover:translate-x-1"
                                                    )}><span className="font-black">{tab.title.slice(0, 2)}</span>{tab.title.slice(2)}</span>
                                                </div>
                                                <ChevronRight size={14} className={cn(
                                                    "transition-all duration-300 relative z-10",
                                                    isActive ? "opacity-100 translate-x-0 text-emerald-400" : "opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0"
                                                )} />
                                            </Link>
                                        </m.div>
                                    );
                                })}
                            </nav>

                            {/* Sidebar Footer */}
                            <div className="p-6 border-t border-white/5 bg-black/40 backdrop-blur-md">
                                <div className="flex flex-col items-center gap-1">
                                    <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.3em]">
                                        Olimpiadas Uninorte 2026
                                    </p>
                                    <div className="w-12 h-0.5 rounded-full bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-50" />
                                </div>
                            </div>
                        </m.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
