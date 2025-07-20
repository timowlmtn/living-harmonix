// scripts/testGeoVisionAIClient.mjs

import AWS from "aws-sdk";
import {
  createGeoVisionFolder,
  createProject,
  setupUserFolderAndListProjects,
} from "../GeoVisionAI.js";
import {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

async function loadAwsCredentials() {
  const REGION = process.env.AWS_REGION || "us-east-1";
  AWS.config.update({ region: REGION });

  await new Promise((resolve, reject) => {
    AWS.config.getCredentials((err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  if (!AWS.config.credentials) {
    throw new Error("No AWS credentials available.");
  }

  return {
    creds: AWS.config.credentials,
    region: REGION,
  };
}

async function main() {
  console.log("🔧 Starting standalone GeoVisionAI CRUD test…");

  // Step 1: Load AWS credentials
  let awsConfig;
  try {
    awsConfig = await loadAwsCredentials();
  } catch (err) {
    console.error("❌ Failed to load AWS credentials:", err);
    process.exit(1);
  }
  const { creds: awsCreds, region: AWS_REGION } = awsConfig;
  console.log("✅ AWS credentials loaded. AccessKeyId:", awsCreds.accessKeyId);

  // Prepare a unique userId for this test run
  const today = new Date().toISOString().split("T")[0];
  const userId = `test-${today}`;
  const bucketName = "azrius-data";

  // Initialize a v3 S3Client for direct operations
  const s3v3Client = new S3Client({
    region: AWS_REGION,
    credentials: {
      accessKeyId: awsCreds.accessKeyId,
      secretAccessKey: awsCreds.secretAccessKey,
      sessionToken: awsCreds.sessionToken,
    },
  });

  // Helper: pause then continue
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // Step 2: Call createGeoVisionFolder(userId)
  console.log(`\n1) createGeoVisionFolder("${userId}", awsCreds)`);
  try {
    const projectId = "unit-test-project";
    const timestamp = new Date().toISOString();

    console.log("[test] Creating Folder:", projectId);

    await createGeoVisionFolder(userId, awsCreds);

    console.log("[test] Setting up folders:", projectId);

    const s3Projects = await setupUserFolderAndListProjects(
      userId,
      AWS.config.credentials,
    );

    console.log("[test] Creating project:", projectId);

    const initialProjectData = {
      id: projectId,
      name: "Test Project",
      created_at: timestamp,
      updated_at: timestamp,
      sheet_url: "", // blank initially
      s3_prefix: "", // to be filled by createProject
    };

    console.log("✅ createGeoVisionFolder succeeded: ", projectId);

    const created = await createProject(
      userId,
      projectId,
      initialProjectData,
      awsCreds,
    );
  } catch (err) {
    console.error("❌ createGeoVisionFolder failed:", err);
    process.exit(1);
  }

  // Verify geovision/<userId>/ exists
  const geovisionKey = `geovision/${userId}/`;
  console.log(`   → Verifying that "${geovisionKey}" exists in S3…`);
  try {
    // Small delay to ensure object is visible
    await delay(2000);

    const listResp = await s3v3Client.send(
      new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: geovisionKey,
        MaxKeys: 1,
      }),
    );
    const foundKeys = (listResp.Contents || []).map((obj) => obj.Key);
    console.log(foundKeys);
    if (!foundKeys.includes(geovisionKey)) {
      console.error(`❌ Expected key "${geovisionKey}" not found in S3.`);
      process.exit(1);
    } else {
      console.log(`✅ Verified: "${geovisionKey}" is present in S3.`);
    }
  } catch (err) {
    console.error("❌ Error verifying geovision folder:", err);
    process.exit(1);
  }

  // Step 3: Call setupUserFolderAndListProjects(userId)
  console.log(`\n2) setupUserFolderAndListProjects("${userId}", awsCreds)`);
  let initialProjects;
  try {
    initialProjects = await setupUserFolderAndListProjects(userId, awsCreds);
    console.log("   → Initial projects returned:", initialProjects);
    if (!Array.isArray(initialProjects) || initialProjects.length !== 0) {
      console.warn(
        "   ⚠️ Expected no subfolders under geovision/, but got:",
        initialProjects,
      );
    } else {
      console.log("✅ No initial projects (as expected).");
    }
  } catch (err) {
    console.error("❌ setupUserFolderAndListProjects failed:", err);
    process.exit(1);
  }

  // Step 4: Manually create geovision/<userId>/sample_project/ via S3Client
  const projectPrefix = `geovision/${userId}/sample_project/`;
  console.log(`\n3) Manually creating "${projectPrefix}"`);
  try {
    await s3v3Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: projectPrefix,
        Body: "",
      }),
    );
    console.log(`✅ Created zero-byte object at "${projectPrefix}".`);
  } catch (err) {
    console.error("❌ Failed to create project folder:", err);
    process.exit(1);
  }

  // Small delay before listing again
  await delay(2000);

  console.log("\n🎉 All CRUD steps succeeded!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Unhandled error in test client:", err);
  process.exit(1);
});
