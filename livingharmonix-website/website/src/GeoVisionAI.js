// GeoVisionAI.js

import AWS from "aws-sdk"; // v2 SDK assumed

const BUCKET_NAME = process.env.REACT_APP_AZRIUS_APP_BUCKET || "azri.us-data";

import {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  GetObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";

import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { marked } from "marked";

const REGION = process.env.REACT_APP_AWS_REGION || "us-east-1";

export function parseTimestampFromFilename(filename) {
  const match = filename.match(/^(\d{4}-\d{2}-\d{2}T\d{6}\.\d{3}Z)/);
  if (!match) return filename;

  const raw = match[1]; // e.g., 2025-06-14T174318.422Z
  const iso =
    raw.slice(0, 11) + // '2025-06-14T'
    raw.slice(11, 13) +
    ":" + // '17:'
    raw.slice(13, 15) +
    ":" + // '43:'
    raw.slice(15); // '18.422Z'

  const d = new Date(iso);
  return isNaN(d) ? filename : d.toLocaleString();
}

/**
 * Constructs an S3 client using pre‐existing Cognito credentials.
 *
 * @param {object} awsCredentials
 *   An AWS.CognitoIdentityCredentials instance that has already been
 *   .get()-resolved (i.e. AWS.config.credentials).
 *
 * @returns {S3Client}
 */
export function getS3Client(awsCredentials) {
  console.log(
    `[GeoVisionAI] Initializing S3 client using provided Cognito credentials`,
  );

  const { accessKeyId, secretAccessKey, sessionToken } = awsCredentials;

  return new S3Client({
    region: REGION,
    credentials: { accessKeyId, secretAccessKey, sessionToken },
  });
}

/**
 * Ensures that "geovision/<userId>/" exists by writing a zero‐byte object.
 *
 * @param {string} userId
 * @param {object} awsCredentials
 *   An AWS.CognitoIdentityCredentials instance (already populated).
 */
export async function createGeoVisionFolder(userId, awsCredentials) {
  const s3 = getS3Client(awsCredentials);
  const geoKey = `geovision/${userId}/`;
  console.log(`[GeoVisionAI] Creating zero-byte object at "${geoKey}"`);

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: geoKey,
      Body: "",
      ContentLength: 0,
    }),
  );

  console.log(`[GeoVisionAI] GeoVision folder ensured: "${geoKey}"`);
}

/**
 * Fetches and parses a ReadableStream or Blob into string.
 *
 * @param {ReadableStream|Uint8Array|Blob} body
 * @returns {Promise<string>}
 */
async function streamToString(body) {
  const response = new Response(body);
  return await response.text();
}

/**
 * Lists "geovision/<userId>/" subfolders and for each folder fetches
 * its "project.json", parses it, and returns an array of those JSON objects.
 *
 * @param {string} userId
 * @param {object} awsCredentials
 *   An AWS.CognitoIdentityCredentials instance (already populated).
 *
 * @returns {Promise<Array<object>>}
 *   Each object is the parsed contents of "project.json" under
 *   "geovision/<userId>/<projectId>/project.json", with
 *   "s3_prefix" normalized to "geovision/<userId>/<projectId>/".
 */
export async function setupUserFolderAndListProjects(userId, awsCredentials) {
  const s3 = getS3Client(awsCredentials);
  const basePrefix = `geovision/${userId}/`;

  console.log(`[GeoVisionAI] Listing subfolders under "${basePrefix}"`);
  const listResponse = await s3.send(
    new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: basePrefix,
      Delimiter: "/",
    }),
  );

  const prefixes = listResponse.CommonPrefixes || [];
  console.log(
    `[GeoVisionAI] Found ${prefixes.length} subfolder(s) under "${basePrefix}"`,
  );

  const projects = [];

  for (const p of prefixes) {
    const fullPrefix = p.Prefix; // e.g. "geovision/<userId>/smith_001/"
    const projectId = fullPrefix.replace(basePrefix, "").replace(/\/$/, "");
    const projectJsonKey = `${fullPrefix}project.json`;

    console.log(`[GeoVisionAI] Attempting to fetch "${projectJsonKey}"`);

    try {
      const getResp = await s3.send(
        new GetObjectCommand({
          Bucket: BUCKET_NAME,
          Key: projectJsonKey,
        }),
      );

      const jsonText = await streamToString(getResp.Body);
      const projectData = JSON.parse(jsonText);
      projectData.s3_prefix = fullPrefix;

      console.log(`[GeoVisionAI] Parsed project "${projectId}":`, projectData);
      projects.push(projectData);
    } catch (err) {
      console.warn(
        `[GeoVisionAI] Skipping "${projectId}" because project.json not found or parse failed:`,
        err,
      );
    }
  }

  return projects;
}

