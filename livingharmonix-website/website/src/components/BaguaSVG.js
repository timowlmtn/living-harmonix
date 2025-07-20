// Inline SVG component for octagon with colored Bagua regions and a yin-yang center button
import CameraSwitcher from "./CameraSwitcher";

function BaguaSVG({ images, onRegionClick, onSave, submitted }) {
  const size = 200;
  const center = size / 2;
  const radius = 90;
  const labelRadius = 60;
  const centerRadius = 25;
  // Define regions in clockwise order starting at N
  const directions = ["N", "NW", "W", "SW", "S", "SE", "E", "NE"];

  // Color mapping approximating the image's light colors
  const regionColors = {
    N: "#6c6d71", // Slate Gray
    NW: "#b0bee1", // Light Cornflower Blue
    W: "#9fb6a2", // Sage Green
    SW: "#beb0d4", // Lavender Gray
    S: "#e4b09b", // Salmon Peach
    SE: "#dcccbf", // Desert Sand
    E: "#ffffff", // Pure White
    NE: "#d1d2d4", // Pale Silver
  };

  // Calculate vertex positions for octagon
  const startAngle = 67.5;
  const vertices = directions.map((_, i) => {
    const angle = (startAngle + i * 45) * (Math.PI / 180);
    return {
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle),
    };
  });

  // Label positions
  const labels = directions.map((region, i) => {
    const angle = (90 - i * 45) * (Math.PI / 180);
    return {
      region,
      x: center + labelRadius * Math.cos(angle),
      y: center + labelRadius * Math.sin(angle),
    };
  });

  // Determine if every region has an image
  const allFilled = Object.values(images).every((img) => img);

  // Handle save click: warn if incomplete, else proceed
  const handleSaveClick = () => {
    if (!allFilled) {
      alert("Please capture an image for every Bagua region before saving.");
      return;
    }
    onSave();
  };

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width="100%"
      height="auto"
      className="mb-4"
    >
      <defs>
        <filter id="button-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow
            dx="0"
            dy="2"
            stdDeviation="2"
            floodColor="#000"
            floodOpacity="0.3"
          />
        </filter>
      </defs>

      {/* Draw each region as a colored slice */}
      {vertices.map((v, i) => {
        const next = vertices[(i + 1) % vertices.length];
        const region = directions[i];
        // console.log(
        //   `Rendering region: ${region} with color ${regionColors[region]}`,
        // );
        return (
          <polygon
            key={region}
            points={`${center},${center} ${v.x},${v.y} ${next.x},${next.y}`}
            fill={regionColors[region]}
            stroke="none"
          />
        );
      })}

      {/* Outer octagon border */}
      <polygon
        points={vertices.map((v) => `${v.x},${v.y}`).join(" ")}
        fill="none"
        stroke="#333"
        strokeWidth="2"
      />

      {/* Lines from vertices to center */}
      {vertices.map((v, idx) => (
        <line
          key={idx}
          x1={v.x}
          y1={v.y}
          x2={center}
          y2={center}
          stroke="#666"
          strokeWidth="1"
          pointerEvents="none"
        />
      ))}

      {/* Direction labels */}
      {labels.map((lbl, idx) => (
        <text
          key={idx}
          x={lbl.x}
          y={lbl.y}
          textAnchor="middle"
          alignmentBaseline="middle"
          fontSize="12"
          fontWeight="bold"
          fill={images[lbl.region] ? "#0a0" : "#222"}
          style={{ cursor: "pointer", pointerEvents: "all" }}
          onClick={() => onRegionClick(lbl.region)}
        >
          {lbl.region}
        </text>
      ))}

      {/* Center button group */}
      <g onClick={handleSaveClick} style={{ cursor: "pointer" }}>
        <circle
          cx={center}
          cy={center}
          r={centerRadius}
          fill={submitted ? "#eee" : "#fff"}
          stroke="#333"
          strokeWidth="2"
          filter="url(#button-shadow)"
        />
        <text
          x={center}
          y={center - 4}
          textAnchor="middle"
          alignmentBaseline="middle"
          fontSize="20"
          fill="#222"
          style={{ userSelect: "none", pointerEvents: "none" }}
        >
          ☯
        </text>
        <text
          x={center}
          y={center + 12}
          textAnchor="middle"
          alignmentBaseline="middle"
          fontSize="10"
          fill="#555"
          style={{
            opacity: submitted ? 0 : 1,
            transition: "opacity 0.2s",
            pointerEvents: "none",
          }}
        >
          Save
        </text>
      </g>
    </svg>
  );
}

export default BaguaSVG;
