/**
 * Servicio para consumir APIs externas y públicas
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
            throw new Error(`Error HTTP: ${response.status}`);
        }

        const data = await response.json();

        // 🧹 Mapa para deduplicar usando la versión sin tildes como clave interna
        const mapaCiudades = new Map<string, string>();

        const tieneTilde = (texto: string) => /[áéíóúÁÉÍÓÚ]/i.test(texto);
        const normalizarClave = (texto: string) =>
            texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        data.forEach((c: any) => {
            if (!c.name) return;
            const nombreLimpio = c.name.trim();
            const claveNormal = normalizarClave(nombreLimpio);

            if (!mapaCiudades.has(claveNormal)) {
                mapaCiudades.set(claveNormal, nombreLimpio);
            } else {
                // Si la existente no tenía tilde y esta nueva sí la tiene, la reemplazamos
                const ciudadExistente = mapaCiudades.get(claveNormal)!;
                if (!tieneTilde(ciudadExistente) && tieneTilde(nombreLimpio)) {
                    mapaCiudades.set(claveNormal, nombreLimpio);
                }
            }
        });

        // Retorna la lista única ordenada respetando tildes y caracteres en español
        return Array.from(mapaCiudades.values())
            .sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }))
            .map((nombre) => ({
                label: nombre,
                value: nombre
            }));

    } catch (error) {
        console.error("Error al obtener municipios de Colombia:", error);
        return [];
    }
};