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
    fechaRegistro?: number;
    //  CAMPOS DE CALIDAD Y ATRIBUTOS
    rnt?: string;
    unescoId?: string;
    tagsEspeciales?: string[]; // Etiquetas dinámicas (actividades, cocina o comodidades)
    servicios?: string[];     // Wi-Fi, Parqueadero, Baños, etc.
    petFriendly?: boolean;
    accesibleSillaRuedas?: boolean;
    dificultad?: string;
    contactoWhatsapp?: string;
    queLlevar?: string;

    // Criterios de filtrado
    categoriaPrincipal?: string;
    perfilUsuario?: string[];
    nivelGasto?: number;
    clima?: string;
    popularidad?: boolean;
    estanciaSugerida?: string;
    entorno?: string;
    acceso?: string;
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