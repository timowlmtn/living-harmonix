// src/App.js
import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import GeoVisionLayout from "./components/GeoVisionLayout.js";

import AuthPage from "./pages/AuthPage.js";
import AgentPage from "./pages/AgentPage.js";
import BaguaCameraPage from "./pages/BaguaCameraPage.js";
import CameraPage from "./pages/CameraPage.js";
import MapPage from "./pages/MapPage.js";
import PlanPage from "./pages/PlanPage.js";
import TestPage from "./pages/TestPage.js";
import ProjectPage from "./pages/ProjectPage.js";

import PinboardPage from "./pages/PinboardPage.js";
import LivingHarmonyPage from "./pages/LivingHarmonyPage.js";
import LittleLibraryPage from "./pages/LittleLibraryPage.js";

import ArticlePage from "./pages/ArticlePage.js";

import "./index.css";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<GeoVisionLayout />}>
          {/* nested index route → AuthPage */}
          <Route index element={<AuthPage />} />
        </Route>

        <Route path="/project" element={<ProjectPage />} />
        <Route path="/pinboard" element={<PinboardPage />} />
        <Route path="/little_library" element={<LittleLibraryPage />} />
        <Route path="/living_harmony" element={<LivingHarmonyPage />} />
        <Route path="/agent/:projectId" element={<AgentPage />} />
        <Route path="/baguaCamera/:projectId" element={<BaguaCameraPage />} />
        <Route path="/camera/:projectId" element={<CameraPage />} />
        <Route path="/plan/:projectId" element={<PlanPage />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/test" element={<TestPage />} />
        <Route path="/article/:id" element={<ArticlePage />} />
      </Routes>
    </Router>
  );
}

export default App;
