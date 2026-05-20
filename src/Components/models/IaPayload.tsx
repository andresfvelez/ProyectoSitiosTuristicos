export interface UserPreferences {
    // 1. Tipo de experiencia (Naturaleza, Cultura, etc.)
    categorias: string[];
    // 2. Con quién viaja (Solo, Pareja, Familia, Amigos)
    acompañantes: string[];
    // 3. Nivel de gasto (Bajo, Medio, Alto)
    presupuesto: string;
    // 4. Clima preferido (Frío, Templado, Cálido)
    clima: string;
    // 5. Preferencia de descubrimiento (Muy conocidos vs. Poco conocidos)
    preferenciaDestino: string;
    // 6. Tiempo que planea quedarse (Pasadía, Fin de semana, etc.)
    duracionEstancia: string;
    // 7. Nivel de actividad física (Bajo/Relax, Moderado, Alto)
    nivelEsfuerzo: string;
    // 8. Tipo de paisaje (Rural, Urbano, Silvestre)
    entorno: string;
    // 9. Facilidad de llegada (Vehículo simple, 4x4, Caminata)
    tipoAcceso: string;
}
export interface UserContext {
    userId: string;
    preferences: UserPreferences;
    currentLocation?: { lat: number; lng: number };
    lastVisitedPlaces: string[];
    avoidedEnvironments: string[];
}

export interface WeightingCriteria {
    environmentMatch: number;
    activityMatch: number;
    distance: number;
    popularity: number;
    novelty:number;
}

export interface TouristPlace {
    id: string;
    name: string;
    environmentType: string;
    activities: string[];
    location: {
        department: string;
        city: string;
        lat: number;
        lng: number;
    };
    rating: number;
    visitsCount: number;
}

export interface AIPayload {
    userContext: UserContext;
    weightingCriteria: WeightingCriteria;
    availablePlaces: TouristPlace[];
    maxResults: number;
}