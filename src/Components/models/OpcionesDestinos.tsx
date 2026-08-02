// src/utils/opcionesDestinos.ts

export const OPCIONES_ACTIVIDADES = [
    { label: '🥾 Senderismo', value: 'senderismo' },
    { label: '🦜 Avistamiento de Aves', value: 'avistamiento_aves' },
    { label: '🌊 Deportes Acuáticos', value: 'deportes_acuaticos' },
    { label: '📸 Fotografía', value: 'fotografia' },
    { label: '⛺ Camping / Glamping', value: 'camping' },
    { label: '🏛️ Tour Cultural', value: 'cultural' },
];

export const OPCIONES_RESTAURANTE = [
    { label: '🍲 Comida Típica / Criolla', value: 'comida_tipica' },
    { label: '🐟 Pescados y Mariscos', value: 'mariscos' },
    { label: '🥩 Parrilla / Carnes', value: 'parrilla' },
    { label: '🥗 Opción Vegetariana', value: 'vegetariana' },
    { label: '☕ Café / Repostería', value: 'reposteria' },
];

export const OPCIONES_HOTEL = [
    { label: '🏊 Piscina', value: 'piscina' },
    { label: '🥐 Desayuno Incluido', value: 'desayuno' },
    { label: '❄️ Aire Acondicionado', value: 'aire' },
    { label: '🏔️ Vista Panorámica', value: 'vista' },
    { label: '🛁 Jacuzzi / Spa', value: 'jacuzzi' },
    { label: '🏡 Cabaña Privada', value: 'cabana' },
];

export const OPCIONES_SERVICIOS = [
    { label: '📶 Wi-Fi Gratis', value: 'wifi' },
    { label: '🚗 Parqueadero Privado', value: 'parqueadero' },
    { label: '🗣️ Guía / Atención Personalizada', value: 'atencion_personalizada' },
    { label: '🚻 Baños Públicos', value: 'banos' },
];

// 🛠️ Helper para buscar el nombre bonito con el emoji sin importar de qué categoría sea
export const obtenerLabelFormateado = (valor: string): string => {
    const todasLasOpciones = [
        ...OPCIONES_ACTIVIDADES,
        ...OPCIONES_RESTAURANTE,
        ...OPCIONES_HOTEL,
        ...OPCIONES_SERVICIOS
    ];
    const opcion = todasLasOpciones.find(op => op.value === valor);
    return opcion ? opcion.label : valor; // Si no lo encuentra, devuelve el valor original
};