/**
 * Servicio de integración para el consumo de APIs externas públicas y normalización territorial.
 */

// Función auxiliar para detectar acentos ortográficos
const tieneTilde = (texto: string): boolean => {
    return /[áéíóúÁÉÍÓÚ]/i.test(texto);
};

// Función auxiliar para estandarizar cadenas (remueve signos diacríticos y capitalización)
const normalizarClave = (texto: string): string => {
    return texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

/**
 * Obtiene, filtra y normaliza la lista de municipios desde el registro público de API Colombia.
 * @returns {Promise<{label: string, value: string}[]>} Lista deduplicada y ordenada alfabéticamente.
 */
export const obtenerCiudadesColombia = async (): Promise<{ label: string; value: string }[]> => {
    try {
        const response = await fetch("https://api-colombia.com/api/v1/City?sortBy=name&sortDirection=asc", {
            method: "GET",
            headers: {
                "Accept": "application/json"
            }
        });

        if (!response.ok) {
            throw new Error(`Error de comunicación con el servicio geográfico. Código HTTP: ${response.status}`);
        }

        const data = await response.json();
        const mapaCiudades = new Map<string, string>();

        // Proceso de deduplicación preservando la variante con mayor riqueza ortográfica
        data.forEach((ciudadItem: any) => {
            if (!ciudadItem.name) return;

            const nombreOriginal = ciudadItem.name.trim();
            const claveCanonico = normalizarClave(nombreOriginal);

            if (!mapaCiudades.has(claveCanonico)) {
                mapaCiudades.set(claveCanonico, nombreOriginal);
            } else {
                const ciudadRegistrada = mapaCiudades.get(claveCanonico)!;
                if (!tieneTilde(ciudadRegistrada) && tieneTilde(nombreOriginal)) {
                    mapaCiudades.set(claveCanonico, nombreOriginal);
                }
            }
        });

        // Ordenamiento lingüístico y mapeo al estándar del selector (label/value)
        return Array.from(mapaCiudades.values())
            .sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }))
            .map((nombreFinal) => ({
                label: nombreFinal,
                value: nombreFinal
            }));

    } catch (error) {
        return [];
    }
};