/**
 * Creates a new project folder under "geovision/<userId>/<projectId>/"
 * and writes an initial project.json into it.
 *
 * @param {string} userId
 * @param {string} projectId
 * @param {object} projectData
 *   The JSON‐serializable object to write into project.json.
 *   e.g. { id, name, created_at, updated_at, sheet_url, s3_prefix }
 * @param {object} awsCredentials
 *   AWS.CognitoIdentityCredentials instance (already populated).
 *
 * @returns {Promise<object>}
 *   Returns the projectData with `s3_prefix` normalized.
 */
export async function createProject(
  userId,
  projectId,
  projectData,
  awsCredentials,
) {
  const s3 = getS3Client(awsCredentials);
  const baseFolder = `geovision/${userId}/${projectId}/`;

  console.log(`[GeoVisionAI] Ensuring project folder "${baseFolder}"`);

  // 1) Create zero‐byte “folder” object
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: baseFolder,
      Body: "",
      ContentLength: 0,
    }),
  );

  // 2) Write project.json
  const projectJsonKey = `${baseFolder}project.json`;
  projectData.s3_prefix = baseFolder;
  const projectJsonBody = JSON.stringify(projectData, null, 2);
  console.log(`[GeoVisionAI] Writing project.json at "${projectJsonKey}"`);

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: projectJsonKey,
      Body: projectJsonBody,
      ContentType: "application/json",
    }),
  );

  console.log(`[GeoVisionAI] Project "${projectId}" created successfully.`);
  return projectData;
}

/**-----------------------------------------------------------------------
 * Internal helper:
 *   • Gets geolocation
 *   • Builds the “geovision/{userId}/{projectId}/{lat_lon}/{YYYY-MM-DD}/” prefix
 *   • Ensures the zero-byte “folder” object exists in S3
 *
 * @param {string} userId
 * @param {string} projectId
 * @param {AWS.CognitoIdentityCredentials} awsCreds
 * @returns {Promise<string>}  The S3 folder prefix (always ends with “/”).
 */
async function _ensureFolderPrefix(userId, projectId, awsCreds) {
  if (!userId || !projectId) {
    throw new Error(
      "[GeoVisionAI] Missing userId or projectId in _ensureFolderPrefix",
    );
  }

  // 1) Get geolocation
  const { coords } = await new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject);
  });

  // 2) Compute lat/lon (4 decimals) and date (YYYY-MM-DD)
  const lat = coords.latitude.toFixed(4);
  const lon = coords.longitude.toFixed(4);
  const today = new Date().toISOString().slice(0, 10);

  // 3) Build folder prefix
  const latLongKey = `${lat}_${lon}`.replace(/\s+/g, "");
  const folderPrefix = `geovision/${userId}/${projectId}/${today}/${latLongKey}/`;

  // 4) Initialize S3 client
  const s3 = new AWS.S3({
    credentials: awsCreds,
    region: awsCreds.region || AWS.config.region,
  });

  // 5) Create zero-byte “folder” object (Key ending in “/”)
  try {
    await s3
      .putObject({
        Bucket: BUCKET_NAME,
        Key: folderPrefix,
        Body: "",
      })
      .promise();
  } catch (err) {
    console.error(
      "[GeoVisionAI] Error ensuring camera output folder:",
      err,
      `s3://${BUCKET_NAME}/${folderPrefix}`,
    );
    throw err;
  }

  return folderPrefix;
}

/**
 * Internal helper: returns an ISO‐based timestamp string
 * with colons removed, e.g. "2025-06-04T142230.123Z".
 */
function _getSafeIsoTimestamp() {
  return new Date().toISOString().replace(/:/g, "");
}

/**
 * Facade #1:
 *   Uploads a plain‐text response to S3 under:
 *     geovision/{userId}/{projectId}/{lat_lon}/{YYYY-MM-DD}/{ISO-no-colons}.txt
 *
 * @param {string} userId
 * @param {string} projectId
 * @param {string} responseText      — The text payload to save.
 * @param {AWS.CognitoIdentityCredentials} awsCreds
 * @returns {Promise<{ bucket: string, key: string }>}
 */
