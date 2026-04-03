"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
    Home, Calendar, Gamepad2, Trophy, Newspaper,
    Swords, TrendingUp, BarChart3, MapPin,
    User as UserIcon, LogOut, Shield, Heart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Avatar } from "@/components/ui-primitives";
import { supabase } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

interface NavItem {
    id: string;
    label: string;
    icon: React.ElementType;
    href: string;
}

// ─── All possible nav items ───────────────────────────────────────────────────

const I: Record<string, NavItem> = {
    calendario:   { id: 'calendario',   label: 'Fecha',   icon: Calendar,   href: '/calendario'    },
    partidos:     { id: 'partidos',     label: 'Match',   icon: Gamepad2,   href: '/partidos'      },
    medallero:    { id: 'medallero',    label: 'Podio',   icon: Trophy,     href: '/medallero'     },
    clasificacion:{ id: 'clasificacion',label: 'Llaves',  icon: Swords,     href: '/clasificacion' },
    lideres:      { id: 'lideres',      label: 'Top',     icon: TrendingUp, href: '/estadisticas'  },
    noticias:     { id: 'noticias',     label: 'News',    icon: Newspaper,  href: '/noticias'      },
    mapa:         { id: 'mapa',         label: 'Mapa',    icon: MapPin,     href: '/mapa'          },
    quiniela:     { id: 'quiniela',     label: 'Acierta', icon: BarChart3,  href: '/quiniela'      },
};

// ─── Context groups — [left1, left2, right1] (slots 1, 2, 4) ─────────────────

const CONTEXT_SLOTS: Record<string, [NavItem, NavItem, NavItem]> = {
    default:     [I.partidos,      I.mapa,          I.medallero    ],
    competicion: [I.partidos,      I.clasificacion, I.medallero    ],
    resultados:  [I.medallero,     I.lideres,       I.partidos     ],
    comunidad:   [I.noticias,      I.quiniela,      I.medallero    ],
    personal:    [I.quiniela,      I.medallero,     I.partidos     ],
};

function getContext(pathname: string): string {
    if (pathname.startsWith('/partidos') || pathname.startsWith('/partido/') || pathname.startsWith('/clasificacion') || pathname.startsWith('/calendario')) return 'competicion';
    if (pathname.startsWith('/medallero') || pathname.startsWith('/estadisticas') || pathname.startsWith('/lideres')) return 'resultados';
    // Mapa is the entry point — visiting it activates the full comunidad context
    if (pathname.startsWith('/mapa') || pathname.startsWith('/noticias')) return 'comunidad';
    if (pathname.startsWith('/quiniela') || pathname.startsWith('/perfil') || pathname.startsWith('/notificaciones')) return 'personal';
    return 'default';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function NavSlot({ item, active }: { item: NavItem; active: boolean }) {
    return (
        <Link
            href={item.href}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 py-1 relative min-w-0 active:scale-90 transition-transform"
        >
            <AnimatePresence mode="wait">
                <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 8, scale: 0.85 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.85 }}
                    transition={{ duration: 0.18, type: "spring", stiffness: 400, damping: 28 }}
                    className="flex flex-col items-center gap-0.5"
                >
                    <div className={cn(
                        "relative w-9 h-9 rounded-[0.9rem] flex items-center justify-center transition-all duration-300",
                        active ? "bg-white/10 text-white" : "text-white/35"
                    )}>
                        {/* Active indicator bar */}
                        {active && (
                            <span className="absolute -top-3.5 w-4 h-0.5 rounded-full bg-white/50 shadow-[0_0_8px_rgba(255,255,255,0.6)]" />
                        )}
                        <item.icon size={17} strokeWidth={active ? 2.5 : 1.8} />
                    </div>
                    <span className={cn(
                        "text-[7px] font-black uppercase tracking-wider leading-none truncate max-w-[44px] transition-all duration-300",
                        active ? "text-white/70 opacity-100" : "text-white/25 opacity-80"
                    )}>
                        {item.label}
                    </span>
                </motion.div>
            </AnimatePresence>
        </Link>
    );
}

