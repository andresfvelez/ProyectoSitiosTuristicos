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

    const favoritos = (userContext.favoritePlaces && userContext.favoritePlaces.length > 0)
        ? userContext.favoritePlaces.join(', ')
        : 'Ninguno';

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
    4. Impulso por Interés Demostrado (Favoritos): Si un destino del catálogo coincide con la lista de "Destinos de Alto Interés (Favoritos)" del usuario, o comparte atributos directos con ellos, otórgale prioridad y un bono de afinidad de +0.15 (sin superar 1.0).
    5. Regla de Joyas Ocultas: Si un destino tiene Rating > 4.2 y visitsCount < 15, y cumple al menos el 50% de las preferencias, súmale un bono de +0.1 al score base (sin superar 1.0).
    6. Selección: Elige los ${maxResults} destinos con el score final más alto, ordenados de forma descendente.
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
    - Destinos de Alto Interés (Favoritos): ${favoritos}
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
    - El atributo "score" debe ser estrictamente un número flotante en el rango [0.0, 1.0]. Incluso con bonos, jamás debe superar 1.0.
    
    2. REGLAS ESTRICTAS DE NEGOCIO:
    - Si un lugar pertenece a los "Entornos a EVITAR", su score debe ser 0.0 o ser omitido completamente del resultado.
    - Los destinos marcados en "Favoritos" son candidatos válidos y prioritarios para ser recomendados si cumplen las condiciones de perfil.
    - Si no hay suficientes coincidencias para alcanzar ${maxResults} resultados, devuelve únicamente los lugares que superen un score de 0.4. No rellenes con datos irrelevantes o inventados.
    
    3. SINTAXIS Y FORMATO PARA PARSEO EN FRONTEND:
    - Devuelve ÚNICAMENTE la estructura JSON estricta. Queda ABSOLUTAMENTE PROHIBIDO incluir bloques de código markdown (\`\`\`json) o comillas al inicio/final del texto. La respuesta debe iniciar con '{' y terminar con '}'.
    - No generes respuestas conversacionales, saludos, ni textos explicativos adicionales fuera de la clave "reason".
    - El array "recommendations" no debe contener "placeId" duplicados y debe estar ordenado de mayor a menor según el "score".
    
    4. REDACCIÓN Y CONCISIÓN (Para el atributo "reason"):
    - El atributo "reason" debe estar redactado en español neutro de Colombia.
    - Longitud requerida: Entre 12 y 22 palabras. No redactes respuestas extremadamente cortas ni párrafos largos.
    - Estructura obligatoria: Conecta un atractivo real del destino (paisaje, actividad, clima) con la necesidad específica del usuario (su compañía, presupuesto o ritmo).
    - PROHIBIDO el uso de frases genéricas, obvias o redundantes como: "Porque te gusta...", "Ideal para ti...", "Recomendado por tu clima...".
    - EJEMPLOS DE REDACCIÓN:
      - CORRECTO: "Caminatas ecológicas entre cascadas de clima fresco, perfecto para recorrer a ritmo pausado con amigos dentro de tu presupuesto."
      - CORRECTO: "Ambiente colonial tranquilo con excelente gastronomía típica, ideal para un plan en pareja con acceso cómodo en vehículo."
      - INCORRECTO: "Porque te gusta el frío y vas con tu pareja." (Demasiado corto y genérico).
      - INCORRECTO: "Lugar muy económico y recomendado para ti porque se ajusta a lo que pediste." (Texto vacío, no describe el lugar).
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