export async function saveCameraResponseText(
  userId,
  projectId,
  responseText,
  awsCreds,
) {
  if (responseText == null) {
    throw new Error(
      "[GeoVisionAI] saveCameraResponseText: responseText cannot be null",
    );
  }

  // 1) Ensure folder prefix (also does the zero-byte “folder” creation)
  const folderPrefix = await _ensureFolderPrefix(userId, projectId, awsCreds);

  // 2) Build timestamped filename for .txt
  const safeIso = _getSafeIsoTimestamp(); // e.g. "2025-06-04T142230.123Z"
  const filename = `${safeIso}.txt`;
  const responseKey = `${folderPrefix}${filename}`;

  // 3) Upload the text file
  const s3 = new AWS.S3({
    credentials: awsCreds,
    region: awsCreds.region || AWS.config.region,
  });

  try {
    await s3
      .putObject({
        Bucket: BUCKET_NAME,
        Key: responseKey,
        Body: responseText,
        ContentType: "text/plain",
      })
      .promise();

    console.log(
      "[GeoVisionAI] Successfully saved camera response text:",
      `s3://${BUCKET_NAME}/${responseKey}`,
    );
    return { bucket: BUCKET_NAME, key: responseKey };
  } catch (err) {
    console.error(
      "[GeoVisionAI] Error saving camera response text:",
      err,
      `s3://${BUCKET_NAME}/${responseKey}`,
    );
    throw err;
  }
}

/**
 * Facade #2:
 *   Uploads a Base64‐encoded image (PNG) to S3 under:
 *     geovision/{userId}/{projectId}/{lat_lon}/{YYYY-MM-DD}/{ISO-no-colons}.png
 *
 * @param {string}           userId
 * @param {string}           projectId
 * @param {string}           imageBase64URL   — Data URL, e.g. "data:image/png;base64,iVBORw0KGgoAAAANS…"
 * @param {AWS.CognitoIdentityCredentials} awsCreds
 * @returns {Promise<{ bucket: string, key: string }>}
 */
export async function saveCameraResponseImage(
  userId,
  projectId,
  imageBase64URL,
  awsCreds,
  compassHeading,
) {
  if (
    !imageBase64URL ||
    typeof imageBase64URL !== "string" ||
    !imageBase64URL.startsWith("data:image/")
  ) {
    throw new Error(
      "[GeoVisionAI] saveCameraResponseImage: invalid imageBase64URL",
    );
  }

  // 1) Ensure folder prefix (zero-byte “folder” creation)
  const folderPrefix = await _ensureFolderPrefix(userId, projectId, awsCreds);

  // 2) Build timestamped filename for .png
  const safeIso = _getSafeIsoTimestamp(); // e.g. "2025-06-04T142230.123Z"
  const filename = `${safeIso}_${compassHeading}.png`;
  const imageKey = `${folderPrefix}${filename}`;

  // 3) Decode Base64 → Uint8Array
  const base64Data = imageBase64URL.split(",")[1];
  const binaryString = atob(base64Data);
  const len = binaryString.length;
  const buffer = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    buffer[i] = binaryString.charCodeAt(i);
  }

  // 4) Upload the PNG file
  const s3 = new AWS.S3({
    credentials: awsCreds,
    region: awsCreds.region || AWS.config.region,
  });

  try {
    await s3
      .putObject({
        Bucket: BUCKET_NAME,
        Key: imageKey,
        Body: buffer,
        ContentType: "image/png",
      })
      .promise();

    console.log(
      "[GeoVisionAI] Successfully saved camera image:",
      `s3://${BUCKET_NAME}/${imageKey}`,
    );
    return { bucket: BUCKET_NAME, key: imageKey };
  } catch (err) {
    console.error(
      "[GeoVisionAI] Error saving camera image:",
      err,
      `s3://${BUCKET_NAME}/${imageKey}`,
    );
    throw err;
  }
}

/**
 * Saves a camera image and waits for the corresponding text file to appear.
 *
 * @param {string} userId
 * @param {string} projectId
 * @param {string} imageBase64URL
 * @param {AWS.CognitoIdentityCredentials} awsCreds
 * @param {number} [timeoutMs=10000] – Max wait time
 * @param {number} [intervalMs=1000] – Polling interval
 * @returns {Promise<string>} – Text content of the generated .txt file
 */
