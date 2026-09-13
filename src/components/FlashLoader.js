import React, { useState, useEffect } from "react";
import "./FlashLoader.css";

export default function FlashLoader({ isLoading }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isLoading) {
      setProgress(0);
      return;
    }

    // Simulates an unpredictable, classic Flash web loading jump
    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = prev + Math.floor(Math.random() * 12) + 6;
        return next >= 100 ? 100 : next;
      });
    }, 120);

    return () => clearInterval(interval);
  }, [isLoading]);

  if (!isLoading) return null;

  return (
    <div className="flash-loader-overlay">
      <div className="flash-loader-container">
        <h2 className="flash-loader-text">
          LOADING... <span className="flash-loader-percent">{progress}%</span>
        </h2>
        <div className="flash-loader-track">
          <div 
            className="flash-loader-fill" 
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}