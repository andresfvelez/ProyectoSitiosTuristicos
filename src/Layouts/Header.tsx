import React, { useState, useEffect } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { AutoComplete, Input, Tooltip } from 'antd';
import { SearchOutlined, FilterOutlined } from '@ant-design/icons';
import "../Components/Pages/styles/Header.css";
import { useAuth } from "../auth/AuthProvider";
import { signOut } from 'firebase/auth';
import { auth } from "../firebase/firebaseConfig";
import { obtenerFotoPerfilUsuario, obtenerPerfilUsuario } from '../services/usuariosService';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import logoApp from '../Imagenes_referencia/logo.png';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import Divider from '@mui/material/Divider';
import Logout from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import FlagIcon from '@mui/icons-material/Flag';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import BuildIcon from '@mui/icons-material/Build';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';

import { EstadoConexion } from "./EstadoConexion";
import { DEFAULT_AVATAR } from './Images/defaulAvatar';
import { ModalRecomendacionesIA } from "../Components/Pages/Seccions/ModalRecomendacionesIa";

interface HeaderProps {
    sections: ReadonlyArray<{ title: string; url: string }>;
    availablePlaces: any[];
}

interface SugerenciaFiltro {
    value: string;
    tipo: 'tag' | 'lugar';
    id?: string;
    data?: any;
}

const SUGERENCIAS_IA: { value: string; tipo: 'tag' }[] = [
    { value: 'Clima Frío', tipo: 'tag' },
    { value: 'Clima Cálido', tipo: 'tag' },
    { value: 'Aventura', tipo: 'tag' },
    { value: 'Naturaleza', tipo: 'tag' },
    { value: 'Joya Oculta', tipo: 'tag' },
    { value: 'Presupuesto Bajo', tipo: 'tag' },
    { value: 'Acceso 4x4', tipo: 'tag' },
    { value: 'Viaje en Pareja', tipo: 'tag' },
];

