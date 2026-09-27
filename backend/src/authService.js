const crypto = require('node:crypto');

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function fail(message, status = 400) { throw Object.assign(new Error(message), { status }); }
function normalizeEmail(value) { return String(value ?? '').trim().toLowerCase(); }
function validateEmail(value) { const email = normalizeEmail(value); if (!EMAIL_RE.test(email) || email.length > 180) fail('Adresse e-mail invalide.'); return email; }
function validatePassword(value) { const password = String(value ?? ''); if (password.length < 8) fail('Le mot de passe doit contenir au moins 8 caractères.'); if (password.length > 200) fail('Le mot de passe est trop long.'); return password; }
function cleanName(value, field = 'name') { const v = String(value ?? '').trim(); if (v.length < 2 || v.length > 120) fail(`${field} doit contenir entre 2 et 120 caractères.`); return v; }

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}
function verifyPassword(password, encoded) {
  const [salt, expected] = String(encoded || '').split(':');
  if (!salt || !expected) return false;
  const actual = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return expected.length === actual.length && crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(actual, 'hex'));
}
function b64url(value) { return Buffer.from(value).toString('base64url'); }
function signToken(payload, secret) {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64url(JSON.stringify(payload));
  const data = `${header}.${body}`;
  const signature = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  return `${data}.${signature}`;
}
function verifyToken(token, secret) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) fail('Session invalide.', 401);
  const [header, body, signature] = parts;
  const expected = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) fail('Session invalide.', 401);
  let payload; try { payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')); } catch { fail('Session invalide.', 401); }
  if (!payload.exp || payload.exp <= Math.floor(Date.now() / 1000)) fail('Session expirée.', 401);
  return payload;
}

function createAuthService(repository, { secret = process.env.ZANDO_AUTH_SECRET || 'dev-only-change-this-secret' } = {}) {
  const revoked = new Set();
  return {
    register: async (input) => {
      const email = validateEmail(input.email);
      const password = validatePassword(input.password);
      const role = input.role === 'merchant' ? 'merchant' : 'customer';
      const name = cleanName(input.name, 'name');
      if (await repository.findUserByEmail(email)) fail('Cette adresse e-mail est déjà utilisée.', 409);
      let merchantId = null;
      if (role === 'merchant') {
        const merchantName = cleanName(input.merchantName || name, 'merchantName');
        const city = cleanName(input.city || 'Kinshasa', 'city');
        const merchant = await repository.createMerchant({ name: merchantName, city });
        merchantId = merchant.id;
      }
      const user = await repository.createUser({ email, name, role, merchantId, courierId: null, passwordHash: hashPassword(password) });
      return publicUser(user);
    },
    login: async (input) => {
      const email = validateEmail(input.email);
      const password = String(input.password ?? '');
      const user = await repository.findUserByEmail(email);
      if (!user || !verifyPassword(password, user.passwordHash)) fail('E-mail ou mot de passe incorrect.', 401);
      const now = Math.floor(Date.now() / 1000);
      const token = signToken({ sub: user.id, role: user.role, merchantId: user.merchantId || null, iat: now, exp: now + TOKEN_TTL_SECONDS, jti: crypto.randomUUID() }, secret);
      return { token, user: publicUser(user) };
    },
    authenticate: async (req) => {
      const header = String(req.headers.authorization || '');
      if (!header.startsWith('Bearer ')) fail('Authentification requise.', 401);
      const token = header.slice(7).trim();
      if (!token || revoked.has(token)) fail('Session invalide.', 401);
      const payload = verifyToken(token, secret);
      const user = await repository.findUserById(payload.sub);
      if (!user) fail('Compte introuvable.', 401);
      return { user, payload, token };
    },
    revoke(token) { if (token) revoked.add(token); },
    publicUser
  };
}
function publicUser(user) { return { id: user.id, email: user.email, name: user.name, role: user.role, merchantId: user.merchantId || null, courierId: user.courierId || null, createdAt: user.createdAt }; }
module.exports = { createAuthService, hashPassword, verifyPassword, validateEmail, validatePassword, publicUser };
