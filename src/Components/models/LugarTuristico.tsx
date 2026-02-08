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
