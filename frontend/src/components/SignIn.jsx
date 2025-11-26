import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../components-css/signin.css";

export default function SignIn() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!form.username || !form.password) {
      setError("Please enter email and password.");
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("username", form.username);
      params.append("password", form.password);

      const res = await axios.post(
        "http://127.0.0.1:8000/auth/login",
        params.toString(),
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      );

      const { access_token, refresh_token } = res.data || {};
      if (access_token) {
        localStorage.setItem("accessToken", access_token);
        if (refresh_token) localStorage.setItem("refreshToken", refresh_token);
        axios.defaults.headers.common["Authorization"] = `Bearer ${access_token}`;
        // fetch current user info and store for navbar
        try {
          const me = await axios.get("http://127.0.0.1:8000/auth/me");
          const userObj = me.data || {};
          // normalize to have at least email/name
          const stored = {
            name: userObj.name || userObj.email || "",
            email: userObj.email || form.username,
            role: userObj.role || "",
          };
          localStorage.setItem("user", JSON.stringify(stored));
              // notify other components (navbar, sidebar) that user info changed
              try { window.dispatchEvent(new CustomEvent('user-updated', { detail: stored })); } catch (e) {}
        } catch (err) {
          // fallback: store email only
          localStorage.setItem("user", JSON.stringify({ name: form.username, email: form.username }));
              try { window.dispatchEvent(new CustomEvent('user-updated', { detail: { name: form.username, email: form.username } })); } catch (e) {}
        }

        navigate("/");
      } else {
        setError("Login succeeded but no token returned.");
      }
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.detail || err?.response?.data || err.message;
      setError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="signin-page">
      <form className="signin-card" onSubmit={handleSubmit}>
        <h2>Sign In</h2>

        <label>Email</label>
        <input
          name="username"
          type="email"
          value={form.username}
          onChange={handleChange}
          placeholder="you@example.com"
          required
        />

        <label>Password</label>
        <input
          name="password"
          type="password"
          value={form.password}
          onChange={handleChange}
          placeholder="Password"
          required
        />

        {error && <div className="signin-error">{error}</div>}

        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>
    </div>
  );
}
