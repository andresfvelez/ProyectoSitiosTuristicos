import React, { useCallback, useEffect, useState } from "react";
import { GoogleMap, useJsApiLoader, Marker } from "@react-google-maps/api";

// Estilos del contenedor del mapa
const containerStyle = {
  width: "100%",
  height: "600px",
};

function Localizacion() {
  // Estado para guardar la información del lugar (coordenadas, zoom, etc.)
  const [post, setPost] = useState<any>(null);
  
  // Hook de la librería para cargar el script de Google Maps de forma segura
  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    // ¡Importante! La clave de API se carga desde las variables de entorno
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY || "",
  });


  // Función para obtener los datos del lugar desde localStorage
  const getLugarData = useCallback(() => {
    try {
      const seleccionadoString = localStorage.getItem("seleccionado");
      if (seleccionadoString) {
        const destino = JSON.parse(seleccionadoString);
        // Asegurarnos de que las coordenadas y el zoom existan y sean números
        if (destino.coordenadas && typeof destino.coordenadas.lat === 'number' && typeof destino.coordenadas.lng === 'number') {
          setPost({
            coordenadas: destino.coordenadas,
            zoom: typeof destino.zoom === 'number' ? destino.zoom : 15, // Zoom por defecto si no existe
          });
        } else {
          console.error("Las coordenadas no son válidas en el objeto de localStorage.");
        }
      } else {
        // Coordenadas por defecto si no hay nada en localStorage
        setPost({
          coordenadas: { lat: 4.5709, lng: -74.2973 }, // Centro de Colombia
          zoom: 6,
        });
      }
    } catch (error) {
      console.error("Error al parsear los datos de localStorage:", error);
      // Fallback en caso de error
      setPost({
        coordenadas: { lat: 4.5709, lng: 74.2973 },
        zoom: 6,
      });
    }
  }, []);

  // useEffect para llamar a la función cuando el componente se monta
  useEffect(() => {
    getLugarData();
  }, [getLugarData]);

  // Renderiza un mensaje de carga mientras el API de Google se carga
  if (!isLoaded || !post) {
    return <div>Cargando mapa...</div>;
  }

  // Renderiza el mapa una vez que todo está listo
  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={post.coordenadas}
      zoom={post.zoom}
    >
      {/* 
        Este es el marcador. Se renderiza de forma declarativa.
        La posición viene del estado 'post' que se carga desde localStorage.
      */}
      <Marker position={post.coordenadas} />
    </GoogleMap>
  );
}


export default React.memo(Localizacion);
