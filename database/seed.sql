INSERT INTO merchants (id, name, slug, verified, city) VALUES
('merchant-001', 'Boutique Zando Central', 'boutique-zando-central', TRUE, 'Kinshasa'),
('merchant-002', 'Kin Beauty Market', 'kin-beauty-market', TRUE, 'Kinshasa'),
('merchant-003', 'Accessoires 243', 'accessoires-243', FALSE, 'Kinshasa')
ON CONFLICT (id) DO NOTHING;

INSERT INTO categories (id, name, slug) VALUES
('cat-001', 'Mode', 'mode'),
('cat-002', 'Beauté', 'beaute'),
('cat-003', 'Accessoires', 'accessoires'),
('cat-004', 'Maison', 'maison')
ON CONFLICT (id) DO NOTHING;

INSERT INTO products
(id, merchant_id, category_id, name, slug, description, price, currency, stock, sales_count, image_url, created_at)
VALUES
('prod-001','merchant-001','cat-001','Robe noire élégante','robe-noire-elegante','Robe noire polyvalente pour sorties et événements.',28.50,'USD',14,38,'https://images.unsplash.com/photo-1539008835657-9e8e9680c956?auto=format&fit=crop&w=900&q=80','2026-09-01T10:00:00Z'),
('prod-002','merchant-001','cat-001','Chemise homme premium','chemise-homme-premium','Chemise coupe moderne, adaptée au bureau et aux cérémonies.',24,'USD',21,29,'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=900&q=80','2026-08-27T10:00:00Z'),
('prod-003','merchant-002','cat-002','Kit soin visage','kit-soin-visage','Routine de soin visage comprenant plusieurs produits complémentaires.',19.90,'USD',9,51,'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=900&q=80','2026-08-18T10:00:00Z'),
('prod-004','merchant-002','cat-002','Parfum quotidien','parfum-quotidien','Parfum aux notes fraîches pour un usage quotidien.',17.50,'USD',0,64,'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=900&q=80','2026-08-10T10:00:00Z'),
('prod-005','merchant-003','cat-003','Sac à main urbain','sac-a-main-urbain','Sac compact avec espace pour les essentiels du quotidien.',22,'USD',17,43,'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=900&q=80','2026-08-30T10:00:00Z'),
('prod-006','merchant-003','cat-003','Montre classique','montre-classique','Montre au design sobre pour un style quotidien.',31,'USD',6,18,'https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=900&q=80','2026-08-05T10:00:00Z')
ON CONFLICT (id) DO NOTHING;
