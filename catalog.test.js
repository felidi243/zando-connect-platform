const test=require("node:test");
const assert=require("node:assert/strict");
const {createApp}=require("../src/app");
const {MemoryRepository}=require("../src/repository/memoryRepository");

async function get(path){
  const server=createApp(new MemoryRepository()).listen(0);
  await new Promise(r=>server.once("listening",r));
  const port=server.address().port;
  try{return await fetch(`http://127.0.0.1:${port}${path}`);}
  finally{await new Promise(r=>server.close(r));}
}
test("health",async()=>{const r=await get("/api/health");assert.equal(r.status,200);assert.equal((await r.json()).ok,true);});
test("catalog",async()=>{const r=await get("/api/v1/products?limit=3");const b=await r.json();assert.equal(r.status,200);assert.equal(b.items.length,3);assert.equal(b.total,6);});
test("search plus price",async()=>{const r=await get("/api/v1/products?q=robe&maxPrice=30");const b=await r.json();assert.equal(b.total,1);assert.equal(b.items[0].id,"prod-001");});
test("stock filter",async()=>{const b=await (await get("/api/v1/products?inStock=true")).json();assert.equal(b.total,5);assert.ok(b.items.every(p=>p.stock>0));});
test("bad range",async()=>{assert.equal((await get("/api/v1/products?minPrice=50&maxPrice=10")).status,400);});
test("missing product",async()=>{assert.equal((await get("/api/v1/products/nope")).status,404);});
test("popular",async()=>{const b=await (await get("/api/v1/products?sort=popular")).json();assert.equal(b.items[0].id,"prod-004");});