export async function saveCameraResponseImageAndWaitForText(
  userId,
  projectId,
  imageBase64URL,
  awsCreds,
  timeoutMs = 10000,
  intervalMs = 1000,
  compassHeading = "",
) {
  const { bucket, key } = await saveCameraResponseImage(
    userId,
    projectId,
    imageBase64URL,
    awsCreds,
    compassHeading,
  );

  const s3 = new AWS.S3({
    credentials: awsCreds,
    region: awsCreds.region || AWS.config.region,
  });

  const txtKey = key.replace(/\.png$/, ".txt");

  const waitUntilExists = async () => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try {
        const data = await s3
          .getObject({ Bucket: bucket, Key: txtKey })
          .promise();
        return data.Body.toString("utf-8");
      } catch (err) {
        if (err.code === "NoSuchKey") {
          await new Promise((res) => setTimeout(res, intervalMs));
        } else {
          throw err;
        }
      }
    }
    throw new Error(
      `Timeout: Text file not found at s3://${bucket}/${txtKey} after ${timeoutMs}ms`,
    );
  };

  return waitUntilExists();
}

/**
 * Lists every file under geovision/{userId}/{projectId}/ (or just a specific date) and returns:
 * {
 *   [projectId]: {
 *     [dateFolder]: {
 *       [lat_lonFolder]: [ "file1.png", "file2.txt", … ]
 *     }, …
 *   }
 * }
 *
 * @param {string} userId
 * @param {string} projectId
 * @param {object} awsCredentials
 * @param {string|null} selectedDate  // YYYY-MM-DD to filter, or null to list all dates
 */
export async function listProjectContents(
  userId,
  projectId,
  awsCredentials,
  selectedDate = null,
) {
  const s3 = getS3Client(awsCredentials);
  const basePrefixRoot = `geovision/${userId}/${projectId}/`;
  // If a date is provided, narrow the prefix to that date folder
  const prefix = selectedDate
    ? `${basePrefixRoot}${selectedDate}/`
    : basePrefixRoot;

  let token;
  const tree = {};

  do {
    const resp = await s3.send(
      new ListObjectsV2Command({
        Bucket: BUCKET_NAME,
        Prefix: prefix,
        ContinuationToken: token,
      }),
    );

    (resp.Contents || []).forEach(({ Key }) => {
      // Remove the prefix portion
      const rel = Key.slice(prefix.length);
      if (!rel || rel.endsWith("/")) return; // skip empty/folder keys

      const parts = rel.split("/");
      if (selectedDate) {
        // Expect [lat_lon, filename]
        if (parts.length !== 2) return;
        const [latlon, filename] = parts;
        tree[selectedDate] = tree[selectedDate] || {};
        tree[selectedDate][latlon] = tree[selectedDate][latlon] || [];
        tree[selectedDate][latlon].push(filename);
      } else {
        // Expect [date, lat_lon, filename]
        if (parts.length !== 3) return;
        const [dateFolder, latlon, filename] = parts;
        tree[dateFolder] = tree[dateFolder] || {};
        tree[dateFolder][latlon] = tree[dateFolder][latlon] || [];
        tree[dateFolder][latlon].push(filename);
      }
    });

    token = resp.IsTruncated ? resp.NextContinuationToken : undefined;
  } while (token);

  return { [projectId]: tree };
}

// Helper to flatten your nested geoData into an array of point objects
export const flattenGeoData = (data) => {
  const pts = [];
  for (const [project, dates] of Object.entries(data)) {
    for (const [date, locs] of Object.entries(dates)) {
      for (const [coord, files] of Object.entries(locs)) {
        const [lat, lon] = coord.split("_").map(Number);
        pts.push({ lat, lon, project, date, files });
      }
    }
  }
  return pts;
};

/**
 * Securely loads an image file from S3 using AWS Cognito credentials.
 * Returns a temporary signed URL that can be used in <img src="...">
 */
export async function getSecureImageURL(bucket, key, awsCredentials) {
  const s3 = new S3Client({
    region: "us-east-1",
    credentials: awsCredentials,
  });

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  return getSignedUrl(s3, command, { expiresIn: 900 });
}

/**
 * Loads a text file from S3 using credentials and returns its contents as a UTF-8 string.
 */
export async function getTextFileContent(bucket, key, awsCredentials) {
  const s3 = new S3Client({
    region: "us-east-1",
    credentials: awsCredentials,
  });

  // console.log(`[getTextFileContent] Loading text from: ${key}`);

  try {
    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    const response = await s3.send(command);

    if (!response.Body) {
      throw new Error("Response body is undefined");
    }

    const text = await new Response(response.Body).text();

    // console.log(
    //   `[getTextFileContent] Successfully loaded ${text} from: ${key}`,
    // );
    return text;
  } catch (err) {
    console.error(`[getTextFileContent] Error loading ${key}:`, err);
    return null;
  }
}

/**
 * Deletes all S3 objects under geovision/{userId}/{projectId}/
 */
