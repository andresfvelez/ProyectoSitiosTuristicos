import React, { useState, useRef } from 'react';
import { Box, Typography, IconButton, Avatar } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';

interface SelectorImagenesProps {
    multiple?: boolean;
    cantidad?: number;
    label?: string;
    esPerfil?: boolean;
    onFilesChange: (files: (File | null)[]) => void;
}

const SelectorImagenes = ({
                              multiple = false,
                              cantidad = 1,
                              label = "Subir Imagen",
                              esPerfil = false,
                              onFilesChange
                          }: SelectorImagenesProps) => {
    const [previews, setPreviews] = useState<(string | null)[]>(new Array(cantidad).fill(null));
    const [archivos, setArchivos] = useState<(File | null)[]>(new Array(cantidad).fill(null));

    const manejarSeleccion = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const nuevasPrev = [...previews];
                const nuevosArchivos = [...archivos];

                nuevasPrev[index] = reader.result as string;
                nuevosArchivos[index] = file;

                setPreviews(nuevasPrev);
                setArchivos(nuevosArchivos);
                onFilesChange(nuevosArchivos); // Notifica al componente padre
            };
            reader.readAsDataURL(file);
        }
    };

    const eliminarImagen = (index: number) => {
        const nuevasPrev = [...previews];
        const nuevosArchivos = [...archivos];
        nuevasPrev[index] = null;
        nuevosArchivos[index] = null;
        setPreviews(nuevasPrev);
        setArchivos(nuevosArchivos);
        onFilesChange(nuevosArchivos);
    };

    return (
        <Box sx={{ mb: 3 }}>
            <Typography variant="body1" fontWeight="bold" sx={{ mb: 1 }}>{label}</Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                {previews.map((src, i) => (
                    <Box key={i} sx={{ position: 'relative' }}>
                        {esPerfil ? (
                            // DISEÑO PARA FOTO DE PERFIL
                            <Box sx={{ position: 'relative', width: 120, height: 120 }}>
                                <Avatar src={src || ""} sx={{ width: 120, height: 120, border: '2px solid #4dbce9' }} />
                                <label style={{ position: 'absolute', bottom: 0, right: 0, backgroundColor: '#4dbce9', borderRadius: '50%', padding: '5px', cursor: 'pointer', display: 'flex' }}>
                                    <input type="file" hidden accept="image/*" onChange={(e) => manejarSeleccion(i, e)} />
                                    <CloudUploadIcon sx={{ color: 'white', fontSize: 20 }} />
                                </label>
                            </Box>
                        ) : (
                            // DISEÑO PARA GALERÍA
                            <Box sx={{
                                width: 100, height: 100, border: '2px dashed #4dbce9', borderRadius: '15px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', bgcolor: '#f8fcfe'
                            }}>
                                {src ? (
                                    <>
                                        <img src={src} alt="prev" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        <IconButton size="small" onClick={() => eliminarImagen(i)} sx={{ position: 'absolute', top: -10, right: -10, bgcolor: 'white', boxShadow: 1 }}>
                                            <DeleteIcon fontSize="small" color="error" />
                                        </IconButton>
                                    </>
                                ) : (
                                    <label style={{ cursor: 'pointer', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <input type="file" hidden accept="image/*" onChange={(e) => manejarSeleccion(i, e)} />
                                        <CloudUploadIcon sx={{ color: "#4dbce9" }} />
                                    </label>
                                )}
                            </Box>
                        )}
                    </Box>
                ))}
            </Box>
        </Box>
    );
};

export default SelectorImagenes;