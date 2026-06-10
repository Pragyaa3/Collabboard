import Keycloak from "@keycloak/keycloak-js";

const keycloak = new Keycloak({
  url: import.meta.env.VITE_KEYCLOAK_URL ?? "http://localhost:8080",
  realm: import.meta.env.VITE_KEYCLOAK_REALM ?? "collabboard",
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID ?? "collabboard-frontend",
});

export default keycloak;