import { AIPayload } from '../../Components/models/IaPayload';


export function buildAIPrompt(payload: AIPayload): string {
    const { userContext, weightingCriteria, availablePlaces, maxResults } = payload;
    const { preferences } = userContext;

    return `
Eres un experto en turismo colombiano actuando como un motor lógico de recomendación.

MISIÓN:
Generar recomendaciones personalizadas cruzando las preferencias del usuario con las características de los sitios. 
Prioridad máxima: "Joyas Ocultas" (lugares con ALTA valoración y BAJA popularidad).

1. **Prioridad 1 (Joyas Ocultas):** Identifica lugares con Rating > 4.2 y visitsCount < 15. Estos deben encabezar la lista si coinciden con al menos el 50% de las preferencias del usuario.
2. **Prioridad 2 (Match de Preferencias):** Si no completas los ${maxResults} cupos, selecciona lugares con el mayor puntaje de coincidencia en Clima, Entorno y Categoría, sin importar su popularidad.
3. **Puntuación (Score):** Calcula un valor de 0.0 a 1.0 basado en los PESOS de ponderación. Las "Joyas Ocultas" reciben un bono de +0.2 sobre su score base (sin superar 1.0).
4. **Filtro de Calidad:** Penaliza fuertemente (score < 0.4) cualquier lugar con Rating < 3.5, sin importar qué tan cerca esté o qué tanto coincida con los gustos.


REGLAS DE ORO:
- Devuelve ÚNICAMENTE un JSON válido.
- No incluyas explicaciones fuera del JSON ni bloques de código markdown.
- Máximo ${maxResults} recomendaciones.
- Prohibido recomendar destinos en entornos evitados: ${userContext.avoidedEnvironments.join(', ') || 'Ninguno'}.
- Respuesta ultra-concisa. Motivos de máximo 10 palabras.

CONTEXTO DEL USUARIO:
- ID de usuario: ${userContext.userId}
- Ubicación Actual: ${userContext.currentLocation ? `${userContext.currentLocation.lat}, ${userContext.currentLocation.lng}` : 'No disponible'}
- Categorías/Experiencias: ${preferences.categorias.join(', ') || 'Sin especificar'}
- Compañía: ${preferences.acompañantes.join(', ') || 'Sin especificar'}
- Presupuesto: ${preferences.presupuesto}
- Clima preferido: ${preferences.clima}
- Preferencia de descubrimiento: ${preferences.preferenciaDestino}
- Duración de estancia: ${preferences.duracionEstancia}
- Nivel de esfuerzo/actividad: ${preferences.nivelEsfuerzo}
- Entorno preferido: ${preferences.entorno}
- Tipo de acceso/Accesibilidad: ${preferences.tipoAcceso}
- Últimos lugares visitados (IDs): ${userContext.lastVisitedPlaces.join(', ') || 'Ninguno'}

CRITERIOS DE PONDERACIÓN (Pesos exactos para el score):
- Coincidencia de entorno y clima: ${weightingCriteria.environmentMatch}
- Coincidencia de categorías y actividades: ${weightingCriteria.activityMatch}
- Distancia (Cercanía física): ${weightingCriteria.distance}
- Popularidad (MENOS visitas es MEJOR): ${weightingCriteria.popularity}
- Valoración/Novedad (MÁS rating es MEJOR): ${weightingCriteria.novelty}

BANCO DE DATOS (Sitios disponibles para analizar):
${JSON.stringify(availablePlaces)}

FORMATO DE RESPUESTA (JSON):
{
  "recommendations": [
    {
      "placeId": "string",
      "score": number,
      "reason": "Explicación breve (máx 10 palabras) del match según sus 9 criterios"
    }
  ]
}
`;
}