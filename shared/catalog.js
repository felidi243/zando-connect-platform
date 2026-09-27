const ROLES = Object.freeze({
  CUSTOMER: "CUSTOMER",
  MERCHANT: "MERCHANT",
  COURIER: "COURIER",
  HUB_MANAGER: "HUB_MANAGER",
  ADMIN: "ADMIN"
});

function normalizeSearch(value = "") {
  return String(value).trim().toLowerCase().replace(/\s+/g, " ");
}

module.exports = { ROLES, normalizeSearch };
