// src/components/GeoVisionLayout.js
import React, { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import StaticPage from "../components/StaticPage";

// — cookie helpers —
function setCookie(name, value, days = 365) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/`;
}

function getCookie(name) {
  return document.cookie.split("; ").reduce((r, c) => {
    const [key, v] = c.split("=", 2);
    return key === name ? decodeURIComponent(v) : r;
  }, "");
}

// — GeoVisionHeader component —
function GeoVisionHeader({ location }) {
  return (
    <header className="geovision-header">
      <h1>Welcome to {location}</h1>
    </header>
  );
}

import { useRef } from "react";

function GeoVisionMenu({ activeLocation, onSelect }) {
  // Eventually we want this centered on your current geolocated town
  const locations = [
    "Lincoln",
    "Providence",
    "Jamestown",
    // …etc…
  ];

  const listRef = useRef(null);

  const scrollBy = (offset) => {
    listRef.current?.scrollBy({ left: offset, behavior: "smooth" });
  };

  return (
    <nav className="geovision-menu">
      <button
        className="slider-btn left"
        aria-label="Scroll left"
        onClick={() => scrollBy(-200)}
      >
        ◀
      </button>

      <ul className="slider-list" ref={listRef}>
        {locations.map((loc) => (
          <li
            key={loc}
            className={`slider-item ${loc === activeLocation ? "active" : ""}`}
            onClick={() => onSelect(loc)}
          >
            {loc.split(",")[0]}
          </li>
        ))}
      </ul>

      <button
        className="slider-btn right"
        aria-label="Scroll right"
        onClick={() => scrollBy(200)}
      >
        ▶
      </button>
    </nav>
  );
}

export default function GeoVisionLayout() {
  const defaultLocation = "Providence";
  const [location, setLocation] = useState(defaultLocation);
  const [s3Key, setS3Key] = useState(
    `US/RI/${defaultLocation}/index.html`,
  );

  // on mount, read the cookie
  useEffect(() => {
    const saved = getCookie("geovisionLocation");
    if (saved) setLocation(saved);
  }, []);

  // whenever location changes, update the S3 key
  useEffect(() => {
    setS3Key(`US/RI/${location}/index.html`);
  }, [location]);

  // when user picks a new location
  function handleSelect(loc) {
    setCookie("geovisionLocation", loc);
    setLocation(loc);
  }

  return (
    <>
      <GeoVisionHeader location={location} />
      <GeoVisionMenu activeLocation={location} onSelect={handleSelect} />

      {/* serve up the location-specific static page */}
      <StaticPage s3Key={s3Key} />

      <Outlet />
    </>
  );
}
