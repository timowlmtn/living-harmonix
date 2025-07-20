import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import AWS from "aws-sdk";

import {
  listProjectContents,
  flattenGeoData,
  parseTimestampFromFilename,
  getSecureImageURL,
  getTextFileContent,
  saveZenGuidePlanAndLink,
  deleteObject,
} from "../GeoVisionAI.js";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";

function degreesToCompass(degrees) {
  const directions = [
    "North",
    "North-East",
    "East",
    "South-East",
    "South",
    "South-West",
    "West",
    "North-West",
  ];
  const index = Math.round(degrees / 45) % 8;
  return `${directions[index]} (${degrees}°)`;
}

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
};

const IDENTITY_POOL_ID = process.env.REACT_APP_COGNITO_IDENTITY_POOL_ID;
const AWS_REGION = "us-east-1";
const BUCKET_NAME = process.env.REACT_APP_AZRIUS_APP_BUCKET;

const PROMPT_DEFAULTS = {
  caption: "Write a useful caption for each image.",
  summary: "Summarize the visual data points shown on the map.",
  analysis: "Analyze patterns or anomalies present in the image set.",
};

function AgentPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [projectData, setProjectData] = useState(null);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );

  const [promptType, setPromptType] = useState("caption");
  const [promptText, setPromptText] = useState(PROMPT_DEFAULTS.caption);
  const [showMap, setShowMap] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  const [fengshuiResult, setFengshuiResult] = useState(null);
  const [isCallingAPI, setIsCallingAPI] = useState(false);

  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem(`prompt-${projectId}`);
    if (saved) {
      const { promptType: savedType, prompt } = JSON.parse(saved);
      setPromptType(savedType || "caption");
      setPromptText(prompt || PROMPT_DEFAULTS.caption);
    }
  }, [projectId]);

  const runZenGuideAnalysis = async () => {
    setIsCallingAPI(true);
    setFengshuiResult(null);
    try {
      const folder = `geovision/${AWS.config.credentials.identityId}/${projectId}/${selectedDate}`;
      const response = await fetch(
        "https://r2h6kexg7d.execute-api.us-east-1.amazonaws.com/prod/fengshui",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ folder }),
        },
      );

      if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
      const data = await response.json();
      setFengshuiResult(data);
      console.log("Zen Guide Analysis Result:", data);
    } catch (err) {
      setFengshuiResult({ error: err.message });
    } finally {
      setIsCallingAPI(false);
    }
  };

  function generateZenGuideHTML(projectId, date, result) {
    return `
  <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding: 1rem; font-size: 14px; line-height: 1.4;">
    <h3 style="margin-bottom: 0.5rem;">🌿 Room Layout</h3>
    <p>${result.room_layout || "<em>No layout provided.</em>"}</p>

    <h3 style="margin-bottom: 0.5rem;">🪑 Furniture Positions</h3>
    <p>${result.furniture_positions || "<em>No furniture positions described.</em>"}</p>

    <h3 style="margin-bottom: 0.5rem;">🧭 Feng Shui Advice</h3>
    <p>${result.feng_shui_advice || "<em>No advice available.</em>"}</p>

    <div style="margin-top: 1rem; font-size: 12px; color: #666;">
      Images Analyzed: ${result.image_count || 0}
    </div>
  </div>
  `;
  }

  function generateZenGuideMarkdown(projectId, date, result, promptText) {
    const safePrompt = promptText.replace(/"/g, "'").replace(/\n/g, " ");
    return `
### 🌿 Room Layout
${result.room_layout || "_No layout provided._"}

### 🪑 Furniture Positions
${result.furniture_positions || "_No furniture positions described._"}

### 🧭 Feng Shui Advice
${result.feng_shui_advice || "_No advice available._"}


Images Analyzed ${result.image_count || 0}

`;
  }

  // Handler to delete an image
  const handleDelete = async (objectKey) => {
    try {
      setDeleting(objectKey);
      const userId = AWS.config.credentials.identityId;
      const awsCreds = AWS.config.credentials;
      await deleteObject(userId, awsCreds, projectId, selectedDate, objectKey);
      // Refresh after delete
      await loadProjectData();
    } catch (err) {
      console.error("Failed to delete image:", err);
    } finally {
      setDeleting(null);
    }
  };

  const handleSaveZenGuidePlan = async () => {
    if (!fengshuiResult) return;

    const today = selectedDate;
    // save as JSON so we keep the full structure
    // only save the final_summary, as a Markdown file
    const fileName = `zen_guide_plan_${projectId}_${today}.md`;
    const markdown = fengshuiResult.responses?.final_summary || "";
    const payload = markdown;

    try {
      const userId = AWS.config.credentials.identityId;
      const awsCreds = AWS.config.credentials;

      const { planKey, planUrl } = await saveZenGuidePlanAndLink(
        userId,
        projectId,
        selectedDate,
        fileName,
        payload,
        awsCreds,
      );
      alert(`Zen Guide saved:\n${planKey}\nLinked in ${fileName}.`);
    } catch (err) {
      console.error("Failed to save Zen Guide JSON:", err);
      alert("Failed to save JSON. Check console for details.");
    }
  };

  // 1) Extract fetch logic into a stable function
  const loadProjectData = useCallback(async () => {
    try {
      const userId = AWS.config.credentials?.identityId;
      if (!userId) throw new Error("Missing AWS Cognito credentials");

      // 1a) get the project.json
      const s3 = new AWS.S3({
        credentials: AWS.config.credentials,
        region: AWS_REGION,
      });
      const key = `geovision/${userId}/${projectId}/project.json`;
      const response = await s3
        .getObject({ Bucket: BUCKET_NAME, Key: key })
        .promise();
      const parsed = JSON.parse(response.Body.toString("utf-8"));

      // 1b) list & flatten your geo-points
      const projectContents = await listProjectContents(
        userId,
        projectId,
        AWS.config.credentials,
        selectedDate,
      );
      const points = flattenGeoData(projectContents);

      // 1c) build all your maps (URLs, descriptions, compass)
      const signedURLMap = {};
      const descriptionMap = {};
      const compassMap = {};

      await Promise.all(
        points.flatMap((pt) =>
          pt.files
            .filter((f) => f.endsWith(".png"))
            .map(async (file) => {
              const baseKey = `geovision/${userId}/${pt.project}/${pt.date}/${pt.lat}_${pt.lon}/`;
              const imageKey = `${baseKey}${file}`;
              const textKey = `${baseKey}${file.replace(".png", ".txt")}`;
              const fileKey = `${pt.lat}_${pt.lon}/${file}`;

              signedURLMap[fileKey] = await getSecureImageURL(
                BUCKET_NAME,
                imageKey,
                AWS.config.credentials,
              );
              descriptionMap[fileKey] = await getTextFileContent(
                BUCKET_NAME,
                textKey,
                AWS.config.credentials,
              );
              const match = file.match(/_(\d+)\.png$/);
              compassMap[fileKey] = match
                ? degreesToCompass(parseInt(match[1], 10))
                : "N/A";
            }),
        ),
      );

      // 1d) assemble and set state
      parsed.contents = projectContents;
      parsed.center = points.length ? [points[0].lat, points[0].lon] : [0, 0];
      parsed.points = points;
      parsed.signedURLs = signedURLMap;
      parsed.descriptions = descriptionMap;
      parsed.directions = compassMap;

      setProjectData(parsed);
      setError(null);
    } catch (err) {
      console.error("[AgentContainer] Error fetching data:", err);
      setError(err.message);
    }
  }, [projectId, selectedDate]);

  useEffect(() => {
    loadProjectData();
  }, [loadProjectData]);
  if (error) {
    return (
      <div className="container">
        <div className="card">
          <h2>Error</h2>
          <p>{error}</p>
          <button
            className="back-button"
            onClick={() => navigate("/project", { replace: true })}
          >
            ← Back to Agents
          </button>
        </div>
      </div>
    );
  }

  if (!projectData) {
    return (
      <div className="container">
        <div className="card">
          <p>Loading project…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="agent">
      <div className="form">
        <nav>
          <Link to="/project">← Back to Agents</Link>
        </nav>

        <h1>
          <a
            name={projectData.id}
            title={`Last updated: ${new Date(projectData.updated_at).toLocaleString()}`}
          >
            {projectData.name}
          </a>
        </h1>

        {/* ─── Prompt Form ─────────────────────────────────────────── */}
        {projectData.template_type === "feng_shui" ? (
          <div></div>
        ) : (
          <div
            style={{
              marginTop: "1rem",
              marginBottom: "2rem",
              padding: "1rem",
              border: "1px solid #ccc",
              borderRadius: "0.5rem",
              background: "#f9f9f9",
            }}
          >
            <h2>Project Type: {projectData.id}</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                localStorage.setItem(
                  `prompt-${projectId}`,
                  JSON.stringify({ promptType, prompt: promptText }),
                );
                alert("Prompt saved.");
              }}
            >
              <div style={{ marginBottom: "0.75rem" }}>
                <label htmlFor="promptType">
                  <strong>Prompt Type:</strong>
                </label>
                <br />
                <select
                  id="promptType"
                  name="promptType"
                  value={promptType}
                  onChange={(e) => {
                    const selected = e.target.value;
                    setPromptType(selected);
                    setPromptText(PROMPT_DEFAULTS[selected]);
                  }}
                  style={{
                    width: "100%",
                    padding: "0.5rem",
                    marginTop: "0.25rem",
                  }}
                >
                  <option value="caption">Caption Images</option>
                  <option value="summary">Summarize Map Findings</option>
                  <option value="analysis">Analyze Image Patterns</option>
                </select>
              </div>

              <div style={{ marginBottom: "1rem" }}>
                <label htmlFor="promptText">
                  <strong>Edit Prompt:</strong>
                </label>
                <br />
                <textarea
                  id="promptText"
                  name="promptText"
                  rows={4}
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.5rem",
                    fontFamily: "monospace",
                    fontSize: "1rem",
                    resize: "vertical",
                    marginTop: "0.25rem",
                  }}
                />
              </div>

              <button
                type="submit"
                style={{
                  padding: "0.5rem 1rem",
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                Save Prompt
              </button>
            </form>
          </div>
        )}

        {/* ─── Run Zen Guide Analysis ───────────────────────────────────── */}
        <div style={{ marginBottom: "2rem" }}>
          <button
            onClick={runZenGuideAnalysis}
            disabled={isCallingAPI}
            style={{
              padding: "0.5rem 1rem",
              fontWeight: "bold",
              background: "#d1e7dd",
              border: "1px solid #0f5132",
              color: "#0f5132",
              borderRadius: "0.25rem",
              cursor: isCallingAPI ? "not-allowed" : "pointer",
            }}
          >
            {isCallingAPI ? "Running Zen Guide…" : "Run Zen Guide Analysis"}
          </button>

          {fengshuiResult && (
            <div
              style={{
                marginTop: "1rem",
                padding: "1rem",
                background: "#f8f9fa",
                border: "1px solid #ccc",
                borderRadius: "0.5rem",
                whiteSpace: "pre-wrap",
              }}
            >
              <h3>🌿 Zen Guide Result 🌿</h3>

              {fengshuiResult.error ? (
                <div
                  style={{
                    padding: "1rem",
                    background: "#fff3f3",
                    border: "1px solid #ffaaaa",
                    borderRadius: "0.5rem",
                    color: "#b00020",
                    whiteSpace: "pre-wrap",
                    textAlign: "left",
                  }}
                >
                  ❌❌❌ <strong>Error Occurred</strong> ❌❌❌
                  <br />
                  {fengshuiResult.error}
                </div>
              ) : (
                <>
                  {/* final_summary pulled from summaries */}
                  {fengshuiResult.responses?.final_summary ? (
                    <pre
                      style={{
                        padding: "1rem",
                        background: "#f4f9f4",
                        border: "1px solid #cce3cc",
                        borderRadius: "0.5rem",
                        whiteSpace: "pre-wrap",
                        lineHeight: "1.6",
                        textAlign: "left",
                      }}
                    >
                      {fengshuiResult.responses.final_summary}
                    </pre>
                  ) : (
                    <p>No final summary available.</p>
                  )}

                  <div style={{ marginTop: "1rem" }}>
                    <button
                      onClick={handleSaveZenGuidePlan}
                      style={{
                        padding: "0.5rem 1rem",
                        backgroundColor: "#e6f4ea",
                        border: "1px solid #2d6a4f",
                        borderRadius: "0.25rem",
                        color: "#2d6a4f",
                        fontWeight: "bold",
                        cursor: "pointer",
                      }}
                    >
                      💾 Save as Zen Guide Plan
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* ─── Date Picker ───────────────────────────────────────────── */}
        <div style={{ marginBottom: "1rem" }}>
          <label>
            <strong>Select date: </strong>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </label>
        </div>

        {/* ─── Results Table ─────────────────────── */}
        <div style={{ marginTop: "2rem" }}>
          <h2>Image Captures</h2>
          {projectData.points.length === 0 ? (
            <p>No data available for this date.</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th
                    style={{
                      borderBottom: "1px solid #ccc",
                      padding: "0.5rem",
                    }}
                  >
                    Timestamp
                  </th>
                  <th
                    style={{
                      borderBottom: "1px solid #ccc",
                      padding: "0.5rem",
                    }}
                  >
                    Image
                  </th>
                  <th
                    style={{
                      borderBottom: "1px solid #ccc",
                      padding: "0.5rem",
                    }}
                  >
                    Lat
                  </th>
                  <th
                    style={{
                      borderBottom: "1px solid #ccc",
                      padding: "0.5rem",
                    }}
                  >
                    Lon
                  </th>
                  <th
                    style={{
                      borderBottom: "1px solid #ccc",
                      padding: "0.5rem",
                    }}
                  >
                    Compass
                  </th>
                  <th
                    style={{
                      borderBottom: "1px solid #ccc",
                      padding: "0.5rem",
                    }}
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {projectData.points.flatMap((pt, i) =>
                  pt.files
                    .filter((f) => f.endsWith(".png"))
                    .map((file, idx) => {
                      const fileKey = `${pt.lat}_${pt.lon}/${file}`;
                      const signedUrl = projectData.signedURLs?.[fileKey] || "";
                      const description =
                        projectData.descriptions?.[fileKey] ||
                        "No description available";

                      const compass =
                        projectData.directions?.[fileKey] || "N/A";

                      return (
                        <tr key={`${i}-${idx}`}>
                          <td style={{ padding: "0.5rem" }}>
                            {parseTimestampFromFilename(file)}
                          </td>
                          <td style={{ padding: "0.5rem" }}>
                            <img
                              src={signedUrl}
                              alt="thumbnail"
                              title={description}
                              onClick={() =>
                                setSelectedImage({
                                  url: signedUrl,
                                  caption: description,
                                })
                              }
                              style={{
                                width: "100px",
                                borderRadius: "0.25rem",
                                cursor: "pointer",
                              }}
                            />
                          </td>
                          <td style={{ padding: "0.5rem" }}>{pt.lat}</td>
                          <td style={{ padding: "0.5rem" }}>{pt.lon}</td>
                          <td style={{ padding: "0.5rem" }}>{compass}</td>
                          <td style={{ padding: "0.5rem" }}>
                            <button
                              onClick={() => handleDelete(fileKey)}
                              disabled={deleting === fileKey}
                              style={{
                                padding: "4px 8px",
                                background: "#e53e3e",
                                color: "#fff",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                                opacity: deleting === fileKey ? 0.6 : 1,
                              }}
                            >
                              {deleting === fileKey ? "Deleting..." : "Delete"}
                            </button>
                          </td>
                        </tr>
                      );
                    }),
                )}
              </tbody>
            </table>
          )}
        </div>

        <div style={{ marginTop: "2rem" }}>
          <div style={{ marginBottom: "1rem" }}>
            <button
              onClick={() => setShowMap((prev) => !prev)}
              style={{
                padding: "0.5rem 1rem",
                fontWeight: "bold",
                background: "#eee",
                border: "1px solid #ccc",
                borderRadius: "0.25rem",
                cursor: "pointer",
              }}
            >
              {showMap ? "Hide Map" : "Show Map"}
            </button>
          </div>

          {/* ─── Map ─────────────────────────────────────────────────── */}
          {showMap &&
            (projectData.points.length > 0 ? (
              <MapContainer
                key={selectedDate}
                center={projectData.center}
                zoom={15}
                style={{ width: "100%", height: "100vh" }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution="&copy; OpenStreetMap contributors"
                />
                {projectData.points.map((pt, i) => (
                  <Marker key={i} position={[pt.lat, pt.lon]}>
                    <Popup>
                      <strong>Project:</strong> {pt.project}
                      <br />
                      <strong>Date:</strong> {pt.date}
                      <br />
                      <strong>Files:</strong>
                      <ul style={{ margin: "0.5em 0 0 1em", padding: 0 }}>
                        {pt.files.map((f, idx) => (
                          <li key={idx}>{f}</li>
                        ))}
                      </ul>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            ) : (
              <div
                style={{
                  marginTop: "1rem",
                  fontStyle: "italic",
                  color: "#666",
                }}
              >
                No results found for this day. Please choose a different date to
                visualize the data on the map.
              </div>
            ))}
        </div>

        {selectedImage && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100vw",
              height: "100vh",
              backgroundColor: "rgba(0,0,0,0.8)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 1000,
              flexDirection: "column",
              padding: "2rem",
            }}
            onClick={() => setSelectedImage(null)}
          >
            <img
              src={selectedImage.url}
              alt="Full-size"
              style={{
                maxHeight: "80%",
                maxWidth: "90%",
                marginBottom: "1rem",
                borderRadius: "0.5rem",
                boxShadow: "0 0 20px black",
              }}
            />
            <div
              style={{
                color: "white",
                fontSize: "1.1rem",
                maxWidth: "90%",
                textAlign: "center",
                backgroundColor: "rgba(0,0,0,0.6)",
                padding: "1rem",
                borderRadius: "0.5rem",
              }}
            >
              {selectedImage.caption || "No caption available."}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AgentPage;
