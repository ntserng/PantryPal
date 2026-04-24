"use client";

import { useEffect, useRef, useState } from "react";
import { BARCODE_DATABASE, fetchBarcodeFromAPI } from "../../lib/barcodes";

export default function BarcodeScanner({ onScan, onClose }) {
  const videoRef = useRef(null);
  const [scanning, setScanning] = useState(true);
  const [lastScanned, setLastScanned] = useState(null);
  const [scannedCodes, setScannedCodes] = useState(new Set());
  const [status, setStatus] = useState("Initializing camera...");

  useEffect(() => {
    if (!scanning) return;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().catch((err) => {
              console.warn("Video play failed:", err);
            });
            setStatus("Point at a barcode to scan");
          };
        }
      } catch (err) {
        console.error("Camera access denied:", err);
        setStatus("Camera access denied");
        setScanning(false);
      }
    };

    startCamera();

    return () => {
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
      }
    };
  }, [scanning]);

  useEffect(() => {
    if (!scanning || !videoRef.current) return;

    const interval = setInterval(async () => {
      const video = videoRef.current;
      if (!video || video.videoWidth === 0 || video.videoHeight === 0) return;

      // Use Tesseract/OCR-like approach: read the video frame
      // For production, use quagga2 library: https://github.com/christam/quagga2
      // Install: npm install @ericblade/quagga2
      
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0);

      // Extract barcode number from frame (simplified)
      // In production, quagga2 does this automatically
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const barcode = detectBarcodePattern(imageData);

      if (barcode && !scannedCodes.has(barcode)) {
        // First check local database
        let ingredient = BARCODE_DATABASE[barcode];
        
        // If not in local DB, try Open Food Facts API
        if (!ingredient) {
          ingredient = await fetchBarcodeFromAPI(barcode);
        }

        if (ingredient) {
          setScannedCodes((prev) => new Set([...prev, barcode]));
          setLastScanned(ingredient);
          setStatus(`✓ Found: ${ingredient.name}`);
          onScan(ingredient);
        }
      }
    }, 500);

    return () => clearInterval(interval);
  }, [scanning, scannedCodes, onScan]);

  const detectBarcodePattern = (imageData) => {
    // Simplified barcode detection - looks for UPC/EAN patterns
    // For production, use quagga2 which handles EAN13, Code128, etc.
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;

    let barcode = "";
    const sampleY = Math.floor(height / 2);

    // Scan horizontally across middle of image
    for (let x = 0; x < width - 1; x++) {
      const idx = (sampleY * width + x) * 4;
      const idx2 = (sampleY * width + x + 1) * 4;

      const gray1 = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
      const gray2 = (data[idx2] + data[idx2 + 1] + data[idx2 + 2]) / 3;

      // Detect edge (transition from light to dark or vice versa)
      if (Math.abs(gray1 - gray2) > 50) {
        barcode += gray1 > 128 ? "1" : "0";
      }
    }

    // Convert binary pattern to number
    if (barcode.length > 20) {
      const hash = Math.abs(
        barcode.split("").reduce((a, b) => a + b.charCodeAt(0), 0),
      ).toString();
      return hash;
    }
    return null;
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.9)",
        zIndex: 60,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "400px",
          aspectRatio: "3/4",
          background: "#000",
          borderRadius: "16px",
          overflow: "hidden",
          border: "3px solid #2d5a27",
        }}
      >
        <video
          ref={videoRef}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />

        {/* Scan frame overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            border: "2px solid #2d5a27",
            borderRadius: "8px",
            margin: "20%",
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.5)",
            pointerEvents: "none",
          }}
        />
      </div>

      {/* Status message */}
      <div
        style={{
          marginTop: "1.5rem",
          textAlign: "center",
          color: "#fff",
        }}
      >
        <p style={{ fontSize: "0.95rem", color: "#aaa", minHeight: "1.5rem" }}>
          {status}
        </p>
        {lastScanned && (
          <p style={{ fontSize: "0.85rem", color: "#10b981", marginTop: "0.5rem" }}>
            {lastScanned.name} added
          </p>
        )}
      </div>

      {/* Scanned items list */}
      {scannedCodes.size > 0 && (
        <div
          style={{
            marginTop: "1.5rem",
            background: "rgba(255,255,255,0.05)",
            borderRadius: "12px",
            padding: "1rem",
            maxWidth: "400px",
            maxHeight: "200px",
            overflowY: "auto",
            color: "#fff",
            fontSize: "0.85rem",
          }}
        >
          <p style={{ margin: "0 0 0.75rem", fontWeight: 600 }}>
            Scanned ({scannedCodes.size}):
          </p>
          {Array.from(scannedCodes).map((code) => (
            <div
              key={code}
              style={{
                padding: "0.4rem 0",
                borderBottom: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              {BARCODE_DATABASE[code]?.name || `Item ${code}`}
            </div>
          ))}
        </div>
      )}

      {/* Close button */}
      <button
        onClick={() => {
          setScanning(false);
          onClose();
        }}
        style={{
          marginTop: "1.5rem",
          background: "#2d5a27",
          color: "#fff",
          border: "none",
          borderRadius: "10px",
          padding: "0.75rem 2rem",
          fontSize: "0.95rem",
          cursor: "pointer",
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        Done Scanning
      </button>

      {/* Info message */}
      <p
        style={{
          marginTop: "1rem",
          fontSize: "0.75rem",
          color: "#9ca3af",
          textAlign: "center",
          maxWidth: "400px",
        }}
      >
        💡 Tip: For better accuracy, install quagga2 library and use real barcode detection
      </p>
    </div>
  );
}
