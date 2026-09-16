
export type RolUsuario = 'turista'  | 'administrador';
export type EstadoCuenta = 'activo' | 'suspendido' |  'bloqueado';
export interface UserProfileData {
    uid?: string;
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

    rol?: RolUsuario | string;
    estado?: EstadoCuenta | string;
    bloqueadoHasta?: number | null; // Timestamp en milisegundos
    motivoSancion?: string | null;

}