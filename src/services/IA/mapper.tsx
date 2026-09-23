import { LugarTuristico } from '../../Components/models/LugarTuristico';
import { TouristPlace } from '../../Components/models/IaPayload';

export const mapFirestorePlaceToAI = (place: LugarTuristico): TouristPlace => {
    return {
        id: place.id || '',
        name: place.nombre || 'Sin nombre',
        category: place.categoria || 'aventura',
        city: place.ciudad || '',
        department: place.departamento || '',
        location: {
            lat: Number(place.latitud) || 0,
            lng: Number(place.longitud) || 0
        },
        rating: Number(place.puntuacion) || 0,
        visitsCount: Number((place as any).vistas) || 0,
        clima: place.clima || 'templado',
        entorno: place.entorno || 'naturaleza',
        rangoPresupuesto: (place as any).rangoPresupuesto || 'economico',
        tipoAcceso: (place as any).tipoAcceso || place.acceso || 'carro',
        ritmo: (place as any).ritmo || 'moderado',
        companiaIdeal: Array.isArray((place as any).companiaIdeal)
            ? (place as any).companiaIdeal
            : ['amigos', 'pareja']
    };
};