// Componentes
//import { PageHeaderComponent } from 'app/shared/components/page-header.component';

// Utilidades

import {ModalComponent} from '../modal.component';
import Button from 'antd/es/button';
import {useNavigate} from 'react-router-dom';
import "../Pages/styles/Homepage.css";
//import { ApiService } from 'app/services/Apis.service';
import {useCallback, useContext, useEffect, useRef, useState} from 'react';

import Swal from 'sweetalert2';
import React from 'react';
import Banner from '../../Layouts/Images/Banner.png';
import User from '../../Layouts/Images/user.png';
import Star from '../../Layouts/Images/iconstar.png';

import {Box, Grid, Paper, Typography} from '@mui/material';
import FeaturedPost from './Seccions/Cards';
import {ApiService} from '../../services/ApiServices';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import { LugarTuristico } from '../models/LugarTuristico';
import {
    obtenerImagenesPorDestino,
    obtenerLugares
} from "../../services/lugaresService";
import Scrapper from "./Scrapper";
import {ejecutarConsultaIA} from "../../services/IA/IaExecuter";
import ScrapperMejorado from './ScrapperMejorado';


const InitialPage = () => {
    const navigate = useNavigate();
    const api = new ApiService();
    const [lugares, setLugares] = useState<LugarTuristico[]>([]);

    const [renderizar, setrenderizar] = useState<boolean>(false);
    // const api = new ApiService(accountIdentifier);
    const [activeIndex, setActiveIndex] = useState(0);

    //Cambiar de tema oscuro y claro
    const bannerImages = [Banner, User, Star];
    /*
      const getListas = useCallback(

          async () => {
              const valores = await api.ObtenerMunicipios();


              if (localStorage.getItem('departamentos') === null || localStorage.getItem('departamentos') === undefined) {
                  const valores2 = await api.ObtenerDepartamentos();
                  localStorage.setItem('departamentos', JSON.stringify(valores2))
                  console.log(valores2);
              }

              //const valores= await api.insertardatos();
              console.log(valores);


          },


          // eslint-disable-next-line react-hooks/exhaustive-deps
          []
      );
  */
    const closeTab = () => {
        window.opener = null;
        window.open(process.env.REACT_APP_REDIRECT_TO, "_self");
        window.close();
    };
    //const getMenu = UpdateMenu();

    useEffect(() => {
        const cargarTodo = async () => {
            // 1. Obtener la lista base de lugares
            const listaLugares = await obtenerLugares();
            console.log("dataa",listaLugares);
            const lugaresConFotos = await Promise.all(
                listaLugares.map(async (lugar) => {
                    const fotos = await obtenerImagenesPorDestino(lugar.id!);
                    return {
                        ...lugar,
                        imagenes: fotos
                    };
                })
            );
            console.log(lugaresConFotos)

            setLugares(lugaresConFotos);
            setrenderizar(true);

            if (lugaresConFotos.length > 0) {
                await ejecutarConsultaIA(lugaresConFotos, null);
            }
        };

        cargarTodo();
        //getListas();

    }, []);

    const onCancel = (): void => {
    };
    const scrollRef = useRef<HTMLDivElement>(null);

    const scroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            const { scrollLeft, clientWidth } = scrollRef.current;

            // Al desplazar exactamente el 'clientWidth', movemos una "página" completa
            // de tarjetas. El CSS Scroll Snap se encargará de centrarlas perfectamente.
            const scrollToPosition = direction === "left"
                ? scrollLeft - clientWidth
                : scrollLeft + clientWidth;

            scrollRef.current.scrollTo({
                left: scrollToPosition,
                behavior: "smooth"
            });
        }
    };
    const scrollBanner = (direction: 'left' | 'right') => {
        if (direction === "left") {
            setActiveIndex((prev) => (prev === 0 ? bannerImages.length - 1 : prev - 1));
        } else {
            setActiveIndex((prev) => (prev === bannerImages.length - 1 ? 0 : prev + 1));
        }
    };



    return (
        <>
            {renderizar && (
                <>
                    <section className="banner-carousel">
                        {/* Botones con tu estilo circular y transparente */}
                        <button className="nav-btn left" onClick={() => scrollBanner("left")}>
                            <ArrowBackIosIcon />
                        </button>

                        <div className="banner-container">
                            {/* Esta es la pista que se desliza */}
                            <div
                                className="banner-track"
                                style={{ transform: `translateX(-${activeIndex * 100}%)` }}
                            >
                                {bannerImages.map((img, index) => (
                                    <div key={index} className="banner-slide">
                                        <img src={img} className="d-block w-100" alt={`Slide ${index}`} />
                                    </div>
                                ))}
                            </div>
                        </div>

                        <button className="nav-btn right" onClick={() => scrollBanner("right")}>
                            <ArrowForwardIosIcon />
                        </button>
                    </section>



                    <div className="carousel-wrapper">
                        <h2 className="section-title">Destinos Populares</h2>

                        {lugares.length > 0 && (
                            <div className="slider-container">
                                <button className="nav-btn left" onClick={() => scroll("left")}>
                                    <ArrowBackIosIcon/>
                                </button>
                                <div className="cards-track" ref={scrollRef}>
                                    {lugares.map((post, index) => (
                                        <FeaturedPost key={index} post={post} ventana="principal" sub="0"/>
                                    ))}
                                </div>
                                <button className="nav-btn right" onClick={() => scroll("right")}>
                                    <ArrowForwardIosIcon/>
                                </button>
                            </div>
                        )}

                    </div>


                    <div className='fadeInTop container-fluid ' style={{position: 'relative'}}>

                        <div className='card card-body'>
                            <span><h4 className='app-subtitle mt-3'><span>Pagina de inicio</span></h4></span>
                        </div>

                    </div>

                    <div style={{ maxWidth: '800px', margin: '50px auto' }}>
                        <h1>Configuración del Sistema</h1>
                        <p>Utiliza esta herramienta para poblar la base de datos de Firebase con información real de internet.</p>

                        <hr />


                        <ScrapperMejorado />

                    </div>

                </>

            )}
        </>
    );
};

export default InitialPage;
