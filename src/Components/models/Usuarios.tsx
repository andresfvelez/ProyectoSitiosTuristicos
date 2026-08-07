export interface UserProfileData {
    fullName: string;
    email?: string;
    telefono?: string;
    ciudad?: string;
    biografia?: string;
    fechaNacimiento?: string;
    puntos?: number;
    perfilIncompleto?: boolean;

    clima?: string;
    entorno?: string;
    rangoPresupuesto?: string;
    tipoAcceso?: string;
    ritmo?: string;
    companiaIdeal?: string[];
}