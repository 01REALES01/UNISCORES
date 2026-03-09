"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { User } from "@supabase/supabase-js";
import { HomeIcon, Calendar, Newspaper, MapPin, Trophy, Tv, Shield, User as UserIcon, BarChart3, LogOut, Menu, X, Swords } from "lucide-react";
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
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const profileMenuRef = useRef<HTMLDivElement>(null);

    const getActiveIndex = () => {
        if (pathname === '/') return 0;
        if (pathname.startsWith('/calendario')) return 1;
        if (pathname.startsWith('/noticias')) return 2;
        if (pathname.startsWith('/mapa')) return 3;
        if (pathname.startsWith('/medallero')) return 4;
        if (pathname.startsWith('/quiniela')) return 5;
        if (pathname.startsWith('/brackets')) return 6;
        if (pathname.startsWith('/tv')) return 8;
        if (pathname.startsWith('/admin') && isStaff) return 9;
        return null;
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/login');
        router.refresh();
    };

    return (
        <header className="sticky top-0 z-50 w-full backdrop-blur-xl border-b border-white/5 bg-[#0a0805]/80">
            <div className="flex h-16 sm:h-18 items-center px-4 sm:px-6 w-full max-w-7xl mx-auto">
                {/* 1. Left: Logo Group */}
                <div className="flex-1 flex items-center justify-start">
                    <Link href="/">
                        <div className="flex items-center gap-3 sm:gap-5 group cursor-pointer relative">
                            {/* Logo Wrapper - Balanced size */}
                            <div className="relative flex-shrink-0 flex items-center justify-center transition-all duration-500 group-hover:scale-105">
                                {/* Ambient Glow - Balanced intensity */}
                                <div className="absolute inset-0 bg-red-600/30 rounded-full blur-[30px] opacity-20 group-hover:opacity-50 animate-pulse duration-[4s] transition-opacity" />

                                {/* Logo Image */}
                                <Image
                                    src="/uninorte_logo.png"
                                    alt="Uninorte"
                                    width={100}
                                    height={100}
                                    className="h-12 sm:h-18 w-auto object-contain flex-shrink-0 relative z-10 filter drop-shadow-[0_0_10px_rgba(255,255,255,0.3)] group-hover:drop-shadow-[0_0_15px_rgba(255,0,0,0.5)] transition-all duration-500"
                                    priority
                                />
                            </div>

                            {/* Text labels - Professional & Sporty */}
                            <div className="flex flex-col justify-center">
                                <h1 className="font-black text-[18px] sm:text-[24px] tracking-tighter leading-none text-white transition-all duration-500 group-hover:text-red-500">
                                    OLIMPIADAS
                                </h1>
                                <div className="flex items-center gap-1.5 mt-1 sm:mt-1.5">
                                    <span className="h-px w-2 sm:w-4 bg-red-600/50" />
                                    <p className="text-[9px] sm:text-[11px] font-black text-red-600 tracking-[0.3em] uppercase leading-none drop-shadow-[0_0_8px_rgba(220,38,38,0.4)] transition-all duration-500 group-hover:text-white">
                                        UNINORTE 2026
                                    </p>
                                </div>
                            </div>
                        </div>
                    </Link>
                </div>

                {/* 2. Center: Navigation Dock */}
                <div className="hidden lg:flex flex-shrink-0 items-center justify-center">
                    <ExpandableTabs
                        activeColor="text-red-500"
                        activeItem={getActiveIndex()}
                        alwaysShowLabels={false}
                        tabs={[
                            { title: "Inicio", icon: HomeIcon },
                            { title: "Calendario", icon: Calendar },
                            { title: "Noticias", icon: Newspaper },
                            { title: "Mapa", icon: MapPin },
                            { title: "Medallería", icon: Trophy },
                            { title: "Predicciones", icon: BarChart3 },
                            { title: "Brackets", icon: Swords },
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
                            if (index === 5) router.push('/quiniela');
                            if (index === 6) router.push('/brackets');
                            if (index === 8) window.open('/tv', '_blank');
                            if (index === 9 && isStaff) router.push('/admin');
                        }}
                        onHover={(index) => {
                            if (index === 0) router.prefetch('/');
                            if (index === 1) router.prefetch('/calendario');
                            if (index === 2) router.prefetch('/noticias');
                            if (index === 3) router.prefetch('/mapa');
                            if (index === 4) router.prefetch('/medallero');
                            if (index === 5) router.prefetch('/quiniela');
                            if (index === 6) router.prefetch('/brackets');
                            if (index === 9 && isStaff) router.prefetch('/admin');
                        }}
                    />
                </div>

                {/* 3. Right: User / Login Section */}
                <div className="flex-1 flex items-center justify-end gap-2">
                    {/* Mobile Menu Toggle */}
                    <div className="flex lg:hidden items-center mr-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-white hover:bg-white/10 rounded-full w-10 h-10"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        >
                            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                        </Button>
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
                                className="flex items-center gap-3 cursor-pointer group p-1 pr-2 rounded-full hover:bg-white/5 transition-all duration-300"
                                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                            >
                                <div className="text-right hidden sm:block pl-2">
                                    <span className="block text-[9px] text-slate-500 font-black uppercase tracking-[0.2em] leading-none mb-1">¡Hola!</span>
                                    <p className="text-[13px] font-black text-white truncate max-w-[140px] tracking-tight group-hover:text-red-500 transition-colors">
                                        {profile?.full_name?.split(' ')[0] || user.email?.split('@')[0]}
                                    </p>
                                </div>

                                {/* Premium Avatar with Ring */}
                                <div className="relative">
                                    <div className="absolute inset-0 bg-gradient-to-br from-red-600 to-orange-500 rounded-full blur-sm opacity-40 group-hover:opacity-100 transition-opacity animate-pulse" />
                                    <div className="relative w-10 h-10 rounded-full bg-[#1A1612] border-2 border-white/10 flex items-center justify-center overflow-hidden shadow-2xl transition-transform duration-300 group-hover:scale-110">
                                        <div className="absolute inset-0 bg-gradient-to-br from-red-600/20 to-orange-500/20" />
                                        <span className="relative z-10 text-white font-black text-[14px] tracking-tighter uppercase drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">
                                            {user.email?.substring(0, 2).toUpperCase()}
                                        </span>
                                    </div>
                                    {/* Status Dot */}
                                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#0a0805] shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                </div>
                            </div>

                            {/* Profile Dropdown */}
                            {profileMenuOpen && (
                                <div className="absolute right-0 top-full mt-3 w-64 bg-[#0F0D0A]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden z-[100] animate-in fade-in slide-in-from-top-4 duration-300 origin-top-right">
                                    <div className="p-4 bg-gradient-to-br from-white/[0.03] to-transparent border-b border-white/5">
                                        <p className="text-sm font-black text-white truncate drop-shadow-sm">{profile?.full_name || user.email?.split('@')[0]}</p>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5 truncate">{user.email}</p>
                                    </div>
                                    <div className="p-1.5">
                                        {isStaff && (
                                            <button
                                                onClick={() => { setProfileMenuOpen(false); router.push('/admin'); }}
                                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-amber-400 hover:bg-amber-400/10 transition-all group/item"
                                            >
                                                <div className="w-8 h-8 rounded-lg bg-amber-400/10 flex items-center justify-center group-hover/item:scale-110 transition-transform">
                                                    <Shield size={16} />
                                                </div>
                                                Admin Dashboard
                                            </button>
                                        )}
                                        <button
                                            onClick={() => { setProfileMenuOpen(false); router.push('/quiniela'); }}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-slate-300 hover:bg-white/5 hover:text-white transition-all group/item"
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover/item:scale-110 transition-transform">
                                                <BarChart3 size={16} />
                                            </div>
                                            Mis Predicciones
                                        </button>
                                        <div className="my-1.5 h-px bg-white/5" />
                                        <button
                                            onClick={handleLogout}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-red-500 hover:bg-red-500/10 transition-all group/item"
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center group-hover/item:scale-110 transition-transform">
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

            {/* Mobile Navigation Menu Dropdown */}
            {mobileMenuOpen && (
                <div className="lg:hidden absolute top-full left-0 right-0 bg-[#0a0805]/95 backdrop-blur-xl border-b border-white/10 shadow-2xl animate-in slide-in-from-top-2 fade-in duration-200">
                    <nav className="flex flex-col p-4 gap-2">
                        <Link href="/" onClick={() => setMobileMenuOpen(false)}>
                            <div className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-colors ${pathname === '/' ? 'bg-red-500/10 text-red-500' : 'text-white/80 hover:bg-white/5 hover:text-white'}`}>
                                <HomeIcon size={20} />
                                <span className="font-medium text-sm">Inicio</span>
                            </div>
                        </Link>
                        <Link href="/calendario" onClick={() => setMobileMenuOpen(false)}>
                            <div className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-colors ${pathname.startsWith('/calendario') ? 'bg-red-500/10 text-red-500' : 'text-white/80 hover:bg-white/5 hover:text-white'}`}>
                                <Calendar size={20} />
                                <span className="font-medium text-sm">Calendario</span>
                            </div>
                        </Link>
                        <Link href="/noticias" onClick={() => setMobileMenuOpen(false)}>
                            <div className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-colors ${pathname.startsWith('/noticias') ? 'bg-red-500/10 text-red-500' : 'text-white/80 hover:bg-white/5 hover:text-white'}`}>
                                <Newspaper size={20} />
                                <span className="font-medium text-sm">Noticias</span>
                            </div>
                        </Link>
                        <Link href="/mapa" onClick={() => setMobileMenuOpen(false)}>
                            <div className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-colors ${pathname.startsWith('/mapa') ? 'bg-red-500/10 text-red-500' : 'text-white/80 hover:bg-white/5 hover:text-white'}`}>
                                <MapPin size={20} />
                                <span className="font-medium text-sm">Mapa</span>
                            </div>
                        </Link>
                        <Link href="/medallero" onClick={() => setMobileMenuOpen(false)}>
                            <div className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-colors ${pathname.startsWith('/medallero') ? 'bg-red-500/10 text-red-500' : 'text-white/80 hover:bg-white/5 hover:text-white'}`}>
                                <Trophy size={20} />
                                <span className="font-medium text-sm">Medallería</span>
                            </div>
                        </Link>
                        <Link href="/quiniela" onClick={() => setMobileMenuOpen(false)}>
                            <div className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-colors ${pathname.startsWith('/quiniela') ? 'bg-red-500/10 text-red-500' : 'text-white/80 hover:bg-white/5 hover:text-white'}`}>
                                <BarChart3 size={20} />
                                <span className="font-medium text-sm">Predicciones</span>
                            </div>
                        </Link>
                        <Link href="/brackets" onClick={() => setMobileMenuOpen(false)}>
                            <div className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-colors ${pathname.startsWith('/brackets') ? 'bg-red-500/10 text-red-500' : 'text-white/80 hover:bg-white/5 hover:text-white'}`}>
                                <Swords size={20} />
                                <span className="font-medium text-sm">Brackets</span>
                            </div>
                        </Link>
                        <div className="h-px bg-white/10 my-2" />
                        <a href="/tv" target="_blank" rel="noopener noreferrer" onClick={() => setMobileMenuOpen(false)}>
                            <div className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-colors ${pathname.startsWith('/tv') ? 'bg-red-500/10 text-red-500' : 'text-white/80 hover:bg-white/5 hover:text-white'}`}>
                                <Tv size={20} />
                                <span className="font-medium text-sm">TV</span>
                            </div>
                        </a>
                        {isStaff && (
                            <Link href="/admin" onClick={() => setMobileMenuOpen(false)}>
                                <div className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-colors ${pathname.startsWith('/admin') ? 'bg-amber-500/10 text-amber-500' : 'text-amber-500/80 hover:bg-amber-500/5 hover:text-amber-500'}`}>
                                    <Shield size={20} />
                                    <span className="font-medium text-sm">Admin Panel</span>
                                </div>
                            </Link>
                        )}
                    </nav>
                </div>
            )}
        </header>
    );
}
