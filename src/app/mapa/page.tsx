"use client";

import { useEffect, useState, useMemo } from "react";
import { m, AnimatePresence } from "framer-motion";
import { CampusMapInteractive } from "@/components/campus-map-interactive";
import { supabase } from "@/lib/supabase";
import { safeQuery } from "@/lib/supabase-query";
import { Button, Badge } from "@/components/ui-primitives";
import { SportIcon } from "@/components/sport-icons";
import { 
    ArrowLeft, 
    MapPin, 
    Activity, 
    Calendar,
    Trophy as TrophyIcon, 
    Info, 
    Map as MapIcon, 
    Sparkles 
} from "lucide-react";
import Link from "next/link";
import { LUGARES_OLIMPICOS } from "@/lib/constants";
import { MainNavbar } from "@/components/main-navbar";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { getDisplayName, getCarreraSubtitle } from "@/lib/sport-helpers";
import { useMatches } from "@/hooks/use-matches";
import { SafeBackButton } from "@/shared/components/safe-back-button";

const FACILITIES_INFO = [
    {
        id: 'futbol',
        name: 'Cancha de Fútbol',
        mapVenue: 'Cancha de Fútbol',
        image: '/images/installations/futbol.png',
        description: 'Nuestra cancha de fútbol cuenta con grama sintética de última tecnología y una iluminación profesional para encuentros nocturnos de alta intensidad.',
        details: ['Luz Profesional', 'Gradas Cubiertas', 'Grama Sintética']
    },
    {
        id: 'coliseo',
        name: 'Coliseo Los Fundadores',
        mapVenue: 'Coliseo Uninorte',
        image: '/images/installations/coliseo.png',
        description: 'El corazón deportivo de la universidad. Un espacio polivalente donde se vive la pasión del baloncesto, voleibol y otras disciplinas bajo techo.',
        details: ['Tablero Electrónico', 'Maderamen Profesional', 'Climatización']
    },
    {
        id: 'piscina',
        name: 'Piscina Deportiva',
        mapVenue: 'Piscina Centro Deportivo',
        image: '/images/installations/piscina.png',
        description: 'Nuestras piscinas ofrecen un ambiente olímpico para la natación competitiva y el recreo, con agua cristalina y carriles reglamentarios.',
        details: ['Medidas Olímpicas', 'Carriles Marcados', 'Zona de Calentamiento']
    },
    {
        id: 'tenis',
        name: 'Complejo de Tenis',
        mapVenue: 'Cancha de Tenis',
        image: '/images/installations/tenis.png',
        description: 'Canchas de tenis de superficie dura con medidas reglamentarias, ideales para torneos individuales y de dobles.',
        details: ['Superficie Rápida', 'Medidas Oficiales', 'Gradas Laterales']
    },
    {
        id: 'baambu',
        name: 'Jardín Baambu',
        mapVenue: 'Baambu',
        image: '/images/installations/baambu.png',
        description: 'Un espacio natural y relajante, ideal para deportes de mesa y actividades de bajo impacto rodeado de vegetación.',
        details: ['Ambiente Natural', 'Zona de Descanso', 'Sombra Permanente']
    }
];

