import React, { useState } from 'react';
import {
    Box, Typography, Grid, Paper, Stack, IconButton, Avatar
} from '@mui/material';
import { Button, Form, Input } from 'antd';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import LockIcon from '@mui/icons-material/Lock';
import { useNavigate } from "react-router-dom";

interface Comentario {
    usuario: string;
    comentario: string;
    puntuacion: number;
    imagenes?: string;
    fecha?: string;
}

interface SeccionComentariosProps {
    comentariosIniciales: Comentario[];
    usuarioLogueado: any;
    onEnviarComentario: (nuevoComentario: { puntuacion: number; comentario: string }) => void;
}

const SeccionComentarios = ({ comentariosIniciales, usuarioLogueado, onEnviarComentario }: SeccionComentariosProps) => {
    const [form] = Form.useForm();
    const navigate = useNavigate();
    const [starsUser, setStarsUser] = useState([false, false, false, false, false]);
    const [botonDeshabilitado, setBotonDeshabilitado] = useState(true);

    const validarFormulario = (estrellasActuales: boolean[]) => {
        const values = form.getFieldsValue();
        const tieneTexto = !!values.comentario && values.comentario.trim() !== "";
        const tieneEstrellas = estrellasActuales.some(s => s === true);

        setBotonDeshabilitado(!(tieneTexto && tieneEstrellas));
    };

    const manejarEstrellas = (index: number) => {
        const newStars = starsUser.map((_, i) => i <= index);
        setStarsUser(newStars);
        validarFormulario(newStars);
    };

    const manejarCambioValores = () => {
        validarFormulario(starsUser);
    };

    const ETIQUETAS_ESTRELLAS = ["Pésimo", "Regular", "Bueno", "Muy Bueno", "¡Excelente!"];
    const totalEstrellasSeleccionadas = starsUser.filter(Boolean).length;

    const alEnviar = () => {
        const puntuacion = starsUser.filter(Boolean).length;
        const { comentario } = form.getFieldsValue();
        onEnviarComentario({ puntuacion, comentario });
        form.resetFields();
        setStarsUser([false, false, false, false, false]);
        setBotonDeshabilitado(true);
    };

    return (
        <Box sx={{ mt: 10, mb: 5 }}>
            <Typography variant="h4" fontWeight="800" sx={{ mb: 4 }}>Comentarios</Typography>
            <Grid container spacing={4}>
                {/* Lado Izquierdo: Formulario */}
                <Grid item xs={12} md={5}>
                    <Paper sx={{ p: 4, borderRadius: "25px", border: "1px solid #eee", boxShadow: 'none' }}>
                        {usuarioLogueado ? (
                            <>
                                <Typography variant="h6" fontWeight="800" color="#0f172a" gutterBottom>
                                    Deja tu opinión
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                    ¿Cómo fue tu experiencia en este sitio?
                                </Typography>

                                {/* ⭐️ RATING */}
                                <Box sx={{ mb: 3 }}>
                                    <Stack direction="row" alignItems="center" spacing={0.5}>
                                        {starsUser.map((active, i) => (
                                            <IconButton
                                                key={i}
                                                onClick={() => manejarEstrellas(i)}
                                                sx={{
                                                    p: 0.5,
                                                    transition: "transform 0.1s",
                                                    "&:hover": { transform: "scale(1.15)" }
                                                }}
                                            >
                                                {active ? (
                                                    <StarIcon sx={{ fontSize: 30, color: "#f59e0b" }} />
                                                ) : (
                                                    <StarBorderIcon sx={{ fontSize: 30, color: "#cbd5e1" }} />
                                                )}
                                            </IconButton>
                                        ))}

                                        {totalEstrellasSeleccionadas > 0 && (
                                            <Typography
                                                variant="caption"
                                                fontWeight="800"
                                                sx={{
                                                    ml: 1,
                                                    color: "#d97706",
                                                    fontSize: "0.85rem"
                                                }}
                                            >
                                                {ETIQUETAS_ESTRELLAS[totalEstrellasSeleccionadas - 1]}
                                            </Typography>
                                        )}
                                    </Stack>
                                </Box>

                                {/* ✍️ TEXTAREA CON BORDE AZUL CONTINUO */}
                                <Form form={form} onValuesChange={manejarCambioValores} onFinish={alEnviar}>
                                    <Form.Item name="comentario" style={{ marginBottom: "20px" }}>
                                        <Input.TextArea
                                            rows={4}
                                            placeholder="Cuéntanos los detalles de tu visita, consejos sobre transporte, o qué fue lo que más te gustó..."
                                            style={{
                                                borderRadius: "20px",
                                                backgroundColor: "#f8fafc",
                                                fontSize: "0.95rem",
                                                border: "2px solid #38bdf8",
                                                padding: "12px 16px",
                                                outline: "none"
                                            }}
                                        />
                                    </Form.Item>

                                    <Button
                                        type="primary"
                                        size="large"
                                        block
                                        htmlType="submit"
                                        disabled={botonDeshabilitado}
                                        style={{
                                            borderRadius: "12px",
                                            height: "48px",
                                            fontWeight: "bold",
                                            fontSize: "0.95rem",
                                            backgroundColor: botonDeshabilitado ? "#e2e8f0" : "#0284c7"
                                        }}
                                    >
                                        Publicar Comentario
                                    </Button>
                                </Form>
                            </>
                        ) : (
                            <Box sx={{ textAlign: 'center', py: 2 }}>
                                <LockIcon sx={{ fontSize: 48, color: '#0ea5e9', mb: 1.5 }} />
                                <Typography variant="h6" fontWeight="bold" gutterBottom>
                                    ¿Conoces este sitio?
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                                    Inicia sesión para compartir tu experiencia con la comunidad y calificar el lugar.
                                </Typography>
                                <Button
                                    type="primary"
                                    size="large"
                                    block
                                    onClick={() => navigate('/login')}
                                    style={{ borderRadius: "10px", height: "50px", fontWeight: "bold" }}
                                >
                                    Iniciar Sesión
                                </Button>
                            </Box>
                        )}
                    </Paper>
                </Grid>

                {/* Lado Derecho: Lista de Comentarios */}
                <Grid item xs={12} md={7}>
                    <Stack spacing={3}>
                        {comentariosIniciales.map((c, i) => (
                            <Paper key={i} sx={{ p: 3, borderRadius: "20px", border: "1px solid #f0f0f0", boxShadow: 'none' }}>
                                <Stack direction="row" spacing={2} alignItems="center">
                                    <Avatar
                                        src={c.imagenes ? `data:image/png;base64,${c.imagenes}` : undefined}
                                        sx={{ bgcolor: "#4dbce9" }}
                                    >
                                        {c.usuario ? c.usuario[0] : "?"}
                                    </Avatar>
                                    <Box sx={{ flex: 1 }}>
                                        <Stack direction="row" justifyContent="space-between">
                                            <Typography fontWeight="bold">{c.usuario}</Typography>
                                            <Typography variant="caption" color="primary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                {c.puntuacion} <StarIcon fontSize="inherit" />
                                            </Typography>
                                        </Stack>
                                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                            {c.comentario}
                                        </Typography>
                                    </Box>
                                </Stack>
                            </Paper>
                        ))}
                    </Stack>
                </Grid>
            </Grid>
        </Box>
    );
};

export default SeccionComentarios;