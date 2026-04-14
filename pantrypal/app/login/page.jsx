"use client";

import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { useState } from "react";
import { auth } from "../../lib/firebase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!auth) {
      alert("Firebase is not configured.");
      return;
    }

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      window.location.href = "/";
    } catch (error) {
      alert(error?.message || "Invalid login");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async () => {
    if (!auth) {
      alert("Firebase is not configured.");
      return;
    }

    setLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      window.location.href = "/";
    } catch (error) {
      alert(error?.message || "Unable to create account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-2xl shadow-md w-80">
        <h1 className="text-2xl font-bold mb-6 text-center">
          Login to PantryPal
        </h1>

        <input
          type="email"
          placeholder="Email"
          className="w-full mb-3 p-2 border rounded"
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          className="w-full mb-4 p-2 border rounded"
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-green-500 text-white p-2 rounded hover:bg-green-600 disabled:opacity-60"
        >
          Sign In
        </button>

        <button
          onClick={handleCreateAccount}
          disabled={loading}
          className="w-full mt-3 bg-gray-800 text-white p-2 rounded hover:bg-gray-900 disabled:opacity-60"
        >
          Create Account
        </button>

        <p className="text-xs text-gray-400 mt-4 text-center">
          Use the same email to return later
        </p>
      </div>
    </div>
  );
}
