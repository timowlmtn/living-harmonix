// src/pages/LittleLibraryPage.js

import React, { useState, useEffect, useRef } from "react";
import "./ArticlePage.css";
import { getLocationDetails } from "../api/reverseGeocodeClient";
import {
  listImagesGroupedByDate,
  saveCameraResponseImage,
} from "../GeoVisionAI";
import { upsertProject } from "../api/projectsClient.js";
import { Link } from "react-router-dom";
import AWS from "aws-sdk";
import CameraSwitcher from "../components/CameraSwitcher";

export default function LittleLibraryPage() {
  const [location, setLocation] = useState("Loading location...");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [photosByDate, setPhotosByDate] = useState({});
  const [projectId, setProjectId] = useState(null);

  const [selectedPhoto, setSelectedPhoto] = useState(null);

  const [showCamera, setShowCamera] = useState(false);

  // Track camera permission state
  const [hasCameraAccess, setHasCameraAccess] = useState(false);
  const [cameraError, setCameraError] = useState(null);

  // Refs for video stream and hidden canvas
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // ─── new book‐search state/hooks ──────────────────────────────────────────
  const [books, setBooks] = useState([]);
  const [searchCategory, setSearchCategory] = useState("genre");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    // fetch your list of books from an API or local data source
    async function fetchBooks() {
      try {
        const resp = await fetch("/api/books");
        const data = await resp.json();
        setBooks(data);
      } catch (err) {
        console.error("Failed to load books:", err);
      }
    }
    fetchBooks();
  }, []);

  // filter based on dropdown + query
  const filteredBooks = books.filter((book) =>
    book[searchCategory]
      .toLowerCase()
      .includes(searchQuery.trim().toLowerCase()),
  );

  // 1) Reverse-geocode user location
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocation("Geolocation not supported");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude, longitude } }) => {
        try {
          const locationMap = await getLocationDetails(latitude, longitude);
          setLocation(
            locationMap.neighbourhood ||
              locationMap.town ||
              locationMap.metro ||
              locationMap.city ||
              "Unknown Location",
          );
        } catch {
          setLocation(`${latitude.toFixed(2)}, ${longitude.toFixed(2)}`);
        }
      },
      () => setLocation("Unknown Location"),
    );
  }, []);

  // 2) Check camera permission on mount
  useEffect(() => {
    const checkCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        // immediately stop; we just wanted to trigger/verify permission
        stream.getTracks().forEach((t) => t.stop());
        setHasCameraAccess(true);
      } catch (err) {
        console.error("Camera access error:", err);
        setCameraError(err);
      }
    };
    checkCamera();
  }, []);

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

  // 3) Photo-fetcher (pull out so we can call it multiple times)
  async function fetchPhotos() {
    try {
      const userId = AWS.config.credentials.identityId;
      const awsCreds = AWS.config.credentials;
      const agentType = "little_library";
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

  // initial load
  useEffect(() => {
    fetchPhotos();
  }, []);

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

  return (
    <div className="little-library-page">
      <Link to="/" className="text-blue-500 hover:underline">
        ← Back to Home
      </Link>

      <section className="camera-section">
        <h2>Little Library Catalog – {location}</h2>

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

      {/* ─── Book Search Section ─────────────────────────────────────────────── */}
      <section className="search-section" style={{ marginTop: 32 }}>
        <h2>Search Books</h2>
        <div
          className="search-controls"
          style={{ display: "flex", gap: 8, marginBottom: 16 }}
        >
          <select
            value={searchCategory}
            onChange={(e) => setSearchCategory(e.target.value)}
            style={{ padding: "8px", borderRadius: 4 }}
          >
            <option value="title">Title</option>
            <option value="author">Author</option>
            <option value="genre">Genre</option>
          </select>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search by ${searchCategory}…`}
            style={{ flex: 1, padding: "8px", borderRadius: 4 }}
          />
        </div>

        <ul className="books-list" style={{ listStyle: "none", padding: 0 }}>
          {filteredBooks.length > 0 ? (
            filteredBooks.map((book) => (
              <li
                key={book.id}
                style={{
                  padding: "8px 0",
                  borderBottom: "1px solid #eee",
                }}
              >
                <strong>{book.title}</strong> by {book.author}{" "}
                <em>({book.genre})</em>
              </li>
            ))
          ) : (
            <li>No books match your search.</li>
          )}
        </ul>
      </section>

      <section className="photos-section">
        <h2>Photo Library</h2>

        {/* PHOTO DETAILS MODAL */}
        {selectedPhoto && (
          <div
            className="photo-modal-overlay"
            onClick={() => setSelectedPhoto(null)}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0,0,0,0.7)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
            }}
          >
            <div
              className="photo-modal-content"
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "#fff",
                padding: "16px",
                borderRadius: "8px",
                maxWidth: "90vw",
                maxHeight: "90vh",
                overflow: "auto",
                textAlign: "center",
              }}
            >
              <img
                src={selectedPhoto.url}
                alt={selectedPhoto.description}
                style={{
                  maxWidth: "100%",
                  maxHeight: "80vh",
                  marginBottom: "12px",
                }}
              />
              {selectedPhoto.description && (
                <p style={{ marginBottom: "12px" }}>
                  {selectedPhoto.description}
                </p>
              )}
              <button
                onClick={() => setSelectedPhoto(null)}
                style={{
                  padding: "8px 16px",
                  background: "#007aff",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* MAIN GALLERY */}
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
                {images.map(({ key, url, description }) => (
                  <div
                    key={key}
                    className="masonry-item"
                    style={{ cursor: "pointer" }}
                    onClick={() => setSelectedPhoto({ url, description })}
                  >
                    <img src={url} alt={description} />
                    <p className="caption">{description}</p>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <p className="no-photos">
            All photos are private. Please log in on the home page to create
            photos.
          </p>
        )}
      </section>
    </div>
  );
}
