const merchants = [
  { id:"merchant-001", name:"Boutique Zando Central", slug:"boutique-zando-central", verified:true, city:"Kinshasa" },
  { id:"merchant-002", name:"Kin Beauty Market", slug:"kin-beauty-market", verified:true, city:"Kinshasa" },
  { id:"merchant-003", name:"Accessoires 243", slug:"accessoires-243", verified:false, city:"Kinshasa" }
];

const categories = [
  { id:"cat-001", name:"Mode", slug:"mode" },
  { id:"cat-002", name:"Beauté", slug:"beaute" },
  { id:"cat-003", name:"Accessoires", slug:"accessoires" },
  { id:"cat-004", name:"Maison", slug:"maison" }
];

const products = [
  {id:"prod-001",merchantId:"merchant-001",categoryId:"cat-001",name:"Robe noire élégante",slug:"robe-noire-elegante",description:"Robe noire polyvalente pour sorties et événements.",price:28.5,currency:"USD",stock:14,salesCount:38,imageUrl:"https://images.unsplash.com/photo-1539008835657-9e8e9680c956?auto=format&fit=crop&w=900&q=80",createdAt:"2026-09-01T10:00:00Z"},
  {id:"prod-002",merchantId:"merchant-001",categoryId:"cat-001",name:"Chemise homme premium",slug:"chemise-homme-premium",description:"Chemise coupe moderne, adaptée au bureau et aux cérémonies.",price:24,currency:"USD",stock:21,salesCount:29,imageUrl:"https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=900&q=80",createdAt:"2026-08-27T10:00:00Z"},
  {id:"prod-003",merchantId:"merchant-002",categoryId:"cat-002",name:"Kit soin visage",slug:"kit-soin-visage",description:"Routine de soin visage comprenant plusieurs produits complémentaires.",price:19.9,currency:"USD",stock:9,salesCount:51,imageUrl:"https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=900&q=80",createdAt:"2026-08-18T10:00:00Z"},
  {id:"prod-004",merchantId:"merchant-002",categoryId:"cat-002",name:"Parfum quotidien",slug:"parfum-quotidien",description:"Parfum aux notes fraîches pour un usage quotidien.",price:17.5,currency:"USD",stock:0,salesCount:64,imageUrl:"https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=900&q=80",createdAt:"2026-08-10T10:00:00Z"},
  {id:"prod-005",merchantId:"merchant-003",categoryId:"cat-003",name:"Sac à main urbain",slug:"sac-a-main-urbain",description:"Sac compact avec espace pour les essentiels du quotidien.",price:22,currency:"USD",stock:17,salesCount:43,imageUrl:"https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=900&q=80",createdAt:"2026-08-30T10:00:00Z"},
  {id:"prod-006",merchantId:"merchant-003",categoryId:"cat-003",name:"Montre classique",slug:"montre-classique",description:"Montre au design sobre pour un style quotidien.",price:31,currency:"USD",stock:6,salesCount:18,imageUrl:"https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=900&q=80",createdAt:"2026-08-05T10:00:00Z"}
];
module.exports = { merchants, categories, products };
