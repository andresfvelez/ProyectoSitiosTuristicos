// ==========================================
// 1. FILTROS ESTRUCTURALES DEL DESTINO (IA)
// ==========================================

export const OPCIONES_CLIMA = [
    { label: '☀️ Cálido', value: 'calido' },
    { label: '🏔️ Frío', value: 'frio' },
    { label: '🍃 Templado', value: 'templado' },
];

export const OPCIONES_ENTORNO = [
    { label: '🌿 Naturaleza Pura', value: 'naturaleza' },
    { label: '🏡 Pueblo Tranquilo', value: 'pueblo' },
    { label: '🌴 Selva / Bosque', value: 'selva' },
    { label: '🏙️ Urbano / Ciudad', value: 'urbano' },
];

export const OPCIONES_PRESUPUESTO = [
    { label: '💰 Económico / Mochilero ($)', value: 'economico' },
    { label: '💳 Moderado ($$)', value: 'moderado' },
    { label: '💎 Lujo / Premium ($$$)', value: 'lujo' },
];

export const OPCIONES_ACCESO = [
    { label: '🚗 Carro Particular / Pavimentado', value: 'carro' },
    { label: '🚌 Transporte Público / Bus', value: 'bus' },
    { label: '🚜 Vehículo 4x4 / Trocha', value: '4x4' },
    { label: '🥾 Caminata / Sin Acceso Vehicular', value: 'caminata' },
];

export const OPCIONES_RITMO = [
    { label: '🛋️ Relax Total / Descanso', value: 'relax' },
    { label: '🚶 Moderado / Exploración', value: 'moderado' },
    { label: '🧗 Muy Activo / Exigente', value: 'activo' },
];

export const OPCIONES_COMPANIA = [
    { label: '🎒 Viajero Solo', value: 'solo' },
    { label: '👩‍❤️‍👨 En Pareja', value: 'pareja' },
    { label: '👥 Con Amigos', value: 'amigos' },
    { label: '👨‍👩‍👧‍👦 En Familia', value: 'familia' },
];

// ==========================================
// 2. ACTIVIDADES Y CATEGORÍAS DE INTERÉS
// ==========================================

export const OPCIONES_ACTIVIDADES = [
    { label: '🥾 Senderismo / Caminata', value: 'senderismo' },
    { label: '🦜 Avistamiento de Aves', value: 'avistamiento_aves' },
    { label: '🌊 Deportes Acuáticos / Río', value: 'deportes_acuaticos' },
    { label: '📸 Fotografía de Paisaje', value: 'fotografia' },
    { label: '⛺ Camping / Glamping', value: 'camping' },
    { label: '🏛️ Tour Cultural / Historia', value: 'cultural' },
    { label: '☕ Ruta del Café / Agro', value: 'cafe' },
];

// ==========================================
// 3. AMENIDADES Y SERVICIOS DEL LUGAR
// ==========================================

export const OPCIONES_SERVICIOS = [
    { label: '📶 Wi-Fi Gratis', value: 'wifi' },
    { label: '🚗 Parqueadero Privado', value: 'parqueadero' },
    { label: '🗣️ Guía / Atención Personalizada', value: 'atencion_personalizada' },
    { label: '🚻 Baños Públicos', value: 'banos' },
];

export const OPCIONES_HOTEL = [
    { label: '🏊 Piscina', value: 'piscina' },
    { label: '🥐 Desayuno Incluido', value: 'desayuno' },
    { label: '❄️ Aire Acondicionado', value: 'aire' },
    { label: '🏔️ Vista Panorámica', value: 'vista' },
    { label: '🛁 Jacuzzi / Spa', value: 'jacuzzi' },
    { label: '🏡 Cabaña Privada', value: 'cabana' },
];

export const OPCIONES_RESTAURANTE = [
    { label: '🍲 Comida Típica / Criolla', value: 'comida_tipica' },
    { label: '🐟 Pescados y Mariscos', value: 'mariscos' },
    { label: '🥩 Parrilla / Carnes', value: 'parrilla' },
    { label: '🥗 Opción Vegetariana', value: 'vegetariana' },
    { label: '☕ Café / Repostería', value: 'reposteria' },
];

// ==========================================
// 🛠️ HELPER FORMATEADOR DE LABELS (EMOJIS)
// ==========================================

export const obtenerLabelFormateado = (valor: string): string => {
    const todasLasOpciones = [
        ...OPCIONES_CLIMA,
        ...OPCIONES_ENTORNO,
        ...OPCIONES_PRESUPUESTO,
        ...OPCIONES_ACCESO,
        ...OPCIONES_RITMO,
        ...OPCIONES_COMPANIA,
        ...OPCIONES_ACTIVIDADES,
        ...OPCIONES_SERVICIOS,
        ...OPCIONES_HOTEL,
        ...OPCIONES_RESTAURANTE,
    ];

    const opcion = todasLasOpciones.find(op => op.value === valor);
    return opcion ? opcion.label : valor;
};