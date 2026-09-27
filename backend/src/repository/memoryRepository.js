const crypto = require('node:crypto');
const { merchants, categories, products } = require('../data/seed');
const { hashPassword } = require('../authService');
const norm = v => String(v ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
const clone = v => JSON.parse(JSON.stringify(v));
function slugify(value) { return norm(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

class MemoryRepository {
  constructor() {
    this.users = [
      { id:'user-admin-001', email:'admin@zandoconnect.test', name:'Zando Admin', role:'admin', merchantId:null, passwordHash:hashPassword('AdminV4!2026'), createdAt:'2026-09-01T00:00:00Z' },
      { id:'user-merchant-001', email:'merchant@zandoconnect.test', name:'Boutique Zando Central', role:'merchant', merchantId:'merchant-001', passwordHash:hashPassword('MerchantV4!2026'), createdAt:'2026-09-01T00:00:00Z' }
    ];
    this.nextUser = 1; this.nextMerchant = merchants.length + 1; this.carts = new Map(); this.orders = []; this.payments = []; this.deliveries = []; this.deliveryEvents = []; this.hubs = [{id:'hub-001',name:'Hub Centre-Ville',city:'Kinshasa',active:true},{id:'hub-002',name:'Hub Lemba',city:'Kinshasa',active:true}]; this.couriers = [{id:'courier-001',name:'Coursier Démo',phone:'+243900000001',active:true}]; this.commissionRules=[{id:'rule-default',categoryId:null,ratePercent:10,active:true}]; this.orderCommissions=[]; this.notifications=[]; this.auditLogs=[];
  }
  async listCategories(){ return clone(categories); }
  async listMerchants(){ return clone(merchants); }
  async findMerchantById(id){ return clone(merchants.find(m=>m.id===id)||null); }
  async findProductById(id){ return clone(products.find(p=>p.id===id)||null); }
  async findUserByEmail(email){ return clone(this.users.find(u=>u.email===email)||null); }
  async findUserById(id){ return clone(this.users.find(u=>u.id===id)||null); }
  async createUser(data){ const user={id:`user-${String(this.nextUser++).padStart(3,'0')}`,...data,createdAt:new Date().toISOString()}; this.users.push(user); return clone(user); }
  async createMerchant(data){ const id=`merchant-${String(this.nextMerchant++).padStart(3,'0')}`; const merchant={id,name:data.name,slug:slugify(data.name),verified:false,city:data.city,createdAt:new Date().toISOString()}; merchants.push(merchant); return clone(merchant); }
  async listMerchantProducts(merchantId) { return clone(products.filter(p=>p.merchantId===merchantId)); }
  async createProduct(merchantId, data) {
    const merchant=merchants.find(m=>m.id===merchantId); if(!merchant) throw Object.assign(new Error('Marchand introuvable.'),{status:404});
    const category=categories.find(c=>c.id===data.categoryId); if(!category) throw Object.assign(new Error('Catégorie introuvable.'),{status:400});
    const id=`prod-${String(products.length+1).padStart(3,'0')}`;
    const product={id,merchantId,categoryId:data.categoryId,name:data.name,slug:slugify(data.name),description:data.description,price:data.price,currency:data.currency,stock:data.stock,salesCount:0,imageUrl:data.imageUrl,createdAt:new Date().toISOString()}; products.push(product); return clone(product);
  }
  async updateProduct(merchantId,id,data){ const product=products.find(p=>p.id===id); if(!product) throw Object.assign(new Error('Produit introuvable.'),{status:404}); if(product.merchantId!==merchantId) throw Object.assign(new Error('Accès refusé à ce produit.'),{status:403}); if(!categories.some(c=>c.id===data.categoryId)) throw Object.assign(new Error('Catégorie introuvable.'),{status:400}); Object.assign(product,{name:data.name,slug:slugify(data.name),description:data.description,price:data.price,currency:data.currency,stock:data.stock,categoryId:data.categoryId,imageUrl:data.imageUrl}); return clone(product); }
  async deleteProduct(merchantId,id){ const index=products.findIndex(p=>p.id===id); if(index<0) throw Object.assign(new Error('Produit introuvable.'),{status:404}); if(products[index].merchantId!==merchantId) throw Object.assign(new Error('Accès refusé à ce produit.'),{status:403}); products.splice(index,1); }
  async getCart(userId) {
    const items = this.carts.get(userId) || [];
    const result = await Promise.all(items.map(async item => {
      const product = products.find(p => p.id === item.productId);
      return product ? { productId: product.id, quantity: item.quantity, product: clone(product), lineTotal: Math.round(product.price * item.quantity * 100) / 100 } : null;
    }));
    return clone(result.filter(Boolean));
  }
  async setCartItem(userId, productId, quantity) {
    const product = products.find(p => p.id === productId); if (!product) throw Object.assign(new Error('Produit introuvable.'), {status:404});
    if (product.stock < quantity) throw Object.assign(new Error('Stock insuffisant.'), {status:409});
    const items = this.carts.get(userId) || []; const i = items.findIndex(x => x.productId === productId);
    if (i >= 0) items[i].quantity = quantity; else items.push({productId, quantity}); this.carts.set(userId, items); return this.getCart(userId);
  }
  async removeCartItem(userId, productId) { const items=this.carts.get(userId)||[]; this.carts.set(userId, items.filter(x=>x.productId!==productId)); return this.getCart(userId); }
  async clearCart(userId) { this.carts.delete(userId); }
  async createOrder(userId, address) {
    const cart=await this.getCart(userId); if(!cart.length) throw Object.assign(new Error('Le panier est vide.'),{status:400});
    for(const item of cart) if(item.product.stock < item.quantity) throw Object.assign(new Error(`Stock insuffisant pour ${item.product.name}.`),{status:409});
    const subtotal=Math.round(cart.reduce((s,i)=>s+i.lineTotal,0)*100)/100, deliveryFee=0, taxAmount=0, total=subtotal;
    const order={id:`order-${String(this.orders.length+1).padStart(4,'0')}`,userId,status:'pending',currency:'USD',subtotal,deliveryFee,taxAmount,total,deliveryAddress:clone(address),createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),items:cart.map(i=>({id:`item-${crypto.randomUUID()}`,productId:i.productId,merchantId:i.product.merchantId,productName:i.product.name,unitPrice:i.product.price,quantity:i.quantity,lineTotal:i.lineTotal}))};
    for(const i of cart){const p=products.find(x=>x.id===i.productId);p.stock-=i.quantity;p.salesCount+=i.quantity;}
    this.orders.push(order); await this.clearCart(userId); return clone(order);
  }
  async listOrders(userId) { return clone(this.orders.filter(o=>o.userId===userId)); }
  async listAllOrders(){return clone(this.orders);}
  async listAllPayments(){return clone(this.payments);}
  async findOrderByIdForUser(id,userId){ return clone(this.orders.find(o=>o.id===id&&o.userId===userId)||null); }
  async findPaymentByIdempotencyKey(userId,key){ return clone(this.payments.find(p=>p.userId===userId&&p.idempotencyKey===key)||null); }
  async createPayment(d){ const payment={...d,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}; this.payments.push(payment); return clone(payment); }
  async findPaymentByIdForUser(id,userId){ return clone(this.payments.find(p=>p.id===id&&p.userId===userId)||null); }
  async findPaymentByProviderReference(ref){ return clone(this.payments.find(p=>p.providerReference===ref)||null); }
  async updatePaymentStatus(id,status,providerReference,metadata){ const p=this.payments.find(x=>x.id===id); if(!p) throw Object.assign(new Error('Paiement introuvable.'),{status:404}); p.status=status;p.providerReference=providerReference||p.providerReference;p.metadata=metadata||p.metadata;p.updatedAt=new Date().toISOString(); if(status==='succeeded'){const o=this.orders.find(x=>x.id===p.orderId);if(o&&o.status==='pending'){o.status='confirmed';o.updatedAt=new Date().toISOString();}} return clone(p); }
  async listPayments(userId){ return clone(this.payments.filter(p=>p.userId===userId)); }
  async cancelOrder(id,userId){ const o=this.orders.find(x=>x.id===id&&x.userId===userId); if(!o) throw Object.assign(new Error('Commande introuvable.'),{status:404}); if(o.status!=='pending') throw Object.assign(new Error('Seule une commande en attente peut être annulée.'),{status:409}); for(const i of o.items){const p=products.find(x=>x.id===i.productId);if(p){p.stock+=i.quantity;p.salesCount=Math.max(0,p.salesCount-i.quantity);}} o.status='cancelled';o.updatedAt=new Date().toISOString();return clone(o); }
  async findDeliveryByOrderId(orderId){ return clone(this.deliveries.find(d=>d.orderId===orderId)||null); }
  async findDeliveryById(id){ return clone(this.deliveries.find(d=>d.id===id)||null); }
  async findDeliveryByIdForUser(id,userId){ return clone(this.deliveries.find(d=>d.id===id&&d.userId===userId)||null); }
  async createDelivery(d){ this.deliveries.push(clone(d)); return clone(d); }
  async listDeliveriesForUser(userId){ return clone(this.deliveries.filter(d=>d.userId===userId)); }
  async assignDelivery(id,hubId,courierId){ const d=this.deliveries.find(x=>x.id===id);if(!d)throw Object.assign(new Error('Livraison introuvable.'),{status:404});if(!this.hubs.some(h=>h.id===hubId&&h.active))throw Object.assign(new Error('Hub introuvable.'),{status:404});if(courierId&&!this.couriers.some(c=>c.id===courierId&&c.active))throw Object.assign(new Error('Coursier introuvable.'),{status:404});d.hubId=hubId;d.courierId=courierId;d.status='courier_assigned';d.updatedAt=new Date().toISOString();return clone(d); }
  async updateDeliveryStatus(id,status){ const d=this.deliveries.find(x=>x.id===id);if(!d)throw Object.assign(new Error('Livraison introuvable.'),{status:404});d.status=status;d.updatedAt=new Date().toISOString();return clone(d); }
  async addDeliveryEvent(deliveryId,actor,status,note){ const e={id:`event-${crypto.randomUUID()}`,deliveryId,actor,status,note,createdAt:new Date().toISOString()};this.deliveryEvents.push(e);return clone(e); }
  async listDeliveryEvents(id){ return clone(this.deliveryEvents.filter(e=>e.deliveryId===id)); }
  async listHubs(){return clone(this.hubs.filter(h=>h.active));}
  async listCouriers(){return clone(this.couriers.filter(c=>c.active));}
  async createCourier(d){const c={id:`courier-${crypto.randomUUID()}`,name:d.name,phone:d.phone,active:true};this.couriers.push(c);return clone(c);}
  async updateDeliveryLocation(id,data){const d=this.deliveries.find(x=>x.id===id);if(!d)throw Object.assign(new Error('Livraison introuvable.'),{status:404});Object.assign(d,data);d.updatedAt=new Date().toISOString();return clone(d);}
  async listAdminDeliveries(){return clone(this.deliveries);}
  async listUsers(){return clone(this.users);}
  async listCommissionRules(){return clone(this.commissionRules);}
  async createCommissionRule(d){const r={id:`rule-${crypto.randomUUID()}`,categoryId:d.categoryId||null,ratePercent:Number(d.ratePercent),active:d.active!==false};this.commissionRules.push(r);return clone(r);}
  async listOrderCommissions(){return clone(this.orderCommissions);}
  async createNotification(d){const n={id:`notif-${crypto.randomUUID()}`,...d,readAt:null,createdAt:new Date().toISOString()};this.notifications.push(n);return clone(n);}
  async listNotifications(userId){return clone(this.notifications.filter(n=>n.userId===userId));}
  async markNotificationRead(id,userId){const n=this.notifications.find(x=>x.id===id&&x.userId===userId);if(!n)throw Object.assign(new Error('Notification introuvable.'),{status:404});n.readAt=new Date().toISOString();return clone(n);}
  async createAuditLog(d){const a={id:`audit-${crypto.randomUUID()}`,...d,createdAt:new Date().toISOString()};this.auditLogs.push(a);return clone(a);}
  async listAuditLogs(){return clone(this.auditLogs);}

  async listProducts(f={}) { let r=[...products]; if(f.category){const q=norm(f.category);r=r.filter(p=>{const c=categories.find(x=>x.id===p.categoryId);return c&&(norm(c.slug)===q||norm(c.name)===q);});} if(f.merchant){const q=norm(f.merchant);r=r.filter(p=>{const m=merchants.find(x=>x.id===p.merchantId);return m&&(norm(m.slug)===q||norm(m.name)===q);});} if(f.minPrice!=null)r=r.filter(p=>p.price>=f.minPrice); if(f.maxPrice!=null)r=r.filter(p=>p.price<=f.maxPrice); if(f.inStock)r=r.filter(p=>p.stock>0); if(f.q){const q=norm(f.q);r=r.filter(p=>norm(p.name).includes(q)||norm(p.description).includes(q));} if(f.sort==='price_asc')r.sort((a,b)=>a.price-b.price); else if(f.sort==='price_desc')r.sort((a,b)=>b.price-a.price); else if(f.sort==='popular')r.sort((a,b)=>b.salesCount-a.salesCount); else r.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)); const total=r.length,page=Math.max(1,Number(f.page||1)),limit=Math.min(50,Math.max(1,Number(f.limit||12))); return {items:clone(r.slice((page-1)*limit,page*limit)),total,page,limit,pages:Math.max(1,Math.ceil(total/limit))}; }
}
module.exports={MemoryRepository};
