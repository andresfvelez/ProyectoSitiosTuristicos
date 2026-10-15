import React, { useEffect, useState } from "react";
import { Box, Typography, Paper, Modal, IconButton } from "@mui/material";
import { Table, Button, Tag, Empty } from "antd";
import VisibilityIcon from '@mui/icons-material/Visibility';
import CloseIcon from '@mui/icons-material/Close';
import { obtenerDestinosPendientes } from "../../services/lugaresService";
import { FormularioDestino } from "./FormularioDestino";
import { LugarTuristico } from "../models/LugarTuristico";

export default function AprobarDestinos() {
    const [pendientes, setPendientes] = useState<LugarTuristico[]>([]);
    const [cargando, setCargando] = useState<boolean>(true);
    const [lugarSeleccionado, setLugarSeleccionado] = useState<LugarTuristico | null>(null);

    // Consulta de registros turísticos en estado no confirmado
    const cargarPendientes = async () => {
        setCargando(true);
        try {
            const lista = await obtenerDestinosPendientes();
            setPendientes(lista || []);
        } catch (error) {
            setPendientes([]);
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        cargarPendientes();
    }, []);

    // Configuración de columnas para la tabla de moderación
    const columnas = [
        {
            title: 'Nombre del Destino',
            dataIndex: 'nombre',
            key: 'nombre',
            width: 260,
            render: (text: string) => <strong style={{ color: '#0f172a' }}>{text || "Sin nombre registrado"}</strong>
        },
        {
            title: 'Categoría',
            dataIndex: 'categoria',
            key: 'categoria',
            width: 150,
            render: (cat: string) => {
                const categoriaNormalizada = (cat || 'aventura').toLowerCase();
                let colorTag = 'green';

                if (categoriaNormalizada === 'hotel') colorTag = 'red';
                if (categoriaNormalizada === 'restaurante') colorTag = 'orange';

                return (
                    <Tag color={colorTag} style={{ fontWeight: 'bold' }}>
                        {categoriaNormalizada.toUpperCase()}
                    </Tag>
                );
            }
        },
        {
            title: 'Ciudad / Municipio',
            dataIndex: 'ciudad',
            key: 'ciudad',
            width: 200,
            render: (ciudad: string) => ciudad || 'Colombia'
        },
        {
            title: 'Acciones',
            key: 'acciones',
            width: 140,
            render: (_: any, record: LugarTuristico) => (
                <Button
                    type="primary"
                    icon={<VisibilityIcon style={{ fontSize: 16 }} />}
                    onClick={() => setLugarSeleccionado(record)}
                    style={{
                        backgroundColor: '#0284c7',
                        borderRadius: '8px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}
                >
                    Revisar
                </Button>
            )
        }
    ];

    return (
        <Box sx={{ p: { xs: 1.5, sm: 3, md: 4 }, bgcolor: "#f1f5f9", minHeight: "100vh", overflowX: 'hidden' }}>
            <Paper sx={{ p: { xs: 2, sm: 3, md: 4 }, borderRadius: { xs: '16px', sm: '20px' }, boxShadow: "0 10px 30px rgba(0,0,0,0.05)" }}>
                <Typography
                    variant="h4"
                    fontWeight="800"
                    sx={{
                        mb: 1,
                        color: '#0f172a',
                        fontSize: { xs: "1.35rem", sm: "1.8rem", md: "2rem" },
                        wordBreak: "break-word"
                    }}
                >
                    Moderación de Destinos
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3, fontSize: { xs: "0.82rem", sm: "0.875rem" } }}>
                    Inspecciona, verifica y aprueba las publicaciones enviadas por la comunidad antes de hacerlas públicas en el catálogo.
                </Typography>

                <Table
                    dataSource={pendientes}
                    columns={columnas}
                    rowKey={(record) => record.id || Math.random().toString()}
                    loading={cargando}
                    pagination={{ pageSize: 8, responsive: true }}
                    scroll={{ x: 'max-content' }}
                    locale={{
                        emptyText: (
                            <Box sx={{ py: 4 }}>
                                <Empty description="No hay destinos pendientes de moderación en este momento." />
                            </Box>
                        )
                    }}
                />
            </Paper>

            {/* Ventana modal para la inspección y aprobación del destino */}
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