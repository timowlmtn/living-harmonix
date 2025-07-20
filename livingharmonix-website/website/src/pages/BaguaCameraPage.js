import React, { useState, useRef, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import AWS from "aws-sdk";
import {
  saveCameraResponseImage,
  saveCameraResponseImageAndWaitForText,
} from "../GeoVisionAI.js";

import BaguaSVG from "../components/BaguaSVG.js";

export default function BaguaCameraPage({ onSubmit }) {
  const { projectId } = useParams();
  const navigate = useNavigate();

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

  // ─── Reset all captures ───────────────────────────────────────
  const resetAll = () => {
    setImages(initialImages);
    image_map.current.clear();
    setSubmitted(false);
    console.log("All images and image_map have been reset");
  };

  const [images, setImages] = useState(initialImages);
  const [activeRegion, setActiveRegion] = useState(null);

  const [submitted, setSubmitted] = useState(false);

  // refs for hidden video & canvas
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

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
        window.projectIdGlobal,
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

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-2">Bagua Camera ({projectId})</h1>
      <Link to="/project" className="text-blue-500 hover:underline">
        ← Back to Agents
      </Link>

      <BaguaSVG
        images={images}
        onRegionClick={handleRegionClick}
        submitted={submitted}
      />

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
                          style={{ width: 200 }}
                        />
                      )}
                      {region === null && (
                        <button
                          onClick={() => handleRegionClick("center")}
                          className="w-full h-full flex items-center justify-center font-bold"
                        >
                          Save
                        </button>
                      )}
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
