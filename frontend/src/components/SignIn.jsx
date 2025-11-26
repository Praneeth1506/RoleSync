import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../components-css/signin.css";

export default function SignIn() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignIn = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      // Check locally stored signup data first
      const signupDataStr = localStorage.getItem("signupData");
      const signupData = signupDataStr ? JSON.parse(signupDataStr) : null;

      let userData = null;

      // Check against locally stored signup
      if (signupData && signupData.email === formData.email && signupData.password === formData.password) {
        userData = {
          name: signupData.name,
          email: signupData.email,
          message: "Sign in successful",
        };
      }
      // Check against dummy user
      else if (
        formData.email === "user@example.com" &&
        formData.password === "password123"
      ) {
        const response = await axios.post("http://localhost:8000/api/dummy/signin", {
          email: formData.email,
          password: formData.password,
        });
        userData = response.data;
      } else {
        throw new Error("Invalid email or password");
      }

      if (userData) {
        // Store user data in localStorage
        localStorage.setItem("user", JSON.stringify(userData));
        alert("Sign in successful!");
        navigate("/");
        window.location.reload(); // Reload to update navbar
      }
    } catch (error) {
      console.error("Sign in failed:", error);
      const errorMsg = error.message || "Invalid email or password";
      setErrors({ submit: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signin-container">
      <div className="signin-wrapper">
        <div className="signin-header">
          <h1>Welcome Back</h1>
          <p>Sign in to your AI Consortium account</p>
        </div>

        <form onSubmit={handleSignIn} className="signin-form">
          {/* Email */}
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="your@email.com"
              className={errors.email ? "error" : ""}
            />
            {errors.email && <span className="error-text">{errors.email}</span>}
          </div>

          {/* Password */}
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              className={errors.password ? "error" : ""}
            />
            {errors.password && (
              <span className="error-text">{errors.password}</span>
            )}
          </div>

          {/* Submit Error */}
          {errors.submit && (
            <div className="error-box">{errors.submit}</div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            className="btn-submit"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>

          {/* Sign Up Link */}
          <div className="signup-link">
            Don't have an account?{" "}
            <button
              type="button"
              onClick={() => navigate("/signup")}
              className="link-btn"
            >
              Sign Up
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