export default function CampusMapPage() {
    const { user, profile, isStaff } = useAuth();
    const { matches, loading: matchesLoading } = useMatches();
    const [selectedVenue, setSelectedVenue] = useState<string | null>(null);

    const activeFacility = useMemo(() => 
        FACILITIES_INFO.find(f => f.mapVenue === selectedVenue),
    [selectedVenue]);

    const loading = matchesLoading;

    return (
        <div className="min-h-screen bg-background text-white relative overflow-hidden">
            <MainNavbar user={user} profile={profile} isStaff={isStaff} />

            {/* Background Effects */}
            <div className="absolute inset-0 z-0 pointer-events-none opacity-40 mix-blend-screen">
                <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-violet-600/20 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
                <div className="absolute bottom-[-10%] right-[-5%] w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />
            </div>

            <div className="w-full px-4 pt-12 pb-4 relative z-10 max-w-[1600px] mx-auto">
                <div className="flex justify-start mb-6">
                    <SafeBackButton fallback="/" />
                </div>
                <div className="flex flex-col items-center text-center gap-1 mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <p className="font-display text-xs font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-emerald-400 tracking-[0.3em]">
                        Sedes & ubicaciones
                    </p>
                    <h1 className="text-5xl md:text-[5rem] font-black tracking-tighter font-display text-transparent bg-clip-text bg-gradient-to-br from-white to-white/60 drop-shadow-sm leading-none">
                        Mapa del campus
                    </h1>
                </div>

                {/* Leyenda */}
                <div className="flex items-center gap-3 bg-white/5 p-2 rounded-xl backdrop-blur-md border border-white/5 w-fit">
                    <div className="flex items-center gap-1.5 px-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                        <span className="text-xs font-bold text-zinc-300">En Curso</span>
                    </div>
                    <div className="w-px h-4 bg-white/10" />
                    <div className="flex items-center gap-1.5 px-2">
                        <span className="w-2 h-2 rounded-full bg-violet-400" />
                        <span className="text-xs font-bold text-zinc-300">Programado</span>
                    </div>
                    <div className="w-px h-4 bg-white/10" />
                    <div className="flex items-center gap-1.5 px-2">
                        <span className="w-2 h-2 rounded-full bg-white/20" />
                        <span className="text-xs font-bold text-zinc-500">Inactivo</span>
                    </div>
                </div>
            </div>

            <div id="mapa-contenedor" className="scroll-mt-32" />

            {/* Main Map Component */}
            <div className="w-full h-[75vh] min-h-[500px] mx-auto my-6 border border-white/5 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] relative bg-white ring-2 ring-black/5">
                {loading ? (
                    <div className="w-full h-full flex items-center justify-center bg-background">
                        <div className="flex flex-col items-center gap-4">
                            <Activity className="animate-spin text-emerald-400" size={32} />
                            <span className="text-xs font-mono text-white/50 uppercase tracking-widest">Cargando Satélite...</span>
                        </div>
                    </div>
                ) : (
                    <CampusMapInteractive 
                        matches={matches} 
                        onVenueSelect={setSelectedVenue}
                        externalSelectedVenue={selectedVenue}
                    />
                )}
            </div>

            {/* Facilities Showcase Section */}
            <div className="max-w-7xl mx-auto px-4 mb-20 relative z-20">
                <div className="flex flex-col items-center text-center mb-10">
                    <m.div 
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-2 mb-2"
                    >
                        <Sparkles className="text-emerald-400" size={16} />
                        <span className="font-display text-xs font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-600 tracking-[0.3em]">Explora uninorte</span>
                    </m.div>
                    <h2 className="text-4xl md:text-6xl font-black text-white tracking-tighter mb-4 font-display text-transparent bg-clip-text bg-gradient-to-br from-white to-white/60">
                        Instalaciones
                    </h2>
                    <p className="text-white/50 text-sm max-w-lg mb-8 font-medium">
                        Interactúa con el mapa o elige una opción para conocer los escenarios donde se vive la pasión olímpica.
                    </p>

                    <div className="flex flex-wrap justify-center gap-3">
                        {FACILITIES_INFO.map(fac => (
                            <Button 
                                key={fac.id}
                                variant={selectedVenue === fac.mapVenue ? "default" : "outline"}
                                className={cn(
                                    "rounded-full px-6 py-2 h-auto text-xs font-black uppercase tracking-wider transition-all duration-300 border-white/5",
                                    selectedVenue === fac.mapVenue 
                                        ? "bg-violet-600 text-white shadow-[0_0_20px_rgba(124,58,237,0.3)] scale-105 border-transparent" 
                                        : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                                )}
                                onClick={() => setSelectedVenue(fac.mapVenue === selectedVenue ? null : fac.mapVenue)}
                            >
                                {fac.name}
                            </Button>
                        ))}
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    {activeFacility ? (
                        <m.div
                            key={activeFacility.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.5, ease: "circOut" }}
                            className="relative w-full rounded-[2.5rem] overflow-hidden bg-black/40 border border-white/5 shadow-2xl backdrop-blur-sm group"
                        >
                            <div className="grid grid-cols-1 lg:grid-cols-2">
                                <div className="relative h-[300px] lg:h-[500px] overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10 lg:hidden" />
                                    <m.img 
                                        initial={{ scale: 1.1 }}
                                        animate={{ scale: 1 }}
                                        transition={{ duration: 2 }}
                                        src={activeFacility.image} 
                                        alt={activeFacility.name}
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                    />
                                    <div className="absolute top-6 left-6 z-20">
                                        <Badge className="bg-white/10 backdrop-blur-md border-emerald-500/30 text-emerald-400 font-bold tracking-widest px-4 py-1.5 rounded-full text-[10px] uppercase font-display">
                                            Sede Oficial
                                        </Badge>
                                    </div>
                                </div>
                                <div className="p-8 lg:p-12 flex flex-col justify-center relative overflow-hidden bg-background/50">
                                    <div className="absolute -top-20 -right-20 w-80 h-80 bg-violet-600/10 rounded-full blur-[100px] pointer-events-none" />
                                    
                                    <m.div
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.2 }}
                                    >
                                        <h3 className="font-display text-3xl lg:text-5xl font-black text-white mb-6 tracking-tighter leading-none">
                                            {activeFacility.name}
                                        </h3>
                                        <p className="text-white/60 text-lg leading-relaxed mb-8 max-w-md font-medium">
                                            {activeFacility.description}
                                        </p>
                                        
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
                                            {activeFacility.details.map((detail, i) => (
                                                <div key={detail} className="p-3 rounded-2xl bg-white/5 border border-white/5 flex flex-col items-center text-center backdrop-blur-sm">
                                                    <Sparkles size={14} className="text-emerald-400 mb-2" />
                                                    <span className="text-[10px] font-bold text-white/80 uppercase tracking-wider">{detail}</span>
                                                </div>
                                            ))}
                                        </div>

                                        <Button 
                                            variant="outline" 
                                            className="rounded-full border-white/20 text-[#F5F5DC] hover:bg-white/10 active:bg-white/5 transition-all font-black uppercase tracking-[0.2em] text-xs h-12 px-8"
                                            onClick={() => {
                                                const element = document.getElementById('mapa-contenedor');
                                                element?.scrollIntoView({ behavior: 'smooth' });
                                            }}
                                        >
                                            Ver ubicación en mapa
                                        </Button>
                                    </m.div>
                                </div>
                            </div>
                        </m.div>
                    ) : (
                        <m.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex flex-col items-center justify-center py-20 bg-white/5 rounded-[2.5rem] border border-white/5 border-dashed"
                        >
                            <div className="w-16 h-16 rounded-full bg-black/20 flex items-center justify-center mb-6">
                                <MapIcon className="text-zinc-600" size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-white/50 mb-2">Selecciona un punto para explorar</h3>
                            <p className="text-zinc-600 text-sm max-w-xs text-center">
                                Haz clic en los pines amarillos del mapa o utiliza los botones de arriba.
                            </p>
                        </m.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="w-full px-4 py-8 relative z-10 max-w-[1600px] mx-auto">
                <div className="flex items-center gap-3 mb-6 px-1">
                    <div className="relative p-2 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20">
                        <Calendar size={18} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-white uppercase tracking-tighter">Agenda por escenarios</h2>
                        <p className="text-zinc-500 text-[10px] uppercase tracking-widest font-bold">Resumen de actividad hoy</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {LUGARES_OLIMPICOS.map((venue, idx) => {
                        const venueMatches = matches.filter(m => m.lugar?.includes(venue));
                        // Sort by date: live first, then upcoming
                        const sortedMatches = [...venueMatches].sort((a, b) => {
                            if (a.estado === 'en_curso' && b.estado !== 'en_curso') return -1;
                            if (a.estado !== 'en_curso' && b.estado === 'en_curso') return 1;
                            return new Date(a.fecha).getTime() - new Date(b.fecha).getTime();
                        });
                        
                        const currentOrNext = sortedMatches[0];
                        const others = sortedMatches.slice(1);

                        return (
                            <m.div 
                                key={venue} 
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: idx * 0.1 }}
                                className="group relative"
                            >
                                <div className="absolute -inset-1 bg-gradient-to-r from-violet-600/10 to-emerald-600/10 rounded-[2rem] blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200" />
                                
                                <div className="relative flex flex-col h-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] overflow-hidden transition-all duration-500 hover:border-violet-500/30 hover:translate-y-[-4px]">
                                    {/* Card Header */}
                                    <div className="p-6 border-b border-white/5 bg-gradient-to-br from-white/5 to-transparent">
                                        <div className="flex justify-between items-start mb-1">
                                            <h3 className="text-xl font-black text-white tracking-tighter group-hover:text-emerald-400 transition-colors uppercase">
                                                {venue}
                                            </h3>
                                            {currentOrNext?.estado === 'en_curso' && (
                                                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.3)] flex items-center gap-1.5 font-black px-3 py-1 font-display tracking-wide">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                                    EN CURSO
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-[10px] text-white/40 font-bold uppercase tracking-[0.2em]">Escenario Olímpico</p>
                                    </div>

                                    {/* Main Content Area */}
                                    <div className="flex-1 p-6 flex flex-col gap-6">
                                        {currentOrNext ? (
                                            <>
                                                {/* Current/Featured Event */}
                                                <div>
                                                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-3 block opacity-80">
                                                        {currentOrNext.estado === 'en_curso' ? 'En este momento' : 'Próximo Evento'}
                                                    </span>
                                                    <Link 
                                                        href={`/partido/${currentOrNext.id}`}
                                                        className="block p-5 rounded-3xl bg-black/20 border border-white/5 hover:bg-white/5 transition-all group/match"
                                                    >
                                                        <div className="flex items-center justify-between mb-4">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center border border-white/10 text-emerald-400">
                                                                    <SportIcon sport={currentOrNext.disciplinas?.name || ''} size={16} />
                                                                </div>
                                                                <span className="text-xs font-bold text-white/80">{currentOrNext.disciplinas?.name}</span>
                                                            </div>
                                                            <div className="font-mono text-[11px] text-emerald-400 font-black bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                                                                {new Date(currentOrNext.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </div>
                                                        </div>
                                                        {currentOrNext.marcador_detalle?.tipo === 'carrera' ? (
                                                            <div className="text-xl font-black text-white text-center py-2 relative z-10 w-full">
                                                                <span className="whitespace-nowrap overflow-hidden text-ellipsis max-w-full block text-[#F5F5DC]">
                                                                    {currentOrNext.marcador_detalle?.distancia} {currentOrNext.marcador_detalle?.estilo}
                                                                </span>
                                                                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-1 block">Prueba de Velocidad</span>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <div className="text-lg font-black text-white tracking-tight leading-tight group-hover/match:text-emerald-400 transition-colors line-clamp-2">
                                                                    {getDisplayName(currentOrNext, 'a')} 
                                                                    <span className="text-white/30 mx-2 text-sm italic font-medium">
                                                                        {currentOrNext.disciplinas?.name === 'Ajedrez' ? ' ' : 'vs'}
                                                                    </span> 
                                                                    {getDisplayName(currentOrNext, 'b')}
                                                                </div>
                                                                {(getCarreraSubtitle(currentOrNext, 'a') || getCarreraSubtitle(currentOrNext, 'b')) && (
                                                                    <div className="mt-2 text-xs text-zinc-500 font-bold truncate">
                                                                        {getCarreraSubtitle(currentOrNext, 'a') || getCarreraSubtitle(currentOrNext, 'b')}
                                                                    </div>
                                                                )}
                                                            </>
                                                        )}
                                                    </Link>
                                                </div>

                                                {/* Upcoming List */}
                                                {others.length > 0 && (
                                                    <div>
                                                        <span className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-3 block">Posteriormente</span>
                                                        <div className="space-y-3">
                                                            {others.slice(0, 2).map((m) => (
                                                                <Link 
                                                                    key={m.id}
                                                                    href={`/partido/${m.id}`}
                                                                    className="flex items-center justify-between p-3 rounded-2xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5"
                                                                >
                                                                    {m.marcador_detalle?.tipo === 'carrera' ? (
                                                                        <div className="flex flex-col flex-1 min-w-0 pr-3">
                                                                            <span className="text-xs font-bold text-white/80 line-clamp-1">
                                                                                {m.marcador_detalle?.distancia} {m.marcador_detalle?.estilo}
                                                                            </span>
                                                                            <span className="text-[10px] font-medium text-zinc-500 truncate">
                                                                                {m.disciplinas?.name} • Prueba
                                                                            </span>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="flex flex-col flex-1 min-w-0 pr-3">
                                                                            <span className="text-xs font-bold text-white/80 line-clamp-1">
                                                                                {getDisplayName(m, 'a')} {m.disciplinas?.name === 'Ajedrez' ? '-' : 'vs'} {getDisplayName(m, 'b')}
                                                                            </span>
                                                                            <span className="text-[10px] font-medium text-zinc-500 truncate">
                                                                                {m.disciplinas?.name} {getCarreraSubtitle(m, 'a') ? `• ${getCarreraSubtitle(m, 'a')}` : ''}
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                    <span className="font-mono text-[10px] text-zinc-400">
                                                                        {new Date(m.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                    </span>
                                                                </Link>
                                                            ))}
                                                            {others.length > 2 && (
                                                                <p className="text-[10px] text-center font-bold text-emerald-400/50 py-2 border-t border-white/5 uppercase tracking-widest">
                                                                    +{others.length - 2} eventos adicionales
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <div className="flex-1 flex flex-col items-center justify-center py-10 opacity-30">
                                                <div className="w-12 h-12 rounded-full border border-dashed border-white/20 mb-4 flex items-center justify-center bg-white/5">
                                                    <Calendar size={20} className="text-white/60" />
                                                </div>
                                                <p className="text-xs font-bold uppercase tracking-widest text-white/50">Sin partidos hoy</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Action Footer */}
                                    {venueMatches.length > 0 && (
                                        <div className="p-4 bg-white/5 border-t border-white/5">
                                            <Link href="/quiniela">
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm"
                                                    className="w-full h-10 rounded-xl text-[10px] font-black uppercase tracking-widest text-white/50 hover:text-emerald-400 hover:bg-emerald-500/10 font-display transition-all"
                                                >
                                                    Hacer predicción en este escenario
                                                </Button>
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            </m.div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
