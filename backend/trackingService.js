const crypto=require('node:crypto');
function fail(message,status=400){throw Object.assign(new Error(message),{status});}
function coords(lat,lng){const a=Number(lat),b=Number(lng);if(!Number.isFinite(a)||!Number.isFinite(b)||a<-90||a>90||b<-180||b>180)fail('Coordonnées GPS invalides.');return {latitude:Number(a.toFixed(6)),longitude:Number(b.toFixed(6))};}
function distanceKm(a,b){const R=6371,rad=Math.PI/180,dLat=(b.latitude-a.latitude)*rad,dLon=(b.longitude-a.longitude)*rad;const x=Math.sin(dLat/2)**2+Math.cos(a.latitude*rad)*Math.cos(b.latitude*rad)*Math.sin(dLon/2)**2;return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));}
function createTrackingService(repository){return {
 async updateCourier(id,courierId,lat,lng){const d=await repository.findDeliveryById(id);if(!d)fail('Livraison introuvable.',404);if(d.courierId!==courierId)fail('Ce coursier n’est pas affecté à cette livraison.',403);const c=coords(lat,lng);return repository.updateDeliveryLocation(id,{courierLatitude:c.latitude,courierLongitude:c.longitude,locationUpdatedAt:new Date().toISOString()});},
 async updateClient(id,userId,lat,lng){const d=await repository.findDeliveryByIdForUser(id,userId);if(!d)fail('Livraison introuvable.',404);const c=coords(lat,lng);return repository.updateDeliveryLocation(id,{clientLatitude:c.latitude,clientLongitude:c.longitude,locationUpdatedAt:new Date().toISOString()});},
 async view(id,userId){const d=await repository.findDeliveryByIdForUser(id,userId);if(!d)fail('Livraison introuvable.',404);return enrich(d);},
 async courierView(id,courierId){const d=await repository.findDeliveryById(id);if(!d||d.courierId!==courierId)fail('Livraison introuvable.',404);return enrich(d);},
 async adminView(id){const d=await repository.findDeliveryById(id);if(!d)fail('Livraison introuvable.',404);return enrich(d);}
};}
function enrich(d){const courier=d.courierLatitude!=null?{latitude:Number(d.courierLatitude),longitude:Number(d.courierLongitude)}:null;const client=d.clientLatitude!=null?{latitude:Number(d.clientLatitude),longitude:Number(d.clientLongitude)}:null;return {...d,courierLocation:courier,clientLocation:client,distanceKm:courier&&client?Number(distanceKm(courier,client).toFixed(2)):null};}
module.exports={createTrackingService,coords,distanceKm};
