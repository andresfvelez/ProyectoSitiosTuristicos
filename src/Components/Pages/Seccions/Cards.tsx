import {useEffect, useMemo, useState} from "react";
import {useNavigate} from "react-router-dom";
import {Modal} from "antd"; // Importamos el Modal de Ant Design
import LocationOnIcon from "@mui/icons-material/LocationOn";
import FavoriteIcon from "@mui/icons-material/Favorite";
import StarIcon from "@mui/icons-material/Star";
import VisibilityIcon from "@mui/icons-material/Visibility";

// Estilos
import "../styles/Cards.css";
import imgGuatape from "../../../Layouts/Images/Banner.png";
import {LugarTuristico} from "../../models/LugarTuristico";

export default function FeaturedPost(props: FeaturedPostProps) {
    const {post, ventana, sub} = props;
    const [filtroModal, setFiltroModal] = useState<string>("");  // Estado para controlar el Popup
    const [renderizar, setrenderizar] = useState<boolean>(false);
    const navigate = useNavigate();
    const [fotoActual, setFotoActual] = useState(0);
    // Función para manejar la navegación desde el modal
    const handleNavigation = () => {
        localStorage.setItem("seleccionado", JSON.stringify(post))
        if (!post?.id) {
            console.error("El objeto post no tiene un ID válido:", post);
            return;
        }
        if (ventana === "lugar") {
            localStorage.setItem("origen", "lugar");
            navigate("/Mapa");
        } else {
            // 👇 Redirigimos pasando el ID directamente en la URL
            navigate(`/pagina2/${post.id}`);
        }
    };
    const imagenAleatoriaFija = useMemo(() => {
        if (post.imagenes && post.imagenes.length > 0) {
            const indice = Math.floor(Math.random() * post.imagenes.length);
            return post.imagenes[indice];
        }
        return imgGuatape;
    }, [post.imagenes]);
    useEffect(() => {
        const totalImagenes = post.imagenes?.length || 0;
        // Solo iniciamos el timer si hay más de una imagen
        if (totalImagenes > 1) {
            const interval = setInterval(() => {
                setFotoActual((prev) => (prev + 1) % totalImagenes);
            }, 10000);
            return () => clearInterval(interval);
        }


    }, [post.imagenes]);
// Función para las mini-cards de abajo (Explora más)
    if (sub === '1') {
        return (
            <div className="mini-box-premium">
                <div className="mini-img-wrapper">
                    <img src={imagenAleatoriaFija} alt={post.nombre} />


                    {/* ESTRELLA FLOTANTE */}
                    <div className="mini-rating-badge">
                        <StarIcon style={{fontSize: '12px', color: '#4dbce9', marginRight: '2px'}}/>
                        {post.puntuacion }
                    </div>
                </div>
                {/* NOMBRE RECUPERADO ABAJO */}
                <div className="mini-card-info">
                    <h5>{post.nombre}</h5>
                </div>
            </div>
        );
    }
    return (
        <>
            {/* TARJETA DEL CARRUSEL */}
            <div className="card-destino" onClick={() => setrenderizar(ventana === 'principal')}>
                <div className="image-container">
                    <img
                        src={post.imagenes?.[0] ||  imgGuatape}
                        alt={post.nombre}
                        onError={(e) => {
                            e.currentTarget.src = "https://via.placeholder.com/300x200?text=Error+Carga";
                        }}
                    />
                    <div className="heart-icon">
                        <FavoriteIcon fontSize="small"/>
                    </div>
                </div>

                <div className="card-body-custom">
                    <p className="country-text">{post.pais}</p>
                    <div className="title-row">
                        <h3 className="destination-name">{post.nombre}</h3>
                        <span className="rating-badge">
              <StarIcon fontSize="inherit" style={{marginRight: 4}}/>
                            {post.puntuacion}
            </span>
                    </div>

                    <div className="price-section">
                        <p className="price-old">US $ {post.recomendado}</p>
                        <p className="price-current">
                            <strong>Desde US $ {post.minimo}</strong>
                        </p>
                    </div>
                </div>
            </div>

            <Modal
                open={renderizar}
                onCancel={() => setrenderizar(false)}
                footer={null}
                width={600}
                style={{top: 100}}
                bodyStyle={{padding: 0, borderRadius: '30px', overflow: 'hidden'}}
            >
                <div className="modal-detalle-container">
                    <img
                        key={fotoActual} // Esto obliga a React a ejecutar la transición de opacidad
                        className="modal-img-header"
                        src={post.imagenes && post.imagenes.length > 0 ? post.imagenes[fotoActual] : imgGuatape}
                        alt={post.nombre}
                        style={{ transition: 'opacity 0.5s ease-in-out' }}
                    />
                    <div className="dots-container">
                        {post.imagenes && post.imagenes.length > 1 && post.imagenes.map((_, index) => (
                            <span
                                key={index}
                                className={`dot ${index === fotoActual ? 'active' : ''}`}
                                onClick={() => setFotoActual(index)} // Cambia la imagen al hacer clic
                            />
                        ))}
                    </div>


                    <div className="modal-scroll-area">
                        <p style={{color: '#888', fontSize: '0.9rem', marginBottom: '0'}}>{post.pais}</p>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                            <h2 style={{fontSize: '1.8rem', fontWeight: 800, margin: '5px 0'}}>{post.nombre}</h2>
                            <span style={{color: '#4dbce9', fontWeight: 'bold'}}>
                <StarIcon style={{marginRight: '4px'}}/> {post.puntuacion }
              </span>
                        </div>

                        <p className="modal-description">{post.descripcion}</p>

                        <div style={{margin: '20px 0'}}>
                            <span style={{color: '#888', fontSize: '0.9rem'}}>{post.recomendado}</span>
                            <div style={{fontSize: '1.2rem', fontWeight: '800', color: '#222'}}>{post.minimo}</div>
                        </div>


                        <div style={{display: 'flex', gap: '12px', margin: '20px 0'}}>
                      <span
                          className={`service-pill-selectable ${filtroModal === "rest" ? "active" : ""}`}
                          onClick={() => setFiltroModal("rest")}
                      >
                        Restaurantes <span style={{marginLeft: '8px'}}>🥗</span>
                      </span>

                            <span
                                className={`service-pill-selectable ${filtroModal === "hotel" ? "active" : ""}`}
                                onClick={() => setFiltroModal("hotel")}
                            >
                        Hoteles <span style={{marginLeft: '8px'}}>🏨</span>
                      </span>
                        </div>

                        <h4 style={{fontSize: '1.1rem', fontWeight: 800, marginBottom: '10px'}}>Explora más</h4>

                        {/* CONTENEDOR HORIZONTAL CON NOMBRES */}
                        <div className="mini-card-scroll">
                            <FeaturedPost post={post} ventana={ventana} sub={'1'}/>
                            <FeaturedPost post={post} ventana={ventana} sub={'1'}/>
                            <FeaturedPost post={post} ventana={ventana} sub={'1'}/>
                        </div>

                        <div className="text-center" style={{marginTop: '30px'}}>
                            <button
                                className="btn-ver-mas-modal"
                                onClick={() => handleNavigation()}
                            >
                                Ver Mas
                            </button>
                        </div>
                    </div>
                </div>
            </Modal>
        </>
    );
}

interface FeaturedPostProps {
    post: LugarTuristico;
    sub: any;
    ventana: string;
}