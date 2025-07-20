import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import AWS from "aws-sdk";
import {
  saveCameraResponseImage,
  deleteAllProjectData,
  deleteTodayProjectData,
} from "../GeoVisionAI.js";

import BaguaSVG from "../components/BaguaSVG.js";
import {
  upsertProject,
  saveProjectImages,
  showProjectOptions,
} from "../api/projectsClient";

const quotes = [
  {
    text: "Nature does not hurry, yet everything is accomplished.",
    author: "Lao Tzu",
  },
  {
    text: "The journey of a thousand miles begins with a single step.",
    author: "Lao Tzu",
  },
  {
    text: "When you realize nothing is lacking, the whole world belongs to you.",
    author: "Lao Tzu",
  },
  {
    text: "To study the self is to forget the self. To forget the self is to be enlightened by all things.",
    author: "Dōgen",
  },
  {
    text: "Sitting quietly, doing nothing, spring comes, and the grass grows by itself.",
    author: "Zen Proverb",
  },
  {
    text: "Let go or be dragged.",
    author: "Zen Proverb",
  },
  {
    text: "The obstacle is the path.",
    author: "Zen Saying",
  },
  {
    text: "Do not seek the truth, only cease to cherish your opinions.",
    author: "Seng-ts’an",
  },
  {
    text: "If you cannot find the truth right where you are, where else do you expect to find it?",
    author: "Dōgen",
  },
  {
    text: "Mind is the forerunner of all things.",
    author: "Gautama Buddha",
  },
  {
    text: "Peace comes from within. Do not seek it without.",
    author: "Gautama Buddha",
  },
  {
    text: "The quieter you become, the more you are able to hear.",
    author: "Rumi",
  },
  {
    text: "Only when the mind is free from the old can it discover the new.",
    author: "Shunryu Suzuki",
  },
  {
    text: "In the beginner’s mind there are many possibilities; in the expert’s mind there are few.",
    author: "Shunryu Suzuki",
  },
  {
    text: "Look at everything as though you were seeing it either for the first or last time.",
    author: "Gautama Buddha",
  },
  {
    text: "True wisdom lies in gathering the precious moments out of each day.",
    author: "Tibetan Saying",
  },
  {
    text: "To let go is to be free.",
    author: "Tibetan Proverb",
  },
  {
    text: "You are the sky. Everything else—it’s just the weather.",
    author: "Pema Chödrön",
  },
  {
    text: "The only Zen you find on the tops of mountains is the Zen you bring up there.",
    author: "Robert M. Pirsig",
  },
  {
    text: "One’s destination is never a place, but a new way of seeing things.",
    author: "Henry Miller",
  },
];

