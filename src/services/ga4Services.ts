import * as jose from 'jose';
import CryptoJS from 'crypto-js';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

const GOOGLE_OAUTH_URL = "https://oauth2.googleapis.com/token";

// Desencriptador estándar AES del proyecto
const desencriptarDatos = (data: string, key: string): string => {
    try {
        const bytes = CryptoJS.AES.decrypt(data, key);
        return bytes.toString(CryptoJS.enc.Utf8);
    } catch {
        return "";
    }
};

/**
 * Consulta y desencripta las credenciales de GA4 almacenadas en Firestore.
 */
const obtenerCredencialesGA4 = async () => {
    try {
        const docRefClaves = doc(db, "Constantes", "claves");
        const docSnapClaves = await getDoc(docRefClaves);
        const docRefGa4 = doc(db, "Constantes", "Google_Analitics(GA4)");
        const docSnapGa4 = await getDoc(docRefGa4);

        if (!docSnapClaves.exists() || !docSnapGa4.exists()) return null;

        const fraseMaestra = docSnapClaves.data().encriptado;
        const dataGa4 = docSnapGa4.data();

        if (!dataGa4.private_key) return null;

        const privateKey = desencriptarDatos(dataGa4.private_key, fraseMaestra);
        if (!privateKey) return null;

        return {
            client_email: dataGa4.client_email,
            private_key: privateKey.trim(),
            property_id: dataGa4.property_id || ""
        };
    } catch {
        return null;
    }
};

/**
 * Genera un token de acceso temporal OAuth 2.0 usando la clave privada desencriptada.
 */
const obtenerAccessToken = async (clientEmail: string, privateKeyPem: string): Promise<string> => {
    const privateKey = await jose.importPKCS8(privateKeyPem, 'RS256');

    const jwt = await new jose.SignJWT({
        iss: clientEmail,
        scope: 'https://www.googleapis.com/auth/analytics.readonly',
        aud: GOOGLE_OAUTH_URL,
    })
        .setProtectedHeader({ alg: 'RS256' })
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(privateKey);

    const res = await fetch(GOOGLE_OAUTH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion: jwt,
        }),
    });

    if (!res.ok) {
        throw new Error(`Fallo en autenticación con Google OAuth: ${res.status}`);
    }

    const data = await res.json();
    return data.access_token;
};

/**
 * Consulta las métricas de tráfico en GA4 de los últimos 120 días por ID de destino.
 */
export const obtenerVistasDirectoDesdeGA4 = async (): Promise<Record<string, number>> => {
    try {
        const credenciales = await obtenerCredencialesGA4();
        if (!credenciales) return {};

        const token = await obtenerAccessToken(credenciales.client_email, credenciales.private_key);
        const endpoint = `https://analyticsdata.googleapis.com/v1beta/properties/${credenciales.property_id}:runReport`;

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                dateRanges: [{ startDate: '120daysAgo', endDate: 'today' }],
                dimensions: [{ name: 'pagePath' }],
                metrics: [{ name: 'screenPageViews' }],
            }),
        });

        if (!response.ok) {
            throw new Error(`Fallo al consultar GA4 Data API: ${response.status}`);
        }

        const data = await response.json();
        const vistasPorLugarId: Record<string, number> = {};

        if (data.rows && Array.isArray(data.rows)) {
            data.rows.forEach((row: any) => {
                const path = row.dimensionValues?.[0]?.value || '';
                const vistas = parseInt(row.metricValues?.[0]?.value || '0', 10);

                if (path.includes('/destino/')) {
                    const partesPath = path.split('/destino/')[1];
                    if (partesPath) {
                        const lugarId = partesPath.split('?')[0].split('/')[0];
                        if (lugarId) {
                            vistasPorLugarId[lugarId] = (vistasPorLugarId[lugarId] || 0) + vistas;
                        }
                    }
                }
            });
        }

        return vistasPorLugarId;
    } catch {
        return {};
    }
};