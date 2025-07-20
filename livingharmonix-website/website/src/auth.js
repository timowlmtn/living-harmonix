// src/auth.js
import { useState, useEffect } from "react";
import AWS from "aws-sdk";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
} from "firebase/auth";
import { initializeApp } from "firebase/app";

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

// Initialize Firebase app (singleton)
let app;
try {
  app = initializeApp(firebaseConfig);
} catch (err) {
  // ignore app already initialized
}

// ─── AWS Cognito configuration ───────────────────────────────────────────────
const IDENTITY_POOL_ID = process.env.REACT_APP_COGNITO_IDENTITY_POOL_ID;
const AWS_REGION = "us-east-1";
const LOGIN_KEY = `securetoken.google.com/${process.env.REACT_APP_FIREBASE_PROJECT_ID}`;

const auth = getAuth(app);
const provider = new GoogleAuthProvider();

/**
 * Trigger Google Sign-In popup
 */
export function signInWithGoogle() {
  return signInWithPopup(auth, provider)
    .then((result) => result.user)
    .catch((error) => {
      console.error("Google sign-in error", error);
      throw error;
    });
}

/**
 * Custom hook to subscribe to auth state
 * @returns {import('firebase/auth').User | null}
 */

export function useAuth() {
  const auth = getAuth();
  const [user, setUser] = useState(() => auth.currentUser);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        try {
          // 1) Grab a fresh Firebase ID token
          const idToken = await firebaseUser.getIdToken(true);

          // 2) Configure AWS SDK
          AWS.config.update({ region: AWS_REGION });
          AWS.config.credentials = new AWS.CognitoIdentityCredentials({
            IdentityPoolId: IDENTITY_POOL_ID,
            Logins: { [LOGIN_KEY]: idToken },
          });

          // 3) Wait for Cognito credentials to be ready
          await new Promise((resolve, reject) => {
            AWS.config.credentials.get((err) =>
              err ? reject(err) : resolve(),
            );
          });

          console.log(
            "[useAuth] AWS credentials ready, identityId:",
            AWS.config.credentials.identityId,
          );
        } catch (err) {
          console.error("[useAuth] Failed to set AWS credentials:", err);
        }
      } else {
        // Clear AWS creds on sign-out
        AWS.config.credentials = null;
      }
    });

    return unsubscribe;
  }, []);

  return user;
}

export function handleLogout(user) {
  try {
    console.log("Logging out user:", user?.email);
    auth.signOut();
  } catch (err) {
    console.error("Logout failed:", err);
  }
}
