import React, { useEffect, useState } from "react";
import { Box, Typography, Paper, Modal, IconButton } from "@mui/material";
import { Table, Button, Tag } from "antd";
import VisibilityIcon from '@mui/icons-material/Visibility';
import CloseIcon from '@mui/icons-material/Close';
import { obtenerDestinosPendientes } from "../../services/lugaresService";
import { FormularioDestino } from "./FormularioDestino";
import { LugarTuristico } from "../models/LugarTuristico";

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
        <Box sx={{ p: { xs: 1.5, sm: 3, md: 4 }, overflowX: 'hidden' }}>
            <Paper sx={{ p: { xs: 2, sm: 3, md: 4 }, borderRadius: { xs: '16px', sm: '20px' } }}>
                <Typography
                    variant="h4"
                    fontWeight="800"
                    sx={{
                        mb: 1,
                        color: '#0f172a',
                        fontSize: { xs: "1.35rem", sm: "1.8rem", md: "2.125rem" },
                        wordBreak: "break-word"
                    }}
                >
                    Moderación de Destinos
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3, fontSize: { xs: "0.82rem", sm: "0.875rem" } }}>
                    Revisa las publicaciones pendientes antes de hacerlas visibles al público.
                </Typography>

                <Table
                    dataSource={pendientes}
                    columns={columnas}
                    rowKey="id"
                    loading={cargando}
                    pagination={{ pageSize: 8, responsive: true }}
                    scroll={{ x: 'max-content' }}
                />
            </Paper>

            {/* MODAL ADAPTATIVO CON BOTÓN DE CIERRE (X) */}
            <Modal
                open={Boolean(lugarSeleccionado)}
                onClose={() => setLugarSeleccionado(null)}
                sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: { xs: 1, sm: 2 } }}
            >
                <Box
                    sx={{
                        position: 'relative',
                        width: '100%',
                        maxWidth: 1100,
                        bgcolor: 'background.paper',
                        borderRadius: { xs: 3, sm: 4 },
                        p: { xs: 1, sm: 2 },
                        maxHeight: '92vh',
                        overflowY: 'auto',
                        outline: 'none'
                    }}
                >
                    {/* ❌ BOTÓN DE CIERRE FLOTANTE */}
                    <IconButton
                        onClick={() => setLugarSeleccionado(null)}
                        size="small"
                        sx={{
                            position: 'absolute',
                            top: { xs: 12, sm: 16 },
                            right: { xs: 12, sm: 16 },
                            zIndex: 10,
                            bgcolor: 'rgba(0, 0, 0, 0.4)',
                            color: '#ffffff',
                            backdropFilter: 'blur(4px)',
                            '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.7)' }
                        }}
                    >
                        <CloseIcon fontSize="small" />
                    </IconButton>

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