const BTN_COLOR: Record<string, string> = {
    amber:  "text-amber-400 hover:bg-amber-400/10",
    slate:  "text-slate-300 hover:bg-white/5 hover:text-white",
    rose:   "text-rose-400 hover:bg-rose-500/10",
    indigo: "text-indigo-400 hover:bg-indigo-500/10",
    stone:  "text-stone-400 hover:bg-stone-500/10",
};
const BTN_ICON: Record<string, string> = {
    amber:  "bg-amber-400/10 border-amber-400/20 text-amber-400",
    slate:  "bg-white/5 border-white/10 text-slate-300",
    rose:   "bg-rose-500/10 border-rose-500/20 text-rose-400",
    indigo: "bg-indigo-500/10 border-indigo-500/20 text-indigo-400",
    stone:  "bg-stone-500/10 border-stone-500/20 text-stone-400",
};

function SheetButton({ onClick, icon, label, color }: { onClick: () => void; icon: React.ReactNode; label: string; color: string }) {
    return (
        <button
            onClick={onClick}
            className={cn("w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-black font-display tracking-tight transition-all duration-200 text-left", BTN_COLOR[color])}
        >
            <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 transition-all", BTN_ICON[color])}>
                {icon}
            </div>
            {label}
        </button>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function MobileBottomNav() {
    const { user, profile, isStaff } = useAuth();
    const pathname = usePathname();
    const router = useRouter();
    const [profileOpen, setProfileOpen] = useState(false);

    const ctx = getContext(pathname);
    const [s1, s2, s4] = CONTEXT_SLOTS[ctx];

    const isActive = (href: string) => href === '/' ? pathname === '/' : pathname.startsWith(href);
    const isHome = pathname === '/';

    const handleLogout = async () => {
        setProfileOpen(false);
        await supabase.auth.signOut();
        router.push('/');
        router.refresh();
    };

    return (
        <>
            {/* ── Floating Dock ─────────────────────────────────────────────── */}
            <div
                className="md:hidden fixed bottom-0 left-0 right-0 z-[9990] px-3 pb-3"
                style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
            >
                {/* Fade-out gradient behind dock so content blends */}
                <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#1a0e35]/90 to-transparent pointer-events-none -z-10" />

                <nav className="relative flex items-center bg-[#120c2a]/92 backdrop-blur-3xl border border-white/[0.08] rounded-[1.75rem] shadow-[0_-2px_40px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.05)] overflow-visible h-[58px] px-1">

                    {/* Inner gloss */}
                    <div className="absolute inset-0 rounded-[1.75rem] bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none" />

                    {/* ── Slot 1 */}
                    <NavSlot item={s1} active={isActive(s1.href)} />

                    {/* ── Slot 2 */}
                    <NavSlot item={s2} active={isActive(s2.href)} />

                    {/* ── Slot 3: HOME (permanent, center, elevated) */}
                    <Link
                        href="/"
                        aria-label="Inicio"
                        className="flex-1 flex flex-col items-center justify-center relative group"
                    >
                        {/* Elevated button — pops above the dock */}
                        <div className={cn(
                            "absolute -top-5 w-13 h-13 rounded-2xl flex items-center justify-center transition-all duration-400 border shadow-[0_8px_25px_rgba(0,0,0,0.7)]",
                            isHome
                                ? "bg-gradient-to-br from-violet-500 to-emerald-500 border-white/30 shadow-[0_0_25px_rgba(124,58,237,0.6)] scale-110"
                                : "bg-gradient-to-br from-violet-700 to-violet-900 border-white/15 group-active:scale-95"
                        )}
                            style={{ width: '52px', height: '52px' }}
                        >
                            <Home size={22} strokeWidth={2.5} className="text-white drop-shadow-sm" />
                        </div>
                        {/* Invisible spacer keeps flex layout */}
                        <div style={{ width: '52px', height: '100%' }} />
                        <span className="absolute bottom-1 text-[7px] font-black uppercase tracking-wider text-white/25">
                            Inicio
                        </span>
                    </Link>

                    {/* ── Slot 4 */}
                    <NavSlot item={s4} active={isActive(s4.href)} />

                    {/* ── Slot 5: PROFILE (permanent, far-right) */}
                    <button
                        onClick={() => user ? setProfileOpen(true) : router.push('/login')}
                        aria-label="Perfil"
                        className="flex-1 flex flex-col items-center justify-center gap-0.5 py-1 active:scale-90 transition-transform"
                    >
                        <div className="relative">
                            {user ? (
                                <>
                                    <Avatar
                                        name={profile?.full_name || user.email}
                                        src={profile?.avatar_url}
                                        size="sm"
                                        className="w-8 h-8 border border-white/20"
                                    />
                                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#120c2a] shadow-[0_0_6px_rgba(52,211,153,0.9)]" />
                                </>
                            ) : (
                                <div className="w-8 h-8 rounded-xl bg-white/8 border border-white/15 flex items-center justify-center text-white/40">
                                    <UserIcon size={15} />
                                </div>
                            )}
                        </div>
                        <span className="text-[7px] font-black uppercase tracking-wider text-white/25 leading-none">
                            {user ? 'Perfil' : 'Entrar'}
                        </span>
                    </button>
                </nav>
            </div>

            {/* ── Profile Sheet ─────────────────────────────────────────────── */}
            <AnimatePresence>
                {profileOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.22 }}
                            className="fixed inset-0 bg-black/65 backdrop-blur-sm z-[9995] md:hidden"
                            onClick={() => setProfileOpen(false)}
                        />

                        {/* Sheet */}
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 32, stiffness: 380, mass: 0.8 }}
                            drag="y"
                            dragConstraints={{ top: 0 }}
                            dragElastic={0.12}
                            onDragEnd={(_, info) => { if (info.offset.y > 80) setProfileOpen(false); }}
                            className="fixed bottom-0 left-0 right-0 z-[9996] md:hidden"
                            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
                        >
                            <div className="bg-[#0f0a22]/98 border-t border-white/[0.08] rounded-t-[2rem] shadow-[0_-20px_60px_rgba(0,0,0,0.95)] overflow-hidden">

                                {/* Drag handle */}
                                <div className="flex justify-center pt-3 pb-1">
                                    <div className="w-9 h-1 rounded-full bg-white/15" />
                                </div>

                                {/* User info header */}
                                {user && (
                                    <div className="px-5 pb-4 pt-2 flex items-center gap-4 border-b border-white/[0.06]">
                                        <div className="relative">
                                            <Avatar
                                                name={profile?.full_name || user.email}
                                                src={profile?.avatar_url}
                                                className="w-12 h-12 border-2 border-white/10"
                                            />
                                            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#0f0a22]" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-black font-display text-white truncate">
                                                {profile?.full_name || user.email?.split('@')[0]}
                                            </p>
                                            <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider truncate mt-0.5">
                                                {user.email}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Options */}
                                <div className="p-4 space-y-1 pb-8">
                                    {!user ? (
                                        <button
                                            onClick={() => { router.push('/login'); setProfileOpen(false); }}
                                            className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-emerald-600 text-white font-black font-display text-sm tracking-tight shadow-lg"
                                        >
                                            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                                                <UserIcon size={18} />
                                            </div>
                                            Iniciar Sesión
                                        </button>
                                    ) : (
                                        <>
                                            {isStaff && (
                                                <SheetButton
                                                    onClick={() => { router.push('/admin'); setProfileOpen(false); }}
                                                    icon={<Shield size={16} />}
                                                    label="Admin Dashboard"
                                                    color="amber"
                                                />
                                            )}
                                            <SheetButton
                                                onClick={() => { router.push('/perfil'); setProfileOpen(false); }}
                                                icon={<UserIcon size={16} />}
                                                label="Mi Perfil"
                                                color="slate"
                                            />
                                            <SheetButton
                                                onClick={() => { router.push('/estadisticas'); setProfileOpen(false); }}
                                                icon={<Heart size={16} className="fill-current" />}
                                                label="Ranking de Popularidad"
                                                color="rose"
                                            />
                                            <SheetButton
                                                onClick={() => { router.push('/quiniela'); setProfileOpen(false); }}
                                                icon={<BarChart3 size={16} />}
                                                label="Acierta y Gana"
                                                color="indigo"
                                            />
                                            <div className="h-px bg-white/[0.06] my-2" />
                                            <SheetButton
                                                onClick={handleLogout}
                                                icon={<LogOut size={16} />}
                                                label="Cerrar Sesión"
                                                color="stone"
                                            />
                                        </>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
