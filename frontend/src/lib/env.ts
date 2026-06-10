const backendUrl = process.env.BACKEND_URL;

if (!backendUrl) {
  throw new Error("BACKEND_URL no esta configurado");
}

export const env = {
  BACKEND_URL: backendUrl,
};
