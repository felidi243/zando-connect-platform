const crypto = require('node:crypto');
const METHODS = new Set(['mobile_money','card']);
function fail(message,status=400){throw Object.assign(new Error(message),{status});}
function validatePaymentInput(input={}){
  const orderId=String(input.orderId??'').trim(); if(!orderId) fail('orderId est obligatoire.');
  const method=String(input.method??'').trim(); if(!METHODS.has(method)) fail('Méthode de paiement invalide.');
  const provider=String(input.provider??'').trim().toLowerCase(); if(!provider||provider.length>60) fail('Provider de paiement invalide.');
  const idempotencyKey=String(input.idempotencyKey??'').trim(); if(idempotencyKey.length<8||idempotencyKey.length>120) fail('idempotencyKey invalide.');
  return {orderId,method,provider,idempotencyKey};
}
function createPaymentService(repository, providers={}){
  return {
    create: async(input,userId)=>{
      const data=validatePaymentInput(input);
      const order=await repository.findOrderByIdForUser(data.orderId,userId); if(!order) fail('Commande introuvable.',404);
      if(order.status==='cancelled') fail('Cette commande est annulée.',409);
      const existing=await repository.findPaymentByIdempotencyKey(userId,data.idempotencyKey); if(existing) return existing;
      const provider=providers[data.provider]; if(!provider) fail('Provider de paiement non configuré.',400);
      const result=await provider.initialize({order,paymentMethod:data.method,provider:data.provider,reference:crypto.randomUUID()});
      return repository.createPayment({id:`pay-${crypto.randomUUID()}`,orderId:data.orderId,userId,method:data.method,provider:data.provider,status:result.status||'pending',amount:order.total,currency:order.currency,providerReference:result.providerReference||null,idempotencyKey:data.idempotencyKey,metadata:result.metadata||{}});
    },
    confirm: async(paymentId,userId)=>{
      const payment=await repository.findPaymentByIdForUser(paymentId,userId); if(!payment) fail('Paiement introuvable.',404);
      if(payment.status==='succeeded') return payment;
      if(payment.status==='failed'||payment.status==='cancelled') fail('Ce paiement ne peut plus être confirmé.',409);
      const provider=providers[payment.provider]; if(!provider) fail('Provider de paiement non configuré.',400);
      const result=await provider.confirm({payment});
      return repository.updatePaymentStatus(payment.id,result.status||'failed',result.providerReference||payment.providerReference,result.metadata||payment.metadata||{});
    },
    cancel: async(paymentId,userId)=>{
      const payment=await repository.findPaymentByIdForUser(paymentId,userId); if(!payment) fail('Paiement introuvable.',404);
      if(payment.status==='succeeded') fail('Un paiement réussi ne peut pas être annulé ici.',409);
      if(payment.status==='cancelled') return payment;
      return repository.updatePaymentStatus(payment.id,'cancelled',payment.providerReference,payment.metadata||{});
    }
  };
}
function createTestProviders(){
  const make=(name)=>({initialize:async({reference})=>({status:'pending',providerReference:`${name}-${reference}`}),confirm:async({payment})=>({status:'succeeded',providerReference:payment.providerReference})});
  return {demo_mobile_money:make('mm'),demo_card:make('card')};
}
module.exports={createPaymentService,createTestProviders,validatePaymentInput};
