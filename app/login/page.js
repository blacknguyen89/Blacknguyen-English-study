"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      if (res.ok) {
        router.push("/");
        router.refresh();
      } else {
        setError("Mã PIN không đúng.");
      }
    } catch (e) {
      setError("Có lỗi xảy ra, thử lại nhé.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#101826",
        fontFamily: "sans-serif",
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          background: "#1b2536",
          padding: "32px",
          borderRadius: "12px",
          width: "280px",
          border: "1px solid #2a3550",
        }}
      >
        <h2 style={{ color: "#f3ead8", marginTop: 0, fontSize: "18px" }}>
          🛂 English-Study
        </h2>
        <p style={{ color: "#9aa4b8", fontSize: "13px" }}>Nhập mã PIN để vào app</p>
        <input
          type="password"
          inputMode="numeric"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder="Mã PIN"
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: "8px",
            border: "1px solid #3a4666",
            background: "#101826",
            color: "#f3ead8",
            fontSize: "15px",
            marginBottom: "12px",
          }}
        />
        {error && (
          <p style={{ color: "#e8b3a4", fontSize: "12.5px", marginTop: "-4px" }}>{error}</p>
        )}
        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: "10px",
            borderRadius: "8px",
            border: "none",
            background: "#cf9a3e",
            color: "#101826",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {loading ? "Đang kiểm tra..." : "Vào học"}
        </button>
      </form>
    </div>
  );
}
