// src/pages/ArticlePage.js
import React, { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { loadPublicArticle } from "../GeoVisionAI.js";

export default function ArticlePage() {
  const { id } = useParams();
  const [md, setMd] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    setError(null);
    setMd("");
    loadPublicArticle(id)
      .then(setMd)
      .catch((e) => setError(e.message));
  }, [id]);

  if (error) {
    return <p>Error: {error}</p>;
  }
  if (!md) {
    return <p>Loading…</p>;
  }

  return (
    <div style={{ maxWidth: 800, margin: "2rem auto", padding: "0 1rem" }}>
      <Link to="/" className="text-blue-500 hover:underline">
        ← Back to Home
      </Link>
      <ReactMarkdown>{md}</ReactMarkdown>
    </div>
  );
}
