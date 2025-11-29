import { createContext, useState, useEffect } from "react";

export const ResumeContext = createContext();

export function ResumeProvider({ children }) {
  const [resume, setResume] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem("resume");
    if (saved) {
      const parsed = JSON.parse(saved);
      setResume({
        file: { name: parsed.name },
        url: parsed.url,
      });
    }
  }, []);

  return (
    <ResumeContext.Provider value={{ resume, setResume }}>
      {children}
    </ResumeContext.Provider>
  );
}
