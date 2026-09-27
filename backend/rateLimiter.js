function createRateLimiter({windowMs=60000,max=60}={}){
  const buckets=new Map();
  return {check(key){const now=Date.now(),b=buckets.get(key);if(!b||now-b.start>=windowMs){buckets.set(key,{start:now,count:1});return true;}b.count++;return b.count<=max;}};
}
module.exports={createRateLimiter};
