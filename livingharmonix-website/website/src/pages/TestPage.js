import React, { useState } from "react";
import AWS from "aws-sdk";
import { useNavigate } from "react-router-dom";
import {
  listProjectContents,
  setupUserFolderAndListProjects,
  getProjectData,
} from "../GeoVisionAI";

function TestPage() {
  const navigate = useNavigate();
  const [projectId, setProjectId] = useState("living_room"); // ← new!
  const [contents, setContents] = useState(null);
  const [s3Projects, setS3Projects] = useState(null);
  const [projectData, setProjectData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const runTest = async () => {
    setLoading(true);
    setError(null);
    setContents(null);

    try {
      const userId = AWS.config.credentials.identityId;
      const awsCreds = AWS.config.credentials;
      const date = new Date().toISOString().split("T")[0];

      if (!userId) throw new Error("Missing AWS credentials");

      const result = await listProjectContents(
        userId,
        projectId, // ← now dynamic
        awsCreds,
        date,
      );
      console.log("listProjectContents result:", result);
      setContents(result);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const runSetupFolderTest = async () => {
    setLoading(true);
    setError(null);
    setS3Projects(null);

    try {
      const userId = AWS.config.credentials.identityId;
      const awsCreds = AWS.config.credentials;
      if (!userId) throw new Error("Missing AWS credentials");

      const projects = await setupUserFolderAndListProjects(userId, awsCreds);
      console.log("setupUserFolderAndListProjects result:", projects);
      setS3Projects(projects);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  function formatIdentityId(identityId) {
    if (!identityId) return "🔒 Not signed in";
    const parts = identityId.split(":");
    const idPart = parts.length > 1 ? parts[1] : identityId;
    return `🧑‍💻 ${idPart.slice(0, 8)}...`;
  }

  // ─── Test 3: getProjectData ─────────────────────────────────
  const runGetProjectData = async () => {
    setLoading(true);
    setError(null);
    setProjectData(null);

    try {
      const userId = AWS.config.credentials.identityId;
      const awsCreds = AWS.config.credentials;
      if (!userId) throw new Error("Missing AWS credentials");

      const project = await getProjectData(userId, projectId);
      console.log("getProjectData result:", project);
      setProjectData(project);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: "600px",
        margin: "0 auto",
        padding: "1rem",
        fontFamily: "Arial, sans-serif",
        backgroundColor: "#fffdf8",
        color: "#333",
      }}
    >
      <button
        className="back-button"
        onClick={() => navigate("/", { replace: true })}
      >
        ← Back to Agents
      </button>

      <h1>🧪 Test Page</h1>
      <p>
        <strong>AWS Identity:</strong>{" "}
        {formatIdentityId(AWS.config.credentials?.identityId)}
      </p>

      {/* New: project selector */}
      <div style={{ margin: "1rem 0" }}>
        <label>
          <strong>Project ID: </strong>
          <input
            type="text"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            style={{ padding: "0.25rem", fontSize: "1rem", width: "200px" }}
          />
        </label>
      </div>

      {/* Test 1: listProjectContents */}
      <button onClick={runTest} disabled={loading}>
        {loading ? "Loading…" : "Run listProjectContents()"}
      </button>

      {/* Test 2: setupUserFolderAndListProjects */}
      <button
        onClick={runSetupFolderTest}
        disabled={loading}
        style={{ marginLeft: "1rem" }}
      >
        {loading ? "Loading…" : "Run setupUserFolderAndListProjects()"}
      </button>

      <br />

      {/* Test 3: getProjectData */}
      <button
        onClick={runGetProjectData}
        disabled={loading}
        style={{ marginLeft: "1rem" }}
      >
        {loading ? "Loading…" : "Run getProjectData()"}
      </button>

      {error && <p style={{ color: "red" }}>❌ {error}</p>}

      {contents && (
        <div style={{ marginTop: "1rem" }}>
          <h2>✅ S3 Contents for “{projectId}”:</h2>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              background: "#f0f0f0",
              padding: "1rem",
            }}
          >
            {JSON.stringify(contents, null, 2)}
          </pre>
        </div>
      )}

      {projectData && (
        <div style={{ marginTop: "1rem" }}>
          <h2>✅ getProjectData Result for “{projectId}”:</h2>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              background: "#eef9ff",
              padding: "1rem",
              border: "1px solid #99ccee",
              borderRadius: "0.25rem",
            }}
          >
            {JSON.stringify(projectData, null, 2)}
          </pre>
        </div>
      )}

      {s3Projects && (
        <div style={{ marginTop: "1rem" }}>
          <h2>✅ Projects (from setupUserFolderAndListProjects):</h2>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th
                  style={{
                    border: "1px solid #ccc",
                    padding: "0.5rem",
                    textAlign: "left",
                  }}
                >
                  project.json
                </th>
              </tr>
            </thead>
            <tbody>
              {s3Projects.map((proj, i) => (
                <tr key={i}>
                  <td
                    style={{
                      border: "1px solid #ccc",
                      padding: "0.5rem",
                      fontFamily: "monospace",
                      whiteSpace: "pre-wrap",
                      background: "#fafafa",
                    }}
                  >
                    {JSON.stringify(proj, null, 2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default TestPage;
