"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { User } from "@supabase/supabase-js";
import { 
    HomeIcon, Gamepad2, Newspaper, MapPin, Trophy, Shield, 
    User as UserIcon, BarChart3, LogOut, Swords, 
    Calendar as CalendarIcon, TrendingUp, Heart, Menu, X 
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
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

    // Close mobile menu on route change
    useEffect(() => {
        setMobileMenuOpen(false);
    }, [pathname]);

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

    const navItems = [
        { title: "Inicio", icon: HomeIcon, href: '/' },
        { title: "Calendario", icon: CalendarIcon, href: '/calendario' },
        { title: "Partidos", icon: Gamepad2, href: '/partidos' },
        { title: "Noticias", icon: Newspaper, href: '/noticias' },
        { title: "Mapa", icon: MapPin, href: '/mapa' },
        { title: "Medallería", icon: Trophy, href: '/medallero' },
        { title: "Acierta y Gana", icon: BarChart3, href: '/quiniela' },
        { title: "Clasificación", icon: Swords, href: '/clasificacion' },
        { title: "Líderes", icon: TrendingUp, href: '/estadisticas' },
        ...(isStaff ? [{ title: "Admin", icon: Shield, href: '/admin' }] : []),
    ];

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/login');
        router.refresh();
    };

    return (
        <>
            <header className="sticky top-0 z-50 w-full backdrop-blur-xl border-b border-white/5 bg-background/80">
                <div className="flex h-16 sm:h-18 items-center px-4 sm:px-6 w-full max-w-7xl mx-auto gap-4">
                    
                    {/* 1. LEFT: Hamburger & Logo */}
                    <div className="flex-1 flex items-center justify-start order-1 gap-3">
                        {/* Hamburger Menu Icon */}
                        <button 
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="xl:hidden p-2 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white transition-all shadow-lg active:scale-95 group"
                            aria-label="Toggle menu"
                        >
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={mobileMenuOpen ? 'close' : 'menu'}
                                    initial={{ opacity: 0, rotate: -90 }}
                                    animate={{ opacity: 1, rotate: 0 }}
                                    exit={{ opacity: 0, rotate: 90 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                                </motion.div>
                            </AnimatePresence>
                        </button>

                        <Link href="/" className="shrink-0">
                            <Image
                                src="/Logo Olimpiadas NEW.png"
                                alt="Logo"
                                width={280}
                                height={80}
                                className="h-9 sm:h-14 w-auto object-contain hover:opacity-80 transition-opacity"
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
                            tabs={navItems.map(item => ({ title: item.title, icon: item.icon }))}
                            onChange={(index) => router.push(navItems[index].href)}
                        />
                    </div>

                    {/* 3. RIGHT: User / Notifications */}
                    <div className="flex-1 flex items-center justify-end order-3 gap-2 sm:gap-4">
                        {/* Notification bell */}
                        {user && <NotificationBell />}

                        {/* Profile dropdown */}
                        <div className="flex items-center gap-2">
                            {!user ? (
                                <Link href="/login">
                                    <Button variant="outline" className="rounded-full border-white/10 bg-white/5 hover:bg-white/10 text-[#F5F5DC] gap-2 font-medium px-3 sm:px-4 h-9 sm:h-10 text-xs sm:text-sm">
                                        <UserIcon size={16} />
                                        <span className="hidden sm:inline">Ingresar</span>
                                    </Button>
                                </Link>
                            ) : (
                                <div className="relative" ref={profileMenuRef}>
                                    <div
                                        className="flex items-center gap-2 sm:gap-3 cursor-pointer group p-1 sm:pr-2 rounded-full hover:bg-white/5 transition-all duration-300"
                                        onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                                    >
                                        <div className="hidden sm:block text-right pl-2">
                                            <span className="block text-[8px] text-slate-500 font-black uppercase tracking-[0.2em] leading-none mb-1">¡Hola!</span>
                                            <p className="text-[12px] font-black text-white truncate max-w-[120px] tracking-tight group-hover:text-[#F5F5DC] transition-colors">
                                                {profile?.full_name?.split(' ')[0] || user.email?.split('@')[0]}
                                            </p>
                                        </div>
                                        <div className="relative shrink-0">
                                            <div className="absolute inset-0 bg-gradient-to-br from-[#F5F5DC] to-white/50 rounded-full blur-[4px] opacity-40 group-hover:opacity-100 transition-opacity" />
                                            <Avatar
                                                name={profile?.full_name || user.email}
                                                src={profile?.avatar_url}
                                                size="default"
                                                className="w-9 h-9 sm:w-10 sm:h-10 border-2 border-white/10 group-hover:scale-105 transition-transform"
                                            />
                                            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#0a0805]" />
                                        </div>
                                    </div>

                                    {/* Profile Dropdown */}
                                    {profileMenuOpen && (
                                        <div className="absolute right-0 top-full mt-4 w-72 bg-background/95 backdrop-blur-3xl border border-white/10 rounded-[2rem] shadow-[0_30px_60px_rgba(0,0,0,0.9)] overflow-hidden z-[100] animate-in fade-in slide-in-from-top-6 duration-300 origin-top-right ring-1 ring-white/5">
                                            <div className="relative p-5 bg-gradient-to-br from-white/10 to-transparent border-b border-white/5 overflow-hidden group">
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

            {/* Mobile Navigation Drawer */}
            <AnimatePresence>
                {mobileMenuOpen && (
                    <>
                        {/* Backdrop with sophisticated blur */}
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setMobileMenuOpen(false)}
                            className="fixed inset-0 bg-black/70 backdrop-blur-md z-[500] xl:hidden"
                        />
                        {/* Drawer Container */}
                        <motion.div 
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
                            className="fixed inset-y-0 left-0 w-[300px] bg-[#0a0805]/90 backdrop-blur-3xl border-r border-white/10 z-[501] xl:hidden flex flex-col shadow-[20px_0_60px_rgba(0,0,0,0.9)] overflow-hidden"
                        >
                            {/* Watermark Decoration */}
                            <div className="absolute inset-0 pointer-events-none opacity-5 flex items-center justify-center overflow-hidden">
                                <img src="/elementos/09.png" alt="" className="w-full h-auto object-contain scale-150 rotate-12" />
                            </div>

                            {/* Gradient Accent Bloom */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/10 blur-[100px] -z-10 rounded-full translate-x-1/2 -translate-y-1/2" />

                            {/* Header inside Drawer */}
                            <div className="px-6 pt-12 pb-6 flex items-center justify-between border-b border-white/5 relative z-10">
                                <Link href="/" onClick={() => setMobileMenuOpen(false)}>
                                    <Image src="/Logo Olimpiadas NEW.png" alt="Logo" width={160} height={40} className="h-8 w-auto object-contain" />
                                </Link>
                                <button onClick={() => setMobileMenuOpen(false)} className="p-2 rounded-full bg-white/5 text-white/50 hover:bg-white/10 hover:text-white transition-all">
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Navigation Items */}
                            <div className="flex-1 overflow-y-auto py-6 px-4 space-y-2 relative z-10 custom-scrollbar">
                                {navItems.map((item) => {
                                    const active = pathname === item.href;
                                    return (
                                        <Link 
                                            key={item.href}
                                            href={item.href}
                                            onClick={() => setMobileMenuOpen(false)}
                                            className={cn(
                                                "flex items-center gap-4 px-5 py-4 rounded-[1.5rem] transition-all duration-300 group relative",
                                                active 
                                                    ? "bg-violet-600/15 text-white shadow-[inset_0_0_20px_rgba(124,58,237,0.1)] border border-violet-500/20" 
                                                    : "text-white/40 hover:bg-white/5 hover:text-white border border-transparent"
                                            )}
                                        >
                                            {/* Icon with specific accent support */}
                                            <div className={cn(
                                                "w-11 h-11 rounded-2xl flex items-center justify-center border transition-all duration-300",
                                                active 
                                                    ? "bg-violet-600/30 border-violet-400/50 text-violet-400 shadow-[0_0_15px_rgba(124,58,237,0.3)]" 
                                                    : "bg-white/5 border-white/10 text-white/20 group-hover:border-white/20 group-hover:text-white"
                                            )}>
                                                <item.icon size={20} strokeWidth={active ? 2.5 : 1.5} />
                                            </div>

                                            {/* Label with Neulis Font */}
                                            <div className="flex flex-col">
                                                <span className={cn(
                                                    "text-lg font-display tracking-wide capitalize transition-all duration-300",
                                                    active ? "text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]" : "text-white/60 group-hover:text-white"
                                                )}>
                                                    {item.title}
                                                </span>
                                                {active && (
                                                    <motion.div 
                                                        layoutId="mobile-nav-active-bar"
                                                        className="h-0.5 w-6 bg-violet-400 rounded-full mt-0.5"
                                                    />
                                                )}
                                            </div>

                                            {/* Glow for Active Item */}
                                            {active && (
                                                <div className="absolute inset-0 bg-violet-600/5 blur-xl -z-10 rounded-[1.5rem]" />
                                            )}
                                        </Link>
                                    );
                                })}
                            </div>
                            
                            {/* Drawer Footer */}
                            <div className="p-6 border-t border-white/5 relative z-10 bg-[#0a0805]/40 backdrop-blur-sm">
                                <div className="flex flex-col gap-1">
                                    <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.3em] text-center">Uninorte</p>
                                    <p className="text-[12px] text-[#F5F5DC]/40 font-display tracking-wide text-center">Olimpiadas Deportivas 2026</p>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
