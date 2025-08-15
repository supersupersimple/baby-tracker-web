"use client";

import { useState, useEffect } from "react";

export function LayoutIndicator() {
  const [screenSize, setScreenSize] = useState("unknown");

  useEffect(() => {
    const updateScreenSize = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setScreenSize("mobile");
      } else if (width < 1024) {
        setScreenSize("tablet");
      } else {
        setScreenSize("desktop");
      }
    };

    updateScreenSize();
    window.addEventListener("resize", updateScreenSize);
    return () => window.removeEventListener("resize", updateScreenSize);
  }, []);

  return (
    <div className="fixed bottom-4 left-4 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded z-50">
      {screenSize} ({typeof window !== "undefined" ? window.innerWidth : "?"}px)
    </div>
  );
}
