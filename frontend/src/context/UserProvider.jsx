// context/UserProvider.jsx
import React, { createContext, useEffect, useState } from "react";

export const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);

  // Load user from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch (e) {
      console.warn("Invalid stored user");
    }
  }, []);

  // Listen for login/logout events
  useEffect(() => {
    const handler = (e) => {
      if (e.detail) {
        setUser(e.detail);
        localStorage.setItem("user", JSON.stringify(e.detail));
      } else {
        setUser(null);
        localStorage.removeItem("user");
      }
    };

    window.addEventListener("user-updated", handler);
    return () => window.removeEventListener("user-updated", handler);
  }, []);

  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  );
}