export async function deleteProject(userId, projectId, awsCredentials) {
  const s3 = new S3Client({
    region: "us-east-1",
    credentials: awsCredentials,
  });

  const prefix = `geovision/${userId}/${projectId}/`;

  // 1. List all objects under the project prefix
  const listedObjects = await s3.send(
    new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: prefix,
    }),
  );

  if (!listedObjects.Contents || listedObjects.Contents.length === 0) {
    console.warn(`[deleteProject] No objects found for prefix: ${prefix}`);
    return;
  }

  // 2. Delete them all
  const deleteParams = {
    Bucket: BUCKET_NAME,
    Delete: {
      Objects: listedObjects.Contents.map(({ Key }) => ({ Key })),
    },
  };

  await s3.send(new DeleteObjectsCommand(deleteParams));
  console.log(
    `[deleteProject] Deleted ${listedObjects.Contents.length} objects under ${prefix}`,
  );
}

/**
 * Loads a Zen Guide template for Feng Shui analysis from S3.
 * S3 path: s3://azrius-data/geovision/agent/zen_guide/project_template.json
 */
export async function loadZenGuideTemplate(awsCredentials) {
  const s3 = new S3Client({
    region: "us-east-1",
    credentials: awsCredentials,
  });

  const bucket = "azrius-data";
  const key = "geovision/agent/zen_guide/project_template.json";

  try {
    const response = await s3.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    );

    const fileContents = await streamToString(response.Body);
    return JSON.parse(fileContents);
  } catch (err) {
    console.error(
      "[GeoVisionAI] Failed to load Zen Guide template from S3:",
      err,
    );
    throw new Error("Unable to load Zen Guide template");
  }
}

/**
 * Saves a Zen Guide project template to S3.
 * S3 path: s3://azrius-data/geovision/agent/zen_guide/project_template.json
 *
 *
 * @param userId
 * @param projectId
 * @param date
 * @param fileName
 * @param content
 * @param credentials
 * @returns {Promise<string>}
 */
export async function saveZenGuidePlanAndLink(
  userId,
  projectId,
  date,
  fileName,
  content,
  credentials,
) {
  const s3 = new AWS.S3({ credentials, region: "us-east-1" });
  const baseKey = `geovision/${userId}/${projectId}/`;
  const planKey = `${baseKey}${date}/${fileName}`;
  const projectJsonKey = `${baseKey}project.json`;

  // 1. Upload the markdown plan
  await s3
    .putObject({
      Bucket: "azrius-data",
      Key: planKey,
      Body: content,
      ContentType: "text/markdown",
    })
    .promise();

  // 2. Read project.json (if it exists)
  let projectData = {};
  try {
    const response = await s3
      .getObject({ Bucket: "azrius-data", Key: projectJsonKey })
      .promise();
    projectData = JSON.parse(response.Body.toString("utf-8"));
  } catch (err) {
    console.warn("[GeoVisionAI] No existing project.json found; creating new.");
  }

  // 3. Merge new plan link
  const s3Url = `s3://${"azrius-data"}/${planKey}`;
  projectData.plan_url = s3Url;
  projectData.updated_at = new Date().toISOString();

  // 4. Save updated project.json
  await s3
    .putObject({
      Bucket: "azrius-data",
      Key: projectJsonKey,
      Body: JSON.stringify(projectData, null, 2),
      ContentType: "application/json",
    })
    .promise();

  return { planKey, planUrl: s3Url };
}

/**
 * Loads a single project's project.json from:
 *   geovision/{userId}/{projectId}/project.json
 *
 * @param {string} userId
 * @param {string} projectId
 * @returns {Promise<object>} The parsed project.json contents
 */
export async function getProjectData(userId, projectId) {
  const s3 = getS3Client(AWS.config.credentials);
  const key = `geovision/${userId}/${projectId}/project.json`;

  console.log(`[GeoVisionAI] Fetching single project.json from "${key}"`);

  try {
    const response = await s3.send(
      new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      }),
    );

    const text = await streamToString(response.Body);
    const json = JSON.parse(text);
    json.s3_prefix = `geovision/${userId}/${projectId}/`;

    console.log(`[GeoVisionAI] Loaded project "${projectId}":`, json);
    return json;
  } catch (err) {
    console.error(`[GeoVisionAI] Failed to load project "${projectId}":`, err);
    throw err;
  }
}

/**
 * Load a public Markdown article by ID.
 * No authentication required.
 *
 * @param {string} articleId
 * @returns {Promise<string>} raw Markdown text
 */
