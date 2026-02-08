import React, { useState } from 'react';
import {
    Box, Typography, Grid, Paper, Stack, IconButton, TextField, Avatar
} from '@mui/material';
import { Button, Form } from 'antd'; // Manteniendo el mix con Ant Design que usas
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';

// Definimos la estructura de un comentario para TypeScript
interface Comentario {
    usuario: string;
    comentario: string;
    puntuacion: number;
    imagenes?: string;
}

interface SeccionComentariosProps {
    comentariosIniciales: Comentario[];
    onEnviarComentario: (nuevoComentario: { puntuacion: number; comentario: string }) => void;
}

const SeccionComentarios = ({ comentariosIniciales, onEnviarComentario }: SeccionComentariosProps) => {
    const [form] = Form.useForm();
    const [starsUser, setStarsUser] = useState([false, false, false, false, false]);
    const [botonDeshabilitado, setBotonDeshabilitado] = useState(true);

    // Lógica de las estrellas
    const manejarEstrellas = (index: number) => {
        const newStars = starsUser.map((_, i) => i <= index);
        setStarsUser(newStars);
    };

    const manejarCambioValores = () => {
        const values = form.getFieldsValue();
        const tieneTexto = !!values.comentario && values.comentario.trim() !== "";
        const tieneEstrellas = starsUser.some(s => s === true);
        setBotonDeshabilitado(!(tieneTexto && tieneEstrellas));
    };

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
                        <Typography variant="h6" fontWeight="bold" gutterBottom>Deja tu opinión</Typography>
                        <Stack direction="row" sx={{ mb: 2 }}>
                            {starsUser.map((active, i) => (
                                <IconButton key={i} onClick={() => { manejarEstrellas(i); manejarCambioValores(); }}>
                                    {active ? <StarIcon color="primary" /> : <StarBorderIcon color="primary" />}
                                </IconButton>
                            ))}
                        </Stack>
                        <Form form={form} onValuesChange={manejarCambioValores} onFinish={alEnviar}>
                            <Form.Item name="comentario">
                                <TextField fullWidth multiline rows={4} placeholder="Cuéntanos tu experiencia..." />
                            </Form.Item>
                            <Button
                                type="primary"
                                size="large"
                                block
                                htmlType="submit"
                                disabled={botonDeshabilitado}
                                style={{ borderRadius: "10px", height: "50px", fontWeight: "bold" }}
                            >
                                Enviar Comentario
                            </Button>
                        </Form>
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