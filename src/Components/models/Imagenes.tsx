export interface ImagenBase64 {
    id?: string;
    idVinculado: string; // ID del lugar o del usuario
    esLugar: boolean;    // true si es de un lugar, false si es de perfil
    base64: string;      // El string de la imagen
    fechaCreacion: number;
}