export async function loadPublicArticle(articleId) {
  const url = `https://azri.us/geovision/articles/${encodeURIComponent(articleId)}.md`;
  try {
    console.log(`[GeoVisionAI] Loading public article: ${url}`);
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "text/markdown" },
    });
    if (!res.ok) {
      console.error("[GeoVisionAI] loadPublicArticle failed:", res);
      throw new Error(
        `Failed to load article ${articleId}: ${res.status} ${res.statusText}`,
      );
    }
    return await res.text();
  } catch (err) {
    console.error("[GeoVisionAI] loadPublicArticle error:", err);
    throw err;
  }
}

/**
 * Loads a project_template.json for a given agent type.
 *
 * Valid agentType values:
 *   • "zen"             →   geovision/agent/zen_guide/project_template.json
 *   • "pinboard_zine"   →   geovision/agent/pinboard_zine/project_template.json
 *   • "little_library"  →   geovision/agent/little_library/project_template.json
 *   • "living_harmony"  →   geovision/agent/living_harmony/project_template.json
 *
 * @param {string} agentType     one of the above strings
 * @param {object} awsCredentials  AWS.CognitoIdentityCredentials (already resolved)
 * @returns {Promise<object>}     the parsed JSON template
 */
export async function loadProjectTemplate(agentType, awsCredentials) {
  if (!agentType) {
    throw new Error("[GeoVisionAI] loadProjectTemplate: agentType is required");
  }
  const valid = ["zen", "pinboard_zine", "little_library", "living_harmony"];
  if (!valid.includes(agentType)) {
    throw new Error(
      `[GeoVisionAI] loadProjectTemplate: Invalid agentType "${agentType}". ` +
        `Must be one of: ${valid.join(", ")}`,
    );
  }

  // map "zen" → "zen_guide", leave others as-is
  const folderName = agentType === "zen" ? "zen_guide" : agentType;
  const key = `geovision/agent/${folderName}/project_template.json`;

  // new v3 S3 client using your existing REGION constant
  const s3 = new S3Client({
    region: REGION,
    credentials: awsCredentials,
  });

  try {
    const resp = await s3.send(
      new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key }),
    );
    const jsonText = await streamToString(resp.Body);
    return JSON.parse(jsonText);
  } catch (err) {
    console.error(
      `[GeoVisionAI] loadProjectTemplate: failed to load "${key}"`,
      err,
    );
    throw new Error(
      `Unable to load project template for "${agentType}" (S3 key: ${key})`,
    );
  }
}

export async function listImagesGroupedByDate(
  userId,
  agentType,
  awsCredentials,
) {
  const s3 = new S3Client({ region: REGION, credentials: awsCredentials });

  // compute cut-off: anything before this is >7 days old
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 7);

  const grouped = {};

  const homePrefix = `geovision/${userId}/`;
  const homeResp = await s3.send(
    new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: homePrefix,
      Delimiter: "/",
    }),
  );

  for (const { Prefix: agentFolder } of homeResp.CommonPrefixes || []) {
    if (!agentFolder.includes(agentType)) continue;

    const agentResp = await s3.send(
      new ListObjectsV2Command({
        Bucket: BUCKET_NAME,
        Prefix: agentFolder,
        Delimiter: "/",
      }),
    );

    for (const { Prefix: dateFolder } of agentResp.CommonPrefixes || []) {
      // Extract “2025-06-20” from “…/2025-06-20/”
      const m = dateFolder.match(/\/(\d{4}-\d{2}-\d{2})\/$/);
      const date = m ? m[1] : null;
      if (!date) continue;

      // **NEW: skip anything older than 7 days ago**
      const dateObj = new Date(date);
      if (isNaN(dateObj) || dateObj < cutoffDate) {
        // console.log(`Skipping ${date} – too old`);
        continue;
      }

      // ensure we have an array for this date
      if (!grouped[date]) grouped[date] = [];

      const dateResp = await s3.send(
        new ListObjectsV2Command({
          Bucket: BUCKET_NAME,
          Prefix: dateFolder,
          Delimiter: "/",
        }),
      );

      for (const { Prefix: llFolder } of dateResp.CommonPrefixes || []) {
        const llResp = await s3.send(
          new ListObjectsV2Command({
            Bucket: BUCKET_NAME,
            Prefix: llFolder,
          }),
        );

        for (const obj of llResp.Contents || []) {
          const imgKey = obj.Key;
          if (
            !imgKey.match(/\.(jpe?g|png|gif)$/i) ||
            !imgKey.includes(agentType)
          )
            continue;

          // get a 1h presigned URL
          const url = await getSignedUrl(
            s3,
            new GetObjectCommand({ Bucket: BUCKET_NAME, Key: imgKey }),
            { expiresIn: 3600 },
          );

          // pull metadata + side-car .txt…
          let description = "";
          try {
            const head = await s3.send(
              new HeadObjectCommand({
                Bucket: BUCKET_NAME,
                Key: imgKey,
              }),
            );
            description = head.Metadata?.description || "";
          } catch {}
          if (!description) {
            const txtKey = imgKey.replace(/\.\w+$/, ".txt");
            try {
              const txtObj = await s3.send(
                new GetObjectCommand({
                  Bucket: BUCKET_NAME,
                  Key: txtKey,
                }),
              );
              description = await streamToString(txtObj.Body);
            } catch {}
          }

          const html = marked.parse(description);
          grouped[date].push({ key: imgKey, url, description, html });
        }
      }
    }
  }

  // sort & return as before…
  Object.values(grouped).forEach((images) =>
    images.sort((a, b) =>
      b.key.split("/").pop().localeCompare(a.key.split("/").pop()),
    ),
  );

  return Object.keys(grouped)
    .sort((a, b) => new Date(b) - new Date(a))
    .reduce((acc, date) => {
      acc[date] = grouped[date];
      return acc;
    }, {});
}

