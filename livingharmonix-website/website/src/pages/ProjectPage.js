// src/pages/ProjectPage.js

import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AWS from "aws-sdk";
import {
  createGeoVisionFolder,
  setupUserFolderAndListProjects,
  createProject,
  deleteProject,
  loadZenGuideTemplate,
  loadProjectTemplate,
} from "../GeoVisionAI.js";
import "./ProjectPage.css";

export default function ProjectPage() {
  const [projects, setProjects] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [agentType, setAgentType] = useState("generic");

  useEffect(() => {
    async function loadProjects() {
      try {
        if (!AWS.config.credentials) {
          throw new Error("AWS credentials not yet configured");
        }

        // wait for the CognitoIdentityCredentials to be ready
        await new Promise((resolve, reject) => {
          AWS.config.credentials.get((err) => (err ? reject(err) : resolve()));
        });

        const userId = AWS.config.credentials.identityId;
        const awsCreds = AWS.config.credentials;

        // Ensure base folder exists
        await createGeoVisionFolder(userId, awsCreds);

        // List existing projects
        const s3Projects = await setupUserFolderAndListProjects(
          userId,
          awsCreds,
        );
        setProjects(s3Projects);
      } catch (err) {
        console.error("[ProjectPage] Failed to load projects:", err);
      }
    }
    loadProjects();
  }, []);

  const handleDeleteProject = async (projectId) => {
    if (!window.confirm(`Delete project "${projectId}"?`)) return;
    try {
      const userId = AWS.config.credentials.identityId;
      const awsCreds = AWS.config.credentials;
      await deleteProject(userId, projectId, awsCreds);
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
    } catch (err) {
      console.error("[ProjectPage] Delete failed:", err);
      alert("Could not delete project. See console for details.");
    }
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) {
      alert("Project name can’t be empty.");
      return;
    }

    const sanitized = newProjectName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\- ]/g, "")
      .replace(/\s+/g, "_");

    // prepend the agentType:
    const projectId = `${agentType}_${sanitized}`;

    const timestamp = new Date().toISOString();

    // Choose an emoji‐prefixed display name based on type
    let displayName;
    switch (agentType) {
      case "zen":
        displayName = `🌿 Zen: ${newProjectName}`;
        break;
      case "pinboard_zine":
        displayName = `📌: ${newProjectName}`;
        break;
      case "little_library":
        displayName = `📚: ${newProjectName}`;
        break;
      case "living_harmony":
        displayName = `🏡: ${newProjectName}`;
        break;
      default:
        displayName = newProjectName;
    }

    let projectData = {
      id: projectId,
      name: displayName,
      created_at: timestamp,
      updated_at: timestamp,
      sheet_url: "",
      s3_prefix: "",
    };

    try {
      const userId = AWS.config.credentials.identityId;
      const awsCreds = AWS.config.credentials;

      // Merge in template for non-generic types
      if (agentType === "zen") {
        const template = await loadZenGuideTemplate(awsCreds);
        projectData = { ...projectData, ...template };
      } else if (
        ["pinboard_zine", "living_harmony", "little_library"].includes(
          agentType,
        )
      ) {
        const template = await loadProjectTemplate(agentType, awsCreds);
        projectData = { ...projectData, ...template };
      }

      // override the template defaults with the user’s values
      projectData.id = projectId;
      projectData.name = displayName;
      const timestamp = new Date().toISOString();
      projectData.created_at = timestamp;
      projectData.updated_at = timestamp;

      const created = await createProject(
        userId,
        projectId,
        projectData,
        awsCreds,
      );
      setProjects((prev) => [...prev, created]);
      setNewProjectName("");
      setAgentType("generic");
      setIsCreating(false);
    } catch (err) {
      console.error("[ProjectPage] Create failed:", err);
      alert("Could not create project. See console for details.");
    }
  };

  return (
    <div className="project-page container mx-auto px-4 py-8">
      {/* Centered Header */}
      <header className="text-center mb-8"></header>
      {/* Projects Table */}
      <div className="overflow-x-auto mb-6">
        <h1 className="text-4xl font-bold mb-2">Your AI Agents</h1>
        <Link to="/" className="text-blue-500 hover:underline">
          ← Back to Home
        </Link>
        <hr></hr>
        <table className="w-full table-auto border-collapse">
          <thead>
            <tr className="border-b border-[#777]">
              <th className="px-4 py-2 w-[200px] text-left">Name</th>
              <th className="px-4 py-2 text-left">Camera</th>
              <th className="px-4 py-2 text-left">Bagua</th>
              <th className="px-4 py-2 text-left">Plan</th>
              <th className="px-4 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#777]">
            {projects.map((proj) => (
              <tr key={proj.id}>
                <td className="px-4 py-2 w-[200px]">
                  <Link
                    to={`/agent/${proj.id}`}
                    className="text-blue-600 hover:underline"
                  >
                    {proj.name}
                  </Link>
                </td>
                <td className="px-4 py-2">
                  <Link to={`/camera/${proj.id}`} className="hover:underline">
                    📷
                  </Link>
                </td>
                <td className="px-4 py-2">
                  <Link
                    to={`/baguaCamera/${proj.id}`}
                    className="hover:underline"
                  >
                    ☯️
                  </Link>
                </td>
                <td className="px-4 py-2">
                  {proj.plan_url ? (
                    <Link to={`/plan/${proj.id}`} className="hover:underline">
                      🔍
                    </Link>
                  ) : (
                    "-"
                  )}
                </td>

                <td className="px-4 py-2">
                  <button
                    onClick={() => handleDeleteProject(proj.id)}
                    className="text-red-500 hover:underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create New Project */}
      <div className="text-center">
        {!isCreating ? (
          <button
            onClick={() => setIsCreating(true)}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            + New Project
          </button>
        ) : (
          <div className="inline-block bg-white p-4 rounded shadow">
            <input
              type="text"
              placeholder="Project name"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              className="border px-2 py-1 mr-2"
              style={{
                padding: "2px",
              }}
            />
            <select
              value={agentType}
              onChange={(e) => setAgentType(e.target.value)}
              className="border px-2 py-1 mr-2"
              style={{
                padding: "2px",
                margin: "2px",
              }}
            >
              <option value="generic">Generic Agent</option>
              <option value="zen">🌿 Zen Guide</option>
              <option value="pinboard_zine">📌 Pinboard Zine</option>
              <option value="living_harmony">📚 Living Harmony</option>
              <option value="little_library">🏡 Little Library</option>
            </select>
            <button
              onClick={handleCreateProject}
              className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 mr-2"
              style={{
                padding: "2px",
                margin: "2px",
              }}
            >
              Create
            </button>
            <button
              onClick={() => setIsCreating(false)}
              className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
              style={{
                padding: "2px",
                margin: "2px",
              }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
