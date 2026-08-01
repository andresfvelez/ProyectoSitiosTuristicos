export interface LugarTuristico {
    id?: string;
    nombre: string;
    descripcion: string;
    categoria: string;
    latitud: number;
    longitud: number;
    ciudad: string;
    departamento: string;
    puntuacion:number;
    opiniones?:Opinion[];
    pais:string;
    minimo:number;
    recomendado:number;
    imagenes:string[];
}
export interface Opinion {
    lugarId: string;
    usuarioId: string;
    usuario: string;
    comentario: string;
    puntuacion: number;
    fuente: string;
    fecha: string;
}
export interface OpinionParseada {
    usuarioId: string;
    usuario: string;
    comentario: string;
    puntuacion: number;
    fuente: string;
    fecha: string;
}
export interface OpinionFirebase extends OpinionParseada {
    lugarId: string; // Este es el vínculo con tu colección original
    createdAt: number;
}