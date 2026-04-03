"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { User } from "@supabase/supabase-js";
import { HomeIcon, Gamepad2, Newspaper, MapPin, Trophy, Shield, User as UserIcon, BarChart3, LogOut, Swords, Calendar as CalendarIcon, TrendingUp, Heart } from "lucide-react";
import { ExpandableTabs } from "@/components/ui/expandable-tabs";
import { Button, Avatar } from "@/components/ui-primitives";
import { NotificationBell } from "@/components/notification-bell";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { MobileBottomNav } from "@/shared/components/mobile-bottom-nav";

interface MainNavbarProps {
    user: User | null;
    profile: any | null;
    isStaff: boolean;
}

export function MainNavbar({ user, profile, isStaff }: MainNavbarProps) {
    const router = useRouter();
    const pathname = usePathname();
    const [profileMenuOpen, setProfileMenuOpen] = useState(false);
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
        if (pathname.startsWith('/admin') && isStaff) return 9;
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
                    
                    {/* 1. LEFT: Logo */}
                    <div className="flex-1 flex items-center justify-start order-1">
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
                                if (index === 9 && isStaff) router.push('/admin');
                            }}
                        />
                    </div>

                    {/* 3. RIGHT: User / Notifications (desktop only on mobile, profile is in bottom dock) */}
                    <div className="flex-1 flex items-center justify-end order-3 gap-2">
                        {/* Notification bell — visible on all sizes */}
                        {user && <NotificationBell />}

                        {/* Profile dropdown — hidden on mobile (replaced by dock slot 5) */}
                        <div className="hidden md:flex items-center gap-2">
                            {!user ? (
                                <Link href="/login">
                                    <Button variant="outline" className="rounded-full border-white/10 bg-white/5 hover:bg-white/10 text-[#F5F5DC] gap-2 font-medium">
                                        <UserIcon size={16} />
                                        Ingresar
                                    </Button>
                                </Link>
                            ) : (
                                <div className="relative" ref={profileMenuRef}>
                                    <div
                                        className="flex items-center gap-3 cursor-pointer group p-1 pr-2 rounded-full hover:bg-white/5 transition-all duration-300"
                                        onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                                    >
                                        <div className="text-right pl-2">
                                            <span className="block text-[9px] text-slate-500 font-black uppercase tracking-[0.2em] leading-none mb-1">¡Hola!</span>
                                            <p className="text-[13px] font-black text-white truncate max-w-[140px] tracking-tight group-hover:text-[#F5F5DC] transition-colors">
                                                {profile?.full_name?.split(' ')[0] || user.email?.split('@')[0]}
                                            </p>
                                        </div>
                                        <div className="relative">
                                            <div className="absolute inset-0 bg-gradient-to-br from-[#F5F5DC] to-white/50 rounded-full blur-[6px] opacity-40 group-hover:opacity-100 transition-opacity animate-pulse" />
                                            <div className="relative">
                                                <Avatar
                                                    name={profile?.full_name || user.email}
                                                    src={profile?.avatar_url}
                                                    size="default"
                                                    className="w-10 h-10 border-2 border-white/10 group-hover:scale-110 transition-transform duration-300"
                                                />
                                            </div>
                                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#0a0805] shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                        </div>
                                    </div>

                                    {/* Profile Dropdown */}
                                    {profileMenuOpen && (
                                        <div className="absolute right-0 top-full mt-4 w-72 bg-background/95 backdrop-blur-3xl border border-white/10 rounded-[2rem] shadow-[0_30px_60px_rgba(0,0,0,0.9)] overflow-hidden z-[100] animate-in fade-in slide-in-from-top-6 duration-300 origin-top-right ring-1 ring-white/5">
                                            <div className="relative p-5 bg-gradient-to-br from-white/10 to-transparent border-b border-white/5 overflow-hidden group">
                                                <div className="absolute top-0 right-0 w-32 h-32 bg-[#F5F5DC]/10 blur-2xl rounded-full translate-x-1/2 -translate-y-1/2" />
                                                <div className="relative z-10 flex items-center gap-4">
                                                    <Avatar name={profile?.full_name || user.email} src={profile?.avatar_url} className="w-12 h-12 border-2 border-white/10 rounded-full" />
                                                    <div className="flex flex-col flex-1 min-w-0">
                                                        <p className="text-sm font-black font-display text-white truncate">{profile?.full_name || user.email?.split('@')[0]}</p>
                                                        <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider mt-0.5 truncate">{user.email}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="p-3 space-y-1">
                                                {isStaff && (
                                                    <button onClick={() => { setProfileMenuOpen(false); router.push('/admin'); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-black font-display tracking-tight text-amber-400 hover:bg-amber-400/10 transition-all group/item">
                                                        <div className="w-9 h-9 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center group-hover/item:bg-amber-400/20 transition-all"><Shield size={16} /></div>
                                                        Admin Dashboard
                                                    </button>
                                                )}
                                                <button onClick={() => { setProfileMenuOpen(false); router.push('/perfil'); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-black font-display tracking-tight text-slate-300 hover:bg-white/5 transition-all group/item">
                                                    <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover/item:bg-white/10 transition-all"><UserIcon size={16} /></div>
                                                    Mi Perfil
                                                </button>
                                                <button onClick={() => { setProfileMenuOpen(false); router.push('/estadisticas'); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-black font-display tracking-tight text-rose-400 hover:bg-rose-500/10 transition-all group/item">
                                                    <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center group-hover/item:bg-rose-500/20 transition-all"><Heart size={16} className="fill-current" /></div>
                                                    Ranking de Popularidad
                                                </button>
                                                <button onClick={() => { setProfileMenuOpen(false); router.push('/quiniela'); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-black font-display tracking-tight text-indigo-400 hover:bg-indigo-500/10 transition-all group/item">
                                                    <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center group-hover/item:bg-indigo-500/20 transition-all"><BarChart3 size={16} /></div>
                                                    Acierta y Gana
                                                </button>
                                                <div className="my-2 mx-3 h-px bg-white/5" />
                                                <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-black font-display tracking-tight text-stone-400 hover:bg-stone-500/10 transition-all group/item">
                                                    <div className="w-9 h-9 rounded-xl bg-stone-500/10 border border-stone-500/20 flex items-center justify-center group-hover/item:bg-stone-500/20 transition-all"><LogOut size={16} /></div>
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

            {/* Mobile Bottom Navigation Dock */}
            <MobileBottomNav />
        </>
    );
}