const Headers: React.FC<HeaderProps> = ({ sections, availablePlaces }) => {
    const navigate = useNavigate();
    const { usuario, rol } = useAuth();

    const [options, setOptions] = useState<SugerenciaFiltro[]>([]);
    const [searchText, setSearchText] = useState<string>("");
    const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
    const [fotoPerfilUrl, setFotoPerfilUrl] = useState<string>(DEFAULT_AVATAR);
    const [modalIaAbierto, setModalIaAbierto] = useState<boolean>(false);
    const [perfilCompleto, setPerfilCompleto] = useState<boolean>(false);

    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);

    useEffect(() => {
        let isMounted = true;

        const cargarDatosUsuarioHeader = async () => {
            if (usuario?.uid) {
                try {
                    const [fotoData, perfilData] = await Promise.all([
                        obtenerFotoPerfilUsuario(usuario.uid),
                        obtenerPerfilUsuario(usuario.uid)
                    ]);

                    if (isMounted) {
                        if (fotoData && fotoData.base64) {
                            const src = fotoData.base64.startsWith("data:")
                                ? fotoData.base64
                                : `data:image/png;base64,${fotoData.base64}`;
                            setFotoPerfilUrl(src);
                        } else {
                            setFotoPerfilUrl(DEFAULT_AVATAR);
                        }

                        const estaCompleto = Boolean(perfilData && perfilData.perfilIncompleto === false);
                        setPerfilCompleto(estaCompleto);
                    }
                } catch {
                    if (isMounted) {
                        setFotoPerfilUrl(DEFAULT_AVATAR);
                        setPerfilCompleto(false);
                    }
                }
            } else {
                if (isMounted) {
                    setFotoPerfilUrl(DEFAULT_AVATAR);
                    setPerfilCompleto(false);
                }
            }
        };

        cargarDatosUsuarioHeader();
        window.addEventListener('perfilActualizado', cargarDatosUsuarioHeader);

        return () => {
            isMounted = false;
            window.removeEventListener('perfilActualizado', cargarDatosUsuarioHeader);
        };
    }, [usuario]);

    const onSearch = (value: string) => {
        setSearchText(value);

        if (!value.trim()) {
            setOptions([]);
            return;
        }

        const queryLower = value.toLowerCase().trim();

        const tagsIA: SugerenciaFiltro[] = (SUGERENCIAS_IA || [])
            .filter((item) => item?.value && item.value.toLowerCase().includes(queryLower))
            .map((item) => ({
                value: item.value,
                tipo: 'tag'
            }));

        const lugaresBD: SugerenciaFiltro[] = (availablePlaces || [])
            .filter((lugar) => lugar?.nombre && lugar.nombre.toLowerCase().includes(queryLower))
            .map((lugar) => ({
                value: lugar.nombre,
                id: lugar.id,
                tipo: 'lugar',
                data: lugar
            }));

        setOptions([...tagsIA, ...lugaresBD]);
    };

    const handleAvatarClick = (event: React.MouseEvent<HTMLElement>) => {
        if (usuario) {
            setAnchorEl(event.currentTarget);
        } else {
            navigate("/login");
        }
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    const handleCerrarSesion = async () => {
        try {
            handleMenuClose();
            setMobileMenuOpen(false);
            await signOut(auth);
            navigate("/login");
        } catch {
            navigate("/login");
        }
    };

    const handleSelect = (value: string, option: any) => {
        if (option.tipo === 'lugar') {
            const lugarId = option.id || option.data?.id;
            if (!lugarId) return;
            navigate(`/destino/${lugarId}`);
        } else {
            navigate(`/Destinos?filter=${encodeURIComponent(value)}`);
        }
    };

    const handlePressEnter = () => {
        navigate(`/Destinos?search=${encodeURIComponent(searchText)}`);
    };

    const irANavegacion = (url: string) => {
        setMobileMenuOpen(false);
        navigate(url);
    };

    return (
        <nav className="navbar navbar-expand-lg fixed-top custom-header">
            <div className="container-fluid d-flex align-items-center justify-content-between px-3 px-md-4">
                <div className="d-flex align-items-center">
                    <a className="navbar-brand d-flex align-items-center logo-text me-3 me-md-4" href="/" style={{ textDecoration: 'none' }}>
                        <img
                            src={logoApp}
                            alt="TurisCol"
                            style={{
                                height: '36px',
                                width: 'auto',
                                marginRight: '10px',
                                objectFit: 'contain'
                            }}
                        />
                        <span><span className="text-primary">TURIS</span>COL</span>
                    </a>

                    <div className="collapse navbar-collapse d-none d-lg-block">
                        <ul className="navbar-nav">
                            {sections.map((section) => (
                                <li className="nav-item" key={section.title}>
                                    <a className="nav-link nav-custom-link" href={section.url}>
                                        {section.title}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                <div className="d-none d-sm-block">
                    <EstadoConexion />
                </div>

                <div className="d-flex align-items-center gap-2 gap-md-3">
                    {usuario && perfilCompleto && (
                        <Button
                            variant="contained"
                            size="small"
                            onClick={() => setModalIaAbierto(true)}
                            startIcon={<AutoAwesomeIcon />}
                            className="d-none d-lg-inline-flex"
                            sx={{
                                background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                                color: '#ffffff',
                                borderRadius: '20px',
                                textTransform: 'none',
                                fontWeight: 'bold',
                                fontSize: '0.85rem',
                                px: 2,
                                py: 0.6,
                                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
                                '&:hover': {
                                    background: 'linear-gradient(135deg, #0369a1 0%, #1d4ed8 100%)',
                                }
                            }}
                        >
                            Para Ti (IA)
                        </Button>
                    )}

                    <div className="search-wrapper">
                        <AutoComplete
                            options={options}
                            onSelect={handleSelect}
                            onSearch={onSearch}
                            style={{ width: 180 }}
                            className="search-input-responsive"
                        >
                            <Input
                                size="middle"
                                placeholder="Buscar..."
                                onPressEnter={handlePressEnter}
                                prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
                                suffix={
                                    <Tooltip title="Búsqueda Inteligente">
                                        <FilterOutlined style={{ color: '#1890ff' }} />
                                    </Tooltip>
                                }
                                className="custom-search-input"
                            />
                        </AutoComplete>
                    </div>

                    <div
                        onClick={handleAvatarClick}
                        style={{ cursor: 'pointer' }}
                        className="profile-link-wrapper"
                    >
                        <div className="profile-section">
                            <div className="avatar-wrapper">
                                <img
                                    src={usuario ? fotoPerfilUrl : DEFAULT_AVATAR}
                                    alt={usuario ? "Perfil" : "Invitado"}
                                    className="avatar-img"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src = DEFAULT_AVATAR;
                                    }}
                                />
                                <span className={`status-dot ${usuario ? 'online' : ''}`}></span>
                            </div>
                        </div>
                    </div>

                    <IconButton
                        color="inherit"
                        onClick={() => setMobileMenuOpen(true)}
                        className="d-lg-none text-dark ms-1"
                        aria-label="Abrir menú de navegación"
                    >
                        <MenuIcon />
                    </IconButton>
                </div>
            </div>

            <Menu
                anchorEl={anchorEl}
                id="account-menu"
                open={open}
                onClose={handleMenuClose}
                onClick={handleMenuClose}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                PaperProps={{
                    elevation: 3,
                    sx: {
                        overflow: 'visible',
                        filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.15))',
                        mt: 1.5,
                        '& .MuiAvatar-root': { width: 32, height: 32, ml: -0.5, mr: 1 },
                        '&::before': {
                            content: '""',
                            display: 'block',
                            position: 'absolute',
                            top: 0,
                            right: 14,
                            width: 10,
                            height: 10,
                            bgcolor: 'background.paper',
                            transform: 'translateY(-50%) rotate(45deg)',
                            zIndex: 0,
                        },
                    },
                }}
            >
                <MenuItem component={RouterLink} to="/profile">
                    <ListItemIcon>
                        <PersonIcon fontSize="small" />
                    </ListItemIcon>
                    Mi Perfil
                </MenuItem>

                {rol === 'administrador' && (
                    <React.Fragment>
                        <MenuItem component={RouterLink} to="/admin/pendientes">
                            <ListItemIcon><HourglassTopIcon fontSize="small" color="warning" /></ListItemIcon>
                            Destinos Pendientes
                        </MenuItem>
                        <MenuItem component={RouterLink} to="/admin/reportes">
                            <ListItemIcon><FlagIcon fontSize="small" color="error" /></ListItemIcon>
                            Reportes
                        </MenuItem>
                        <MenuItem component={RouterLink} to="/admin/usuarios">
                            <ListItemIcon><ManageAccountsIcon fontSize="small" color="success" /></ListItemIcon>
                            Gestión de Usuarios
                        </MenuItem>
                        <MenuItem component={RouterLink} to="/admin/scrapper">
                            <ListItemIcon><BuildIcon fontSize="small" color="primary" /></ListItemIcon>
                            Scrapper / Migrador
                        </MenuItem>
                    </React.Fragment>
                )}

                <Divider />

                <MenuItem onClick={handleCerrarSesion} sx={{ color: 'error.main' }}>
                    <ListItemIcon>
                        <Logout fontSize="small" color="error" />
                    </ListItemIcon>
                    Cerrar Sesión
                </MenuItem>
            </Menu>

            <Drawer
                anchor="right"
                open={mobileMenuOpen}
                onClose={() => setMobileMenuOpen(false)}
            >
                <Box sx={{ width: 280, p: 2 }}>
                    <Box className="d-flex justify-content-between align-items-center mb-3">
                        <span className="fw-bold text-primary fs-5">TurisCol</span>
                        <IconButton onClick={() => setMobileMenuOpen(false)} aria-label="Cerrar navegación lateral">
                            <CloseIcon />
                        </IconButton>
                    </Box>
                    <Divider />

                    <List>
                        {usuario && perfilCompleto && (
                            <ListItem disablePadding sx={{ mb: 1 }}>
                                <ListItemButton
                                    onClick={() => {
                                        setMobileMenuOpen(false);
                                        setModalIaAbierto(true);
                                    }}
                                    sx={{
                                        borderRadius: '12px',
                                        background: 'linear-gradient(135deg, #e0f2fe 0%, #dbeafe 100%)'
                                    }}
                                >
                                    <ListItemIcon><AutoAwesomeIcon color="primary" /></ListItemIcon>
                                    <ListItemText
                                        primary="Recomendados para Ti"
                                        primaryTypographyProps={{ fontWeight: 'bold', color: '#0284c7' }}
                                    />
                                </ListItemButton>
                            </ListItem>
                        )}

                        {sections.map((sec) => (
                            <ListItem key={sec.title} disablePadding>
                                <ListItemButton onClick={() => irANavegacion(sec.url)}>
                                    <ListItemText primary={sec.title} />
                                </ListItemButton>
                            </ListItem>
                        ))}

                        {rol === 'administrador' && (
                            <React.Fragment>
                                <Divider sx={{ my: 1 }} />
                                <Box className="px-3 py-1">
                                    <span className="badge bg-danger">ADMINISTRADOR</span>
                                </Box>
                                <ListItem disablePadding>
                                    <ListItemButton onClick={() => irANavegacion("/admin/pendientes")}>
                                        <ListItemIcon><HourglassTopIcon color="warning" /></ListItemIcon>
                                        <ListItemText primary="Destinos Pendientes" />
                                    </ListItemButton>
                                </ListItem>
                                <ListItem disablePadding>
                                    <ListItemButton onClick={() => irANavegacion("/admin/reportes")}>
                                        <ListItemIcon><FlagIcon color="error" /></ListItemIcon>
                                        <ListItemText primary="Reportes" />
                                    </ListItemButton>
                                </ListItem>
                                <ListItem disablePadding>
                                    <ListItemButton onClick={() => irANavegacion("/admin/usuarios")}>
                                        <ListItemIcon><ManageAccountsIcon color="success" /></ListItemIcon>
                                        <ListItemText primary="Gestión de Usuarios" />
                                    </ListItemButton>
                                </ListItem>
                                <ListItem disablePadding>
                                    <ListItemButton onClick={() => irANavegacion("/admin/scrapper")}>
                                        <ListItemIcon><BuildIcon color="primary" /></ListItemIcon>
                                        <ListItemText primary="Scrapper" />
                                    </ListItemButton>
                                </ListItem>
                            </React.Fragment>
                        )}

                        <Divider sx={{ my: 1 }} />

                        {usuario ? (
                            <React.Fragment>
                                <ListItem disablePadding>
                                    <ListItemButton onClick={() => irANavegacion("/profile")}>
                                        <ListItemIcon><PersonIcon color="action" /></ListItemIcon>
                                        <ListItemText primary="Mi Perfil" />
                                    </ListItemButton>
                                </ListItem>
                                <ListItem disablePadding>
                                    <ListItemButton onClick={handleCerrarSesion}>
                                        <ListItemIcon><Logout color="error" /></ListItemIcon>
                                        <ListItemText primary="Cerrar Sesión" sx={{ color: 'error.main' }} />
                                    </ListItemButton>
                                </ListItem>
                            </React.Fragment>
                        ) : (
                            <ListItem disablePadding>
                                <ListItemButton onClick={() => irANavegacion("/login")}>
                                    <ListItemText primary="Iniciar Sesión" sx={{ color: '#1976d2', fontWeight: 'bold' }} />
                                </ListItemButton>
                            </ListItem>
                        )}
                    </List>
                </Box>
            </Drawer>

            <ModalRecomendacionesIA
                isOpen={modalIaAbierto}
                onClose={() => setModalIaAbierto(false)}
                userId={usuario?.uid}
            />
        </nav>
    );
};

export default Headers;