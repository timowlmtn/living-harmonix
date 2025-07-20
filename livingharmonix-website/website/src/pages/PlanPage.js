// src/pages/PlanPage.js

import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getProjectData } from "../GeoVisionAI";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { marked } from "marked";

const REGION = process.env.REACT_APP_AWS_REGION || "us-east-1";
const BUCKET = process.env.REACT_APP_AZRIUS_APP_BUCKET || "azri.us-data";

const PlanPage = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [htmlContent, setHtmlContent] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPlan = async () => {
      try {
        const userId = AWS.config.credentials?.identityId;
        if (!userId) throw new Error("Missing AWS Cognito credentials");

        const project = await getProjectData(userId, projectId);
        const planUrl = project.plan_url;

        if (!planUrl || !planUrl.startsWith("s3://")) {
          alert("This project does not have a valid plan URL.");
          navigate("/");
          return;
        }

        // Parse bucket/key from s3:// URL
        const [, , bucket, ...keyParts] = planUrl.split("/");
        const key = keyParts.join("/");

        const s3 = new S3Client({
          region: REGION,
          credentials: AWS.config.credentials,
        });

        const response = await s3.send(
          new GetObjectCommand({
            Bucket: bucket || BUCKET,
            Key: key,
          }),
        );

        const body = await new Response(response.Body).text();

        // Convert markdown to HTML
        const html = marked.parse(body);
        setHtmlContent(html);
      } catch (err) {
        console.error("[PlanPage] Error loading plan:", err);
        alert("Unable to load plan.");
      } finally {
        setLoading(false);
      }
    };

    loadPlan();
  }, [projectId, navigate]);

  return (
    <div
      style={{
        maxWidth: "600px",
        margin: "0 auto",
        padding: "1rem",
        fontFamily: "Arial, sans-serif",
        backgroundColor: "#fffdf8",
        color: "#333",
      }}
    >
      <button
        className="back-button"
        onClick={() => navigate("/", { replace: true })}
      >
        ← Back to Agents
      </button>

      {loading ? (
        <p>Loading plan...</p>
      ) : (
        <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
      )}
    </div>
  );
};

export default PlanPage;
