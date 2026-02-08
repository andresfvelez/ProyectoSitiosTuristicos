import {MapContainer, TileLayer, Marker, Popup, useMap} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {useEffect, useMemo, useRef, useState} from 'react';
import { GeoSearchControl, OpenStreetMapProvider } from 'leaflet-geosearch';
import 'leaflet-geosearch/dist/geosearch.css'; // ¡No olvides los estilos del buscador!
/* Icono por defecto (bien tipado, sin hacks) */
const defaultIcon = new L.Icon({
    iconRetinaUrl:
        'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl:
        'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl:
        'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

type MapaUbicacionProps = {
    lat: number;
    lng: number;
    nombre: string;
    onUpdate?: (lat: number, lng: number, nombre: string) => void;
};

// Función para obtener el nombre del lugar basado en coordenadas
const reverseGeocode = async (lat: number, lng: number) => {
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
        );
        const data = await response.json();
        // Intentamos obtener el nombre más relevante (pueblo, ciudad o barrio)
        return data.display_name.split(',')[0] || "Ubicación seleccionada";
    } catch (error) {
        console.error("Error en geocodificación inversa:", error);
        return `Ubicación: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
};

// Componente interno para el buscador
const SearchField = ({ onLocationFound }: { onLocationFound: (lat: number, lng: number, label: string) => void }) => {
    const map = useMap();

    useEffect(() => {
        const provider = new OpenStreetMapProvider();
        // @ts-ignore
        const searchControl = new GeoSearchControl({
            provider: provider,
            style: 'bar',
            showMarker: false, // Desactivamos el marcador automático del buscador para usar el nuestro
            retainZoomLevel: false,
            animateZoom: true,
            autoClose: true,
            searchLabel: 'Busca un lugar...',
            keepResult: true
        });

        map.addControl(searchControl);

        // Escuchar cuando el buscador encuentra algo
        map.on('geosearch/showlocation', (result: any) => {
            onLocationFound(result.location.y, result.location.x, result.location.label.split(',')[0]);
        });

        return () => { map.removeControl(searchControl); };
    }, [map, onLocationFound]);

    return null;
};

const MapaUbicacion = ({ lat, lng, nombre, onUpdate }: MapaUbicacionProps) => {
    const [mostrarInicial, setMostrarInicial] = useState(true);
    const [posicion, setPosicion] = useState({ lat, lng });
    const [nombreActual, setNombreActual] = useState(nombre);
    const markerRef = useRef(null);

    // Eventos para el arrastre
    const eventHandlers = useMemo(() => ({
        async dragend() {
            const marker = markerRef.current;
            if (marker != null) {
                // @ts-ignore
                const { lat: mLat, lng: mLng } = marker.getLatLng();
                await handleNewLocation(mLat, mLng);
            }
        },
    }), [posicion]);
    const RecenterMap = ({ lat, lng }: { lat: number, lng: number }) => {
        const map = useMap();
        useEffect(() => {
            map.setView([lat, lng]);
        }, [lat, lng, map]);
        return null;
    };

    // Función para manejar el cambio de ubicación (arrastre o buscador)
    const handleNewLocation = async (newLat: number, newLng: number, newName?: string) => {
        setPosicion({ lat: newLat, lng: newLng });

        // Si no nos pasan nombre (cuando arrastramos), lo buscamos
        const finalName = newName || await reverseGeocode(newLat, newLng);
        setNombreActual(finalName);

        // Si pasamos una función de callback, notificamos al padre (tu formulario)
        if (onUpdate) {
            onUpdate(newLat, newLng, finalName);
        }
    };
    return (
        <div
            style={{
                width: '100%',
                maxWidth: '900px',
                margin: '0 auto',
                height: '420px',
                borderRadius: '14px',
                overflow: 'hidden',
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            }}
        >
            <MapContainer
                center={[lat, lng]}
                zoom={13}
                scrollWheelZoom={true}
                style={{
                    width: '100%',
                    height: '100%',
                }}
            >
                <TileLayer
                    attribution="&copy; OpenStreetMap contributors"
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <RecenterMap lat={posicion.lat} lng={posicion.lng} />
                {( nombre=="") &&
                    mostrarInicial && (
                        <>
                        <Marker
                            draggable={true}
                            eventHandlers={eventHandlers}
                            position={posicion}
                            icon={defaultIcon}
                            ref={markerRef}
                        >
                            <Popup>
                                <div style={{ textAlign: 'center' }}>
                                    {nombreActual && nombreActual!== "" && (
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
                    )}

                { nombre!=="" &&
                    <Marker position={[lat, lng]} icon={defaultIcon}>
                        <Popup>
                            <strong>{nombre}</strong>
                        </Popup>
                    </Marker>
                }




            </MapContainer>
        </div>
    );
};

export default MapaUbicacion;
