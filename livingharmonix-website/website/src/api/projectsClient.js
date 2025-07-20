import AWS from "aws-sdk";
import {
  getProjectData as apiGetProject,
  createProject as apiCreateProject,
  createProject as apiUpdateProject,
  loadProjectTemplate,
  saveCameraResponseImage,
  listProjectsRecursive,
} from "../GeoVisionAI.js"; // Adjust path to your actual API layer

/**
 * Sanitize a user-provided project name into a safe identifier.
 * Lowercases, trims, removes invalid chars, and replaces spaces with underscores.
 */
export function sanitizeProjectId(agentType, projectName) {
  const sanitizedName = projectName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\- ]/g, "")
    .replace(/\s+/g, "_");
  return `${agentType}_${sanitizedName}`;
}

/**
 * Build the base project data object with defaults and optional template merge.
 */
async function buildProjectData(projectId, displayName, agentType, awsCreds) {
  const timestamp = new Date().toISOString();
  let projectData = {
    id: projectId,
    name: displayName,
    created_at: timestamp,
    updated_at: timestamp,
    sheet_url: "",
    s3_prefix: "",
  };

  // Merge in any agent-specific defaults
  if (
    ["pinboard_zine", "living_harmony", "little_library", "zen"].includes(
      agentType,
    )
  ) {
    const template = await loadProjectTemplate(agentType, awsCreds);
    projectData = { ...projectData, ...template };
  }

  // Re-apply overrides to ensure metadata is current
  const now = new Date().toISOString();
  projectData.id = projectId;
  projectData.name = displayName;
  projectData.created_at = now;
  projectData.updated_at = now;

  return projectData;
}

/**
 * Create or update a project record in your backend.
 * @param {string} newProjectName - The display name entered by the user.
 * @param {string} agentType - One of your agent types (e.g. "living_harmony").
 * @param {object} [awsCreds] - AWS credentials object (defaults to AWS.config.credentials).
 * @returns {{ projectName: string, projectId: string }} The final projectName and projectId used.
 */
export async function upsertProject(
  newProjectName,
  agentType,
  awsCreds = AWS.config.credentials,
) {
  // Map agent types to icons
  const iconMap = {
    living_harmony: "🏡",
    pinboard_zine: "📌",
    little_library: "📚",
    zen: "☯️",
  };
  const icon = iconMap[agentType] || "";

  // Strip all existing icon prefixes to avoid duplicates
  let baseName = newProjectName;
  if (icon) {
    const prefixRegex = new RegExp(`^(${icon}:\\s*)+`);
    baseName = baseName.replace(prefixRegex, "");
  }

  // Compute displayName with single icon prefix
  const projectName = icon ? `${icon}: ${baseName}` : baseName;

  // Sanitize and build projectId based on the cleaned baseName
  const projectId = sanitizeProjectId(agentType, baseName);

  // Build projectData (including any templates)
  const projectData = await buildProjectData(
    projectId,
    projectName,
    agentType,
    awsCreds,
  );

  // Attempt to fetch existing project
  const userId = awsCreds.identityId;
  try {
    await apiGetProject(userId, projectId, awsCreds);
    // exists -> update
    await apiUpdateProject(userId, projectId, projectData, awsCreds);
  } catch (err) {
    // not found -> create
    await apiCreateProject(userId, projectId, projectData, awsCreds);
  }

  // Return both the projectName and projectId
  return { projectName, projectId };
}

/**
 * Save a mapping of directional images to S3, including optional compass headings.
 * @param {string} userId - Cognito identityId of the user
 * @param {string} projectId - The project identifier
 * @param {object} images - An object mapping directions (N, NE, E, SE, S, SW, W, NW) to
 *                            { dataUrl: string, compassHeading?: number }
 * @param {object} [awsCreds] - AWS credentials (defaults to AWS.config.credentials)
 */
export async function saveProjectImages(
  userId,
  projectId,
  images,
  awsCreds = AWS.config.credentials,
) {
  // Map compass directions to degrees
  const headingMap = {
    N: 0,
    NE: 45,
    E: 90,
    SE: 135,
    S: 180,
    SW: 225,
    W: 270,
    NW: 315,
  };

  console.log(`Saving images for project: ${projectId} with user: ${userId}`);
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  for (const dir of directions) {
    const dataUrl = images[dir];
    if (dataUrl) {
      const heading = headingMap[dir];
      console.log(`Uploading image for ${projectId} with heading: ${heading}`);
      // If a compass heading is provided, ensure it's within valid range
      if (heading && heading >= 0 && heading <= 360) {
        await saveCameraResponseImage(
          userId,
          projectId,
          dataUrl,
          awsCreds,
          heading,
        );
      }
    }
  }
}

export async function showProjects() {
  const userId = AWS.config.credentials.identityId;
  console.log(`User ID: ${userId}`);
  const map = await listProjectsRecursive(
    userId,
    "living_harmony",
    AWS.config.credentials,
  );
  console.log(JSON.stringify(map, null, 2));
}

//
// Haversine—returns kilometers between two lat/lon points
function haversineDistance(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371; // earth radius in km
  const phi1 = toRad(lat1),
    phi2 = toRad(lat2);
  const dphi = toRad(lat2 - lat1),
    dlambda = toRad(lon2 - lon1);
  const a =
    Math.sin(dphi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dlambda / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function showProjectOptions(currentLat, currentLon) {
  const creds = AWS.config.credentials;
  const userId = creds && creds.identityId;
  console.log(`User ID: ${userId}`);

  // 1) grab the full map
  const projectsMap = await listProjectsRecursive(
    userId,
    "living_harmony",
    creds,
  );

  // 2) for each project, find the *minimum* distance among all its saved locations
  const distances = Object.entries(projectsMap).map(
    ([projectName, { dates }]) => {
      let minDist = Infinity;

      Object.values(dates).forEach((byLocation) => {
        Object.keys(byLocation).forEach((locKey) => {
          const [latStr, lonStr] = locKey.split("_");
          const lat = parseFloat(latStr),
            lon = parseFloat(lonStr);
          if (!isNaN(lat) && !isNaN(lon)) {
            const d = haversineDistance(currentLat, currentLon, lat, lon);
            if (d < minDist) minDist = d;
          }
        });
      });

      return { projectName, distance: minDist };
    },
  );

  // 3) sort so closest comes first
  distances.sort((a, b) => a.distance - b.distance);

  console.log("Distances from current location:", distances);
  // 4) build your options array
  const options = [
    ...distances.map(({ projectName }) => ({
      value: projectName,
      name: projectName,
    })),
    { value: "Default", name: "Create New Project" },
  ];

  console.log("Project options (closest first):", options);
  return options;
}
