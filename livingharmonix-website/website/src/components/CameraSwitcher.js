// src/components/CameraSwitcher.js
import React, { useEffect, useState, useRef } from "react";

const CameraSwitcher = ({ onStream, videoRef }) => {
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);

  useEffect(() => {
    async function getVideoDevices() {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = allDevices.filter((d) => d.kind === "videoinput");
      setDevices(videoInputs);
      if (videoInputs.length > 0) {
        // Try to find a camera with "back" in the label (case-insensitive)
        const backCamera = videoInputs.find((d) =>
          d.label.toLowerCase().includes("back"),
        );
        setSelectedDeviceId((backCamera || videoInputs[0]).deviceId);
      }
    }
    getVideoDevices();
  }, []);

  useEffect(() => {
    async function startStream() {
      if (!selectedDeviceId) return;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: selectedDeviceId } },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      onStream(stream);
    }
    startStream();
    return () => {
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
      }
    };
  }, [selectedDeviceId]);

  return (
    <div>
      <label style={{ fontWeight: "bold" }}>Select Camera:</label>
      <select
        value={selectedDeviceId || ""}
        onChange={(e) => setSelectedDeviceId(e.target.value)}
        style={{ padding: "8px", borderRadius: "4px", marginLeft: "10px" }}
      >
        {devices.map((device, i) => (
          <option key={device.deviceId} value={device.deviceId}>
            {device.label || `Camera ${i + 1}`}
          </option>
        ))}
      </select>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        style={{ width: "100%", marginTop: "10px", borderRadius: "8px" }}
      />
    </div>
  );
};

export default CameraSwitcher;
