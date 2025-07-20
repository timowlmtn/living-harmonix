import React, { useState, useEffect, useRef } from "react";
import { Link, useParams } from "react-router-dom";
import AWS from "aws-sdk";
import {
  saveCameraResponseText,
  saveCameraResponseImageAndWaitForText,
} from "../GeoVisionAI.js";
import CameraSwitcher from "../components/CameraSwitcher.js";

const CameraPage = () => {
  // Read projectId (projectId) from route params
  const { projectId: projectId } = useParams();

  // Refs for video, canvas, and a "processing" flag
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const isProcessingRef = useRef(false);

  // State variables
  const [stream, setStream] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const intervalIdRef = useRef(null);
  const [cameraAccessGranted, setCameraAccessGranted] = useState(false);

  const [baseURL, setBaseURL] = useState("http://localhost:8080");
  const [instruction, setInstruction] = useState("What do you see?");
  const [response, setResponse] = useState("");
  const [intervalMs, setIntervalMs] = useState(30000);

  const [compassHeading, setCompassHeading] = useState(null);
  const [orientationRadians, setOrientationRadians] = useState(null);

  const [manualHeading, setManualHeading] = useState("0"); // Default to North

  // We’ll store the S3 prefix where camera frames should go
  const [s3Prefix, setS3Prefix] = useState("");

  // Styles (inlined to match original CSS)
  const containerStyle = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "20px",
    padding: "20px",
    backgroundColor: "#f0f0f0",
    fontFamily: "sans-serif",
  };

  const videoStyle = {
    width: "480px",
    height: "360px",
    border: "2px solid #333",
    backgroundColor: "#000",
    borderRadius: "8px",
  };

  const ioAreasStyle = {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    width: "100%",
    maxWidth: "800px",
  };

  const ioBlockStyle = {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    backgroundColor: "#fff",
    padding: "15px",
    borderRadius: "8px",
    boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
  };

  const textareaStyle = {
    width: "100%",
    minHeight: "80px",
    padding: "8px",
    border: "1px solid #ccc",
    borderRadius: "4px",
    fontSize: "14px",
    resize: "vertical",
  };

  const controlsStyle = {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    backgroundColor: "#fff",
    padding: "15px",
    borderRadius: "8px",
    boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
  };

  const labelStyle = {
    fontWeight: "bold",
  };

  const selectStyle = {
    padding: "8px",
    borderRadius: "4px",
    border: "1px solid #ccc",
  };

  const buttonStyle = {
    padding: "10px 20px",
    fontSize: "16px",
    cursor: "pointer",
    border: "none",
    borderRadius: "4px",
    color: "white",
    backgroundColor: isProcessing ? "#dc3545" : "#28a745", // red when stopping, green when starting
  };

  const handleOrientation = (event) => {
    // Check for absolute orientation (Android) or iOS compass heading
    if (event.absolute || event.webkitCompassHeading !== undefined) {
      // Get the heading from iOS (webkitCompassHeading) or Android (alpha)
      const rawHeading =
        event.webkitCompassHeading !== undefined
          ? event.webkitCompassHeading // iOS
          : event.alpha; // Android

      const adjustedHeading = rawHeading; // To adjust(rawHeading + 180) % 360;

      // Convert to radians
      const radians = (adjustedHeading * Math.PI) / 180;

      // Save both forms if needed
      setCompassHeading(adjustedHeading);
      setOrientationRadians(radians);

      console.log("Back camera adjusted heading:", adjustedHeading, "°");
      console.log("Heading in radians:", radians);
    }
  };

  // On component mount: request camera access
  useEffect(() => {
    async function requestAccess() {
      try {
        await navigator.mediaDevices.getUserMedia({ video: true });
        setCameraAccessGranted(true);
      } catch (err) {
        console.error("[CameraPage] Camera access denied", err);
        setResponse("Camera access denied. Please allow access to continue.");
      }

      // DeviceOrientation permission (iOS Safari)
      if (window.DeviceOrientationEvent) {
        try {
          if (typeof DeviceOrientationEvent.requestPermission === "function") {
            const response = await DeviceOrientationEvent.requestPermission();
            if (response === "granted") {
              window.addEventListener("deviceorientation", handleOrientation);
            }
          } else {
            // Android Chrome or desktop
            window.addEventListener("deviceorientation", handleOrientation);
          }
        } catch (err) {
          console.warn(
            "[CameraPage] Device orientation permission denied",
            err,
          );
        }
      }
    }

    requestAccess();

    return () => {
      window.removeEventListener("deviceorientation", handleOrientation);
    };
  }, []);

  const handleStream = (newStream) => {
    setStream(newStream);
    if (videoRef.current) {
      videoRef.current.srcObject = newStream;
    }
    setResponse("Camera access granted. Ready to start.");
  };

  // Capture a frame from the video and return a Base64 JPEG string
  const captureImage = () => {
    console.log("[CameraPage] captureImage() called");
    const videoEl = videoRef.current;
    const canvasEl = canvasRef.current;
    if (!stream || !videoEl || !videoEl.videoWidth) {
      console.warn("[CameraPage] Video stream not ready for capture.");
      return null;
    }
    console.log(
      "[CameraPage] Video element dimensions:",
      videoEl.videoWidth,
      videoEl.videoHeight,
    );
    canvasEl.width = videoEl.videoWidth;
    canvasEl.height = videoEl.videoHeight;
    const context = canvasEl.getContext("2d");
    context.drawImage(videoEl, 0, 0, canvasEl.width, canvasEl.height);
    const dataUrl = canvasEl.toDataURL("image/jpeg", 0.8); // JPEG @ 80% quality
    console.log("[CameraPage] Captured image as Base64 JPEG");
    return dataUrl;
  };

  // Send a single chat+image request to the backend
  const sendChatCompletionRequest = async (instr, imageBase64URL) => {
    console.log("[CameraPage] sendChatCompletionRequest() called");
    console.log("[CameraPage] Endpoint:", `${baseURL}/v1/chat/completions`);
    console.log("[CameraPage] Instruction:", instr);
    // Only log the length of the image string to avoid huge logs
    console.log(
      "[CameraPage] imageBase64URL length:",
      imageBase64URL ? imageBase64URL.length : 0,
    );

    try {
      const resp = await fetch(`${baseURL}/v1/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          max_tokens: 100,
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: instr },
                {
                  type: "image_url",
                  image_url: {
                    url: imageBase64URL,
                  },
                },
              ],
            },
          ],
        }),
      });
      console.log(
        "[CameraPage] Received HTTP status:",
        resp.status,
        resp.statusText,
      );
      if (!resp.ok) {
        const errorData = await resp.text();
        console.error(
          "[CameraPage] Server returned error:",
          resp.status,
          errorData,
        );
        return `Server error: ${resp.status} - ${errorData}`;
      }
      const data = await resp.json();
      console.log("[CameraPage] Response JSON:", data);
      const messageContent = data.choices[0].message.content;
      console.log("[CameraPage] Extracted message content:", messageContent);
      return messageContent;
    } catch (err) {
      console.error("[CameraPage] Fetch error:", err);
      return `Request failed: ${err.message}`;
    }
  };

  // Called on each interval tick (and once immediately)
  const sendData = async () => {
    console.log(
      "[CameraPage] sendData() called; isProcessingRef.current =",
      isProcessingRef.current,
    );
    if (!isProcessingRef.current) {
      console.log("[CameraPage] sendData aborted; not processing");
      return;
    }

    const imageBase64URL = captureImage();
    if (!imageBase64URL) {
      console.warn("[CameraPage] Failed to capture image.");
      setResponse("Failed to capture image. Stream might not be active.");
      return;
    }

    // === HERE: grab your AWS credentials from AWS.config.credentials ===
    const awsCreds = AWS.config.credentials;
    if (!awsCreds || !awsCreds.accessKeyId) {
      // if credentials haven’t been “get()”-resolved yet, you can force them:
      await new Promise((resolve, reject) =>
        awsCreds.get((err) => (err ? reject(err) : resolve())),
      );
    }

    try {
      const useLocalLLM = process.env.REACT_APP_USE_LOCAL_LLM === "true";

      if (useLocalLLM) {
        console.log("[CameraPage] Sending chat+image payload to server...");
        const serverText = await sendChatCompletionRequest(
          instruction,
          imageBase64URL,
        );
        console.log("[CameraPage] Received server response:", serverText);
        setResponse(serverText);

        console.log(
          "[CameraPage] Saving response to S3... ",
          window.userIdGlobal,
          window.projectIdGlobal,
          serverText,
          awsCreds,
        );
        saveCameraResponseText(
          window.userIdGlobal,
          window.projectIdGlobal,
          serverText,
          awsCreds,
        );
      } else {
        console.log("[CameraPage] Compass heading:", compassHeading);

        const effectiveHeading =
          compassHeading != null ? compassHeading : parseInt(manualHeading, 10);
        console.log("[CameraPage] Using effective heading:", effectiveHeading);

        const imageText = await saveCameraResponseImageAndWaitForText(
          window.userIdGlobal,
          window.projectIdGlobal,
          imageBase64URL,
          awsCreds,
          60000,
          2000,
          effectiveHeading,
        );

        let responseObj = {
          success: true,
          text: imageText,
        };
        setResponse(responseObj.text);
      }
    } catch (err) {
      console.error("[CameraPage] Error sending data:", err);
      setResponse(`Error: ${err.message}`);
    }
  };

  // Start the periodic capture/upload cycle
  const handleStart = async () => {
    console.log("[CameraPage] handleStart() called");
    if (!stream) {
      console.warn("[CameraPage] Camera not available; cannot start");
      setResponse("Camera not available. Cannot start.");
      alert("Camera not available. Please grant permission first.");
      return;
    }

    // ─── Get the Cognito userId here ────────────────────────────────────
    if (
      !AWS.config.credentials ||
      typeof AWS.config.credentials.get !== "function"
    ) {
      console.error("[CameraPage] AWS.config.credentials not set or invalid");
      alert("Unable to retrieve Cognito credentials. Please log in again.");
      return;
    }

    try {
      // Ensure credentials are loaded
      await new Promise((resolve, reject) => {
        AWS.config.credentials.get((err) => {
          if (err) {
            console.error("[CameraPage] Error fetching AWS credentials:", err);
            reject(err);
          } else {
            resolve();
          }
        });
      });
    } catch (credErr) {
      console.error("[CameraPage] Unable to get Cognito identity ID:", credErr);
      alert("Unable to retrieve Cognito identity. Cannot start.");
      return;
    }

    const userId = AWS.config.credentials.identityId;
    console.log("[CameraPage] Retrieved Cognito identityId:", userId);

    if (!userId || !projectId) {
      console.error(
        "[CameraPage] Missing userId or projectId:",
        userId,
        projectId,
      );
      alert("Unable to determine user or project. Cannot start.");
      return;
    }

    window.userIdGlobal = userId;
    window.projectIdGlobal = projectId;

    // ────────────────────────────────────────────────────────────────────

    console.log("[CameraPage] Starting processing loop");

    // 2) Flip the ref immediately so sendData can see it
    isProcessingRef.current = true;
    console.log("[CameraPage] isProcessingRef.current set to true");

    // 3) Also update React state if you want the UI to re-render
    setIsProcessing(true);
    console.log("[CameraPage] setIsProcessing(true) called");

    setResponse("Processing started...");
    console.log(
      "[CameraPage] isProcessingRef.current = ",
      isProcessingRef.current,
    );
    // Immediately send once
    sendData();
    // Then set up interval
    const id = setInterval(sendData, intervalMs);
    intervalIdRef.current = id;
    console.log("[CameraPage] Interval set to", intervalMs, "ms; id =", id);
  };

  // Stop the cycle
  const handleStop = () => {
    console.log("[CameraPage] handleStop() called");
    isProcessingRef.current = false;
    console.log("[CameraPage] isProcessingRef.current set to false");
    setIsProcessing(false);
    console.log("[CameraPage] setIsProcessing(false) called");

    if (intervalIdRef.current) {
      console.log("[CameraPage] Clearing interval:", intervalIdRef.current);
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }
    setResponse((prev) =>
      prev.startsWith("Processing started...") ? "Processing stopped." : prev,
    );
  };

  return (
    <div style={containerStyle}>
      {/* Video feed */}
      <CameraSwitcher onStream={handleStream} videoRef={videoRef} />

      {/* Hidden canvas for capturing frames */}
      <canvas ref={canvasRef} style={{ display: "none" }}></canvas>

      {/* Caption shown under the video */}
      {response && (
        <p
          style={{
            fontSize: "0.85em",
            color: "#444",
            marginTop: "-10px",
            marginBottom: "10px",
            textAlign: "center",
            maxWidth: "480px",
          }}
        >
          {response}
        </p>
      )}

      {/* Controls */}
      <div style={controlsStyle}>
        <label htmlFor="intervalSelect" style={labelStyle}>
          Interval between requests:
        </label>
        <select
          id="intervalSelect"
          value={intervalMs}
          onChange={(e) => {
            console.log(
              "[CameraPage] intervalMs changed to:",
              parseInt(e.target.value, 10),
            );
            setIntervalMs(parseInt(e.target.value, 10));
          }}
          disabled={isProcessing}
          style={selectStyle}
        >
          <option value={1000}>1s</option>
          <option value={5000}>5s</option>
          <option value={10000}>10s</option>
          <option value={30000}>30s</option>
          <option value={300000}>5m</option>
        </select>

        <button
          onClick={() => {
            console.log(
              "[CameraPage] Start/Stop button clicked; isProcessing:",
              isProcessingRef.current,
            );
            isProcessingRef.current ? handleStop() : handleStart();
          }}
          style={buttonStyle}
        >
          {isProcessing ? "Stop" : "Start"}
        </button>
      </div>

      {/* Display project name from URL params */}
      <h1>Az Agent: {projectId}</h1>

      {/* Navigation back to agents */}
      <nav>
        <Link to="/project">← Back to Agents</Link>
      </nav>

      {compassHeading != null ? (
        <p style={{ fontSize: "0.9em", color: "#555" }}>
          Compass Heading: {Math.round(compassHeading)}°
        </p>
      ) : (
        <div style={{ fontSize: "0.9em", color: "#555" }}>
          Compass not available. Select heading:
          <select
            value={manualHeading}
            onChange={(e) => setManualHeading(e.target.value)}
            style={{
              marginLeft: "10px",
              padding: "4px",
              borderRadius: "4px",
              fontSize: "0.9em",
            }}
          >
            <option value="0">North</option>
            <option value="45">North-East</option>
            <option value="90">East</option>
            <option value="135">South-East</option>
            <option value="180">South</option>
            <option value="225">South-West</option>
            <option value="270">West</option>
            <option value="315">North-West</option>
          </select>
        </div>
      )}

      {/* I/O Areas */}
      <div style={ioAreasStyle}>
        {/* Display where frames will be uploaded */}
        {s3Prefix && (
          <div style={{ marginTop: "8px", fontSize: "0.9rem", color: "#555" }}>
            Uploading frames to: <code>{s3Prefix}</code>
          </div>
        )}
      </div>
    </div>
  );
};

export default CameraPage;
