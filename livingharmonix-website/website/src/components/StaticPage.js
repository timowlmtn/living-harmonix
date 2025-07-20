// src/components/StaticPage.js
import React, { useState, useEffect } from "react";

/**
 * Fetches a static HTML fragment from your public S3 site
 * and injects it into the page.
 *
 * Props:
 *   s3Key: string — the path under your bucket, e.g.
 *     "static/US/RI/Providence/providence.html"
 *
 * Env vars (in .env.local or .env):
 *   REACT_APP_STATIC_HOST=https://azri.us
 */
export default function StaticPage({ s3Key }) {
  const [html, setHtml] = useState("");
  const [status, setStatus] = useState("loading"); // 'loading' | 'error' | 'ready'

  useEffect(() => {
    const host = process.env.REACT_APP_STATIC_HOST || "https://azri.us";
    const url = `${host}/${s3Key}`;

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((text) => {
        setHtml(text);
        setStatus("ready");
      })
      .catch((err) => {
        console.error("[StaticPage] fetch error:", err);
        setStatus("error");
      });
  }, [s3Key]);

  if (status === "loading") {
    return <div id="static-root">Loading content…</div>;
  }
  if (status === "error") {
    return <div id="static-root">Unable to load content.</div>;
  }

  // ready
  return <div id="static-root" dangerouslySetInnerHTML={{ __html: html }} />;
}
