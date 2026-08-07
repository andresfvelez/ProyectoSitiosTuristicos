import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, Stack, Chip as MuiChip, IconButton } from '@mui/material';
import { Table, Button, message, Popconfirm, Tag, List, Tabs } from 'antd';
import { useNavigate } from 'react-router-dom';

// Icons
import FlagIcon from '@mui/icons-material/Flag';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import GppBadIcon from '@mui/icons-material/GppBad';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import RemoveRedEyeIcon from '@mui/icons-material/RemoveRedEye';
import PersonIcon from '@mui/icons-material/Person';
import BlockIcon from '@mui/icons-material/Block'; // 👈 Icono para dar de baja

import {
    obtenerLugaresConReportesPendientes,
    desestimarReportesLugar,
    ponerLugarEnRevision,
    obtenerLugaresEnRevision,
    darDeBajaLugar // 👈 Agregamos la función
} from '../../services/lugaresService';

const ReportesAdmin = () => {
    const navigate = useNavigate();
    const [dataPendientes, setDataPendientes] = useState<any[]>([]);
    const [dataRevision, setDataRevision] = useState<any[]>([]);
    const [cargando, setCargando] = useState<boolean>(true);

    const cargarDatos = async () => {
        setCargando(true);
        const [pendientes, revisiones] = await Promise.all([
            obtenerLugaresConReportesPendientes(1),
            obtenerLugaresEnRevision()
        ]);
        setDataPendientes(pendientes);
        setDataRevision(revisiones);
        setCargando(false);
    };

    useEffect(() => {
        cargarDatos();
    }, []);

    // -- MANEJADORES DE ACCIONES --
    const handleDesestimar = async (lugarId: string) => {
        const exito = await desestimarReportesLugar(lugarId);
        if (exito) {
            message.success("Los reportes fueron desestimados y el sitio volvió a estar publicado.");
            cargarDatos();
        } else {
            message.error("Error al desestimar los reportes.");
        }
    };

    const handleRevision = async (lugarId: string) => {
        const exito = await ponerLugarEnRevision(lugarId);
        if (exito) {
            message.warning("El lugar ha sido ocultado y puesto en revisión.");
            cargarDatos();
        } else {
            message.error("Error al poner el lugar en revisión.");
        }
    };

    const handleDarDeBaja = async (lugarId: string) => {
        const exito = await darDeBajaLugar(lugarId);
        if (exito) {
            message.error("El sitio ha sido dado de baja definitivamente.");
            cargarDatos();
        } else {
            message.error("Error al dar de baja el sitio.");
        }
    };

    // -- RENDER DEL DESPLEGABLE --
    const expandedRowRender = (record: any) => (
        <Box sx={{ p: 2.5, bgcolor: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1', my: 1 }}>
            <Typography variant="subtitle2" fontWeight="800" sx={{ mb: 1.5, color: '#334155' }}>
                Motivos reportados y Usuarios:
            </Typography>
            <List
                size="small"
                dataSource={record.reportes}
                renderItem={(repo: any) => (
                    <List.Item style={{ padding: '8px 0', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                        <Typography variant="body2" color="text.secondary">
                            <strong style={{ color: '#ef4444', marginRight: '6px' }}>•</strong> {repo.motivo}
                        </Typography>
                        <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 0.5, ml: 2 }}>
                            <PersonIcon sx={{ fontSize: 14, color: '#94a3b8' }} />
                            <Typography variant="caption" color="#64748b" fontWeight="bold">
                                ID Usuario: {repo.usuarioId}
                            </Typography>
                        </Stack>
                    </List.Item>
                )}
            />
        </Box>
    );

    // -- COLUMNAS PESTAÑA 1: NUEVOS REPORTES --
    const colsPendientes = [
        {
            title: 'Destino Reportado',
            dataIndex: ['lugar', 'nombre'],
            key: 'nombre',
            render: (text: string) => <strong>{text}</strong>,
        },
        {
            title: 'Categoría',
            dataIndex: ['lugar', 'categoria'],
            key: 'categoria',
            render: (cat: string) => <Tag color="blue">{cat?.toUpperCase()}</Tag>,
        },
        {
            title: 'Reportes Acumulados',
            dataIndex: 'reportes',
            key: 'cantidad',
            render: (reportes: any[]) => (
                <MuiChip icon={<FlagIcon style={{ fontSize: 16 }} />} label={`${reportes.length} Pendientes`} color="error" size="small" sx={{ fontWeight: 'bold' }} />
            ),
        },
        {
            title: 'Acciones de Moderación',
            key: 'acciones',
            render: (_: any, record: any) => (
                <Stack direction="row" spacing={2}>
                    <Popconfirm title="¿Desestimar reportes?" description="El lugar continuará publicado libremente." onConfirm={() => handleDesestimar(record.lugar.id)} okText="Sí" cancelText="Cancelar">
                        <Button style={{ color: '#16a34a', borderColor: '#16a34a', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                            <CheckCircleOutlineIcon style={{ fontSize: 18 }} /> Desestimar
                        </Button>
                    </Popconfirm>
                    <Popconfirm title="¿Poner en revisión (ocultar)?" onConfirm={() => handleRevision(record.lugar.id)} okText="Ocultar" cancelText="Cancelar" okButtonProps={{ danger: true }}>
                        <Button danger style={{ borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                            <GppBadIcon style={{ fontSize: 18 }} /> Poner en Revisión
                        </Button>
                    </Popconfirm>
                </Stack>
            ),
        },
    ];

    // -- COLUMNAS PESTAÑA 2: EN REVISIÓN --
    const colsRevision = [
        {
            title: 'Destino en Revisión',
            dataIndex: ['lugar', 'nombre'],
            key: 'nombre',
            render: (text: string) => <strong>{text}</strong>,
        },
        {
            title: 'Reportes Vinculados',
            dataIndex: 'reportes',
            key: 'cantidad',
            render: (reportes: any[]) => (
                <MuiChip label={`${reportes.length} Registrados`} color="warning" size="small" sx={{ fontWeight: 'bold' }} />
            ),
        },
        {
            title: 'Acciones',
            key: 'acciones',
            render: (_: any, record: any) => (
                <Stack direction="row" spacing={1.5}>
                    {/* PREVISUALIZAR */}
                    <Button
                        type="primary"
                        style={{ borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#0284c7' }}
                        onClick={() => navigate(`/pagina2/${record.lugar.id}`)}
                    >
                        <RemoveRedEyeIcon style={{ fontSize: 18 }} /> Previsualizar
                    </Button>

                    {/* DESESTIMAR */}
                    <Popconfirm
                        title="¿Desestimar reportes?"
                        description="El lugar se restaurará a la plataforma pública."
                        onConfirm={() => handleDesestimar(record.lugar.id)}
                        okText="Restaurar"
                        cancelText="Cancelar"
                    >
                        <Button style={{ color: '#16a34a', borderColor: '#16a34a', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <CheckCircleOutlineIcon style={{ fontSize: 18 }} /> Desestimar
                        </Button>
                    </Popconfirm>

                    {/* DAR DE BAJA */}
                    <Popconfirm
                        title="¿Dar de baja este sitio?"
                        description="El sitio cambiará su estado a 'dado de baja' permanentemente."
                        onConfirm={() => handleDarDeBaja(record.lugar.id)}
                        okText="Sí, Dar de baja"
                        cancelText="Cancelar"
                        okButtonProps={{ danger: true }}
                    >
                        <Button danger style={{ borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <BlockIcon style={{ fontSize: 18 }} /> Dar de Baja
                        </Button>
                    </Popconfirm>
                </Stack>
            ),
        },
    ];

    const configExpansion = {
        expandedRowRender,
        expandIcon: ({ expanded, onExpand, record }: any) =>
            expanded ? (
                <IconButton size="small" onClick={(e) => onExpand(record, e)}>
                    <KeyboardArrowDownIcon sx={{ color: '#0ea5e9' }} />
                </IconButton>
            ) : (
                <IconButton size="small" onClick={(e) => onExpand(record, e)}>
                    <KeyboardArrowRightIcon sx={{ color: '#64748b' }} />
                </IconButton>
            )
    };

    return (
        <Box sx={{ p: { xs: 2, md: 4 }, bgcolor: "#f1f5f9", minHeight: "100vh" }}>
            <Paper sx={{ p: 4, borderRadius: "20px", boxShadow: "0 10px 30px rgba(0,0,0,0.05)" }}>
                <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 4 }}>
                    <FlagIcon sx={{ fontSize: 36, color: "#ef4444" }} />
                    <Box>
                        <Typography variant="h5" fontWeight="800">Centro de Moderación</Typography>
                        <Typography variant="body2" color="text.secondary">
                            Gestiona los reportes de los usuarios y audita los lugares conflictivos.
                        </Typography>
                    </Box>
                </Stack>

                <Tabs
                    defaultActiveKey="1"
                    items={[
                        {
                            key: "1",
                            label: (
                                <span style={{ fontWeight: 'bold' }}>
                  🚩 Nuevos Reportes ({dataPendientes.length})
                </span>
                            ),
                            children: (
                                <Table
                                    columns={colsPendientes}
                                    dataSource={dataPendientes}
                                    rowKey={(record) => record.lugar.id}
                                    loading={cargando}
                                    expandable={configExpansion}
                                    pagination={{ pageSize: 10 }}
                                />
                            )
                        },
                        {
                            key: "2",
                            label: (
                                <span style={{ fontWeight: 'bold' }}>
                  ⚠️ Sitios en Revisión ({dataRevision.length})
                </span>
                            ),
                            children: (
                                <Table
                                    columns={colsRevision}
                                    dataSource={dataRevision}
                                    rowKey={(record) => record.lugar.id}
                                    loading={cargando}
                                    expandable={configExpansion}
                                    pagination={{ pageSize: 10 }}
                                />
                            )
                        }
                    ]}
                />
            </Paper>
        </Box>
    );
};

export default ReportesAdmin;