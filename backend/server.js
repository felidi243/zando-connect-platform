const {createApp}=require('./app');
const {MemoryRepository}=require('./repository/memoryRepository');
const {createTestProviders}=require('./paymentService');
const port=Number(process.env.PORT||3000),host=process.env.HOST||'0.0.0.0';
async function createRepository(){
  if(process.env.DATABASE_URL){
    try { const {Pool}=require('pg'); const {PostgresRepository}=require('./repository/postgresRepository'); const pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:process.env.DATABASE_SSL==='false'?false:{rejectUnauthorized:false}}); await pool.query('SELECT 1'); console.log('PostgreSQL connecté.'); return new PostgresRepository(pool); }
    catch(e){ console.error('Connexion PostgreSQL impossible:',e.message); process.exit(1); }
  }
  console.warn('DATABASE_URL non défini : mode mémoire activé pour développement/tests uniquement.');
  return new MemoryRepository();
}
if(!process.env.ZANDO_AUTH_SECRET)console.warn('WARNING: ZANDO_AUTH_SECRET non défini; utilisez une vraie valeur secrète en production.');
createRepository().then(repo=>createApp(repo,{...createTestProviders()}).listen(port,host,()=>console.log(`Zando Connect V9 listening on http://${host}:${port}`)));
