import * as jose from 'jose';

// Credenciales de tu Cuenta de Servicio (Descargadas de Google Cloud)
const SERVICE_ACCOUNT = {
    client_email: "firebase-adminsdk-fbsvc@sitios-turisticos-tesis.iam.gserviceaccount.com",
    private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCib2Af3NzhrQx1\nZvoDOns/F8e48cPVwY+m8BjKngqY/KXwXsYMf3FMRLvdANWnuELQp0S0arZ5FFjC\nSe87yEwvsFJxmAHqfpq2gN1FOTNawOE86HJ7k7UjtsVSk160BoK8yNQDoU0LcgGK\nKC6TuRJWU+1vNp0H0RKDc5dOWUdmgt0s+BYEzVUm7A60A7QAbLBIZJsVmYZR+2S9\nl3HVW1z70r/mb6YQFfWdV0cqmbG7OYYs3akG4wx6Izbdmv2Mr8vxmCCmFEjDtob5\nFcVUFTrLrnDt946JsTp8k93h0YeDOl01Vmm0RLhVHN8o1O8Vs1AMSfZRJd5vncFi\nOIxh7colAgMBAAECggEAAJ3oDiO4PFcm4uST8pn9pnzzfwGPwWqk83i8M6HWI4hR\nitz/It3yW5gebKSe5tB6YQIxmVR1E3blctso4op/k0xicaDrAotqzHONfSbwY1Fe\nuIZsYN6OH1ZDV0tmgJjoIcmopPsmsSWRWWVKmZZ5MY2HXo5pZujuIwAvb6NUWmop\nhUPicMJZIbkb5xyJfeAnBSzI5GQyYhDgNzfxVKygGwMX9nPl300O/UvR44hMddV5\nbpUJnNsbz4Kuz1pNy9yQae6ziJNHmSxd2BSNJBAbZOegbCePTOvw3J1AOFl3rIQv\nVV9gsfXooXw/oAbjZauOYJ1GzaVySxr/XjDDLURbIQKBgQDO8T9w60rUFe0ybDsm\nEUK9RY53+WZW+lxMG3bv2deZpWtoQJLXPg9RE9HGFJ8S3bhGYBKlAH32cTZng2gM\neTdoxRjwlCXbHLbsy+6+OnUpGJ1+vhEEoLwr6paGEfGTBbBb/k7WKMQhWth7dDol\nNfyiw+KIR0AKp15qE8sbUfIs3QKBgQDI8RqImFJE60347L1xDNADnOzV/Ca65tHC\neK4sLKlLsx8WatLN3IVZfckAAN63jdEBeTGuezHb3Icfag94jV+NqUIWABZvp7hm\noF4S4XrF1y9mlSOnPvrEEpgEw6WAv4TPZyAOtIH4XSSX0L3xsQ9vl+YBfb4dRzpl\ng6WSXGD56QKBgCxdZ/5rUxV4xetDbMLSfH5bRRnPa/NFpTfjw3HUP/Z+kjI9db2T\nXnFBUH2ouhmvUuwzeIvLOTX2O3WhpFLYQdrCNoCNIjiBRW4qojpCChAPaORdFwTo\n+K5pkm+XtTSRyadPM9OR1cpY0YRV/Ikxs8GpQQ16SO5/xyvypl5rCQI5AoGAZ+NX\nf4WZCy7IqkjjjL4+EZAhVmS+NWU+z5eLHSWeBZg/G1zxTiOUAfepYsoQW8ADbgqV\nqArjdTNn3NL92qrk2x3GIA+9ic6h5NVGreZLjlu5kwTKYR6LkbG3TMdGGvFpnb1I\ncrHafGjTkXYHrhyHyX80GFNFZme8Bl3wzWHbdXkCgYB583KdJJvnzYf6YDSQCl43\n2NrEii893xk7yUShPnCsyrdsfqSKPWBVJqN3oMnTsj0g6yqiGZxlqBtBpigaNZRQ\nheG1NvX25jrcPRXlVVHixlKvV7LdCQr7f5y1gDPBsSZ1AWWtc6wGtS/puQPEN5bg\nkzY1SV13AW1lQSbl6D5F3Q==\n-----END PRIVATE KEY-----\n",
};

const PROPERTY_ID = "550147654"; // Tu ID de propiedad GA4

// 1. Obtener Token de Acceso temporal de Google
const obtenerAccessToken = async (): Promise<string> => {
    const privateKey = await jose.importPKCS8(SERVICE_ACCOUNT.private_key, 'RS256');

    const jwt = await new jose.SignJWT({
        iss: SERVICE_ACCOUNT.client_email,
        scope: 'https://www.googleapis.com/auth/analytics.readonly',
        aud: 'https://oauth2.googleapis.com/token',
    })
        .setProtectedHeader({ alg: 'RS256' })
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(privateKey);

    const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion: jwt,
        }),
    });

    const data = await res.json();
    return data.access_token;
};

// 2. Consultar todas las vistas en 1 SOLA PETICIÓN REST
export const obtenerVistasDirectoDesdeGA4 = async (): Promise<Record<string, number>> => {
    try {
        const token = await obtenerAccessToken();

        const response = await fetch(
            `https://analyticsdata.googleapis.com/v1beta/properties/${PROPERTY_ID}:runReport`,
            {
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
            }
        );

        const data = await response.json();
        const vistasPorLugarId: Record<string, number> = {};

        data.rows?.forEach((row: any) => {
            const path = row.dimensionValues?.[0]?.value || '';
            const vistas = parseInt(row.metricValues?.[0]?.value || '0', 10);

            if (path.includes('/pagina2/')) {
                const lugarId = path.split('/pagina2/')[1]?.split('?')[0]?.split('/')[0];
                if (lugarId) {
                    vistasPorLugarId[lugarId] = (vistasPorLugarId[lugarId] || 0) + vistas;
                }
            }
        });

        return vistasPorLugarId;
    } catch (error) {
        console.error("Error consultando API REST de GA4:", error);
        return {};
    }
};