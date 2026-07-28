import crypto from "node:crypto";

// Contrasena inicial cuando no hay DNI: el usuario la recupera con "olvide mi contrasena".
export function randomPassword() {
  return crypto.randomBytes(12).toString("base64url");
}
