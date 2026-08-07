import {
    OPCIONES_CLIMA,
    OPCIONES_ENTORNO,
    OPCIONES_PRESUPUESTO,
    OPCIONES_ACCESO,
    OPCIONES_RITMO,
    OPCIONES_COMPANIA
} from "./OpcionesDestinos";

export interface OpcionPregunta {
    label: string;
    value: string;
}

export interface PreguntaPerfil {
    id: string;
    titulo: string;
    esMultiple?: boolean;
    opciones: OpcionPregunta[];
}

export const PREGUNTAS_PERFIL: PreguntaPerfil[] = [
    {
        id: 'clima',
        titulo: 'Clima Preferido',
        opciones: OPCIONES_CLIMA
    },
    {
        id: 'entorno',
        titulo: 'Tipo de Entorno',
        opciones: OPCIONES_ENTORNO
    },
    {
        id: 'rangoPresupuesto',
        titulo: 'Rango de Presupuesto Habitual',
        opciones: OPCIONES_PRESUPUESTO
    },
    {
        id: 'tipoAcceso',
        titulo: 'Facilidad de Acceso Preferida',
        opciones: OPCIONES_ACCESO
    },
    {
        id: 'ritmo',
        titulo: 'Ritmo / Exigencia del Plan',
        opciones: OPCIONES_RITMO
    },
    {
        id: 'companiaIdeal',
        titulo: 'Ideal Para (Compañía)',
        esMultiple: true,
        opciones: OPCIONES_COMPANIA
    }
];