/**
 * Delete all S3 objects under the given project for the currently-logged-in user.
 *
 * @param {string} projectId    – the project folder (defaults to "Default")
 */
export async function deleteAllProjectData(projectId = "Default") {
  // grab the Cognito identityId that your other methods already rely on:
  const creds = AWS.config.credentials;
  const identityId = creds && creds.identityId;
  if (!identityId) {
    throw new Error(
      "[GeoVisionAI] No Cognito identityId available – are you signed in?",
    );
  }

  const s3 = new S3Client({
    region: REGION,
    credentials: creds,
  });

  // build the user/project prefix:
  const prefix = `geovision/${identityId}/${projectId}/`;
  console.log(`[GeoVisionAI] Clearing S3 prefix: ${prefix}`);

  // 1) list all keys under that prefix
  let continuationToken = undefined;
  const allKeys = [];
  do {
    const listResp = await s3.send(
      new ListObjectsV2Command({
        Bucket: BUCKET_NAME,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }),
    );
    if (listResp.Contents) {
      listResp.Contents.forEach((o) => allKeys.push({ Key: o.Key }));
    }
    continuationToken = listResp.NextContinuationToken;
  } while (continuationToken);

  if (allKeys.length === 0) {
    console.log("[GeoVisionAI] Nothing to delete.");
    return;
  }

  // 2) delete in batches of up to 1000
  for (let i = 0; i < allKeys.length; i += 1000) {
    const chunk = allKeys.slice(i, i + 1000);
    const delResp = await s3.send(
      new DeleteObjectsCommand({
        Bucket: BUCKET_NAME,
        Delete: { Objects: chunk },
      }),
    );
    console.log("[GeoVisionAI] Deleted:", delResp.Deleted);
    if (delResp.Errors && delResp.Errors.length) {
      console.error("[GeoVisionAI] Some deletions failed:", delResp.Errors);
    }
  }

  console.log("[GeoVisionAI] Project cleared.");
}

/**
 * Delete all S3 objects under today’s date for the given project.
 *
 * @param {string} projectId – the project folder (defaults to "Default")
 */
export async function deleteTodayProjectData(projectId = "Default") {
  // grab the Cognito identityId that your other methods already rely on:
  const creds = AWS.config.credentials;
  const identityId = creds && creds.identityId;
  if (!identityId) {
    throw new Error(
      "[GeoVisionAI] No Cognito identityId available – are you signed in?",
    );
  }

  // build a YYYY-MM-DD date segment for “today”
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const dateSegment = `${year}-${month}-${day}`;

  // build the user/project/today prefix:
  const prefix = `geovision/${identityId}/${projectId}/${dateSegment}/`;
  console.log(`[GeoVisionAI] Clearing today’s S3 prefix: ${prefix}`);

  const s3 = new S3Client({ region: REGION, credentials: creds });

  // 1) list all keys under that prefix
  let continuationToken;
  const allKeys = [];
  do {
    const listResp = await s3.send(
      new ListObjectsV2Command({
        Bucket: BUCKET_NAME,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }),
    );
    if (listResp.Contents) {
      listResp.Contents.forEach((o) => allKeys.push({ Key: o.Key }));
    }
    continuationToken = listResp.NextContinuationToken;
  } while (continuationToken);

  if (allKeys.length === 0) {
    console.log("[GeoVisionAI] Nothing to delete for today.");
    return;
  }

  // 2) delete in batches of up to 1000
  for (let i = 0; i < allKeys.length; i += 1000) {
    const chunk = allKeys.slice(i, i + 1000);
    const delResp = await s3.send(
      new DeleteObjectsCommand({
        Bucket: BUCKET_NAME,
        Delete: { Objects: chunk },
      }),
    );
    console.log("[GeoVisionAI] Deleted:", delResp.Deleted);
    if (delResp.Errors?.length) {
      console.error("[GeoVisionAI] Some deletions failed:", delResp.Errors);
    }
  }

  console.log("[GeoVisionAI] Today’s project data cleared.");
}

