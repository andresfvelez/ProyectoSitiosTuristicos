export interface UserPreferences {
    clima: string;             // "calido" | "frio" | "templado"
    entorno: string;           // "naturaleza" | "pueblo" | "selva" | "urbano"
    rangoPresupuesto: string;  // "economico" | "moderado" | "lujo"
    tipoAcceso: string;        // "carro" | "bus" | "4x4" | "caminata"
    ritmo: string;             // "relax" | "moderado" | "activo"
    companiaIdeal: string[];   // ["solo", "pareja", "amigos", "familia"]
}

export interface UserContext {
    userId: string;
    preferences: UserPreferences;
    currentLocation?: { lat: number; lng: number };
    // Opcionales para no romper la llamada mientras no exista historial en BD
    favoritePlaces?: string[];
    lastVisitedPlaces?: string[];
    avoidedEnvironments?: string[];
}

export interface WeightingCriteria {
    environmentMatch: number; // Coincidencia de entorno (naturaleza, pueblo, etc.)
    accessMatch: number;      // Coincidencia de acceso (carro, 4x4, etc.)
    budgetMatch: number;      // Coincidencia de presupuesto
    distance: number;         // Cercanía geográfica (GPS)
    popularity: number;       // Basado en vistas de GA4 y puntuación de opiniones
}

export interface TouristPlace {
    id: string;
    name: string;
    category: string;
    city: string;
    department: string;
    location: {
        lat: number;
        lng: number;
    };
    rating: number;
    visitsCount: number;
    clima: string;
    entorno: string;
    rangoPresupuesto: string;
    tipoAcceso: string;
    ritmo: string;
    companiaIdeal: string[];
    description?: string;
    fechaRegistro?: number;
    diasDesdePublicacion?: number; // Permite calcular el factor de novedad
}

export interface AIPayload {
    userContext: UserContext;
    weightingCriteria: WeightingCriteria;
    availablePlaces: TouristPlace[];
    maxResults: number;
}