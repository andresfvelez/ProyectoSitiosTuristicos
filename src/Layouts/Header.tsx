import React from 'react';

import Layout from 'antd/es/layout';


import '../App.css';
import "../Components/Pages/styles/Header.css";
import {  useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {imgPerfil} from "../Layouts/Images/imagenPerfilPrueba";

 function Headers(props: HeaderProps) {
  const { sections } = props;
  const navigate = useNavigate();

     const [isLoggedIn, setisLoggedIn] = useState<boolean>(true);

  return (
    <React.Fragment>

<nav className="navbar navbar-expand-lg fixed-top">
              <div className="container">
                <a className="navbar-brand" href="#"></a>
                <button
                  className="navbar-toggler"
                  type="button"
                  data-bs-toggle="collapse"
                  data-bs-target="#navbarSupportedContent"
                  aria-controls="navbarSupportedContent"
                  aria-expanded="false"
                  aria-label="Toggle navigation"
                >
                  <i className="fa-solid fa-bars menu"></i>
                </button>
                <div
                  className="collapse navbar-collapse"
                  id="navbarSupportedContent"
                >
                    <div className="d-flex icon_colum">
                    <a href="/" className="user">
                    <span> Inicio</span>
                    </a>
                  </div>
                  <ul className="navbar-nav m-auto mb-2 mb-lg-0">
                    <li className="nav-item">
                      <a className="nav-link active" href="/Destinos">
                      Destinos
                      </a>
                    </li>
                    <li className="nav-item">
                      <a className="nav-link" href="/tours">
                        Tours
                      </a>
                    </li>
                    <li className="nav-item">
                      <a className="nav-link" href="#" onClick={()=>{  }}>
                        Attractions
                      </a>
                    </li>
                    <li className="nav-item">
                      <a className="nav-link" href="/airelibre">
                      Al Aire Libre
                      </a>
                    </li>
                    <li className="nav-item">
                      <a className="nav-link" href="/relajacion">
                      Relajacion
                      </a>
                    </li>
                  </ul>
                    <div className="d-flex icon_colum">
                        {/* Cambiamos el href dinámicamente: si está logueado va al perfil, si no al login */}
                        <a href={isLoggedIn ? "/profile" : "/login"} className="user-link">
                            {isLoggedIn ? (
                                <img
                                    src={`data:image/png;base64,${imgPerfil}`} // La cadena Base64 con prefijo
                                    alt="Perfil"
                                    className="user-profile-img"
                                    onError={(e) => {
                                        // Si el b64 sigue mal, esto pone un icono de respaldo
                                        e.currentTarget.style.display = 'none';
                                        console.error("Error cargando Base64");
                                    }}
                                />
                            ) : (
                                <div className="user-icon-circle">
                                    <i className="fa-solid fa-user"></i>
                                </div>
                            )}
                        </a>
                    </div>
                </div>
              </div>
            </nav>
            
       
    </React.Fragment>
  );
}



/*
<Header   
    
className='d-flex justify-content-between app-bg-transparent border-bottom shadow w-100 fixed-top px-0'
style={{ zIndex: 1003,background:'white' }}>

<div className='d-flex'>
<Button   style={{width:60, height:60,alignContent:'center',alignItems:'center'}} onClick={() => {
          navigate('/');
            }}>

             Inicio
  
    </Button>
    {sections.map((section) => (
      <>
      <Link
        color="inherit"
        noWrap
        key={section.title}
        variant="body2"
        href={section.url}
      
        sx={{ p: 3, flexShrink: 1,width:1000 }}
      >
        
        {section.title}
      </Link>
      </>
      
    ))}
   
    <Button   style={{width:60, height:60,alignContent:'center',alignItems:'center'}}
            onClick={() => {
              navigate('/login')
            }}>
              <img src={User}  className="User " />
  
    </Button>
    </div>
</Header>
*/





/*
<Typography
          component="h2"
          variant="h5"
          color="inherit"
          align="center"
          noWrap
          sx={{ flex: 1 }}
        >
        
        </Typography>   
*/
export default Headers
interface HeaderProps {
    sections: ReadonlyArray<{
      title: string;
      url: string;
    }>;
  
  }