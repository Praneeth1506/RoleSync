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

      const { access_token } = res.data || {};
      if (!access_token) throw new Error("No access token");

      localStorage.setItem("accessToken", access_token);
      axios.defaults.headers.common["Authorization"] = `Bearer ${access_token}`;

      const profileRes = await axios.get("http://127.0.0.1:8000/api/profile");

      if (profileRes.data?.ok && profileRes.data?.profile) {
        const userData = profileRes.data.profile;
        localStorage.setItem("user", JSON.stringify(userData));

        window.dispatchEvent(
          new CustomEvent("user-updated", { detail: userData })
        );
      }

      navigate("/up");
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
        err.message ||
        "Login failed"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="signin-page">
      <div className="signin-wrapper">

        {/* LEFT BRAND SECTION */}
        <div className="signin-left">
          <div className="brand-block">
            <h1 className="brand-name">RoleSync</h1>
            <p className="brand-sub">
              Smarter resumes. Better matches.
            </p>
          </div>
        </div>

        {/* RIGHT FORM SECTION */}
        <div className="signin-right">
          <form className="signin-card" onSubmit={handleSubmit}>
            <h2 className="signin-title">Sign In</h2>

            <label>Email</label>
            <input
              name="username"
              type="email"
              value={form.username}
              onChange={handleChange}
              required
            />

            <label>Password</label>
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              required
            />

            {error && <div className="signin-error">{error}</div>}

            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
