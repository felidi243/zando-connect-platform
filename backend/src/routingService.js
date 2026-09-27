function haversineKm(aLat,aLon,bLat,bLon){
  const toRad=v=>v*Math.PI/180,R=6371,dLat=toRad(bLat-aLat),dLon=toRad(bLon-aLon);
  const x=Math.sin(dLat/2)**2+Math.cos(toRad(aLat))*Math.cos(toRad(bLat))*Math.sin(dLon/2)**2;
  return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));
}
function createRoutingService(provider={}){
  return { estimate: async({from,to})=>{
    if(!Number.isFinite(from?.latitude)||!Number.isFinite(from?.longitude)||!Number.isFinite(to?.latitude)||!Number.isFinite(to?.longitude)) throw Object.assign(new Error('Coordonnées GPS invalides.'),{status:400});
    if(provider.route)return provider.route({from,to});
    const distanceKm=haversineKm(from.latitude,from.longitude,to.latitude,to.longitude);
    return {provider:'straight_line',distanceKm:Math.round(distanceKm*100)/100,etaMinutes:Math.max(1,Math.ceil(distanceKm/0.35)),routeAvailable:false};
  }};
}
module.exports={createRoutingService,haversineKm};
