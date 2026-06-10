import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import keycloak from "../services/keycloak";

interface AuthContextValue {
  ready: boolean;
  authenticated: boolean;
  username: string;
  userId: string;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [ready, setReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    keycloak
      .init({
        onLoad: "login-required",
        checkLoginIframe: false,
        pkceMethod: "S256",
      })
      .then((auth) => {
        setAuthenticated(auth);
        setReady(true);
      })
      .catch(() => {
        setReady(true);
      });
  }, []);

  const logout = () => {
    keycloak.logout({ redirectUri: window.location.origin });
  };

  const value: AuthContextValue = {
    ready,
    authenticated,
    username: keycloak.tokenParsed?.preferred_username ?? "",
    userId: keycloak.tokenParsed?.sub ?? "",
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};