import React, { useState, useEffect } from 'react';
import { Box, Typography, IconButton, Avatar } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';

interface SelectorImagenesProps {
    multiple?: boolean;
    cantidad?: number;
    label?: string;
    esPerfil?: boolean;
    imagenInicial?: string | null;
    fotosExistentes?: string[];
    onEliminarFotoExistente?: (index: number) => void;
    onFilesChange: (files: File[]) => void;
}

// Resuelve la URL adecuada soportando Base64, blobs y URLs remotas
const getImagenSrc = (src: string): string => {
    if (!src) return "";
    if (src.startsWith('http') || src.startsWith('blob:') || src.startsWith('data:image')) {
        return src;
    }
    return `data:image/png;base64,${src}`;
};

const SelectorImagenes: React.FC<SelectorImagenesProps> = ({
                                                               multiple = true,
                                                               cantidad = 1,
                                                               label = "Subir Imagen",
                                                               esPerfil = false,
                                                               imagenInicial = null,
                                                               fotosExistentes = [],
                                                               onEliminarFotoExistente,
                                                               onFilesChange
                                                           }) => {
    const [previews, setPreviews] = useState<string[]>([]);
    const [archivos, setArchivos] = useState<File[]>([]);

    // Sincroniza la previsualización si se proporciona una imagen inicial persistida
    useEffect(() => {
        if (archivos.length === 0) {
            setPreviews(imagenInicial ? [imagenInicial] : []);
        }
    }, [imagenInicial, archivos.length]);

    const totalExistentes = fotosExistentes ? fotosExistentes.length : 0;
    const totalActual = totalExistentes + archivos.length;

    // Procesamiento y lectura de archivos seleccionados desde el dispositivo
    const manejarSeleccion = (e: React.ChangeEvent<HTMLInputElement>) => {
        const fileList = e.target.files;
        if (!fileList || fileList.length === 0) return;

        const filesArray = Array.from(fileList);
        const limiteEfectivo = esPerfil ? 1 : cantidad;
        const espacioDisponible = limiteEfectivo - totalActual;

        if (espacioDisponible <= 0) return;

        const nuevosArchivosAceptados = filesArray.slice(0, espacioDisponible);

        const promesasLectura = nuevosArchivosAceptados.map((file) => {
            return new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    resolve(typeof reader.result === 'string' ? reader.result : "");
                };
                reader.onerror = () => resolve("");
                reader.readAsDataURL(file);
            });
        });

        Promise.all(promesasLectura).then((nuevasPrevias) => {
            const previasFiltradas = nuevasPrevias.filter(Boolean);
            let actualizadosArchivos: File[];
            let actualizadasPrevias: string[];

            if (esPerfil) {
                actualizadosArchivos = nuevosArchivosAceptados;
                actualizadasPrevias = previasFiltradas;
            } else {
                actualizadosArchivos = [...archivos, ...nuevosArchivosAceptados];
                actualizadasPrevias = [...previews, ...previasFiltradas];
            }

            setArchivos(actualizadosArchivos);
            setPreviews(actualizadasPrevias);
            onFilesChange(actualizadosArchivos);
        });

        e.target.value = '';
    };

    // Eliminación de imágenes añadidas en la sesión actual
    const eliminarImagenNuevas = (index: number) => {
        const nuevosArchivos = archivos.filter((_, i) => i !== index);
        const nuevasPrevias = previews.filter((_, i) => i !== index);

        setArchivos(nuevosArchivos);
        setPreviews(nuevasPrevias);
        onFilesChange(nuevosArchivos);
    };

    return (
        <Box sx={{ mb: 3 }}>
            <Typography variant="body1" fontWeight="bold" sx={{ mb: 1, color: '#1e293b' }}>
                {label} {!esPerfil && cantidad > 1 && `(${totalActual}/${cantidad})`}
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                {esPerfil ? (
                    // Vista para fotografía de perfil de usuario
                    <Box sx={{ position: 'relative', width: 120, height: 120 }}>
                        <Avatar
                            src={previews[0] ? getImagenSrc(previews[0]) : ""}
                            sx={{ width: 120, height: 120, border: '2px solid #4dbce9', bgcolor: '#f1f5f9' }}
                        />
                        <label
                            style={{
                                position: 'absolute',
                                bottom: 0,
                                right: 0,
                                backgroundColor: '#4dbce9',
                                borderRadius: '50%',
                                padding: '8px',
                                cursor: 'pointer',
                                display: 'flex',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                            }}
                        >
                            <input type="file" hidden accept="image/*" onChange={manejarSeleccion} />
                            <CloudUploadIcon sx={{ color: 'white', fontSize: 20 }} />
                        </label>
                        {previews[0] && (
                            <IconButton
                                size="small"
                                onClick={() => eliminarImagenNuevas(0)}
                                sx={{
                                    position: 'absolute',
                                    top: 0,
                                    right: 0,
                                    bgcolor: 'white',
                                    boxShadow: 1,
                                    '&:hover': { bgcolor: '#ffebee' }
                                }}
                            >
                                <DeleteIcon fontSize="small" color="error" />
                            </IconButton>
                        )}
                    </Box>
                ) : (
                    // Galería multidestino (recursos existentes en base de datos + nuevas subidas)
                    <>
                        {fotosExistentes.map((src, i) => (
                            <Box key={`existente-${i}`} sx={{ position: 'relative', width: 100, height: 100 }}>
                                <Box
                                    sx={{
                                        width: '100%',
                                        height: '100%',
                                        borderRadius: '15px',
                                        overflow: 'hidden',
                                        border: '1px solid #e0e0e0',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                                    }}
                                >
                                    <img
                                        src={getImagenSrc(src)}
                                        alt={`Imagen existente ${i + 1}`}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                </Box>

                                {onEliminarFotoExistente && (
                                    <IconButton
                                        size="small"
                                        onClick={() => onEliminarFotoExistente(i)}
                                        sx={{
                                            position: 'absolute',
                                            top: -8,
                                            right: -8,
                                            bgcolor: 'white',
                                            boxShadow: 2,
                                            zIndex: 2,
                                            '&:hover': { bgcolor: '#ffebee' }
                                        }}
                                    >
                                        <DeleteIcon fontSize="small" color="error" />
                                    </IconButton>
                                )}
                            </Box>
                        ))}

                        {previews.map((src, i) => (
                            <Box key={`nueva-${i}`} sx={{ position: 'relative', width: 100, height: 100 }}>
                                <Box
                                    sx={{
                                        width: '100%',
                                        height: '100%',
                                        borderRadius: '15px',
                                        overflow: 'hidden',
                                        border: '1px solid #e0e0e0',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                                    }}
                                >
                                    <img
                                        src={getImagenSrc(src)}
                                        alt={`Vista previa local ${i + 1}`}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                </Box>

                                <IconButton
                                    size="small"
                                    onClick={() => eliminarImagenNuevas(i)}
                                    sx={{
                                        position: 'absolute',
                                        top: -8,
                                        right: -8,
                                        bgcolor: 'white',
                                        boxShadow: 2,
                                        zIndex: 2,
                                        '&:hover': { bgcolor: '#ffebee' }
                                    }}
                                >
                                    <DeleteIcon fontSize="small" color="error" />
                                </IconButton>
                            </Box>
                        ))}

                        {totalActual < cantidad && (
                            <Box
                                sx={{
                                    width: 100,
                                    height: 100,
                                    border: '2px dashed #4dbce9',
                                    borderRadius: '15px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    bgcolor: '#f8fcfe',
                                    transition: 'all 0.2s',
                                    '&:hover': { bgcolor: '#eef8fc', borderColor: '#30a2d1' }
                                }}
                            >
                                <label
                                    style={{
                                        cursor: 'pointer',
                                        width: '100%',
                                        height: '100%',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    <input
                                        type="file"
                                        hidden
                                        accept="image/*"
                                        multiple={multiple}
                                        onChange={manejarSeleccion}
                                    />
                                    <AddPhotoAlternateIcon sx={{ color: "#4dbce9", fontSize: 32, mb: 0.5 }} />
                                    <Typography variant="caption" color="primary" fontWeight="bold">
                                        {totalActual === 0 ? "Agregar" : "Más"}
                                    </Typography>
                                </label>
                            </Box>
                        )}
                    </>
                )}
            </Box>
        </Box>
    );
};

export default SelectorImagenes;