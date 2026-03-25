export type TipoDeporte = 'equipo' | 'individual' | 'barras';

export interface PuntosConfig {
    id: number;
    tipo_deporte: TipoDeporte;
    posicion: number; // 1–8
    puntos: number;
    descripcion: string | null;
    created_at: string;
    updated_at: string;
}

export interface ClasificacionDisciplina {
    id: number;
    disciplina_id: number;
    carrera_id: number;
    genero: 'masculino' | 'femenino' | 'mixto';
    posicion: number;
    puntos_obtenidos: number;
    notas: string | null;
    created_at: string;
    updated_at: string;
    created_by: string | null;
    // Joined
    disciplinas?: { id: number; name: string; icon?: string };
    carreras?: { id: number; nombre: string; escudo_url?: string };
}

export interface ClasificacionGeneralRow {
    carrera_id: number;
    carrera_nombre: string;
    escudo_url: string | null;
    total_puntos: number;
    disciplinas_participadas: number;
    detalle_disciplinas: Array<{
        disciplina_id: number;
        disciplina_nombre: string;
        genero: string;
        posicion: number;
        puntos: number;
    }> | null;
}

// Excel import types
export type ImportStatus = 'pending' | 'committing' | 'committed' | 'error' | 'cancelled';
export type RowType = 'partido' | 'evento' | 'roster';
export type ValidationStatus = 'ok' | 'warning' | 'error' | 'pending';

export interface ExcelImport {
    id: string;
    created_at: string;
    uploaded_by: string | null;
    uploader_name: string | null;
    filename: string;
    file_size_bytes: number | null;
    status: ImportStatus;
    total_rows: number;
    rows_ok: number;
    rows_warning: number;
    rows_error: number;
    sheet_names: string[] | null;
    commit_at: string | null;
    notes: string | null;
}

export interface ValidationMessage {
    level: 'warning' | 'error';
    field: string;
    message: string;
}

export interface ExcelImportRow {
    id: number;
    import_id: string;
    sheet_name: string;
    row_number: number;
    row_type: RowType;
    raw_data: Record<string, unknown>;
    matched_data: Record<string, unknown>;
    validation_status: ValidationStatus;
    validation_messages: ValidationMessage[];
    committed: boolean;
    committed_entity_id: string | null;
    created_at: string;
}
