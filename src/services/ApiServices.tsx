export class ApiService {
    /*
ObtenerMunicipios:any = async () =>
   this.get(`https://www.datos.gov.co/resource/xdk5-pm3f.json?c_digo_dane_del_municipio= '15.832'`);


   ObtenerDepartamentos:any = async () =>
   this.get(`https://www.datos.gov.co/resource/vcjz-niiq.json`);
*/

 get = async(  url:any )  => {
let respuesta='';
    await fetch(url, {
        "method": "GET",
        "headers": {
        }
      })
      .then(response => response.json())
      .then(response => {
          respuesta=response;
      })
      .catch(err => { console.log(err); 
      });
     
    
return respuesta;
};
post = async(  url:any,payload:any )  => {
    let respuesta='';
        await fetch(url, {
            "method": "GET",
            "headers": {
            },
            "body": JSON.stringify({
              payload
            })
          })
          .then(response => response.json())
          .then(response => {
              respuesta=response;
          })
          .catch(err => { console.log(err); 
          });
    return respuesta;
    };
}

