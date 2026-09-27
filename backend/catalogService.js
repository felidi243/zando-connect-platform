function num(v,n){if(v===undefined||v==="")return undefined;const x=Number(v);if(!Number.isFinite(x))throw Object.assign(new Error(`${n} doit être un nombre valide.`),{status:400});return x;}
function bool(v,n){if(v===undefined||v==="")return undefined;if(v==="true"||v==="1")return true;if(v==="false"||v==="0")return false;throw Object.assign(new Error(`${n} doit être true ou false.`),{status:400});}
function parseListQuery(q){
  const page=Math.max(1,Math.floor(num(q.page,"page")??1)),limit=Math.min(50,Math.max(1,Math.floor(num(q.limit,"limit")??12)));
  const minPrice=num(q.minPrice,"minPrice"),maxPrice=num(q.maxPrice,"maxPrice"),inStock=bool(q.inStock,"inStock");
  if(minPrice!=null&&minPrice<0||maxPrice!=null&&maxPrice<0)throw Object.assign(new Error("Le prix ne peut pas être négatif."),{status:400});
  if(minPrice!=null&&maxPrice!=null&&minPrice>maxPrice)throw Object.assign(new Error("minPrice ne peut pas dépasser maxPrice."),{status:400});
  const sorts=["price_asc","price_desc","popular","newest"];
  if(q.sort&&!sorts.includes(q.sort))throw Object.assign(new Error("Tri invalide."),{status:400});
  return {q:q.q?.trim()||undefined,category:q.category?.trim()||undefined,merchant:q.merchant?.trim()||undefined,minPrice,maxPrice,inStock,sort:q.sort||"newest",page,limit};
}
module.exports={parseListQuery};
