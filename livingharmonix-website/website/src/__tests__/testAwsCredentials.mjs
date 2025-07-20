// testAwsCredentials.mjs

import AWS from "aws-sdk";

async function main() {
  // 1) Update region (fallback to us-east-1 if not set)
  AWS.config.update({ region: process.env.AWS_REGION || "us-east-1" });

  console.log("🔍 Attempting to load AWS credentials...");

  // 2) Trigger loading of the default credential chain
  AWS.config.getCredentials((err) => {
    if (err) {
      console.error("❌ Error loading credentials:", err);
      process.exit(1);
    } else {
      const creds = AWS.config.credentials;
      console.log("✅ AWS credentials successfully loaded:");
      console.log({
        accessKeyId: creds.accessKeyId,
        secretAccessKey: creds.secretAccessKey,
        sessionToken: creds.sessionToken || "(none)",
        expireTime: creds.expireTime || "(none)",
      });
      process.exit(0);
    }
  });
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
