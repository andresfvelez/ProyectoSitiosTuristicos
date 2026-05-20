
import { TouristPlace }  from '../../Components/models/IaPayload';
import {Opinion} from "../../Components/models/LugarTuristico";
import React from "react";

export function mapFirestorePlaceToAI(place: any): TouristPlace {
    let opinionesArray: any[] = [];
    try {
        opinionesArray = typeof place.opiniones === 'string'
            ? JSON.parse(place.opiniones)
            : (place.opiniones || []);
    } catch (e) {
        opinionesArray = [];
    }

    return {
        id: place.id,
        name: place.nombre,
        environmentType: place.categoria,
        activities: [],
        location: {
            department: place.departamento,
            city: place.ciudad,
            lat: place.latitud,
            lng: place.longitud,
        },
        rating: place.puntuacion,
        visitsCount: opinionesArray.length
    };
}