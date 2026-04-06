"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { User } from "@supabase/supabase-js";
import { 
    HomeIcon, Gamepad2, Newspaper, MapPin, Trophy, Shield, 
    User as UserIcon, BarChart3, LogOut, Swords, 
    Calendar as CalendarIcon, TrendingUp, Heart, Menu, X,
    ChevronRight
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

    // User's specific requested text and casing based on the reference image
    const navItems = [
        { title: "Inicio", icon: HomeIcon, href: '/' },
        { title: "CaLendario", icon: CalendarIcon, href: '/calendario' },
        { title: "PaRtidos", icon: Gamepad2, href: '/partidos' },
        { title: "NoTicias", icon: Newspaper, href: '/noticias' },
        { title: "MaPa", icon: MapPin, href: '/mapa' },
        { title: "MeDallería", icon: Trophy, href: '/medallero' },
        { title: "Acierta y Gana", icon: BarChart3, href: '/quiniela' },
        { title: "ClAsificación", icon: Swords, href: '/clasificacion' },
        { title: "Líderes", icon: TrendingUp, href: '/estadisticas' },
        ...(isStaff ? [{ title: "Admin", icon: Shield, href: '/admin' }] : []),
    ];

    const isActive = (href: string) => {
        if (href === '/' && pathname === '/') return true;
        if (href !== '/' && pathname.startsWith(href)) return true;
        return false;
    };

    const mobileNavItems = user 
        ? [{ title: "Mi Perfil", icon: UserIcon, href: '/perfil' }, ...navItems]
        : navItems;

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
                                src="/Olimpiadas elementos.png"
                                alt="Logo"
                                width={280}
                                height={80}
                                className="h-9 sm:h-14 w-auto object-contain hover:opacity-80 transition-opacity"
                                priority
                            />
                        </Link>
                    </div>

                    {/* 2. CENTER: Navigation Dock */}
                    <div className="hidden xl:flex flex-shrink-0 items-center justify-center order-2 mx-2 max-w-[55%]">
                        <ExpandableTabs
                            activeColor="text-[#F5F5DC]"
                            activeItem={getActiveIndex()}
                            alwaysShowLabels={false}
                            tabs={navItems.map(item => ({ title: item.title, icon: item.icon }))}
                            onChange={(index) => { if (typeof index === 'number' && navItems[index]) router.push(navItems[index].href); }}
                        />
                    </div>

                    {/* 3. RIGHT: User / Notifications */}
                    <div className="flex-1 flex items-center justify-end order-3 gap-2 sm:gap-4">
                        {user && <NotificationBell />}
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
                                            <Avatar
                                                name={profile?.full_name || user.email}
                                                src={profile?.avatar_url}
                                                size="default"
                                                className="w-9 h-9 sm:w-10 sm:h-10 border-2 border-white/10 group-hover:scale-105 transition-transform"
                                            />
                                            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#0a0805]" />
                                        </div>
                                    </div>
                                    {profileMenuOpen && (
                                        <div className="absolute right-0 top-full mt-4 w-72 bg-background/95 backdrop-blur-3xl border border-white/10 rounded-[2rem] shadow-[0_30px_60px_rgba(0,0,0,0.9)] overflow-hidden z-[100] animate-in fade-in slide-in-from-top-6 duration-300 origin-top-right ring-1 ring-white/5">
                                            <div className="p-3 space-y-1">
                                                <button onClick={() => { setProfileMenuOpen(false); router.push('/perfil'); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-black font-display tracking-tight text-slate-300 hover:bg-white/5 transition-all group/item">
                                                    <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover/item:bg-white/10 transition-all"><UserIcon size={16} /></div>
                                                    Mi Perfil
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
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setMobileMenuOpen(false)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[500] xl:hidden"
                        />
                        <motion.div 
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                            className="fixed inset-y-0 left-0 w-[290px] bg-[#330c5e] z-[501] xl:hidden flex flex-col shadow-2xl overflow-hidden"
                        >
                            {/* Drawer Header */}
                            <div className="px-5 pt-10 pb-6 flex items-center justify-between relative z-10 border-b border-white/5">
                                <Link href="/" onClick={() => setMobileMenuOpen(false)}>
                                    <Image src="/Olimpiadas elementos.png" alt="Logo" width={220} height={50} className="h-8 w-auto object-contain" />
                                </Link>
                                <button onClick={() => setMobileMenuOpen(false)} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:bg-white/20 hover:text-white transition-all shadow-md active:scale-95 border border-white/10">
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Spacing below header match */}
                            <div className="h-4" />

                            {/* Navigation Items */}
                            <div className="flex-1 overflow-y-auto px-4 space-y-2 relative z-10 custom-scrollbar">
                                {mobileNavItems.map((item) => {
                                    const active = isActive(item.href);
                                    return (
                                        <Link 
                                            key={item.href}
                                            href={item.href}
                                            onClick={() => setMobileMenuOpen(false)}
                                            className={cn(
                                                "flex items-center gap-4 px-4 py-3.5 rounded-[1.2rem] transition-all duration-300 group",
                                                active 
                                                    ? "bg-white/10 backdrop-blur-md border border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.1)]" 
                                                    : "text-[#9d7bb0] hover:bg-white/5 border border-transparent"
                                            )}
                                        >
                                            {/* Icon Container with Reference Palette */}
                                            <div className={cn(
                                                "w-11 h-11 rounded-2xl flex items-center justify-center border transition-all duration-300",
                                                active 
                                                    ? "bg-gradient-to-br from-[#00E5FF] via-[#7B1FA2] to-[#7B1FA2] border-white/30 text-white shadow-lg" 
                                                    : "bg-[#2a0c41] border border-white/5 text-[#9d7bb0] group-hover:text-white"
                                            )}>
                                                <item.icon size={22} strokeWidth={active ? 2.5 : 1.5} className="relative z-10" />
                                            </div>

                                            {/* Label match reference casing */}
                                            <div className="flex flex-col flex-1 min-w-0">
                                                <span className={cn(
                                                    "text-lg font-display tracking-tight transition-all duration-300 truncate",
                                                    active ? "text-white" : "text-[#9d7bb0] group-hover:text-white"
                                                )}>
                                                    {item.title}
                                                </span>
                                            </div>

                                            {/* Chevron indicator for active state */}
                                            {active && (
                                                <ChevronRight size={18} className="text-emerald-400 group-hover:translate-x-1 transition-transform" />
                                            )}
                                        </Link>
                                    );
                                })}
                            </div>
                            
                            {/* Drawer Footer with exact spacing and glow accent */}
                            <div className="p-8 pb-10 relative z-10 mt-auto">
                                <div className="flex flex-col items-center gap-3">
                                    <p className="text-[10px] text-white/30 font-bold uppercase tracking-[0.45em] text-center w-full">Olimpiadas Uninorte 2026</p>
                                    <div className="h-[2px] w-14 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_10px_rgba(34,211,238,0.6)]" />
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
