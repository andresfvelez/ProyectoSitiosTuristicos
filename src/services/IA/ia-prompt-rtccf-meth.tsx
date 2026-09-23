import { AIPayload } from '../../Components/models/IaPayload';

export function buildAIPromptRTCF(payload: AIPayload): string {
    const { userContext, weightingCriteria, availablePlaces, maxResults } = payload;
    const { preferences } = userContext;
    const avoidedEnvs = (userContext.avoidedEnvironments && userContext.avoidedEnvironments.length > 0)
        ? userContext.avoidedEnvironments.join(', ')
        : 'Ninguno';

    const compania = (preferences.companiaIdeal && preferences.companiaIdeal.length > 0)
        ? preferences.companiaIdeal.join(', ')
        : 'Sin especificar';

    return `
    <ROLE>
    Eres un motor algorítmico de recomendación especializado en turismo colombiano. Tu función es procesar datos estructurados, aplicar reglas de negocio y calcular niveles de afinidad.
    </ROLE>
    
    <TASK>
    Analiza el <CATALOGO_DESTINOS> frente al <PERFIL_USUARIO> y calcula un "score" de afinidad (de 0.0 a 1.0) para cada lugar. 
    Aplica el siguiente razonamiento lógico paso a paso (Chain-of-Thought):
    1. Descarte: Elimina los destinos que pertenezcan a los "Entornos a EVITAR".
    2. Penalización de Calidad: Resta puntuación (forzando un score máximo de 0.39) a los lugares con un Rating menor a 3.5.
    3. Ponderación Base: Calcula la afinidad inicial usando los <CRITERIOS_PONDERACION>.
    4. Regla de Impulso (Joyas Ocultas): Si un destino tiene Rating > 4.2 y visitsCount < 15, y cumple al menos el 50% de las preferencias, súmale un bono de +0.2 al score base (el total nunca debe superar 1.0).
    5. Selección: Elige los ${maxResults} destinos con el score final más alto, ordenados de forma descendente.
    </TASK>
    
    <CONTEXT>
    <PERFIL_USUARIO>
    - ID: ${userContext.userId}
    - Ubicación actual GPS: ${userContext.currentLocation ? `${userContext.currentLocation.lat},${userContext.currentLocation.lng}` : 'No disponible'}
    - Clima Preferido: ${preferences.clima || 'Sin especificar'}
    - Entorno Preferido: ${preferences.entorno || 'Sin especificar'}
    - Presupuesto: ${preferences.rangoPresupuesto || 'Sin especificar'}
    - Tipo de Acceso: ${preferences.tipoAcceso || 'Sin especificar'}
    - Ritmo de Viaje: ${preferences.ritmo || 'Sin especificar'}
    - Compañía Ideal: ${compania}
    - Entornos a EVITAR: ${avoidedEnvs}
    </PERFIL_USUARIO>
    
    <CRITERIOS_PONDERACION>
    - Coincidencia de Entorno: ${weightingCriteria.environmentMatch}
    - Coincidencia de Acceso: ${weightingCriteria.accessMatch}
    - Coincidencia de Presupuesto: ${weightingCriteria.budgetMatch}
    - Distancia Geográfica: ${weightingCriteria.distance}
    - Popularidad (Opiniones/Visitas GA4): ${weightingCriteria.popularity}
    </CRITERIOS_PONDERACION>
    
    <CATALOGO_DESTINOS>
    ${JSON.stringify(availablePlaces)}
    </CATALOGO_DESTINOS>
    </CONTEXT>
    
    <CONSTRAINTS>
   1. INTEGRIDAD DE DATOS Y RANGOS:
   - El atributo "placeId" en la respuesta debe coincidir EXACTAMENTE con el ID del catálogo. Prohibido modificar, traducir o adivinar IDs.
   - El atributo "score" debe ser estrictamente un número flotante en el rango [0.0, 1.0]. Incluso con el bono de impulso, jamás debe superar 1.0.
   
    2. REGLAS ESTRICTAS DE NEGOCIO:
   - Si un lugar pertenece a los "Entornos a EVITAR", su score debe ser 0.0 o ser omitido completamente del resultado.
   - Si no hay suficientes coincidencias para alcanzar ${maxResults} resultados, devuelve únicamente los lugares que superen un score de 0.4. No rerellenes con datos irrelevantes.
    
    3. SINTAXIS Y FORMATO PARA PARSEO EN FRONTEND:
    - Devuelve ÚNICAMENTE la estructura JSON estricta. Queda ABSOLUTAMENTE PROHIBIDO incluir bloques de código markdown (\\json) o comillas al inicio/final del texto. La respuesta debe iniciar con '{' y terminar con '}'.
    - No generes respuestas conversacionales, saludos, ni textos explicativos adicionales fuera de la clave "reason".
   - El array "recommendations" no debe contener "placeId" duplicados y debe estar ordenado de mayor a menor según el "score".
   
    4. REDACCIÓN Y CONCISIÓN:
   - El atributo "reason" debe estar redactado en español neutro de Colombia.
   - La razón debe tener un máximo estricto de 10 palabras y ser altamente específica al perfil del usuario (ejemplo: "Ideal para tu presupuesto y gusto por clima cálido") evita dar textos demasiado largos.
    </CONSTRAINTS>
    
    <FORMAT>
    Devuelve la salida estrictamente bajo este esquema JSON:
    {
      "recommendations": [
        {
          "placeId": "string",
          "score": number,
          "reason": "string"
        }
      ]
    }
    </FORMAT>
`;
}