export default function LivingHarmonyPage({ onSubmit }) {
  const [projectId, setProjectId] = useState("Default");
  const [projectName, setProjectName] = useState("Default");
  const [centerQuote, setCenterQuote] = useState({ text: "", author: "" });

  const [projectOptions, setProjectOptions] = useState([
    { value: "Default", name: "Create New Project" },
  ]);

  const agentType = "living_harmony";

  // persistent map to store images by region
  const image_map = useRef(new Map());

  const initialImages = {
    N: null,
    NE: null,
    E: null,
    SE: null,
    S: null,
    SW: null,
    W: null,
    NW: null,
  };

  // ─── Load, geolocate & log projects on mount ─────────────────────────────────
  useEffect(() => {
    const creds = AWS.config.credentials;
    const userId = creds && creds.identityId;
    if (!userId) {
      console.warn("[GeoVisionAI] no userId, skipping project list");
      return;
    }

    // Ask browser for current position
    navigator.geolocation.getCurrentPosition(
      ({ coords: { latitude, longitude } }) => {
        // on success, call showProjects with actual coords
        showProjectOptions(latitude, longitude)
          .then((projects) => {
            console.log(
              `[GeoVisionAI] projects near (${latitude},${longitude}):`,
              projects,
            );
            setProjectOptions(projects);
            if (opts.length > 0) {
              setProjectName(opts[0].value);
            }
          })
          .catch((err) => {
            console.error("[GeoVisionAI] error listing projects:", err);
          });
      },
      (error) => {
        // on error/fallback, still call showProjects without coords
        console.error("[GeoVisionAI] geolocation failed:", error);
        showProjects()
          .then((projects) => {
            console.log("[GeoVisionAI] projects (no geo):", projects);
          })
          .catch((err) => {
            console.error("[GeoVisionAI] error listing projects:", err);
          });
      },
    );
  }, []); // runs once on load

  // ─── Reset all captures ───────────────────────────────────────
  const resetAll = async () => {
    try {
      console.log("Deleting data for project:", projectId);
      // Clear S3 project data for the default project
      await deleteAllProjectData("Default");
      await deleteTodayProjectData(projectId);
      console.log("S3 project data cleared.");

      // Clear local state
      setImages(initialImages);
      image_map.current.clear();
      setSubmitted(false);
      console.log("All images and image_map have been reset");
    } catch (err) {
      console.error("[LivingHarmonyPage] resetAll failed:", err);
      alert("Failed to reset project data: " + err.message);
    }
  };

  const [images, setImages] = useState(initialImages);
  const [activeRegion, setActiveRegion] = useState(null);

  const [submitted, setSubmitted] = useState(false);

  // refs for hidden video & canvas
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // pick random quote once
  useEffect(() => {
    setCenterQuote(quotes[Math.floor(Math.random() * quotes.length)]);
  }, []);

  // set global IDs once
  useEffect(() => {
    const creds = AWS.config.credentials;
    if (creds && typeof creds.get === "function") {
      creds.get((err) => {
        if (!err) window.userIdGlobal = creds.identityId;
      });
    } else if (creds?.identityId) {
      window.userIdGlobal = creds.identityId;
    }
    window.projectIdGlobal = projectId;
  }, [projectId]);

  const directionOrder = ["SE", "S", "SW", "E", null, "W", "NE", "N", "NW"];

  // Handle clicks: reset submitted on region capture
  const handleRegionClick = async (region) => {
    if (region === "center") {
      onSubmit && onSubmit(images);
      setSubmitted(true);
      return;
    }

    try {
      // 1. Start camera
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      const video = videoRef.current;
      video.srcObject = stream;
      await video.play();

      // 2. Capture one frame
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d").drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL("image/png");

      // 3. Upload image to AWS S3
      stream.getTracks().forEach((t) => t.stop());
      console.log(
        "Saving image for project, c:",
        window.userIdGlobal,
        "region:",
        window.projectIdGlobal,
      );
      const text = await saveCameraResponseImage(
        window.userIdGlobal,
        "Default",
        dataUrl,
        AWS.config.credentials,
        60000,
        2000,
        0,
      );

      // 4. Update state + map
      setImages((prev) => ({ ...prev, [region]: dataUrl }));
      image_map.current.set(region, dataUrl);
      console.log(`Captured & stored image for region "${region}"`);

      // 4. Clean up
      stream.getTracks().forEach((t) => t.stop());
    } catch (err) {
      console.error(err);
      alert("Unable to capture image.");
    }
  };

  // Start camera on region selection
  useEffect(() => {
    let stream;
    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      } catch {
        alert("Unable to access camera.");
        setActiveRegion(null);
      }
    }
    if (activeRegion) startCamera();
    return () => stream && stream.getTracks().forEach((t) => t.stop());
  }, [activeRegion]);

  // Capture frame
  const captureFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/png");
    setImages((prev) => ({ ...prev, [activeRegion]: dataUrl }));
    setActiveRegion(null);
  };

  const cancelCapture = () => setActiveRegion(null);

  // ─── upsert project + save all images ──────────────────────────
  const saveProjectData = async (newProjectName, images) => {
    try {
      // await the upsert so we get the new projectId back
      const { projectName, projectId } = await upsertProject(
        newProjectName,
        agentType,
        AWS.config.credentials,
      );

      // now update your header state
      setProjectName(projectName);
      setProjectId(projectId);

      console.log("images to save:", images);

      await saveProjectImages(
        userIdGlobal,
        projectId,
        images,
        AWS.config.credentials,
      );
    } catch (err) {
      console.error("Error saving project:", err);
    }
  };

  // ─── Save handler ─────────────────────────────────────────────
  const handleSave = () => {
    const name = window.prompt(
      "Enter a project name to save your captures:",
      projectName,
    );
    if (!name) return; // user cancelled
    setProjectId(name); // triggers re-render
    console.log("Chosen project name:", name);
    saveProjectData(name, images); // your save logic
  };

  function handleProjectChange(e) {
    setProjectName(e.target.value);
  }

  return (
    <div className="p-4">
      <Link to="/" className="text-blue-500 hover:underline">
        ← Back to Home
      </Link>

      {/* ─── Project Selector ─────────────────────────────── */}
      <div className="my-4">
        <label htmlFor="projectSelect" className="block font-medium mb-1">
          Select or create a project:
        </label>
        <select
          id="projectSelect"
          value={projectName}
          onChange={handleProjectChange}
          className="border rounded p-2 w-full max-w-xs"
        >
          {projectOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.name}
            </option>
          ))}
        </select>
      </div>
      {/* ───────────────────────────────────────────────────── */}

      <h1 className="text-xl font-bold mb-2">Living Harmony ({projectName})</h1>

      <BaguaSVG
        images={images}
        onRegionClick={handleRegionClick}
        onSave={handleSave}
        submitted={submitted}
      />
      <div className="flex flex-col items-center justify-center h-full w-full text-center">
        <p className="italic text-sm text-gray-700 leading-tight">
          “{centerQuote.text}”
        </p>
        <p className="mt-1 text-xs font-semibold text-gray-500">
          ― {centerQuote.author}
        </p>
      </div>
      {/* ─── Controls ───────────────────────────────────────────────────── */}
      <div className="flex items-center mb-4">
        <button
          onClick={resetAll}
          className="flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-2xl shadow-lg transform transition duration-200 hover:scale-105"
        >
          <span className="mr-3 text-2xl">🧹</span>
          Reset All
        </button>
      </div>

      {/* ─── 3×3 Thumbnail table, with visible cell borders ───────────── */}
      <div className="mt-4 mx-auto" style={{ width: 200 }}>
        <table className="mt-4 mx-auto border-collapse border border-gray-300">
          <tbody>
            {[0, 1, 2].map((row) => (
              <tr key={row}>
                {[0, 1, 2].map((col) => {
                  const idx = row * 3 + col;
                  const region = directionOrder[idx];
                  const src = region ? images[region] : null;
                  return (
                    <td
                      key={col}
                      className="border border-gray-300 w-4 h-4 p-0"
                    >
                      {region && src && (
                        <img
                          src={src}
                          alt={region}
                          className="h-full w-full object-cover rounded"
                          style={{ width: 100 }}
                        />
                      )}
                      {region === null && <div></div>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* hidden elements for snapping */}
      <video ref={videoRef} style={{ display: "none" }} playsInline muted />
      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
}
