// src/pages/PinboardPage.js

import React, { useState, useEffect, useRef } from "react";
import "./PinboardPage.css";
import { getLocationDetails } from "../api/reverseGeocodeClient";
import {
  listImagesGroupedByDate,
  loadRecentEvents,
  saveCameraResponseImage,
} from "../GeoVisionAI";
import { Link } from "react-router-dom";
import AWS from "aws-sdk";
import CameraSwitcher from "../components/CameraSwitcher";
import { upsertProject } from "../api/projectsClient";

export default function PinboardPage() {
  const [location, setLocation] = useState("Loading location...");
  const [events, setEvents] = useState([]);
  const [photosByDate, setPhotosByDate] = useState({});
  const [showCamera, setShowCamera] = useState(false);
  // Track camera permission state
  const [hasCameraAccess, setHasCameraAccess] = useState(false);

  const [showPhotos, setShowPhotos] = useState(false); // <— new

  const [cameraError, setCameraError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Refs for video stream and hidden canvas
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Helper to re-ask for camera if the user taps “Enable Camera”
  const requestCameraAccess = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((t) => t.stop());
      setHasCameraAccess(true);
    } catch (err) {
      console.error("Camera access denied:", err);
      setCameraError(err);
    }
  };

  // Capture snapshot and upload
  const handleCapture = async () => {
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const dataUrl = canvas.toDataURL("image/png");
      const userId = AWS.config.credentials.identityId;
      const awsCreds = AWS.config.credentials;
      const agentType = "little_library";

      // Ensure project exists
      let pid = projectId;
      if (!pid) {
        const newProjectName = location;
        const { projectName: createdName, projectId: newId } =
          await upsertProject(newProjectName, agentType, awsCreds);
        setProjectId(newId);
        pid = newId;
        console.log(`Created project '${createdName}' (${pid})`);
      }

      await saveCameraResponseImage(userId, pid, dataUrl, awsCreds, 0);
      console.log("Snapshot saved.");

      // re‐load photos 10 seconds later
      setTimeout(() => {
        console.log("Refreshing photo list after snapshot…");
        fetchPhotos().finally(() => setIsRefreshing(false));
      }, 10000);

      // show pacifier
      setIsRefreshing(true);
    } catch (err) {
      console.error("Snapshot failed:", err);
    }
  };

  // 1) initial load: geocode + events
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async ({ coords: { latitude, longitude } }) => {
          try {
            const locationMap = await getLocationDetails(latitude, longitude);
            setLocation(locationMap.metro || locationMap.city || "Unknown");
          } catch {
            setLocation(`${latitude.toFixed(2)}, ${longitude.toFixed(2)}`);
          }
        },
        () => setLocation("Unknown"),
      );
    }

    loadRecentEvents()
      .then(setEvents)
      .catch((err) => console.error("Error loading events:", err));
  }, []);

  // 2) fetch photos only when toggled on
  useEffect(() => {
    if (!showPhotos) return;

    async function fetchPhotos() {
      try {
        const userId = AWS.config.credentials.identityId;
        const awsCreds = AWS.config.credentials;
        const agentType = "pinboard_zine";
        const grouped = await listImagesGroupedByDate(
          userId,
          agentType,
          awsCreds,
        );
        setPhotosByDate(grouped);
      } catch (err) {
        console.error("Failed to fetch photos:", err);
      }
    }

    fetchPhotos();
  }, [showPhotos]);

  // Format current date
  const weekOf = new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="pinboard-page">
      <Link to="/" className="text-blue-500 hover:underline">
        ← Back to Home
      </Link>

      <section className="events-section">
        {/* Accessible label for screen readers */}
        <h2 className="sr-only">
          Events in {location}, Week of {weekOf}
        </h2>

        {events.length > 0 ? (
          <table className="events-table w-full table-auto">
            <tbody className="divide-y divide-[#777]">
              {events.map((evt, idx) => (
                <tr key={idx}>
                  <td className="px-4 py-2 event-date">
                    {evt.date && !isNaN(new Date(evt.date).getTime())
                      ? new Date(evt.date).toLocaleDateString(undefined, {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })
                      : "TBA"}
                  </td>
                  <td className="px-4 py-2 event-info">
                    <a
                      href={evt.link || "#"}
                      target={evt.link ? "_blank" : undefined}
                      rel={evt.link ? "noopener noreferrer" : undefined}
                      className="event-title hover:underline"
                    >
                      {evt.title}
                    </a>
                    {evt.description && (
                      <p className="event-description">{evt.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-2 event-image">
                    {evt.image && (
                      <a
                        href={evt.link || "#"}
                        target={evt.link ? "_blank" : undefined}
                        rel={evt.link ? "noopener noreferrer" : undefined}
                        className="event-image-link"
                      >
                        <img
                          src={evt.image}
                          alt={evt.title}
                          className="event-thumbnail"
                        />
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="no-events">No upcoming events found.</p>
        )}
      </section>

      <section className="event-camera">
        {/* Toggle button */}
        <button
          onClick={() => {
            // if turning on, request permission first
            if (!showCamera && !hasCameraAccess) {
              requestCameraAccess();
            }
            setShowCamera(!showCamera);
          }}
          style={{
            marginBottom: "12px",
            padding: "8px 12px",
            borderRadius: "4px",
            background: "#007aff",
            color: "#fff",
            border: "none",
            cursor: "pointer",
          }}
        >
          {showCamera ? "Hide Camera" : "Show Camera"}
        </button>

        {/* Only show camera UI once toggled on */}
        {showCamera &&
          (hasCameraAccess ? (
            <>
              <div className="camera-wrapper" style={{ position: "relative" }}>
                <CameraSwitcher
                  onStream={(stream) => {
                    if (videoRef.current) videoRef.current.srcObject = stream;
                  }}
                  videoRef={videoRef}
                  videoProps={{ autoPlay: true, playsInline: true }}
                />
                <button
                  onClick={handleCapture}
                  className="capture-button"
                  style={{
                    position: "absolute",
                    bottom: 12,
                    right: 12,
                    padding: "12px 16px",
                    fontSize: "1rem",
                    background: "rgba(0,0,0,0.6)",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                  }}
                >
                  📸 Snap
                </button>
                <canvas ref={canvasRef} style={{ display: "none" }} />
              </div>

              {isRefreshing && (
                <div style={{ textAlign: "center", marginTop: "8px" }}>
                  Processing…
                </div>
              )}
            </>
          ) : cameraError ? (
            <div style={{ marginTop: 16 }}>
              <p>📵 Camera access denied.</p>
              <button
                onClick={requestCameraAccess}
                style={{
                  marginTop: 8,
                  padding: "8px 12px",
                  borderRadius: "4px",
                  background: "#007aff",
                  color: "#fff",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Enable Camera
              </button>
            </div>
          ) : (
            <p>🔄 Checking camera permission…</p>
          ))}
      </section>

      {/* Photos Toggle */}
      <section>
        <button
          onClick={() => setShowPhotos(!showPhotos)}
          style={{
            margin: "1em 0",
            padding: "0.5em 1em",
            background: "#007aff",
            color: "#fff",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
          }}
        >
          {showPhotos ? "Hide Photos" : "Show Photos"}
        </button>
      </section>
      {/* Photos Section (only if showPhotos) */}
      {showPhotos && (
        <section className="photos-section">
          <h2>Photo Pinboard</h2>
          {AWS.config.credentials?.identityId ? (
            Object.entries(photosByDate).map(([date, images]) => (
              <div key={date} className="date-group">
                <h3>
                  {new Date(date).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </h3>
                <div className="masonry">
                  {images.map(({ key, url, description, html }) => (
                    <div key={key} className="masonry-item">
                      <img src={url} alt={description} />
                      <p
                        className="caption"
                        dangerouslySetInnerHTML={{ __html: html }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <p className="no-photos">
              Photos are private. Please log in to view or create photos.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
