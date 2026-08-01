import React, { useState } from 'react';
import { Link as RouterLink,useNavigate } from 'react-router-dom';
import { AutoComplete, Input, Tooltip } from 'antd';
import { SearchOutlined, FilterOutlined } from '@ant-design/icons';
import { imgPerfil } from "../Layouts/Images/imagenPerfilPrueba";
import "../Components/Pages/styles/Header.css";
import {useAuth} from "../auth/AuthProvider";
import User from './Images/user.png';
import { signOut } from 'firebase/auth';
import {db,auth} from "../firebase/firebaseConfig";
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import Divider from '@mui/material/Divider';
import Logout from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import {EstadoConexion} from "./EstadoConexion";
interface HeaderProps {
    sections: ReadonlyArray<{ title: string; url: string; }>;
    availablePlaces: any[]; // Los lugares que traes de Firebase
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
    const [isLoggedIn] = useState<boolean>(true);
    const [options, setOptions] = useState<any[]>([]);
    const [searchText, setSearchText] = useState("");
    const { usuario, rol } = useAuth();
    // --- AQUÍ SE HACE LA BÚSQUEDA ---
    const onSearch = (value: string) => {
        setSearchText(value);

        if (!value) {
            setOptions([]);
            return;
        }

        const queryLower = value.toLowerCase();

        // 1. Filtrar Sugerencias IA (Protegido si un item no tiene 'value')
        const tagsIA = (SUGERENCIAS_IA || [])
            .filter(item => item?.value && item.value.toLowerCase().includes(queryLower))
            .map(item => ({
                value: item.value,
                tipo: 'tag'
            }));

        // 2. Filtrar Lugares de la BD (Protegido si un lugar no tiene 'nombre')
        const lugaresBD = (availablePlaces || [])
            .filter(lugar => lugar?.nombre && lugar.nombre.toLowerCase().includes(queryLower))
            .map(lugar => ({
                value: lugar.nombre,
                id: lugar.id,
                tipo: 'lugar',
                data: lugar
            }));

        // Combinamos ambos resultados
        setOptions([...tagsIA, ...lugaresBD]);
    };

    // Estado para controlar la apertura y posición del menú flotante de MUI
    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);

    // Abre el menú al dar clic en el avatar (solo si está logueado)
    const handleAvatarClick = (event: React.MouseEvent<HTMLElement>) => {
        if (usuario) {
            setAnchorEl(event.currentTarget);
        } else {
            // Si no está logueado, lo mandamos directo al login al dar clic
            navigate("/login");
        }
    };

    // Cierra el menú visualmente
    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    // 🔥 LÓGICA DE CIERRE DE SESIÓN BASE DE FIREBASE
    const handleCerrarSesion = async () => {
        try {
            handleMenuClose();
            await signOut(auth); // Le ordena a Firebase limpiar los tokens del LocalStorage
            console.log("🔒 Sesión destruida correctamente.");
            navigate("/login"); // Redirección inmediata a la pantalla pública
        } catch (error) {
            console.error("❌ Error al cerrar sesión:", error);
        }
    };


    const handleSelect = (value: string, option: any) => {
        if (option.tipo === 'lugar') {
            // Obtenemos el ID del lugar de forma segura (soporta option.id u option.data.id)
            const lugarId = option.id || option.data?.id;

            if (!lugarId) {
                console.error("El lugar seleccionado no contiene un ID válido:", option);
                return;
            }

            // Navegamos dinámicamente a la ruta con el ID.
            // React Router refrescará automáticamente los datos sin recargar el navegador.
            navigate(`/pagina2/${lugarId}`);
        } else {
            // Si es una etiqueta IA, vamos a la página de destinos con el filtro
            navigate(`/Destinos?filter=${encodeURIComponent(value)}`);
        }
    };

    const handlePressEnter = () => {
        // Al presionar Enter, llevamos el texto a la página de búsqueda general
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
                                onPressEnter={handlePressEnter} // Captura el ENTER
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


                    {/* El contenedor principal ahora maneja el clic inteligente */}
                    <div
                        onClick={handleAvatarClick}
                        style={{ cursor: 'pointer' }}
                        className="profile-link-wrapper"
                    >
                        {usuario ? (
                            <div className="profile-section">
                                <div className="avatar-wrapper">
                                    <img src={`data:image/png;base64,${imgPerfil}`} alt="Perfil" className="avatar-img" />
                                    <span className="status-dot"></span>
                                </div>
                            </div>
                        ) : (
                            <div className="profile-section">
                                <div className="avatar-wrapper">
                                    <img src={User} alt="Invitado" className="avatar-img" />
                                    <span className="status-dot"></span>
                                </div>
                            </div>
                        )}
                    </div>
                    {/* 🔥 COMPONENTE MENÚ FLOTANTE DE MATERIAL UI */}
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
                                '&::before': { // Esta es la pestañita triangular pequeña que apunta al avatar
                                    content: '""', display: 'block', position: 'absolute', top: 0, right: 14,
                                    width: 10, height: 10, bgcolor: 'background.paper', transform: 'translateY(-50%) rotate(45deg)',
                                    zIndex: 0,
                                },
                            },
                        }}
                    >
                        {/* Opción 1: Navegar al perfil usando el RouterLink integrado */}
                        <MenuItem component={RouterLink} to="/profile">
                            <ListItemIcon>
                                <PersonIcon fontSize="small" />
                            </ListItemIcon>
                            Mi Perfil
                        </MenuItem>

                        <Divider />

                        {/* Opción 2: Disparador del método de cierre de sesión de Firebase */}
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