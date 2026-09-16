import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, Stack, Tooltip } from '@mui/material';
import { Table, Button, message, Popconfirm, Tag, Select, Modal, Input, InputNumber } from 'antd';

// Iconos
import PeopleIcon from '@mui/icons-material/People';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import BlockIcon from '@mui/icons-material/Block';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import SaveIcon from '@mui/icons-material/Save';

import {
    gestionarEstadoUsuario,
    obtenerTodosLosUsuarios,
    cambiarRolUsuario
} from '../../services/usuariosService';
import { UserProfileData, RolUsuario } from '../../Components/models/Usuarios';
import { guardarLimiteReportes, obtenerLimiteReportes } from "../../services/lugaresService";

const UsuariosAdmin = () => {
    const [usuarios, setUsuarios] = useState<UserProfileData[]>([]);
    const [cargando, setCargando] = useState<boolean>(true);
    const [busqueda, setBusqueda] = useState<string>('');

    // ⚙️ Estados para la configuración de reportes
    const [limiteReportes, setLimiteReportes] = useState<number>(3);
    const [guardandoLimite, setGuardandoLimite] = useState<boolean>(false);

    // Estado para el Modal de Suspensión / Baneo
    const [modalVisible, setModalVisible] = useState<boolean>(false);
    const [usuarioSeleccionado, setUsuarioSeleccionado] = useState<UserProfileData | null>(null);
    const [tipoAccionModal, setTipoAccionModal] = useState<'suspender' | 'banear'>('suspender');
    const [diasSuspension, setDiasSuspension] = useState<number>(3);
    const [motivo, setMotivo] = useState<string>('');

    const cargarDatos = async () => {
        setCargando(true);
        const [lista, limite] = await Promise.all([
            obtenerTodosLosUsuarios(),
            obtenerLimiteReportes()
        ]);
        setUsuarios(lista);
        setLimiteReportes(limite);
        setCargando(false);
    };

    useEffect(() => {
        cargarDatos();
    }, []);

    // 💾 Guardar nuevo umbral de reportes
    const handleGuardarLimite = async () => {
        setGuardandoLimite(true);
        const exito = await guardarLimiteReportes(limiteReportes);
        if (exito) {
            message.success("Umbral de alerta por reportes guardado en Firestore.");
        } else {
            message.error("Error al guardar el umbral de reportes.");
        }
        setGuardandoLimite(false);
    };

    const usuariosFiltrados = usuarios.filter((usuario) => {
        const termino = busqueda.toLowerCase().trim();
        const nombre = (usuario.fullName || '').toLowerCase();
        const correo = (usuario.email || '').toLowerCase();
        return nombre.includes(termino) || correo.includes(termino);
    });

    const handleCambiarRol = async (uid: string, nuevoRol: RolUsuario) => {
        const exito = await cambiarRolUsuario(uid, nuevoRol);
        if (exito) {
            message.success("Rol de usuario actualizado correctamente.");
            cargarDatos();
        } else {
            message.error("Error al actualizar el rol.");
        }
    };

    const handleActivar = async (uid: string) => {
        const exito = await gestionarEstadoUsuario(uid, 'activar');
        if (exito) {
            message.success("La cuenta del usuario ha sido reactivada.");
            cargarDatos();
        } else {
            message.error("Error al reactivar la cuenta.");
        }
    };

    const abrirModalSancion = (usuario: UserProfileData, accion: 'suspender' | 'banear') => {
        setUsuarioSeleccionado(usuario);
        setTipoAccionModal(accion);
        setDiasSuspension(3);
        setMotivo('');
        setModalVisible(true);
    };

    const handleConfirmarSancion = async () => {
        const uid = usuarioSeleccionado?.uid;
        if (!uid) return;

        const exito = await gestionarEstadoUsuario(uid, tipoAccionModal, {
            diasSuspension: tipoAccionModal === 'suspender' ? diasSuspension : undefined,
            motivo: motivo || (tipoAccionModal === 'suspender' ? 'Suspensión temporal' : 'Violación de políticas')
        });

        if (exito) {
            message.warning(`El usuario ha sido ${tipoAccionModal === 'suspender' ? 'suspendido' : 'baneado permanentemente'}.`);
            setModalVisible(false);
            cargarDatos();
        } else {
            message.error("Error al aplicar la sanción.");
        }
    };

    // -- COLUMNAS CON ANCHOS MÍNIMOS EN PX PARA EVITAR DEFORMACIÓN EN MÓVIL --
    const columnas = [
        {
            title: 'Usuario',
            key: 'usuario',
            width: 220,
            render: (_: any, record: UserProfileData) => (
                <Box sx={{ pr: 1 }}>
                    <Typography variant="subtitle2" fontWeight="800" sx={{ color: '#1e293b', wordBreak: 'break-word' }}>
                        {record.fullName || 'Usuario sin nombre'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-all', display: 'block' }}>
                        {record.email}
                    </Typography>
                </Box>
            ),
        },
        {
            title: 'Rol',
            key: 'rol',
            width: 150,
            render: (_: any, record: UserProfileData) => (
                <Select
                    value={(record.rol as RolUsuario) || 'turista'}
                    onChange={(nuevoRol) => handleCambiarRol(record.uid!, nuevoRol)}
                    style={{ width: 130 }}
                    options={[
                        { value: 'turista', label: 'Turista' },
                        { value: 'administrador', label: 'Administrador' }
                    ]}
                />
            ),
        },
        {
            title: 'Estado de Cuenta',
            key: 'estado',
            width: 180,
            render: (_: any, record: UserProfileData) => {
                const estado = record.estado || 'activo';

                if (estado === 'activo') {
                    return <Tag color="success" style={{ fontWeight: 'bold' }}>ACTIVO</Tag>;
                }

                if (estado === 'suspendido') {
                    const fechaExp = record.bloqueadoHasta
                        ? new Date(record.bloqueadoHasta).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
                        : 'N/A';

                    return (
                        <Tooltip title={`Sancionado hasta: ${fechaExp} - Motivo: ${record.motivoSancion || 'Sin especificar'}`}>
                            <Tag color="warning" style={{ fontWeight: 'bold' }}>
                                SUSPENDIDO ({fechaExp})
                            </Tag>
                        </Tooltip>
                    );
                }

                return (
                    <Tooltip title={`Motivo: ${record.motivoSancion || 'Violación de políticas'}`}>
                        <Tag color="error" style={{ fontWeight: 'bold' }}>
                            BANEADO DEFINITIVO
                        </Tag>
                    </Tooltip>
                );
            },
        },
        {
            title: 'Acciones de Control',
            key: 'acciones',
            width: 220,
            render: (_: any, record: UserProfileData) => {
                const estado = record.estado || 'activo';

                return (
                    <Stack direction="row" spacing={1.5}>
                        {estado !== 'activo' ? (
                            <Popconfirm
                                title="¿Reactivar cuenta de usuario?"
                                description="Se eliminarán las sanciones actuales y el usuario podrá ingresar de nuevo."
                                onConfirm={() => handleActivar(record.uid!)}
                                okText="Sí, Activar"
                                cancelText="Cancelar"
                                placement="bottomRight"
                                overlayStyle={{ maxWidth: '280px' }}
                            >
                                <Button style={{ color: '#16a34a', borderColor: '#16a34a', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                    <CheckCircleOutlineIcon style={{ fontSize: 18 }} /> Activar
                                </Button>
                            </Popconfirm>
                        ) : (
                            <>
                                <Button
                                    style={{ color: '#d97706', borderColor: '#d97706', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                    onClick={() => abrirModalSancion(record, 'suspender')}
                                >
                                    <WarningAmberIcon style={{ fontSize: 18 }} /> Suspender
                                </Button>
                                <Button
                                    danger
                                    style={{ borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                    onClick={() => abrirModalSancion(record, 'banear')}
                                >
                                    <BlockIcon style={{ fontSize: 18 }} /> Banear
                                </Button>
                            </>
                        )}
                    </Stack>
                );
            },
        },
    ];

    return (
        <Box sx={{ p: { xs: 1.5, sm: 3, md: 4 }, bgcolor: "#f1f5f9", minHeight: "100vh", overflowX: "hidden" }}>
            <Paper sx={{ p: { xs: 2, sm: 3, md: 4 }, borderRadius: { xs: "16px", sm: "20px" }, boxShadow: "0 10px 30px rgba(0,0,0,0.05)" }}>

                {/* 🔔 SECCIÓN SUPERIOR: CONFIGURACIÓN DE UMBRAL DE REPORTES RESPONSIVA */}
                <Paper
                    elevation={0}
                    sx={{
                        p: { xs: 2, sm: 2.5 },
                        mb: 4,
                        bgcolor: '#f8fafc',
                        borderRadius: '14px',
                        border: '1px solid #e2e8f0'
                    }}
                >
                    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2}>
                        <Stack direction="row" alignItems="center" spacing={1.5}>
                            <NotificationsActiveIcon sx={{ color: '#d97706', fontSize: { xs: 24, sm: 28 } }} />
                            <Box>
                                <Typography variant="subtitle1" fontWeight="700" color="#1e293b" sx={{ fontSize: { xs: "0.95rem", sm: "1rem" } }}>
                                    Umbral de Alerta de Reportes
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.78rem" }}>
                                    Define la cantidad mínima de reportes para notificar o alertar al administrador sobre un sitio o usuario.
                                </Typography>
                            </Box>
                        </Stack>

                        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ width: { xs: '100%', sm: 'auto' }, justifyContent: { xs: 'space-between', sm: 'flex-end' } }}>
                            <InputNumber
                                min={1}
                                max={50}
                                value={limiteReportes}
                                onChange={(val) => setLimiteReportes(val || 1)}
                                style={{ width: 80 }}
                            />
                            <Button
                                type="primary"
                                loading={guardandoLimite}
                                onClick={handleGuardarLimite}
                                style={{ borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#0284c7' }}
                            >
                                <SaveIcon style={{ fontSize: 16 }} /> Guardar
                            </Button>
                        </Stack>
                    </Stack>
                </Paper>

                {/* ENCABEZADO DE MÓDULO */}
                <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2} sx={{ mb: 4 }}>
                    <Stack direction="row" alignItems="center" spacing={2}>
                        <PeopleIcon sx={{ fontSize: { xs: 28, sm: 36 }, color: "#0284c7" }} />
                        <Box>
                            <Typography variant="h5" fontWeight="800" sx={{ fontSize: { xs: "1.25rem", sm: "1.5rem" } }}>Gestión de Usuarios</Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: "0.82rem", sm: "0.875rem" } }}>
                                Administra el rol de los usuarios, el estado de acceso de las cuentas de usuarios y aplica suspensiones o baneos.
                            </Typography>
                        </Box>
                    </Stack>

                    <Input.Search
                        placeholder="Buscar por nombre o correo..."
                        allowClear
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        style={{ width: '100%', maxWidth: 320 }}
                    />
                </Stack>

                <Table
                    columns={columnas}
                    dataSource={usuariosFiltrados}
                    rowKey={(record) => record.uid || Math.random().toString()}
                    loading={cargando}
                    pagination={{ pageSize: 10, responsive: true }}
                    scroll={{ x: 'max-content' }}
                />

                <Modal
                    title={tipoAccionModal === 'suspender' ? "⚠️ Suspender Usuario Temporalmente" : "⛔ Banear Usuario Definitivamente"}
                    open={modalVisible}
                    onOk={handleConfirmarSancion}
                    onCancel={() => setModalVisible(false)}
                    okText={tipoAccionModal === 'suspender' ? "Aplicar Suspensión" : "Confirmar Baneo"}
                    okButtonProps={{ danger: tipoAccionModal === 'banear' }}
                    cancelText="Cancelar"
                    width="92%"
                    style={{ maxWidth: 480 }}
                >
                    <Box sx={{ py: 2 }}>
                        <Typography variant="body2" sx={{ mb: 2 }}>
                            Afectando a: <strong>{usuarioSeleccionado?.fullName}</strong> ({usuarioSeleccionado?.email})
                        </Typography>

                        {tipoAccionModal === 'suspender' && (
                            <Box sx={{ mb: 2 }}>
                                <Typography variant="caption" fontWeight="bold" display="block" sx={{ mb: 0.5 }}>
                                    Días de Suspensión:
                                </Typography>
                                <InputNumber
                                    min={1}
                                    max={365}
                                    value={diasSuspension}
                                    onChange={(value) => setDiasSuspension(value || 1)}
                                    style={{ width: '100%' }}
                                />
                            </Box>
                        )}

                        <Box>
                            <Typography variant="caption" fontWeight="bold" display="block" sx={{ mb: 0.5 }}>
                                Motivo de la Sanción:
                            </Typography>
                            <Input.TextArea
                                rows={3}
                                placeholder="Escribe la razón por la cual se aplica esta sanción..."
                                value={motivo}
                                onChange={(e) => setMotivo(e.target.value)}
                            />
                        </Box>
                    </Box>
                </Modal>

            </Paper>
        </Box>
    );
};

export default UsuariosAdmin;