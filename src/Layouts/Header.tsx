import React, { useState, useEffect } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { AutoComplete, Input, Tooltip } from 'antd';
import { SearchOutlined, FilterOutlined } from '@ant-design/icons';
import "../Components/Pages/styles/Header.css";
import { useAuth } from "../auth/AuthProvider";
import { signOut } from 'firebase/auth';
import { auth } from "../firebase/firebaseConfig";
import { obtenerFotoPerfilUsuario } from '../services/usuariosService';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import Divider from '@mui/material/Divider';
import Logout from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import { EstadoConexion } from "./EstadoConexion";
import { DEFAULT_AVATAR } from './Images/defaulAvatar';

interface HeaderProps {
    sections: ReadonlyArray<{ title: string; url: string; }>;
    availablePlaces: any[];
}

const SUGERENCIAS_IA = [
    { value: 'Clima Frío', tipo: 'tag' },
    { value: 'Clima Cálido', tipo: 'tag' },
    { value: 'Aventura', tipo: 'tag' },
    { value: 'Naturaleza', tipo: 'tag' },
    { value: 'Joya Oculta', tipo: 'tag' },
    { value: 'Presupuesto Bajo', tipo: 'tag' },
    { value: 'Acceso 4x4', tipo: 'tag' },
    { value: 'Viaje en Pareja', tipo: 'tag' },
];

function Headers({ sections, availablePlaces }: HeaderProps) {
    const navigate = useNavigate();
    const [options, setOptions] = useState<any[]>([]);
    const [searchText, setSearchText] = useState("");
    const { usuario, rol } = useAuth();

    // 🖼️ Estado para controlar la URL o base64 de la foto de perfil activa
    const [fotoPerfilUrl, setFotoPerfilUrl] = useState<string>(DEFAULT_AVATAR);

    // 🔄 Cargar dinámicamente la foto de perfil desde Firestore al detectar un usuario activo
    useEffect(() => {
        const cargarFotoHeader = async () => {
            if (usuario?.uid) {
                try {
                    const fotoData = await obtenerFotoPerfilUsuario(usuario.uid);
                    if (fotoData && fotoData.base64) {
                        const src = fotoData.base64.startsWith("data:")
                            ? fotoData.base64
                            : `data:image/png;base64,${fotoData.base64}`;
                        setFotoPerfilUrl(src);
                    } else {
                        setFotoPerfilUrl(DEFAULT_AVATAR);
                    }
                } catch (error) {
                    console.error("Error al obtener la foto de perfil en el Header:", error);
                    setFotoPerfilUrl(DEFAULT_AVATAR);
                }
            } else {
                setFotoPerfilUrl(DEFAULT_AVATAR);
            }
        };

        cargarFotoHeader();

        // 🔔 Escuchar la señal de actualización
        window.addEventListener('perfilActualizado', cargarFotoHeader);

        return () => {
            window.removeEventListener('perfilActualizado', cargarFotoHeader);
        };
    }, [usuario]);

    const onSearch = (value: string) => {
        setSearchText(value);

        if (!value) {
            setOptions([]);
            return;
        }

        const queryLower = value.toLowerCase();

        const tagsIA = (SUGERENCIAS_IA || [])
            .filter(item => item?.value && item.value.toLowerCase().includes(queryLower))
            .map(item => ({
                value: item.value,
                tipo: 'tag'
            }));

        const lugaresBD = (availablePlaces || [])
            .filter(lugar => lugar?.nombre && lugar.nombre.toLowerCase().includes(queryLower))
            .map(lugar => ({
                value: lugar.nombre,
                id: lugar.id,
                tipo: 'lugar',
                data: lugar
            }));

        setOptions([...tagsIA, ...lugaresBD]);
    };

    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);

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
            await signOut(auth);
            console.log("🔒 Sesión destruida correctamente.");
            navigate("/login");
        } catch (error) {
            console.error("❌ Error al cerrar sesión:", error);
        }
    };

    const handleSelect = (value: string, option: any) => {
        if (option.tipo === 'lugar') {
            const lugarId = option.id || option.data?.id;

            if (!lugarId) {
                console.error("El lugar seleccionado no contiene un ID válido:", option);
                return;
            }

            navigate(`/pagina2/${lugarId}`);
        } else {
            navigate(`/Destinos?filter=${encodeURIComponent(value)}`);
        }
    };

    const handlePressEnter = () => {
        navigate(`/Destinos?search=${encodeURIComponent(searchText)}`);
    };

    return (
        <nav className="navbar navbar-expand-lg fixed-top custom-header">
            <div className="container-fluid d-flex align-items-center justify-content-between px-4">
                <div className="d-flex align-items-center">
                    <a className="navbar-brand logo-text me-4" href="/">
                        COL<span className="text-primary">EXPLORE</span>
                    </a>
                    <div className="collapse navbar-collapse d-none d-lg-block">
                        <ul className="navbar-nav">
                            {sections.map((section) => (
                                <li className="nav-item" key={section.title}>
                                    <a className="nav-link nav-custom-link" href={section.url}>{section.title}</a>
                                </li>
                            ))}
                            {rol === 'administrador' && (
                                <li className="nav-item ms-3 border-start ps-3 d-flex align-items-center gap-2">
                                    <span className="badge bg-danger me-1" style={{ fontSize: '0.65rem' }}>ADMIN</span>

                                    <RouterLink
                                        to="/admin-panel"
                                        className="btn btn-sm btn-warning text-dark fw-bold d-flex align-items-center gap-1"
                                        style={{ borderRadius: '20px', fontSize: '0.8rem' }}
                                    >
                                        ⏳ Pendientes
                                    </RouterLink>

                                    <RouterLink
                                        to="/admin/scrapper"
                                        className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
                                        style={{ borderRadius: '20px', fontSize: '0.8rem' }}
                                    >
                                        🤖 Scrapper
                                    </RouterLink>

                                    <RouterLink
                                        to="/admin/reportes"
                                        className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
                                        style={{ borderRadius: '20px', fontSize: '0.8rem' }}
                                    >
                                        📊 Reportes
                                    </RouterLink>
                                </li>
                            )}
                        </ul>
                    </div>
                </div>
                <EstadoConexion />
                <div className="d-flex align-items-center gap-3">
                    <div className="search-wrapper">
                        <AutoComplete
                            options={options}
                            onSelect={handleSelect}
                            onSearch={onSearch}
                            style={{ width: 250 }}
                        >
                            <Input
                                size="middle"
                                placeholder="Buscar lugar o clima..."
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

                    {/* 👤 Contenedor dinámico del avatar */}
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
                                    content: '""', display: 'block', position: 'absolute', top: 0, right: 14,
                                    width: 10, height: 10, bgcolor: 'background.paper', transform: 'translateY(-50%) rotate(45deg)',
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
                            <MenuItem component={RouterLink} to="/admin-panel">
                                <ListItemIcon>
                                    <AdminPanelSettingsIcon fontSize="small" color="primary" />
                                </ListItemIcon>
                                Panel de Control Admin
                            </MenuItem>
                        )}
                        <Divider />

                        <MenuItem onClick={handleCerrarSesion} sx={{ color: 'error.main' }}>
                            <ListItemIcon>
                                <Logout fontSize="small" color="error" />
                            </ListItemIcon>
                            Cerrar Sesión
                        </MenuItem>
                    </Menu>
                </div>
            </div>
        </nav>
    );
}

export default Headers;