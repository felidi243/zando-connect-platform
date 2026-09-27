function fail(message, status = 400) { throw Object.assign(new Error(message), { status }); }
function cleanAddress(address) {
  if (!address || typeof address !== 'object') fail('Adresse de livraison obligatoire.');
  const city = String(address.city ?? '').trim();
  const street = String(address.street ?? '').trim();
  const phone = String(address.phone ?? '').trim();
  if (!city || !street || !phone) fail('Adresse : ville, rue et téléphone sont obligatoires.');
  if (city.length > 100 || street.length > 200 || phone.length > 40) fail('Adresse de livraison invalide.');
  return { city, street, phone, notes: String(address.notes ?? '').trim().slice(0, 300) };
}
function parseQuantity(value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 999) fail('La quantité doit être un entier entre 1 et 999.');
  return n;
}
function validateCartItem(input) {
  const productId = String(input?.productId ?? '').trim();
  if (!productId) fail('productId est obligatoire.');
  return { productId, quantity: parseQuantity(input.quantity) };
}
function validateOrderInput(input) { return { address: cleanAddress(input?.address) }; }
module.exports = { validateCartItem, validateOrderInput, parseQuantity };
