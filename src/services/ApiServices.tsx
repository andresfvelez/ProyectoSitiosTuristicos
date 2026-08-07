/**
 * Servicio para consumir APIs externas y públicas
 */

export const obtenerCiudadesColombia = async (): Promise<{ label: string; value: string }[]> => {
    try {
        // Le pasamos el ordenamiento directamente a la URL de la API
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

        // Mapeo directo y limpio
        return data.map((c: any) => ({
            label: c.name.trim(),
            value: c.name.trim()
        }));

    } catch (error) {
        console.error("Error al obtener municipios de Colombia:", error);
        return [];
    }
};