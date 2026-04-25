/**
 * Extrae sexo / género / edad desde metadatos de Supabase Auth (OAuth Microsoft, etc.)
 * y aplica actualizaciones conservadoras a `profiles` (solo rellena NULL).
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { User } from '@supabase/supabase-js';

export function mergeAuthUserMetadata(user: User): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const id of user.identities ?? []) {
        const d = id?.identity_data;
        if (d && typeof d === 'object' && !Array.isArray(d)) {
            Object.assign(out, d as Record<string, unknown>);
        }
    }
    const um = user.user_metadata as Record<string, unknown> | undefined;
    if (um) Object.assign(out, um);
    return out;
}

const SEXO_META_KEYS = [
    'sexo',
    'gender',
    'sex',
    'Sex',
    'Gender',
    'extension_Gender',
    'extension_gender',
] as const;

export function inferSexoFromMergedMeta(meta: Record<string, unknown>): string | null {
    for (const k of SEXO_META_KEYS) {
        const raw = meta[k];
        if (typeof raw !== 'string') continue;
        const s = raw.trim();
        if (!s) continue;
        const u = s.toUpperCase();
        if (u === 'M' || u === 'MALE' || u === 'MASCULINO' || u === 'H' || u === 'HOMBRE') return 'M';
        if (u === 'F' || u === 'FEMALE' || u === 'FEMENINO' || u === 'MUJER') return 'F';
    }
    return null;
}

const GENERO_META_KEYS = ['genero', 'rama', 'branch', 'Genero'] as const;

export function inferGeneroFromMergedMeta(meta: Record<string, unknown>): string | null {
    for (const k of GENERO_META_KEYS) {
        const raw = meta[k];
        if (typeof raw !== 'string') continue;
        const t = raw.trim().toLowerCase();
        if (t === 'masculino' || t === 'femenino' || t === 'mixto') return t;
        if (t === 'male' || t === 'm') return 'masculino';
        if (t === 'female' || t === 'f') return 'femenino';
    }
    return null;
}

const BIRTH_META_KEYS = [
    'birthdate',
    'birthday',
    'fecha_nacimiento',
    'fechaNacimiento',
    'date_of_birth',
    'dateOfBirth',
    'birth_date',
    'extension_Birthdate',
] as const;

export function ageFromBirthString(raw: string): number | null {
    const s = raw.trim();
    if (!s) return null;
    let d: Date | null = null;
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
        d = new Date(s.slice(0, 10) + 'T12:00:00');
    } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
        const [mm, dd, yy] = s.split('/').map((x) => parseInt(x, 10));
        if (!isNaN(mm) && !isNaN(dd) && !isNaN(yy)) d = new Date(yy, mm - 1, dd, 12, 0, 0);
    } else if (/^\d{4}\/\d{2}\/\d{2}$/.test(s)) {
        const [yy, mm, dd] = s.split('/').map((x) => parseInt(x, 10));
        if (!isNaN(mm) && !isNaN(dd) && !isNaN(yy)) d = new Date(yy, mm - 1, dd, 12, 0, 0);
    }
    if (!d || Number.isNaN(d.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - d.getFullYear();
    const m = today.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
    if (age < 10 || age > 100) return null;
    return age;
}

export function inferEdadFromMergedMeta(meta: Record<string, unknown>): number | null {
    for (const k of BIRTH_META_KEYS) {
        const raw = meta[k];
        if (typeof raw !== 'string') continue;
        const age = ageFromBirthString(raw);
        if (age != null) return age;
    }
    const nested = meta.custom_claims;
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
        const n = nested as Record<string, unknown>;
        for (const k of BIRTH_META_KEYS) {
            const raw = n[k];
            if (typeof raw !== 'string') continue;
            const age = ageFromBirthString(raw);
            if (age != null) return age;
        }
    }
    const directEdad = meta.edad ?? meta.age;
    if (typeof directEdad === 'number' && Number.isFinite(directEdad)) {
        const a = Math.round(directEdad);
        if (a >= 10 && a <= 100) return a;
    }
    if (typeof directEdad === 'string' && /^\d{1,2}$/.test(directEdad.trim())) {
        const a = parseInt(directEdad.trim(), 10);
        if (a >= 10 && a <= 100) return a;
    }
    return null;
}

/** Rellena `sexo`, `genero`, `edad` en profiles solo donde sigan NULL (requiere service role). */
export async function syncProfileDemographicsFromOAuth(
    admin: SupabaseClient,
    user: User
): Promise<void> {
    const meta = mergeAuthUserMetadata(user);
    const sexo = inferSexoFromMergedMeta(meta);
    const genero = inferGeneroFromMergedMeta(meta);
    const edad = inferEdadFromMergedMeta(meta);
    if (!sexo && !genero && edad == null) return;

    const { data: cur, error: selErr } = await admin
        .from('profiles')
        .select('sexo, genero, edad')
        .eq('id', user.id)
        .maybeSingle();
    if (selErr) {
        const msg = (selErr.message || '').toLowerCase();
        if (msg.includes('column') || msg.includes('schema cache')) return;
        return;
    }
    if (!cur) return;

    const patch: Record<string, unknown> = {};
    if (sexo && (cur.sexo == null || String(cur.sexo).trim() === '')) patch.sexo = sexo;
    if (genero && (cur.genero == null || String(cur.genero).trim() === '')) patch.genero = genero;
    if (edad != null && (cur.edad == null || Number.isNaN(Number(cur.edad)))) patch.edad = edad;

    if (Object.keys(patch).length === 0) return;

    patch.updated_at = new Date().toISOString();
    const { error } = await admin.from('profiles').update(patch).eq('id', user.id);
    if (error) {
        console.warn('[syncProfileDemographicsFromOAuth]', error.message);
    }
}
