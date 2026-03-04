export const DEPORTES_INDIVIDUALES = [
    'Tenis',
    'Tenis de Mesa',
    'Ajedrez',
    'Natación',
    'Atletismo'
];

export const LUGARES_OLIMPICOS = [
    'Coliseo Uninorte',
    'Cancha de Fútbol',
    'Cancha #1',
    'Cancha #2',
    'Piscina Centro Deportivo'
];

export const CARRERAS_UNINORTE = [
    'Administración de Empresas',
    'Arquitectura',
    'Ciencia de Datos',
    'Ciencia Política y Gobierno',
    'Comunicación Social y Periodismo',
    'Contaduría Pública',
    'Derecho',
    'Diseño Gráfico',
    'Diseño Industrial',
    'Economía',
    'Geología',
    'Ingeniería Civil',
    'Ingeniería de Sistemas',
    'Ingeniería Eléctrica',
    'Ingeniería Industrial',
    'Ingeniería Mecánica',
    'Lenguas Modernas y Cultura',
    'Medicina',
    'Música',
    'Negocios Internacionales',
    'Odontología',
    'Psicología',
    'Relaciones Internacionales',
    'Funcionarios',
    'Egresados'
];

export const SPORT_EMOJI: Record<string, string> = {
    'Fútbol': '⚽', 'Baloncesto': '🏀', 'Voleibol': '🏐',
    'Tenis': '🎾', 'Tenis de Mesa': '🏓', 'Ajedrez': '♟️', 'Natación': '🏊',
    'Atletismo': '🏃', 'Ultimate': '🥏',
};

export const SPORT_GRADIENT: Record<string, string> = {
    'Fútbol': 'from-emerald-500/30 to-emerald-900/10',
    'Baloncesto': 'from-orange-500/30 to-orange-900/10',
    'Voleibol': 'from-indigo-500/30 to-indigo-900/10',
    'Tenis': 'from-lime-500/30 to-lime-900/10',
    'Tenis de Mesa': 'from-rose-500/30 to-rose-900/10',
    'Ajedrez': 'from-violet-500/25 to-violet-900/10',
    'Natación': 'from-cyan-500/30 to-cyan-900/10',
};

export const SPORT_ACCENT: Record<string, string> = {
    'Fútbol': 'text-emerald-400',
    'Baloncesto': 'text-orange-400',
    'Voleibol': 'text-indigo-400',
    'Tenis': 'text-lime-400',
    'Tenis de Mesa': 'text-rose-400',
    'Ajedrez': 'text-violet-400',
    'Natación': 'text-cyan-400',
};

// Border/glow colors for cards per sport - INTENSIFIED
export const SPORT_BORDER: Record<string, string> = {
    'Fútbol': 'border-emerald-500/25 hover:border-emerald-400/50',
    'Baloncesto': 'border-orange-500/25 hover:border-orange-400/50',
    'Voleibol': 'border-indigo-500/25 hover:border-indigo-400/50',
    'Tenis': 'border-lime-500/25 hover:border-lime-400/50',
    'Tenis de Mesa': 'border-rose-500/25 hover:border-rose-400/50',
    'Ajedrez': 'border-violet-500/25 hover:border-violet-400/50',
    'Natación': 'border-cyan-500/25 hover:border-cyan-400/50',
};

export const SPORT_GLOW: Record<string, string> = {
    'Fútbol': 'hover:shadow-emerald-500/15',
    'Baloncesto': 'hover:shadow-orange-500/15',
    'Voleibol': 'hover:shadow-indigo-500/15',
    'Tenis': 'hover:shadow-lime-500/15',
    'Tenis de Mesa': 'hover:shadow-rose-500/15',
    'Ajedrez': 'hover:shadow-violet-500/15',
    'Natación': 'hover:shadow-cyan-500/15',
};

// Harmony Live Bar Colors
export const SPORT_LIVE_TEXT: Record<string, string> = {
    'Fútbol': 'text-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.5)]',
    'Baloncesto': 'text-orange-400 drop-shadow-[0_0_5px_rgba(251,146,60,0.5)]',
    'Voleibol': 'text-indigo-400 drop-shadow-[0_0_5px_rgba(129,140,248,0.5)]',
    'Tenis': 'text-lime-400 drop-shadow-[0_0_5px_rgba(163,230,53,0.5)]',
    'Tenis de Mesa': 'text-rose-400 drop-shadow-[0_0_5px_rgba(251,113,133,0.5)]',
    'Ajedrez': 'text-violet-400 drop-shadow-[0_0_5px_rgba(167,139,250,0.5)]',
    'Natación': 'text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]',
    'default': 'text-[#00E676] drop-shadow-[0_0_5px_rgba(0,230,118,0.5)]'
};

export const SPORT_LIVE_BG_WRAPPER: Record<string, string> = {
    'Fútbol': 'bg-emerald-500/20',
    'Baloncesto': 'bg-orange-500/20',
    'Voleibol': 'bg-indigo-500/20',
    'Tenis': 'bg-lime-500/20',
    'Tenis de Mesa': 'bg-rose-500/20',
    'Ajedrez': 'bg-violet-500/20',
    'Natación': 'bg-cyan-500/20',
    'default': 'bg-[#00E676]/20'
};

export const SPORT_LIVE_BAR: Record<string, string> = {
    'Fútbol': 'bg-emerald-500 shadow-[0_0_12px_#34d399]',
    'Baloncesto': 'bg-orange-500 shadow-[0_0_12px_#fb923c]',
    'Voleibol': 'bg-indigo-500 shadow-[0_0_12px_#818cf8]',
    'Tenis': 'bg-lime-500 shadow-[0_0_12px_#a3e635]',
    'Tenis de Mesa': 'bg-rose-500 shadow-[0_0_12px_#fb7185]',
    'Ajedrez': 'bg-violet-500 shadow-[0_0_12px_#a78bfa]',
    'Natación': 'bg-cyan-500 shadow-[0_0_12px_#22d3ee]',
    'default': 'bg-[#00E676] shadow-[0_0_12px_#00E676]'
};
