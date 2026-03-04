"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { User } from "@supabase/supabase-js";
import { HomeIcon, Calendar, Newspaper, MapPin, Trophy, Tv, Shield, User as UserIcon, BarChart3, LogOut } from "lucide-react";
import { ExpandableTabs } from "@/components/ui/expandable-tabs";
import { Button } from "@/components/ui-primitives";
import { supabase } from "@/lib/supabase";

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
        if (pathname.startsWith('/noticias')) return 2;
        if (pathname.startsWith('/mapa')) return 3;
        if (pathname.startsWith('/medallero')) return 4;
        if (pathname.startsWith('/tv')) return 6;
        if (pathname.startsWith('/admin') && isStaff) return 7;
        return null;
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/login');
        router.refresh();
    };

    return (
        <header className="sticky top-0 z-50 w-full backdrop-blur-xl border-b border-white/5 bg-[#0a0805]/70">
            <div className="flex h-16 items-center px-4 sm:px-6 w-full max-w-7xl mx-auto">
                {/* 1. Left: Logo Group */}
                <div className="flex-1 flex items-center justify-start">
                    <Link href="/">
                        <div className="flex items-center gap-3 sm:gap-4 group cursor-pointer">
                            <div className="relative flex-shrink-0 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                                <img src="/uninorte_logo.png" alt="Uninorte" className="h-10 sm:h-12 w-auto object-contain flex-shrink-0" />
                                <div className="absolute inset-0 bg-white/5 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                            </div>
                            <div className="flex flex-col justify-center">
                                <h1 className="font-extrabold text-[15px] sm:text-[18px] tracking-tight leading-none text-white">
                                    OLIMPIADAS
                                </h1>
                                <p className="text-[9px] sm:text-[10px] font-bold text-red-500 tracking-[0.2em] leading-none mt-1">
                                    UNINORTE 2026
                                </p>
                            </div>
                        </div>
                    </Link>
                </div>

                {/* 2. Center: Navigation Dock */}
                <div className="hidden md:flex flex-shrink-0 items-center justify-center">
                    <ExpandableTabs
                        activeColor="text-red-500"
                        activeItem={getActiveIndex()}
                        tabs={[
                            { title: "Inicio", icon: HomeIcon },
                            { title: "Calendario", icon: Calendar },
                            { title: "Noticias", icon: Newspaper },
                            { title: "Mapa", icon: MapPin },
                            { title: "Medallería", icon: Trophy },
                            { type: "separator" },
                            { title: "TV", icon: Tv },
                            ...(isStaff ? [{ title: "Admin", icon: Shield }] : []),
                        ]}
                        onChange={(index) => {
                            if (index === 0) router.push('/');
                            if (index === 1) router.push('/calendario');
                            if (index === 2) router.push('/noticias');
                            if (index === 3) router.push('/mapa');
                            if (index === 4) router.push('/medallero');
                            if (index === 6) window.open('/tv', '_blank');
                            if (index === 7 && isStaff) router.push('/admin');
                        }}
                    />
                </div>

                {/* 3. Right: User / Login Section */}
                <div className="flex-1 flex items-center justify-end gap-2">
                    {/* Mobile simplified nav */}
                    <div className="flex md:hidden items-center gap-1 sm:gap-2 mr-2">
                        <Link href="/calendario"><Button variant="ghost" size="icon" className="text-white/60 hover:text-white hover:bg-white/10 rounded-full h-8 w-8"><Calendar size={16} /></Button></Link>
                        <Link href="/noticias"><Button variant="ghost" size="icon" className="text-white/60 hover:text-white hover:bg-white/10 rounded-full h-8 w-8"><Newspaper size={16} /></Button></Link>
                    </div>

                    {!user ? (
                        <Link href="/login">
                            <Button variant="outline" className="rounded-full border-white/10 bg-white/5 hover:bg-white/10 text-white gap-2 hidden sm:flex font-medium">
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
                                className="flex items-center gap-3 cursor-pointer group"
                                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                            >
                                <div className="text-right hidden sm:block">
                                    <p className="text-[10px] text-slate-400/80 font-bold uppercase tracking-widest leading-none">HOLA,</p>
                                    <p className="text-[13px] font-bold text-white truncate max-w-[140px] mt-1 tracking-tight group-hover:text-amber-400 transition-colors">
                                        {profile?.full_name || user.email?.split('@')[0]}
                                    </p>
                                </div>
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#E86000] to-[#E86000] flex items-center justify-center text-white font-extrabold text-[15px] border border-white/10 shadow-[0_0_15px_rgba(232,96,0,0.3)] group-hover:scale-105 transition-all duration-300">
                                    {user.email?.substring(0, 2).toUpperCase()}
                                </div>
                            </div>

                            {/* Profile Dropdown */}
                            {profileMenuOpen && (
                                <div className="absolute right-0 top-full mt-2 w-56 bg-[#17130D] border border-white/10 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="px-4 py-3 border-b border-white/5">
                                        <p className="text-sm font-bold text-white truncate">{profile?.full_name || user.email?.split('@')[0]}</p>
                                        <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
                                    </div>
                                    <div className="py-1">
                                        {isStaff && (
                                            <button
                                                onClick={() => { setProfileMenuOpen(false); router.push('/admin'); }}
                                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-amber-400 hover:bg-amber-500/10 transition-colors"
                                            >
                                                <Shield size={16} />
                                                Panel Admin
                                            </button>
                                        )}
                                        <button
                                            onClick={() => { setProfileMenuOpen(false); router.push('/quiniela'); }}
                                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white hover:bg-white/5 transition-colors"
                                        >
                                            <BarChart3 size={16} />
                                            Mis Predicciones
                                        </button>
                                        <div className="my-1 border-t border-white/5" />
                                        <button
                                            onClick={handleLogout}
                                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-500/10 transition-colors"
                                        >
                                            <LogOut size={16} />
                                            Cerrar Sesión
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
