export type PositionCoord = { x: number; y: number };
export type FormationConfig = Record<string, PositionCoord>;

// Coordenadas en porcentaje (0-100) sobre el campo completo.
// x=0 izquierda, x=100 derecha, y=0 portería propia (abajo), y=100 portería rival (arriba).
export const FOOTBALL_FORMATIONS: Record<string, FormationConfig> = {
  "4-3-3": {
    POR:  { x: 50,  y: 12 },
    LD:   { x: 85,  y: 33 },
    DFC1: { x: 62,  y: 29 },
    DFC2: { x: 38,  y: 29 },
    LI:   { x: 15,  y: 33 },
    MCD1: { x: 74,  y: 55 },
    MCD2: { x: 50,  y: 51 },
    MCD3: { x: 26,  y: 55 },
    ED:   { x: 85,  y: 80 },
    DC:   { x: 50,  y: 86 },
    EI:   { x: 15,  y: 80 },
  },
  "4-4-2": {
    POR:  { x: 50,  y: 12 },
    LD:   { x: 85,  y: 33 },
    DFC1: { x: 62,  y: 29 },
    DFC2: { x: 38,  y: 29 },
    LI:   { x: 15,  y: 33 },
    MLD:  { x: 84,  y: 58 },
    MCD1: { x: 61,  y: 55 },
    MCD2: { x: 39,  y: 55 },
    MLI:  { x: 16,  y: 58 },
    DC1:  { x: 63,  y: 83 },
    DC2:  { x: 37,  y: 83 },
  },
  "4-2-3-1": {
    POR:  { x: 50,  y: 12 },
    LD:   { x: 85,  y: 33 },
    DFC1: { x: 62,  y: 29 },
    DFC2: { x: 38,  y: 29 },
    LI:   { x: 15,  y: 33 },
    MCD1: { x: 62,  y: 50 },
    MCD2: { x: 38,  y: 50 },
    ED:   { x: 83,  y: 70 },
    CAM:  { x: 50,  y: 67 },
    EI:   { x: 17,  y: 70 },
    DC:   { x: 50,  y: 87 },
  },
  "3-5-2": {
    POR:  { x: 50,  y: 12 },
    DFC1: { x: 70,  y: 30 },
    DFC2: { x: 50,  y: 27 },
    DFC3: { x: 30,  y: 30 },
    MLD:  { x: 91,  y: 57 },
    MCD1: { x: 68,  y: 54 },
    MCD2: { x: 50,  y: 51 },
    MCD3: { x: 32,  y: 54 },
    MLI:  { x: 9,   y: 57 },
    DC1:  { x: 63,  y: 83 },
    DC2:  { x: 37,  y: 83 },
  },
  "4-1-4-1": {
    POR:  { x: 50,  y: 12 },
    LD:   { x: 85,  y: 33 },
    DFC1: { x: 62,  y: 29 },
    DFC2: { x: 38,  y: 29 },
    LI:   { x: 15,  y: 33 },
    MDF:  { x: 50,  y: 46 },
    MLD:  { x: 84,  y: 63 },
    MCD1: { x: 61,  y: 60 },
    MCD2: { x: 39,  y: 60 },
    MLI:  { x: 16,  y: 63 },
    DC:   { x: 50,  y: 86 },
  },
  "5-3-2": {
    POR:  { x: 50,  y: 12 },
    LD:   { x: 90,  y: 34 },
    DFC1: { x: 70,  y: 29 },
    DFC2: { x: 50,  y: 27 },
    DFC3: { x: 30,  y: 29 },
    LI:   { x: 10,  y: 34 },
    MCD1: { x: 72,  y: 56 },
    MCD2: { x: 50,  y: 52 },
    MCD3: { x: 28,  y: 56 },
    DC1:  { x: 63,  y: 83 },
    DC2:  { x: 37,  y: 83 },
  },
};

export const FOOTBALL_FORMATION_KEYS = Object.keys(FOOTBALL_FORMATIONS);

export const FOOTBALL_POSITION_LABELS: Record<string, string> = {
  POR:  "Portero",
  LD:   "Lateral Derecho",
  DFC1: "Defensa Central",
  DFC2: "Defensa Central",
  DFC3: "Defensa Central",
  LI:   "Lateral Izquierdo",
  MCD1: "Mediocampista",
  MCD2: "Mediocampista",
  MCD3: "Mediocampista",
  MDF:  "Mediocampista Defensivo",
  MLD:  "Mediocampista Derecho",
  MLI:  "Mediocampista Izquierdo",
  CAM:  "Mediapunta",
  ED:   "Extremo Derecho",
  EI:   "Extremo Izquierdo",
  DC:   "Delantero Centro",
  DC1:  "Delantero",
  DC2:  "Delantero",
};

export const BASKETBALL_POSITIONS: Record<string, PositionCoord & { label: string }> = {
  BASE:      { x: 50, y: 82, label: "Base" },
  ESCOLTA:   { x: 22, y: 65, label: "Escolta" },
  ALERO:     { x: 78, y: 65, label: "Alero" },
  ALA_PIVOT: { x: 28, y: 35, label: "Ala-Pívot" },
  PIVOT:     { x: 72, y: 35, label: "Pívot" },
};

export const BASKETBALL_POSITION_KEYS = Object.keys(BASKETBALL_POSITIONS);
