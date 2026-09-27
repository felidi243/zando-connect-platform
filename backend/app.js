const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const {parseListQuery}=require('./catalogService');
const {validateProductInput}=require('./merchantService');
const {createAuthService}=require('./authService');
const {validateCartItem,validateOrderInput}=require('./orderService');
const {createPaymentService}=require('./paymentService');
const {createDeliveryService}=require('./deliveryService');
const {createTrackingService}=require('./trackingService');
const {calculate}=require('./commissionService');
const {createRoutingService}=require('./routingService');
const {createNotificationService}=require('./notificationService');
const {createRateLimiter}=require('./rateLimiter');
const crypto=require('node:crypto');
const {hashPassword}=require('./authService');
function json(res,status,data){const body=status===204?'':JSON.stringify(data);res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});res.end(body);}
async function body(req){let raw='';for await(const chunk of req)raw+=chunk;try{return raw?JSON.parse(raw):{};}catch{throw Object.assign(new Error('JSON invalide.'),{status:400});}}
function createApp(repository, paymentProviders={}){
  const auth=createAuthService(repository);
  const payments=createPaymentService(repository,paymentProviders);
  const delivery=createDeliveryService(repository);
  const tracking=createTrackingService(repository);
  const routing=createRoutingService();
  const notifications=createNotificationService(repository);
  const limiter=createRateLimiter({windowMs:60000,max:120});
  const webDir=path.resolve(__dirname,'../../apps/web/public');
  const merchantDir=path.resolve(__dirname,'../../apps/merchant/public');
  const deliveryDir=path.resolve(__dirname,'../../apps/delivery/public');
  const adminDir=path.resolve(__dirname,'../../apps/admin/public');
  async function requireRole(req,role){const session=await auth.authenticate(req);if(role&&!([].concat(role).includes(session.user.role)))throw Object.assign(new Error('Permissions insuffisantes.'),{status:403});return session;}
  return http.createServer(async(req,res)=>{try{const ip=(req.headers['x-forwarded-for']||req.socket.remoteAddress||'unknown').split(',')[0].trim();if(!limiter.check(ip))return json(res,429,{error:'Trop de requêtes. Réessayez plus tard.'});
    const url=new URL(req.url,'http://localhost');
    if(url.pathname==='/api/health')return json(res,200,{ok:true,service:'zando-connect-api',version:'9.0.0'});
    if(url.pathname==='/api/v1/auth/register'&&req.method==='POST')return json(res,201,{user:await auth.register(await body(req))});
    if(url.pathname==='/api/v1/auth/login'&&req.method==='POST')return json(res,200,await auth.login(await body(req)));
    if(url.pathname==='/api/v1/auth/me'&&req.method==='GET'){const s=await auth.authenticate(req);return json(res,200,{user:auth.publicUser(s.user)});}
    if(url.pathname==='/api/v1/auth/logout'&&req.method==='POST'){const s=await auth.authenticate(req);auth.revoke(s.token);return json(res,204,{});}
    if(url.pathname==='/api/v1/cart'&&req.method==='GET'){const s=await auth.authenticate(req);return json(res,200,{items:await repository.getCart(s.user.id)});}
    if(url.pathname==='/api/v1/cart/items'&&req.method==='POST'){const s=await auth.authenticate(req);const item=validateCartItem(await body(req));return json(res,200,{items:await repository.setCartItem(s.user.id,item.productId,item.quantity)});}
    const cartItemMatch=url.pathname.match(/^\/api\/v1\/cart\/items\/([^/]+)$/);
    if(cartItemMatch&&req.method==='DELETE'){const s=await auth.authenticate(req);return json(res,200,{items:await repository.removeCartItem(s.user.id,decodeURIComponent(cartItemMatch[1]))});}
    if(url.pathname==='/api/v1/orders'&&req.method==='POST'){const s=await auth.authenticate(req);const input=validateOrderInput(await body(req));return json(res,201,await repository.createOrder(s.user.id,input.address));}
    if(url.pathname==='/api/v1/orders'&&req.method==='GET'){const s=await auth.authenticate(req);return json(res,200,{items:await repository.listOrders(s.user.id)});}
    const cancelOrderMatch=url.pathname.match(/^\/api\/v1\/orders\/([^/]+)\/cancel$/);
    if(cancelOrderMatch&&req.method==='POST'){const s=await auth.authenticate(req);return json(res,200,await repository.cancelOrder(decodeURIComponent(cancelOrderMatch[1]),s.user.id));}
    const orderDeliveryMatch=url.pathname.match(/^\/api\/v1\/orders\/([^/]+)\/delivery$/);
    if(orderDeliveryMatch&&req.method==='POST'){const s=await auth.authenticate(req);return json(res,201,await delivery.createForOrder(decodeURIComponent(orderDeliveryMatch[1]),s.user.id));}
    if(url.pathname==='/api/v1/deliveries'&&req.method==='GET'){const s=await auth.authenticate(req);return json(res,200,{items:await delivery.listForUser(s.user.id)});}
    const trackClient=url.pathname.match(/^\/api\/v1\/deliveries\/([^/]+)\/location$/);
    if(trackClient&&req.method==='GET'){const s=await auth.authenticate(req);return json(res,200,await tracking.view(decodeURIComponent(trackClient[1]),s.user.id));}
    if(trackClient&&req.method==='POST'){const s=await auth.authenticate(req);const input=await body(req);return json(res,200,await tracking.updateClient(decodeURIComponent(trackClient[1]),s.user.id,input.latitude,input.longitude));}
    const deliveryMatch=url.pathname.match(/^\/api\/v1\/deliveries\/([^/]+)(?:\/(events))?$/);
    if(deliveryMatch){const s=await auth.authenticate(req);const id=decodeURIComponent(deliveryMatch[1]);if(req.method==='GET'&&deliveryMatch[2])return json(res,200,{items:await delivery.events(id,s.user.id)});if(req.method==='GET')return json(res,200,await delivery.getForUser(id,s.user.id));}
    if(url.pathname==='/api/v1/admin/hubs'&&req.method==='GET'){await requireRole(req,'admin');return json(res,200,{items:await repository.listHubs()});}
    if(url.pathname==='/api/v1/admin/couriers'&&req.method==='GET'){await requireRole(req,'admin');return json(res,200,{items:await repository.listCouriers()});}
    if(url.pathname==='/api/v1/admin/deliveries'&&req.method==='GET'){await requireRole(req,'admin');return json(res,200,{items:await repository.listAdminDeliveries()});}
    if(url.pathname==='/api/v1/admin/users'&&req.method==='GET'){await requireRole(req,'admin');return json(res,200,{items:await repository.listUsers()});}
    if(url.pathname==='/api/v1/admin/couriers'&&req.method==='POST'){await requireRole(req,'admin');const input=await body(req);if(!input.name||!input.phone||!input.email||!input.password)throw Object.assign(new Error('name, phone, email et password sont obligatoires.'),{status:400});const courier=await repository.createCourier({name:String(input.name).trim(),phone:String(input.phone).trim()});const user=await repository.createUser({email:String(input.email).trim().toLowerCase(),name:String(input.name).trim(),role:'courier',merchantId:null,courierId:courier.id,passwordHash:hashPassword(input.password)});return json(res,201,{courier,user:{id:user.id,email:user.email,name:user.name,role:user.role,courierId:user.courierId}});}
    if(url.pathname==='/api/v1/admin/commission-rules'&&req.method==='GET'){await requireRole(req,'admin');return json(res,200,{items:await repository.listCommissionRules()});}
    if(url.pathname==='/api/v1/admin/commission-rules'&&req.method==='POST'){await requireRole(req,'admin');const input=await body(req);const rate=Number(input.ratePercent);if(!Number.isFinite(rate)||rate<0||rate>100)throw Object.assign(new Error('ratePercent doit être entre 0 et 100.'),{status:400});return json(res,201,await repository.createCommissionRule({categoryId:input.categoryId||null,ratePercent:rate,active:true}));}
    if(url.pathname==='/api/v1/admin/commissions'&&req.method==='GET'){await requireRole(req,'admin');return json(res,200,{items:await repository.listOrderCommissions()});}
    if(url.pathname==='/api/v1/admin/audit-logs'&&req.method==='GET'){await requireRole(req,'admin');return json(res,200,{items:await repository.listAuditLogs()});}
    if(url.pathname==='/api/v1/admin/dashboard'&&req.method==='GET'){await requireRole(req,'admin');const [orders,payments,deliveries,users]=await Promise.all([repository.listAllOrders(),repository.listAllPayments(),repository.listAdminDeliveries(),repository.listUsers()]);return json(res,200,{users:users.length,orders:orders.length,paidOrders:orders.filter(o=>o.status!=='pending'&&o.status!=='cancelled').length,revenue:Math.round(orders.filter(o=>o.status!=='cancelled').reduce((a,o)=>a+Number(o.total),0)*100)/100,paymentsSucceeded:payments.filter(p=>p.status==='succeeded').length,deliveries:deliveries.length,deliveriesDelivered:deliveries.filter(d=>d.status==='delivered').length});}
    if(url.pathname==='/api/v1/admin/commission-summary'&&req.method==='GET'){await requireRole(req,'admin');const [orders,rules]=await Promise.all([repository.listAllOrders(),repository.listCommissionRules()]);const rows=[];for(const order of orders.filter(o=>o.status!=='cancelled')){const items=[];for(const item of order.items){const product=await repository.findProductById(item.productId);items.push({...item,categoryId:product?.categoryId||null});}const calc=calculate({...order,items},rules);rows.push(...calc.map(x=>({orderId:order.id,...x})));}return json(res,200,{items:rows,totalCommission:Math.round(rows.reduce((a,x)=>a+x.commissionAmount,0)*100)/100,totalMerchantNet:Math.round(rows.reduce((a,x)=>a+x.merchantNetAmount,0)*100)/100});}
    const adminTrack=url.pathname.match(/^\/api\/v1\/admin\/deliveries\/([^/]+)\/tracking$/);
    if(adminTrack&&req.method==='GET'){await requireRole(req,'admin');return json(res,200,await tracking.adminView(decodeURIComponent(adminTrack[1])));}
    const courierTrack=url.pathname.match(/^\/api\/v1\/courier\/deliveries\/([^/]+)\/location$/);
    if(courierTrack&&req.method==='POST'){const s=await requireRole(req,'courier');if(!s.user.courierId)throw Object.assign(new Error('Coursier non configuré.'),{status:403});const input=await body(req);return json(res,200,await tracking.updateCourier(decodeURIComponent(courierTrack[1]),s.user.courierId,input.latitude,input.longitude));}
    const courierViewMatch=url.pathname.match(/^\/api\/v1\/courier\/deliveries\/([^/]+)\/location$/);
    if(courierViewMatch&&req.method==='GET'){const s=await requireRole(req,'courier');if(!s.user.courierId)throw Object.assign(new Error('Coursier non configuré.'),{status:403});return json(res,200,await tracking.courierView(decodeURIComponent(courierViewMatch[1]),s.user.courierId));}
    if(url.pathname==='/api/v1/courier/deliveries'&&req.method==='GET'){const s=await requireRole(req,'courier');const items=(await repository.listAdminDeliveries()).filter(d=>d.courierId===s.user.courierId);return json(res,200,{items});}

    const adminAssignMatch=url.pathname.match(/^\/api\/v1\/admin\/deliveries\/([^/]+)\/assign$/);
    if(adminAssignMatch&&req.method==='POST'){await requireRole(req,'admin');const input=await body(req);return json(res,200,await delivery.assign(decodeURIComponent(adminAssignMatch[1]),input.hubId,input.courierId));}
    const adminStatusMatch=url.pathname.match(/^\/api\/v1\/admin\/deliveries\/([^/]+)\/status$/);
    if(adminStatusMatch&&req.method==='POST'){const s=await requireRole(req,'admin');const input=await body(req);return json(res,200,await delivery.transition(decodeURIComponent(adminStatusMatch[1]),input.status,s.user.id));}
    if(url.pathname==='/api/v1/notifications'&&req.method==='GET'){const s=await auth.authenticate(req);return json(res,200,{items:await notifications.list(s.user.id)});}
    const notifRead=url.pathname.match(/^\/api\/v1\/notifications\/([^/]+)\/read$/);
    if(notifRead&&req.method==='POST'){const s=await auth.authenticate(req);return json(res,200,await repository.markNotificationRead(decodeURIComponent(notifRead[1]),s.user.id));}
    const routeMatch=url.pathname.match(/^\/api\/v1\/deliveries\/([^/]+)\/route$/);
    if(routeMatch&&req.method==='GET'){const s=await auth.authenticate(req);const d=await delivery.getForUser(decodeURIComponent(routeMatch[1]),s.user.id);const view=await tracking.view(decodeURIComponent(routeMatch[1]),s.user.id);if(!view.clientLatitude||!view.clientLongitude||!view.courierLatitude||!view.courierLongitude)return json(res,200,{delivery:d,route:null});return json(res,200,{delivery:d,route:await routing.estimate({from:{latitude:view.courierLatitude,longitude:view.courierLongitude},to:{latitude:view.clientLatitude,longitude:view.clientLongitude}})});}
    if(url.pathname==='/api/v1/payments/webhook'&&req.method==='POST'){const raw=await body(req);const secret=process.env.PAYMENT_WEBHOOK_SECRET;if(!secret)throw Object.assign(new Error('Webhook de paiement non configuré.'),{status:503});const sig=req.headers['x-zando-signature'];const expected=crypto.createHmac('sha256',secret).update(JSON.stringify(raw)).digest('hex');if(!sig||!crypto.timingSafeEqual(Buffer.from(String(sig)),Buffer.from(expected)))throw Object.assign(new Error('Signature webhook invalide.'),{status:401});const p=await repository.findPaymentByProviderReference(raw.providerReference);if(!p)throw Object.assign(new Error('Paiement introuvable.'),{status:404});return json(res,200,await repository.updatePaymentStatus(p.id,raw.status,p.providerReference,raw.metadata||{}));}
    if(url.pathname==='/api/v1/payments'&&req.method==='POST'){const s=await auth.authenticate(req);return json(res,201,await payments.create(await body(req),s.user.id));}
    const paymentMatch=url.pathname.match(/^\/api\/v1\/payments\/([^/]+)\/(confirm|cancel)$/);
    if(paymentMatch){const s=await auth.authenticate(req);const paymentId=decodeURIComponent(paymentMatch[1]);if(req.method==='POST'&&paymentMatch[2]==='confirm')return json(res,200,await payments.confirm(paymentId,s.user.id));if(req.method==='POST'&&paymentMatch[2]==='cancel')return json(res,200,await payments.cancel(paymentId,s.user.id));}
    if(url.pathname==='/api/v1/payments'&&req.method==='GET'){const s=await auth.authenticate(req);return json(res,200,{items:await repository.listPayments(s.user.id)});}
    if(url.pathname==='/api/v1/categories'&&req.method==='GET')return json(res,200,{items:await repository.listCategories()});
    if(url.pathname==='/api/v1/merchants'&&req.method==='GET')return json(res,200,{items:await repository.listMerchants()});
    if(url.pathname==='/api/v1/products'&&req.method==='GET')return json(res,200,await repository.listProducts(parseListQuery(Object.fromEntries(url.searchParams))));
    if(url.pathname.startsWith('/api/v1/products/')&&req.method==='GET'){const id=decodeURIComponent(url.pathname.split('/').pop());const product=await repository.findProductById(id);return product?json(res,200,product):json(res,404,{error:'Produit introuvable.'});}
    const merchantMatch=url.pathname.match(/^\/api\/v1\/merchant\/([^/]+)\/products$/);
    if(merchantMatch){const merchantId=merchantMatch[1];const session=await requireRole(req,'merchant');if(session.user.merchantId!==merchantId)return json(res,403,{error:'Ce compte ne peut pas gérer ce marchand.'});if(req.method==='GET')return json(res,200,{items:await repository.listMerchantProducts(merchantId)});if(req.method==='POST')return json(res,201,await repository.createProduct(merchantId,validateProductInput(await body(req))));}
    const productMatch=url.pathname.match(/^\/api\/v1\/merchant\/([^/]+)\/products\/([^/]+)$/);
    if(productMatch){const merchantId=productMatch[1],productId=productMatch[2];const session=await requireRole(req,'merchant');if(session.user.merchantId!==merchantId)return json(res,403,{error:'Ce compte ne peut pas gérer ce marchand.'});if(req.method==='PATCH')return json(res,200,await repository.updateProduct(merchantId,productId,validateProductInput(await body(req))));if(req.method==='DELETE'){await repository.deleteProduct(merchantId,productId);return json(res,204,{});}}
    if(req.method!=='GET')return json(res,405,{error:'Méthode non autorisée.'});
    let baseDir=webDir,file=url.pathname==='/'?'index.html':url.pathname.slice(1);
    if(url.pathname==='/merchant'||url.pathname.startsWith('/merchant/')){baseDir=merchantDir;file=url.pathname==='/merchant'||url.pathname==='/merchant/'?'index.html':url.pathname.slice('/merchant/'.length);}
    if(url.pathname==='/delivery'||url.pathname.startsWith('/delivery/')){baseDir=deliveryDir;file=url.pathname==='/delivery'||url.pathname==='/delivery/'?'index.html':url.pathname.slice('/delivery/'.length);}
    if(url.pathname==='/admin'||url.pathname.startsWith('/admin/')){baseDir=adminDir;file=url.pathname==='/admin'||url.pathname==='/admin/'?'index.html':url.pathname.slice('/admin/'.length);}
    const safe=path.normalize(file).replace(/^([.][.][\\/])+/, '');const full=path.join(baseDir,safe);if(!full.startsWith(baseDir))return json(res,403,{error:'Accès interdit.'});
    if(fs.existsSync(full)&&fs.statSync(full).isFile()){const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};res.writeHead(200,{'content-type':types[path.extname(full)]||'application/octet-stream'});return res.end(fs.readFileSync(full));}
    return json(res,404,{error:'Ressource introuvable.'});
  }catch(e){return json(res,e.status||500,{error:e.status?e.message:'Erreur interne du serveur.'});}});
}
module.exports={createApp};
