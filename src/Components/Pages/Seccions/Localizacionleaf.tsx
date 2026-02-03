import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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
};

const MapaUbicacion = ({ lat, lng, nombre }: MapaUbicacionProps) => {
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

                <Marker position={[lat, lng]} icon={defaultIcon}>
                    <Popup>
                        <strong>{nombre}</strong>
                    </Popup>
                </Marker>
            </MapContainer>
        </div>
    );
};

export default MapaUbicacion;