export async function listProjectsRecursive(userId, agentType, awsCredentials) {
  if (!userId) {
    throw new Error("[GeoVisionAI] listProjectsRecursive: userId is required");
  }

  const s3 = new S3Client({
    region: REGION,
    credentials: awsCredentials,
  });
  const prefix = `geovision/${userId}/`;

  console.log(`[GeoVisionAI] Listing projects under prefix: ${prefix}`);
  // 1) page through every object under that prefix
  let continuationToken;
  const allObjects = [];
  do {
    const resp = await s3.send(
      new ListObjectsV2Command({
        Bucket: BUCKET_NAME,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }),
    );
    continuationToken = resp.NextContinuationToken;
    if (resp.Contents) allObjects.push(...resp.Contents);
  } while (continuationToken);

  // 2) fold into nested map
  const projects = {};

  allObjects.forEach(({ Key }) => {
    // strip off the common prefix
    const rel = Key.slice(prefix.length);
    if (!rel || rel === "") return; // skip the root folder itself

    const parts = rel.split("/").filter(Boolean);
    const project = parts[0];
    // **filter** here:
    if (!project.startsWith(agentType)) return;

    if (!projects[project]) {
      projects[project] = { dates: {}, projectJson: null };
    }

    // if it's the top‐level project.json
    if (parts.length === 2 && parts[1] === "project.json") {
      projects[project].projectJson = Key;
      return;
    }

    // otherwise expect at least: project/date/location/…
    const [, date, location, ...rest] = parts;
    if (!date || !location) {
      // unexpected structure, skip or handle specially
      return;
    }

    // init nested slots
    const proj = projects[project];
    proj.dates[date] = proj.dates[date] || {};
    proj.dates[date][location] = proj.dates[date][location] || [];

    // push any deeper file path under that location
    const filePath = rest.join("/");
    if (filePath) {
      proj.dates[date][location].push(filePath);
    }
  });

  return projects;
}

/**
 * Delete an object from S3 under the given project/agent namespace.
 *
 * @param {string} userId       - Cognito identity ID of the user
 * @param {string} agentType    - Agent type (e.g. "little_library")
 * @param {object} awsCreds     - AWS credentials object
 * @param {string} projectId    - ID of the project containing the object
 * @param {string} objectKey    - Relative key of the object to delete (e.g. "lat_lon/timestamp.png")
 */
export async function deleteObject(
  userId,
  awsCreds,
  projectId,
  selectedDate,
  objectKey,
) {
  const s3 = new S3Client({ region: REGION, credentials: awsCreds });

  // Construct the full S3 key path: geovision/<userId>/<projectId>/<objectKey>
  const Key = `geovision/${userId}/${projectId}/${selectedDate}/${objectKey}`;

  try {
    await s3.send(
      new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key,
      }),
    );
    console.log(`Deleted S3 object: s3://${BUCKET_NAME}/${Key}`);
  } catch (err) {
    console.error(`Error deleting object s3://${BUCKET_NAME}/${Key}:`, err);
    throw err;
  }
}

/**
 * Load the final_events.json file from the public endpoint
 * and return it as an array of event objects.
 *
 * @returns {Promise<Array<Object>>}
 */
export async function loadRecentEvents() {
  const url = "https://azri.us/geovision/events/index.json";
  console.log(`[GeoVisionAI] Fetching events from: ${url}`);
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  console.log(`Results: ${res}`);

  if (!res.ok) {
    const text = await res.text();
    console.error(
      "[GeoVisionAI] loadFinalEvents failed:",
      res.status,
      res.statusText,
      text,
    );
    throw new Error(
      `Failed to load events.json: ${res.status} ${res.statusText}`,
    );
  }

  const events = await res.json();
  console.log(`[GeoVisionAI] Loaded ${events.length} events`);
  return events;
}
