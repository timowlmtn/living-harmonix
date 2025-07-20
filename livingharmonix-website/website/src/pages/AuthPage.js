import { useState, useEffect } from "react";
import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "../components/ui/card";
import Button from "../components/ui/button";
import { FiSearch, FiList } from "react-icons/fi";
import { signInWithGoogle, useAuth, handleLogout } from "../auth";

// ─── Firebase configuration ──────────────────────────────────────────
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
};

const articles = [
  {
    id: 1,
    title: "The Pinboard Zine",
    excerpt:
      "Never miss out again—Pinboard Zine uncovers secret block-parties, cozy book swaps, and backyard flea markets you’d otherwise pass by. Just snap a photo of any neighborhood bulletin board and watch your find light up the community calendar.",
    imageUrl: "/images/issue1.jpg",
    pageUrl: "/pinboard",
    link: "/article/1",
  },
  {
    id: 3,
    title: "Little Library Catalog",
    excerpt:
      "Snap a photo of any curbside Little Library and our AI instantly builds a searchable catalog. Filter by age or genre, save favorites, and get alerts for new finds—all for free.",
    imageUrl: "/images/issue3.jpg",
    pageUrl: "/little_library",
    link: "/article/3",
  },
  {
    id: 2,
    title: "Living in Harmony",
    excerpt:
      "Snap your space with the Bagua Camera and get instant AI-powered Feng Shui tips that reveal exactly where your home needs more light, life, or clutter-clearing. Then upload your “before” shots for a certified Master’s personalized consult—harmony, balance, and good fortune are just one snapshot away.",
    imageUrl: "/images/issue2.jpg",
    pageUrl: "/living_harmony",
    link: "/article/2",
  },
];

export default function LandingPage() {
  const user = useAuth();
  const [isLinkedInInApp, setIsLinkedInInApp] = useState(false);

  useEffect(() => {
    // LinkedIn’s mobile app WebView includes "LinkedInApp" in its UA string
    const ua = navigator.userAgent || "";
    if (/LinkedInApp/i.test(ua)) {
      setIsLinkedInInApp(true);
    }
  }, []);

  return (
    <div className="min-h-screen w-full text-center bg-white text-gray-900">
      {/* Header Image */}
      {isLinkedInInApp && (
        <div className="mb-4 p-3 bg-yellow-100 text-yellow-800 rounded">
          ⚠️ It looks like you’re in LinkedIn’s in-app browser. Please open this
          page in your device’s default browser for Google sign-in to work.
        </div>
      )}

      <hr />

      <header className="border-t w-full px-4 py-6 text-center text-sm text-gray-600">
        {user ? (
          <>
            <span className="block mb-2">
              Thank you for being part of our community,{" "}
              <strong>{user.displayName}</strong>!
            </span>

            <div className="flex flex-col md:flex-row justify-center items-center gap-4">
              <div>
                <Link
                  to="/project"
                  className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
                >
                  View & contribute to your projects
                </Link>
              </div>
            </div>
          </>
        ) : (
          <button
            onClick={signInWithGoogle}
            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            Join the community with Google
          </button>
        )}
      </header>

      {/* Main Content */}
      <div className="w-full px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8 text-left">
        {/* Articles Feed */}
        <main className="lg:col-span-2 space-y-8">
          {articles.map((art) => (
            <Card
              key={art.id}
              className="overflow-hidden bg-white/70 backdrop-blur-md shadow-md"
            >
              <hr />
              <h2 className="text-2xl font-semibold mt-4 text-gray-900 px-4">
                <Link
                  to={art.pageUrl}
                  className="text-gray-800 hover:text-green-700"
                >
                  {art.title}
                </Link>
              </h2>

              {/* table layout */}
              <table className="w-full table-auto mt-4">
                <tbody>
                  <tr>
                    {/* image cell */}
                    <td className="w-32 px-4 align-top">
                      <img
                        src={art.imageUrl}
                        alt={art.title}
                        className="w-32 h-32 object-cover rounded"
                        style={{ maxWidth: "128px" }}
                      />
                    </td>

                    {/* excerpt + button cell */}
                    <td
                      className="p-16 align-middle"
                      style={{
                        padding: "16px",
                        verticalAlign: "middle",
                      }}
                    >
                      <p className="text-gray-800">{art.excerpt}</p>
                      <Button asChild className="mt-4">
                        <Link to={art.link}>Read More →</Link>
                      </Button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </Card>
          ))}
        </main>

        {/* Sidebar */}
        <aside className="space-y-8">
          {/* Search */}
          <Card className="bg-white/70 backdrop-blur-md">
            <CardContent>
              <div className="flex items-center">
                <FiSearch className="text-xl mr-2 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search articles..."
                  className="w-full border-none focus:ring-0"
                />
              </div>
            </CardContent>
          </Card>

          {/* Sections */}
          <Card className="bg-white/70 backdrop-blur-md">
            <CardContent>
              <h3 className="text-xl font-semibold mb-4 flex items-center">
                <FiList className="mr-2" /> Sections
              </h3>
              <ul className="space-y-2">
                <li>
                  <Link
                    to="/pinboard"
                    className="text-gray-800 hover:text-green-700"
                  >
                    Pinboard Zine
                  </Link>
                </li>
                <li>
                  <a
                    href="/living_harmony"
                    className="text-gray-800 hover:text-green-700"
                  >
                    Living Harmony
                  </a>
                </li>
                <li>
                  <a
                    href="/litle_library"
                    className="text-gray-800 hover:text-green-700"
                  >
                    Little Library
                  </a>
                </li>
              </ul>
            </CardContent>
          </Card>
        </aside>
      </div>

      {/* Footer */}
      <footer className="border-t w-full px-4 py-6 text-center text-sm text-gray-600">
        {user ? (
          <>
            <span className="block mb-2">
              Thank you for being part of our community,{" "}
              <strong>{user.displayName}</strong>!
            </span>

            <div className="flex flex-col md:flex-row justify-center items-center gap-4">
              <div>
                <Link
                  to="/project"
                  className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
                >
                  View & contribute to your projects
                </Link>
              </div>
              <div>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
                >
                  Logout
                </button>
              </div>
            </div>
          </>
        ) : (
          <button
            onClick={signInWithGoogle}
            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            Join the community with Google
          </button>
        )}
      </footer>
    </div>
  );
}
