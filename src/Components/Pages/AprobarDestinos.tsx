import React, { useEffect, useState } from "react";
import { Box, Typography, Paper, Modal, Stack } from "@mui/material";
import { Table, Button, Tag } from "antd";
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { obtenerDestinosPendientes } from "../../services/lugaresService";
import { FormularioDestino } from "./FormularioDestino";
import {LugarTuristico} from "../models/LugarTuristico";

export default function AprobarDestinos() {
    const [pendientes, setPendientes] = useState<LugarTuristico[]>([]);
    const [cargando, setCargando] = useState<boolean>(true);
    const [lugarSeleccionado, setLugarSeleccionado] = useState<LugarTuristico | null>(null);

    const cargarPendientes = async () => {
        setCargando(true);
        const lista = await obtenerDestinosPendientes();
        setPendientes(lista);
        setCargando(false);
    };

    useEffect(() => {
        cargarPendientes();
    }, []);

    const columnas = [
        {
            title: 'Nombre',
            dataIndex: 'nombre',
            key: 'nombre',
            render: (text: string) => <strong>{text}</strong>
        },
        {
            title: 'Categoría',
            dataIndex: 'categoria',
            key: 'categoria',
            render: (cat: string) => (
                <Tag color={cat === 'hotel' ? 'red' : cat === 'restaurante' ? 'orange' : 'green'}>
                    {(cat || 'aventura').toUpperCase()}
                </Tag>
            )
        },
        {
            title: 'Ciudad',
            dataIndex: 'ciudad',
            key: 'ciudad'
        },
        {
            title: 'Acciones',
            key: 'acciones',
            render: (_: any, record: LugarTuristico) => (
                <Button
                    type="primary"
                    icon={<VisibilityIcon style={{ fontSize: 16 }} />}
                    onClick={() => setLugarSeleccionado(record)}
                >
                    Revisar
                </Button>
            )
        }
    ];

    return (
        <Box sx={{ p: 4 }}>
            <Paper sx={{ p: 4, borderRadius: '20px' }}>
                <Typography variant="h4" fontWeight="800" sx={{ mb: 1, color: '#0f172a' }}>
                    Moderación de Destinos
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Revisa las publicaciones pendientes antes de hacerlas visibles al público.
                </Typography>

                <Table
                    dataSource={pendientes}
                    columns={columnas}
                    rowKey="id"
                    loading={cargando}
                    pagination={{ pageSize: 8 }}
                />
            </Paper>

            {/* MODAL CON EL FORMULARIO REUTILIZABLE EN MODO 'APROBAR' */}
            <Modal
                open={Boolean(lugarSeleccionado)}
                onClose={() => setLugarSeleccionado(null)}
                sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', overflowY: 'auto', p: 2 }}
            >
                <Box sx={{ width: '100%', maxWidth: 1100, bgcolor: 'background.paper', borderRadius: 4, p: 2, maxHeight: '90vh', overflowY: 'auto' }}>
                    {lugarSeleccionado && (
                        <FormularioDestino
                            modo="aprobar"
                            datosIniciales={lugarSeleccionado}
                            onExito={() => {
                                setLugarSeleccionado(null);
                                cargarPendientes();
                            }}
                        />
                    )}
                </Box>
            </Modal>
        </Box>
    );
}