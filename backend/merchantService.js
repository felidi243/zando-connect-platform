function cleanText(value, field) {
  const v = String(value ?? "").trim();
  if (!v) throw Object.assign(new Error(`${field} est obligatoire.`), { status: 400 });
  if (v.length > 180) throw Object.assign(new Error(`${field} est trop long.`), { status: 400 });
  return v;
}

function parsePrice(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) {
    throw Object.assign(new Error("Le prix doit être supérieur à 0."), { status: 400 });
  }
  return Math.round(n * 100) / 100;
}

function parseStock(value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) {
    throw Object.assign(new Error("Le stock doit être un entier positif ou nul."), { status: 400 });
  }
  return n;
}

function validateProductInput(body) {
  return {
    name: cleanText(body.name, "name"),
    description: String(body.description ?? "").trim().slice(0, 2000),
    price: parsePrice(body.price),
    currency: String(body.currency || "USD").trim().toUpperCase(),
    stock: parseStock(body.stock),
    categoryId: cleanText(body.categoryId, "categoryId"),
    imageUrl: body.imageUrl ? String(body.imageUrl).trim().slice(0, 1000) : null
  };
}

module.exports = { validateProductInput };
