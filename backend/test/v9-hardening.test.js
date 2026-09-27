const test=require('node:test');
const assert=require('node:assert/strict');
const {MemoryRepository}=require('../src/repository/memoryRepository');
const {createRoutingService,haversineKm}=require('../src/routingService');
const {createRateLimiter}=require('../src/rateLimiter');

test('V9 routing fallback calculates a usable distance and ETA',async()=>{const r=createRoutingService();const x=await r.estimate({from:{latitude:-4.33,longitude:15.31},to:{latitude:-4.32,longitude:15.32}});assert.equal(x.provider,'straight_line');assert.ok(x.distanceKm>0);assert.ok(x.etaMinutes>0);assert.equal(x.routeAvailable,false);});
test('V9 rate limiter blocks after configured threshold',()=>{const r=createRateLimiter({windowMs:60000,max:2});assert.equal(r.check('a'),true);assert.equal(r.check('a'),true);assert.equal(r.check('a'),false);});
test('V9 notifications and audit logs persist in repository',async()=>{const repo=new MemoryRepository();const n=await repo.createNotification({userId:'user-admin-001',type:'test',title:'Test',message:'Hello',metadata:{x:1}});assert.equal((await repo.listNotifications('user-admin-001')).length,1);await repo.markNotificationRead(n.id,'user-admin-001');assert.ok((await repo.listNotifications('user-admin-001'))[0].readAt);const a=await repo.createAuditLog({actorUserId:'user-admin-001',action:'test',entityType:'delivery',entityId:'d1',metadata:{ok:true}});assert.equal((await repo.listAuditLogs()).length,1);assert.equal(a.entityId,'d1');});
test('V9 haversine distance is zero for identical points',()=>assert.equal(haversineKm(1,2,1,2),0));
