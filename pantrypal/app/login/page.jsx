"use client";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { useState, useEffect } from "react";
import { auth } from "../../lib/firebase";

const FONT_LINK =
  "https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&display=swap";

const TAGLINES = [
  "What's in your fridge tonight?",
  "Less waste. More flavor.",
  "Cook what you already have.",
  "Your pantry has more potential than you think.",
];

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState("signin"); // "signin" | "signup"
  const [tagline, setTagline] = useState(TAGLINES[0]);
  const [emailFocus, setEmailFocus] = useState(false);
  const [passFocus, setPassFocus] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // inject font
    if (!document.querySelector(`link[href="${FONT_LINK}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = FONT_LINK;
      document.head.appendChild(link);
    }
    // random tagline
    setTagline(TAGLINES[Math.floor(Math.random() * TAGLINES.length)]);
    // mount animation
    setTimeout(() => setMounted(true), 30);
  }, []);

  const handleSubmit = async () => {
    if (!auth) {
      setError("Firebase is not configured.");
      return;
    }
    if (!email || !password) {
      setError("Please fill in both fields.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      if (mode === "signin") {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      window.location.href = "/";
    } catch (err) {
      const msg =
        err?.code === "auth/invalid-credential" ||
        err?.code === "auth/wrong-password"
          ? "Incorrect email or password."
          : err?.code === "auth/email-already-in-use"
            ? "An account with this email already exists."
            : err?.code === "auth/weak-password"
              ? "Password should be at least 6 characters."
              : err?.message || "Something went wrong.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = (focused) => ({
    width: "100%",
    padding: "0.7rem 0.875rem",
    border: `1.5px solid ${focused ? "#2d5a27" : "#e9e6df"}`,
    borderRadius: "10px",
    fontSize: "0.875rem",
    fontFamily: "'DM Sans', sans-serif",
    background: focused ? "#fff" : "#fafaf8",
    color: "#1c1c1c",
    outline: "none",
    boxShadow: focused ? "0 0 0 3px rgba(45,90,39,0.07)" : "none",
    transition: "all 0.18s",
    boxSizing: "border-box",
  });

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        fontFamily: "'DM Sans', sans-serif",
        background: "#faf8f3",
        backgroundImage:
          "radial-gradient(ellipse at 10% 80%, rgba(134,164,118,0.12) 0%, transparent 55%), radial-gradient(ellipse at 90% 10%, rgba(212,165,96,0.1) 0%, transparent 50%)",
      }}
    >
      {/* LEFT PANEL — decorative */}
      <div
        style={{
          flex: "0 0 46%",
          background: "#1a2e18",
          backgroundImage:
            "radial-gradient(ellipse at 30% 70%, rgba(45,90,39,0.6) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(134,164,118,0.2) 0%, transparent 50%)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "3rem",
          position: "relative",
          overflow: "hidden",
        }}
        className="login-left-panel"
      >
        {/* subtle grain overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.04,
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")",
            pointerEvents: "none",
          }}
        />

        {/* wordmark */}
        <div style={{ position: "relative", zIndex: 1 }}>
          <span
            style={{
              fontFamily: "'DM Serif Display', serif",
              fontSize: "1.3rem",
              color: "rgba(255,255,255,0.9)",
              letterSpacing: "-0.02em",
            }}
          >
            🌿 PantryPal
          </span>
        </div>

        {/* center quote */}
        <div style={{ position: "relative", zIndex: 1 }}>
          <p
            style={{
              fontFamily: "'DM Serif Display', serif",
              fontSize: "clamp(1.6rem, 2.5vw, 2.2rem)",
              color: "#fff",
              lineHeight: 1.2,
              letterSpacing: "-0.02em",
              marginBottom: "1rem",
            }}
          >
            "{tagline}"
          </p>
          <div style={{ display: "flex", gap: "0.4rem" }}>
            {["🥕", "🫙", "🥦", "🍳", "🌿"].map((e, i) => (
              <span key={i} style={{ fontSize: "1.2rem", opacity: 0.7 }}>
                {e}
              </span>
            ))}
          </div>
        </div>

        {/* bottom note */}
        <p
          style={{
            position: "relative",
            zIndex: 1,
            fontSize: "0.72rem",
            color: "rgba(255,255,255,0.35)",
            lineHeight: 1.6,
          }}
        >
          Add your ingredients.
          <br />
          We'll find what you can cook.
        </p>
      </div>

      {/* RIGHT PANEL — form */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "360px",
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(12px)",
            transition: "opacity 0.35s ease, transform 0.35s ease",
          }}
        >
          {/* heading */}
          <div style={{ marginBottom: "2rem" }}>
            <h1
              style={{
                fontFamily: "'DM Serif Display', serif",
                fontSize: "1.9rem",
                color: "#1a2e18",
                letterSpacing: "-0.03em",
                lineHeight: 1.1,
                marginBottom: "0.375rem",
              }}
            >
              {mode === "signin" ? "Welcome back." : "Create account."}
            </h1>
            <p
              style={{ fontSize: "0.85rem", color: "#9ca3af", fontWeight: 300 }}
            >
              {mode === "signin"
                ? "Sign in to access your pantry."
                : "Start tracking your ingredients today."}
            </p>
          </div>

          {/* tab toggle */}
          <div
            style={{
              display: "flex",
              background: "#f0ede6",
              borderRadius: "10px",
              padding: "3px",
              marginBottom: "1.5rem",
            }}
          >
            {["signin", "signup"].map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  setError("");
                }}
                style={{
                  flex: 1,
                  padding: "7px",
                  borderRadius: "8px",
                  border: "none",
                  fontSize: "0.8rem",
                  fontWeight: 500,
                  fontFamily: "'DM Sans', sans-serif",
                  cursor: "pointer",
                  transition: "all 0.15s",
                  background: mode === m ? "#fff" : "transparent",
                  color: mode === m ? "#1a2e18" : "#9ca3af",
                  boxShadow: mode === m ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                }}
              >
                {m === "signin" ? "Sign in" : "Sign up"}
              </button>
            ))}
          </div>

          {/* fields */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
              marginBottom: "1.25rem",
            }}
          >
            <div>
              <label
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 500,
                  color: "#6b7280",
                  letterSpacing: "0.04em",
                  display: "block",
                  marginBottom: "0.3rem",
                }}
              >
                EMAIL
              </label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setEmailFocus(true)}
                onBlur={() => setEmailFocus(false)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                style={inputStyle(emailFocus)}
              />
            </div>
            <div>
              <label
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 500,
                  color: "#6b7280",
                  letterSpacing: "0.04em",
                  display: "block",
                  marginBottom: "0.3rem",
                }}
              >
                PASSWORD
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setPassFocus(true)}
                onBlur={() => setPassFocus(false)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                style={inputStyle(passFocus)}
              />
            </div>
          </div>

          {/* error */}
          {error && (
            <div
              style={{
                background: "#fff5f5",
                border: "1px solid #fecaca",
                borderRadius: "8px",
                padding: "0.6rem 0.875rem",
                marginBottom: "1rem",
                fontSize: "0.8rem",
                color: "#b91c1c",
              }}
            >
              {error}
            </div>
          )}

          {/* submit */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              width: "100%",
              padding: "0.75rem",
              background: loading ? "#6b9e64" : "#2d5a27",
              color: "#fff",
              border: "none",
              borderRadius: "10px",
              fontSize: "0.875rem",
              fontWeight: 500,
              fontFamily: "'DM Sans', sans-serif",
              cursor: loading ? "not-allowed" : "pointer",
              transition: "background 0.15s",
              letterSpacing: "0.01em",
            }}
            onMouseEnter={(e) => {
              if (!loading) e.target.style.background = "#234a1e";
            }}
            onMouseLeave={(e) => {
              if (!loading) e.target.style.background = "#2d5a27";
            }}
          >
            {loading
              ? "Please wait…"
              : mode === "signin"
                ? "Sign in →"
                : "Create account →"}
          </button>

          {/* footer note */}
          <p
            style={{
              fontSize: "0.72rem",
              color: "#c4bfb3",
              textAlign: "center",
              marginTop: "1.25rem",
              lineHeight: 1.6,
            }}
          >
            Your pantry is saved to your account.
            <br />
            Use the same email to return anytime.
          </p>
        </div>
      </div>

      {/* hide left panel on small screens */}
      <style>{`
        @media (max-width: 640px) {
          .login-left-panel { display: none !important; }
        }
      `}</style>
    </div>
  );
}
