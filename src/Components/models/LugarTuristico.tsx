export interface LugarTuristico {
    id?: string;
    nombre: string;
    descripcion: string;
    categoria: string;
    latitud: number;
    longitud: number;
    ciudad: string;
    departamento?: string;
    puntuacion:number;
    vistas?:number;
    opiniones?:Opinion[];
    pais:string;
    minimo:number;
    recomendado?:number;
    imagenes?:string[];
    fechaRegistro?: number;

    // 🛡️ CAMPOS DE CONTROL Y PERMISOS
    confirmado?: boolean;
    creadorId?: string;


    // VERIFICACIÓN Y NEGOCIO
    rnt?: string;
    unescoId?: string;
    nit?:string;

    // ETIQUETAS Y SERVICIOS
    tagsEspeciales?: string[];
    servicios?: string[];
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