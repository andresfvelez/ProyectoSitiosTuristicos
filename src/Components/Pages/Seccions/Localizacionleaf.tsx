import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { GeoSearchControl, OpenStreetMapProvider } from 'leaflet-geosearch';
import 'leaflet-geosearch/dist/geosearch.css';

// Configuración canónica del marcador de Leaflet para entornos empaquetados
const defaultIcon = new L.Icon({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

interface MapaUbicacionProps {
    lat: number;
    lng: number;
    nombre: string;
    onUpdate?: (lat: number, lng: number, nombre: string) => void;
}

// Geocodificación inversa mediante el servicio público de Nominatim OpenStreetMap
const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
        );
        if (!response.ok) throw new Error("Error en respuesta de geocodificación");
        const data = await response.json();
        return data.display_name?.split(',')[0] || "Ubicación seleccionada";
    } catch {
        return `Ubicación: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
};

// Componente externo para reajustar la vista ante cambios de coordenadas
const RecenterMap: React.FC<{ lat: number; lng: number }> = ({ lat, lng }) => {
    const map = useMap();
    useEffect(() => {
        if (lat && lng) {
            map.setView([lat, lng], map.getZoom());
        }
    }, [lat, lng, map]);
    return null;
};

// Controlador de invalidación de tamaño para prevenir baldosas grises en pantallas móviles
const ResponsiveMapHandler: React.FC = () => {
    const map = useMap();
    useEffect(() => {
        map.invalidateSize();
        const handleResize = () => map.invalidateSize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [map]);
    return null;
};

// Controlador integrado de búsqueda geográfica
const SearchField: React.FC<{ onLocationFound: (lat: number, lng: number, label: string) => void }> = ({
                                                                                                           onLocationFound
                                                                                                       }) => {
    const map = useMap();

    useEffect(() => {
        const provider = new OpenStreetMapProvider();
        const searchControl = new (GeoSearchControl as any)({
            provider,
            style: 'bar',
            showMarker: false,
            retainZoomLevel: false,
            animateZoom: true,
            autoClose: true,
            searchLabel: 'Busca una dirección o municipio...',
            keepResult: true
        });

        map.addControl(searchControl);

        const handleShowLocation = (result: any) => {
            const labelLimpio = result.location.label?.split(',')[0] || "Ubicación encontrada";
            onLocationFound(result.location.y, result.location.x, labelLimpio);
        };

        map.on('geosearch/showlocation', handleShowLocation);

        return () => {
            map.removeControl(searchControl);
            map.off('geosearch/showlocation', handleShowLocation);
        };
    }, [map, onLocationFound]);

    return null;
};

const MapaUbicacion: React.FC<MapaUbicacionProps> = ({ lat, lng, nombre, onUpdate }) => {
    const [posicion, setPosicion] = useState<{ lat: number; lng: number }>({ lat, lng });
    const [nombreActual, setNombreActual] = useState<string>(nombre);
    const markerRef = useRef<L.Marker | null>(null);

    // Determina si el mapa opera como selector interactivo (edición/creación) o como visor turístico
    const esModoEdicion = Boolean(onUpdate);

    // Sincronización del estado interno cuando cambian los props desde el contenedor
    useEffect(() => {
        setPosicion({ lat, lng });
    }, [lat, lng]);

    useEffect(() => {
        setNombreActual(nombre);
    }, [nombre]);

    // Gestión centralizada de cambios de ubicación
    const handleNewLocation = useCallback(async (newLat: number, newLng: number, newName?: string) => {
        setPosicion({ lat: newLat, lng: newLng });

        const nombreFinal = newName || await reverseGeocode(newLat, newLng);
        setNombreActual(nombreFinal);

        if (onUpdate) {
            onUpdate(newLat, newLng, nombreFinal);
        }
    }, [onUpdate]);

    // Gestor de eventos de arrastre para el marcador
    const eventHandlers = useMemo(() => ({
        async dragend() {
            const marker = markerRef.current;
            if (marker) {
                const { lat: mLat, lng: mLng } = marker.getLatLng();
                await handleNewLocation(mLat, mLng);
            }
        },
    }), [handleNewLocation]);

    return (
        <div
            style={{
                width: '100%',
                maxWidth: '900px',
                margin: '0 auto',
                height: '420px',
                borderRadius: '16px',
                overflow: 'hidden',
                boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                border: '1px solid #e2e8f0'
            }}
        >
            <MapContainer
                center={[posicion.lat || 4.5709, posicion.lng || -74.2973]}
                zoom={13}
                scrollWheelZoom={false}
                style={{
                    width: '100%',
                    height: '100%',
                }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <ResponsiveMapHandler />
                <RecenterMap lat={posicion.lat} lng={posicion.lng} />

                {esModoEdicion ? (
                    <>
                        <Marker
                            draggable={true}
                            eventHandlers={eventHandlers}
                            position={[posicion.lat, posicion.lng]}
                            icon={defaultIcon}
                            ref={markerRef}
                        >
                            <Popup>
                                <div style={{ textAlign: 'center' }}>
                                    {nombreActual && (
                                        <>
                                            <strong>{nombreActual}</strong>
                                            <br />
                                        </>
                                    )}
                                    <small>Lat: {posicion.lat.toFixed(4)}</small><br />
                                    <small>Lng: {posicion.lng.toFixed(4)}</small>
                                </div>
                            </Popup>
                        </Marker>

                        <SearchField onLocationFound={handleNewLocation} />
                    </>
                ) : (
                    <Marker position={[posicion.lat, posicion.lng]} icon={defaultIcon}>
                        <Popup>
                            <strong>{nombreActual || "Destino Turístico"}</strong>
                        </Popup>
                    </Marker>
                )}
            </MapContainer>
        </div>
    );
};

export default MapaUbicacion;