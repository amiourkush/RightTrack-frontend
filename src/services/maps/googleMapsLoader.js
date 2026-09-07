let promise;
export function loadGoogleMaps(){
 const key=import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
 if(!key)return Promise.reject(new Error('VITE_GOOGLE_MAPS_API_KEY is not configured.'));
 if(window.google?.maps?.Map)return Promise.resolve(window.google.maps);
 if(promise)return promise;
 promise=new Promise((resolve,reject)=>{
   const existing=document.getElementById('google-maps-bootstrap');
   if(existing){const done=()=>window.google?.maps?resolve(window.google.maps):reject(new Error('Google Maps loaded without Maps API.'));if(window.google?.maps){done();return}existing.addEventListener('load',done,{once:true});existing.addEventListener('error',()=>reject(new Error('Google Maps failed to load.')),{once:true});return}
   const script=document.createElement('script');script.id='google-maps-bootstrap';script.async=true;script.defer=true;script.src=`https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly`;script.onload=()=>window.google?.maps?resolve(window.google.maps):reject(new Error('Google Maps loaded without Maps API.'));script.onerror=()=>reject(new Error('Google Maps failed to load.'));document.head.appendChild(script);
 });return promise;
}
