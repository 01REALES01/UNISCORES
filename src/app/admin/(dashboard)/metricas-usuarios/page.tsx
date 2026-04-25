"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui-primitives";
import { BarChart, DonutChart, MiniLineChart, StatMiniCard } from "@/components/charts";
import { supabase } from "@/lib/supabase";
import { safeQuery } from "@/lib/supabase-query";
import { useAuth } from "@/hooks/useAuth";
import UniqueLoading from "@/components/ui/morph-loading";
import {
    Users,
    GraduationCap,
    VenusAndMars,
    Cake,
    CalendarPlus,
    RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

type ProfileRow = {
    id: string;
    sexo: string | null;
    genero: string | null;
    carrera_id: number | null;
    carreras_ids: number[] | null;
    edad: number | null;
    created_at: string;
    roles: string[] | null;
};

type CarreraRow = { id: number; nombre: string };

function normalizeSexo(raw: string | null): "M" | "F" | "otro" | "sin" {
    if (raw == null || String(raw).trim() === "") return "sin";
    const u = String(raw).trim().toUpperCase();
    if (u === "M" || u === "MASCULINO" || u === "H" || u === "HOMBRE") return "M";
    if (u === "F" || u === "FEMENINO" || u === "MUJER") return "F";
    return "otro";
}

/** Si no hay `sexo`, inferir M/F desde `genero` (rama) para la gráfica. */
function effectiveSexoForMetrics(p: ProfileRow): string | null {
    if (p.sexo != null && String(p.sexo).trim() !== "") return p.sexo;
    const g = (p.genero || "").toLowerCase().trim();
    if (g === "masculino" || g === "masc" || g.startsWith("masc")) return "M";
    if (g === "femenino" || g === "fem" || g.startsWith("feme")) return "F";
    return null;
}

const PROFILE_SELECT_VARIANTS = [
    "id, sexo, genero, carrera_id, carreras_ids, edad, created_at, roles",
    "id, sexo, genero, carrera_id, carreras_ids, created_at, roles",
    "id, genero, carrera_id, carreras_ids, edad, created_at, roles",
    "id, genero, carrera_id, carreras_ids, created_at, roles",
    "id, carrera_id, carreras_ids, edad, created_at, roles",
    "id, carrera_id, carreras_ids, created_at, roles",
] as const;

async function loadProfilesForMetrics(): Promise<{ rows: ProfileRow[]; error: string | null }> {
    let lastErr: string | null = null;
    for (let i = 0; i < PROFILE_SELECT_VARIANTS.length; i++) {
        const sel = PROFILE_SELECT_VARIANTS[i];
        const res = await safeQuery(
            supabase.from("profiles").select(sel).order("created_at", { ascending: false }),
            `metricas-p-${i}`
        );
        if (res.data && !res.error) {
            const rows = (res.data as Record<string, unknown>[]).map((r) => ({
                id: r.id as string,
                sexo: (r.sexo as string | null | undefined) ?? null,
                genero: (r.genero as string | null | undefined) ?? null,
                carrera_id: (r.carrera_id as number | null | undefined) ?? null,
                carreras_ids: (r.carreras_ids as number[] | null | undefined) ?? null,
                edad: (r.edad as number | null | undefined) ?? null,
                created_at: r.created_at as string,
                roles: (r.roles as string[] | null | undefined) ?? null,
            }));
            return { rows, error: null };
        }
        lastErr = res.error?.message ?? "Error al cargar perfiles";
    }
    return { rows: [], error: lastErr };
}

function careerCounts(
    profiles: ProfileRow[],
    carreraById: Map<number, string>
): { label: string; value: number; color?: string }[] {
    const counts = new Map<string, number>();
    for (const p of profiles) {
        const ids = new Set<number>();
        if (p.carrera_id != null) ids.add(p.carrera_id);
        for (const cid of p.carreras_ids ?? []) ids.add(cid);
        if (ids.size === 0) {
            counts.set("Sin carrera", (counts.get("Sin carrera") ?? 0) + 1);
            continue;
        }
        for (const cid of ids) {
            const name = carreraById.get(cid) ?? `Carrera #${cid}`;
            counts.set(name, (counts.get(name) ?? 0) + 1);
        }
    }
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    const top = 12;
    if (sorted.length <= top) {
        return sorted.map(([label, value]) => ({
            label: label.length > 22 ? `${label.slice(0, 20)}…` : label,
            value,
            color: undefined,
        }));
    }
    const head = sorted.slice(0, top);
    const rest = sorted.slice(top).reduce((s, [, v]) => s + v, 0);
    return [
        ...head.map(([label, value]) => ({
            label: label.length > 22 ? `${label.slice(0, 20)}…` : label,
            value,
        })),
        { label: "Otros", value: rest },
    ];
}

function sexoDonut(profiles: ProfileRow[]) {
    let m = 0,
        f = 0,
        otro = 0,
        sin = 0;
    for (const p of profiles) {
        const n = normalizeSexo(effectiveSexoForMetrics(p));
        if (n === "M") m++;
        else if (n === "F") f++;
        else if (n === "otro") otro++;
        else sin++;
    }
    return [
        { label: "Masculino", value: m, color: "#60a5fa", icon: "♂" },
        { label: "Femenino", value: f, color: "#f472b6", icon: "♀" },
        { label: "Otro / NB", value: otro, color: "#a78bfa", icon: "○" },
        { label: "Sin especificar", value: sin, color: "#64748b", icon: "—" },
    ].filter((d) => d.value > 0);
}

function edadBars(profiles: ProfileRow[]) {
    const bins: { label: string; value: number }[] = [
        { label: "≤17", value: 0 },
        { label: "18–20", value: 0 },
        { label: "21–23", value: 0 },
        { label: "24–26", value: 0 },
        { label: "27–30", value: 0 },
        { label: "31+", value: 0 },
        { label: "Sin edad", value: 0 },
    ];
    const idx = (e: number | null) => {
        if (e == null || Number.isNaN(e)) return 6;
        if (e <= 17) return 0;
        if (e <= 20) return 1;
        if (e <= 23) return 2;
        if (e <= 26) return 3;
        if (e <= 30) return 4;
        return 5;
    };
    for (const p of profiles) {
        bins[idx(p.edad)].value++;
    }
    return bins.filter((b) => b.value > 0);
}

function registrosPorMes(profiles: ProfileRow[]) {
    const map = new Map<string, number>();
    for (const p of profiles) {
        const d = new Date(p.created_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        map.set(key, (map.get(key) ?? 0) + 1);
    }
    const keys = [...map.keys()].sort();
    const last = keys.slice(-8);
    return last.map((k) => ({
        label: k.replace(/^\d{4}-/, ""),
        value: map.get(k) ?? 0,
    }));
}

export default function MetricasUsuariosPage() {
    const router = useRouter();
    const { isPeriodista } = useAuth();
    const [profiles, setProfiles] = useState<ProfileRow[]>([]);
    const [carreras, setCarreras] = useState<CarreraRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [syncingFromJugadores, setSyncingFromJugadores] = useState(false);
    const cancelledRef = useRef(false);

    const loadMetrics = useCallback(async (opts?: { silent?: boolean }) => {
        const silent = opts?.silent ?? false;
        if (!silent) {
            setLoading(true);
            setFetchError(null);
        }

        const carrerasRes = await safeQuery(
            supabase.from("carreras").select("id, nombre").order("nombre"),
            "metricas-carreras"
        );

        const { rows: profRows, error: profErr } = await loadProfilesForMetrics();
        if (cancelledRef.current) return;
        if (profErr) {
            setFetchError(profErr);
            setProfiles([]);
        } else {
            setFetchError(null);
            setProfiles(profRows);
        }

        if (carrerasRes.data && !carrerasRes.error) {
            setCarreras(carrerasRes.data as CarreraRow[]);
        }
        if (!silent) setLoading(false);
    }, []);

    useEffect(() => {
        if (isPeriodista) {
            router.push("/admin/noticias");
            return;
        }
        cancelledRef.current = false;
        void loadMetrics();
        return () => {
            cancelledRef.current = true;
        };
    }, [isPeriodista, router, loadMetrics]);

    const handleSyncFromJugadores = async () => {
        setSyncingFromJugadores(true);
        try {
            const res = await fetch("/api/admin/sync-profile-demographics", { method: "POST" });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(body.error || "Error al sincronizar");
            toast.success(
                `Sincronizado desde actas: ${body.profilesUpdated ?? 0} perfiles tocados (+sexo: ${body.sexoFilled ?? 0}, +género: ${body.generoFilled ?? 0})`
            );
            await loadMetrics({ silent: true });
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            toast.error(msg);
        } finally {
            setSyncingFromJugadores(false);
        }
    };

    const carreraById = useMemo(() => {
        const m = new Map<number, string>();
        for (const c of carreras) m.set(c.id, c.nombre);
        return m;
    }, [carreras]);

    const carreraData = useMemo(() => careerCounts(profiles, carreraById), [profiles, carreraById]);
    const sexoData = useMemo(() => sexoDonut(profiles), [profiles]);
    const edadData = useMemo(() => edadBars(profiles), [profiles]);
    const mesData = useMemo(() => registrosPorMes(profiles), [profiles]);

    const withCarrera = useMemo(
        () => profiles.filter((p) => p.carrera_id != null || (p.carreras_ids?.length ?? 0) > 0).length,
        [profiles]
    );
    const withEdad = useMemo(() => profiles.filter((p) => p.edad != null).length, [profiles]);

    if (isPeriodista) {
        return null;
    }

    if (loading) {
        return (
            <div className="min-h-[50vh] flex flex-col items-center justify-center py-20">
                <UniqueLoading size="lg" />
            </div>
        );
    }

    if (fetchError) {
        return (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center">
                <p className="text-red-300 font-medium">{fetchError}</p>
                <p className="text-sm text-muted-foreground mt-2 space-y-1">
                    <span className="block">
                        Aplica en Supabase (SQL editor o migraciones) los scripts del repo:{" "}
                        <code className="text-xs">20260425_profiles_sexo_genero.sql</code>{" "}
                        (<code className="text-xs">sexo</code>, <code className="text-xs">genero</code>) y, si aún no
                        lo hiciste, <code className="text-xs">20260424_profiles_edad.sql</code> (<code className="text-xs">edad</code>).
                    </span>
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-8" data-testid="metricas-usuarios-page">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent flex items-center gap-3">
                        <Users className="text-primary" size={32} />
                        Métricas de usuarios
                    </h2>
                    <p className="text-muted-foreground mt-1">
                        Resumen de registros por carrera, sexo y edad — listo para presentar.
                    </p>
                </div>
                <p className="text-xs text-muted-foreground font-medium">
                    Total cuentas: <span className="text-foreground">{profiles.length}</span>
                    {" · "}
                    Actualizado: {new Date().toLocaleString("es-CO")}
                </p>
            </div>

            <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 px-4 py-4 text-sm text-sky-100/90 space-y-3">
                <p>
                    <strong className="text-sky-200">Mejor fuente sin formularios:</strong> los datos ya están en las
                    filas de <code className="text-xs opacity-80">jugadores</code> (Excel / actas) con sexo y rama. El
                    botón copia eso al perfil del usuario cuando hay <strong>profile_id</strong> o el mismo{" "}
                    <strong>correo</strong> que en la cuenta Uninorte.
                </p>
                <p className="text-xs text-sky-200/70">
                    Microsoft casi nunca manda cumpleaños en el token. Para <strong>edad</strong> masiva hace falta un
                    archivo del registro académico (CSV/API) o fecha de nacimiento en BD; lo podemos enlazar en un
                    segundo paso si tienes el formato.
                </p>
                <button
                    type="button"
                    onClick={() => void handleSyncFromJugadores()}
                    disabled={syncingFromJugadores}
                    className="inline-flex items-center gap-2 rounded-xl border border-sky-400/40 bg-sky-500/15 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-sky-100 hover:bg-sky-500/25 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                >
                    <RefreshCw size={14} className={syncingFromJugadores ? "animate-spin" : ""} />
                    {syncingFromJugadores ? "Sincronizando…" : "Rellenar sexo / rama desde jugadores"}
                </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatMiniCard icon="👥" label="Usuarios registrados" value={profiles.length} changeType="neutral" />
                <StatMiniCard
                    icon="🎓"
                    label="Con carrera indicada"
                    value={withCarrera}
                    change={
                        profiles.length ? `${Math.round((withCarrera / profiles.length) * 100)}% del total` : undefined
                    }
                    changeType="up"
                />
                <StatMiniCard
                    icon="📅"
                    label="Con edad en perfil"
                    value={withEdad}
                    change={
                        profiles.length ? `${Math.round((withEdad / profiles.length) * 100)}% del total` : undefined
                    }
                    changeType={withEdad > 0 ? "up" : "neutral"}
                />
                <StatMiniCard
                    icon="⚧"
                    label="Sexo / rama informado"
                    value={profiles.filter((p) => normalizeSexo(effectiveSexoForMetrics(p)) !== "sin").length}
                    change="sexo o genero en perfil"
                    changeType="neutral"
                />
            </div>

            {withEdad === 0 && profiles.length > 0 && (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-200/90">
                    <strong>Edad:</strong> aún no hay valores en el campo <code className="text-xs">edad</code> de
                    perfiles. Puedes rellenarlo en base de datos o ampliar el formulario de perfil; la gráfica muestra
                    &quot;Sin edad&quot; hasta entonces. La migración{" "}
                    <code className="text-xs">20260424_profiles_edad.sql</code> crea la columna si no existe.
                </div>
            )}

            <div className="grid gap-6 lg:grid-cols-2">
                <Card className="p-6 border-border/30">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <GraduationCap size={18} className="text-violet-400" />
                            Por carrera
                        </h3>
                        <span className="text-[10px] font-bold uppercase text-muted-foreground bg-muted/30 px-2 py-1 rounded-lg">
                            apariciones
                        </span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-4">
                        Cada usuario puede contar en varias carreras si eligió más de una en{" "}
                        <code className="text-[10px]">carreras_ids</code>.
                    </p>
                    {carreraData.length > 0 ? (
                        <BarChart data={carreraData} height={320} />
                    ) : (
                        <EmptyBlock message="No hay datos de carrera" />
                    )}
                </Card>

                <Card className="p-6 border-border/30">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <VenusAndMars size={18} className="text-pink-400" />
                            Por sexo
                        </h3>
                    </div>
                    {sexoData.length > 0 ? (
                        <div className="flex justify-center py-4">
                            <DonutChart data={sexoData} size={240} thickness={34} centerLabel="Usuarios" />
                        </div>
                    ) : (
                        <EmptyBlock message="Sin datos" />
                    )}
                </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <Card className="p-6 border-border/30">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <Cake size={18} className="text-amber-400" />
                            Por edad
                        </h3>
                    </div>
                    {edadData.length > 0 ? (
                        <BarChart data={edadData} height={280} />
                    ) : (
                        <EmptyBlock message="Sin datos de edad" />
                    )}
                </Card>

                <Card className="p-6 border-border/30">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <CalendarPlus size={18} className="text-emerald-400" />
                            Altas por mes
                        </h3>
                    </div>
                    {mesData.length >= 2 ? (
                        <div className="py-6">
                            <MiniLineChart data={mesData} height={100} color="#34d399" />
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground py-8 text-center">
                            Necesitas al menos dos meses con registros para la tendencia.
                        </p>
                    )}
                </Card>
            </div>
        </div>
    );
}

function EmptyBlock({ message }: { message: string }) {
    return (
        <div className="text-center py-14 text-muted-foreground/60 text-sm">
            <Users className="mx-auto mb-2 opacity-30" size={28} />
            {message}
        </div>
    );
}
