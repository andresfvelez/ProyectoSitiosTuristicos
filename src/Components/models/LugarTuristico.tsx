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
    opiniones:string;
    pais:string;
    minimo:number;
    recomendado:number;
    imagenes:string[];
}
export interface Opinion {
    usuario: string;
    comentario: string;
    puntuacion: number;
    fuente: string;
    fecha: string;
}