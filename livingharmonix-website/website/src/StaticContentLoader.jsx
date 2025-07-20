// src/StaticContentLoader.jsx
import React, { useEffect, useState } from "react";

export default function StaticContentLoader() {
  const [html, setHtml] = useState("");

  useEffect(() => {
    fetch("/US/index.html")
      .then((res) => res.text())
      .then((text) => {
        // parse out only the innerHTML of #static-root
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, "text/html");
        const fragment = doc.getElementById("static-root")?.innerHTML || "";
        setHtml(fragment);
      })
      .catch(() => {
        setHtml("<p>Sorry, failed to load static content.</p>");
      });
  }, []);

  return (
    <div
      id="static-root"
      // ⚠️ we trust this HTML because it lives on our server
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
