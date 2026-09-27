const crypto=require('node:crypto');
const STATUS={AWAITING_MERCHANT:'awaiting_merchant',READY:'ready_for_pickup',ASSIGNED:'courier_assigned',PICKED_UP:'picked_up',IN_TRANSIT:'in_transit',OUT:'out_for_delivery',DELIVERED:'delivered',FAILED:'failed',CANCELLED:'cancelled'};
const transitions={awaiting_merchant:new Set(['ready_for_pickup','cancelled']),ready_for_pickup:new Set(['courier_assigned','cancelled']),courier_assigned:new Set(['picked_up','cancelled']),picked_up:new Set(['in_transit','failed']),in_transit:new Set(['out_for_delivery','failed']),out_for_delivery:new Set(['delivered','failed']),failed:new Set(['out_for_delivery','cancelled']),delivered:new Set(),cancelled:new Set()};
function fail(message,status=400){throw Object.assign(new Error(message),{status});}
function validateHubId(v){const x=String(v??'').trim();if(!x)fail('hubId est obligatoire.');return x;}
function validateStatus(v){const x=String(v??'').trim();if(!transitions[x])fail('Statut de livraison invalide.');return x;}
function createDeliveryService(repository){
 return {
  async createForOrder(orderId,userId){const order=await repository.findOrderByIdForUser(orderId,userId);if(!order)fail('Commande introuvable.',404);if(order.status!=='confirmed')fail('La commande doit être payée avant la création de la livraison.',409);const existing=await repository.findDeliveryByOrderId(orderId);if(existing)return existing;const d={id:`delivery-${crypto.randomUUID()}`,orderId,userId,status:STATUS.AWAITING_MERCHANT,trackingCode:`ZDO-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,hubId:null,courierId:null,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};await repository.createDelivery(d);await repository.addDeliveryEvent(d.id,null,d.status,'Livraison créée.');return d;},
  async getForUser(id,userId){const d=await repository.findDeliveryByIdForUser(id,userId);if(!d)fail('Livraison introuvable.',404);return d;},
  async listForUser(userId){return repository.listDeliveriesForUser(userId);},
  async assign(id,hubId,courierId){const d=await repository.findDeliveryById(id);if(!d)fail('Livraison introuvable.',404);hubId=validateHubId(hubId);if(d.status!=='ready_for_pickup')fail('La livraison doit être prête avant affectation.',409);const updated=await repository.assignDelivery(id,hubId,String(courierId??'').trim()||null);await repository.addDeliveryEvent(id,null,'courier_assigned','Coursier affecté.');return updated;},
  async transition(id,status,actor){const d=await repository.findDeliveryById(id);if(!d)fail('Livraison introuvable.',404);status=validateStatus(status);if(!transitions[d.status].has(status))fail(`Transition impossible : ${d.status} → ${status}.`,409);const updated=await repository.updateDeliveryStatus(id,status);await repository.addDeliveryEvent(id,actor||null,status,`Statut mis à jour : ${status}.`);return updated;},
  async events(id,userId){const d=await repository.findDeliveryByIdForUser(id,userId);if(!d)fail('Livraison introuvable.',404);return repository.listDeliveryEvents(id);}
 };
}
module.exports={createDeliveryService,STATUS,transitions};
