import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../components-css/signup.css";

export default function SignUp() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    linkedin: "",
    phone: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignUp = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      // For now, just store the signup data locally
      const signupData = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        linkedin: formData.linkedin || null,
        phone: formData.phone || null,
      };

      // Store in localStorage
      localStorage.setItem("signupData", JSON.stringify(signupData));
      
      alert("Sign up successful! Please sign in with your credentials.");
      navigate("/signin");
    } catch (error) {
      console.error("Sign up failed:", error);
      setErrors({ submit: "Sign up failed. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-container">
      <div className="signup-wrapper">
        <div className="signup-header">
          <h1>Create Account</h1>
          <p>Join AI Consortium and start your journey</p>
        </div>

        <form onSubmit={handleSignUp} className="signup-form">
          {/* Name */}
          <div className="form-group">
            <label htmlFor="name">Full Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="John Doe"
              className={errors.name ? "error" : ""}
            />
            {errors.name && <span className="error-text">{errors.name}</span>}
          </div>

          {/* Email */}
          <div className="form-group">
            <label htmlFor="email">Email Address *</label>
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
            <label htmlFor="password">Password *</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter password"
              className={errors.password ? "error" : ""}
            />
            {errors.password && (
              <span className="error-text">{errors.password}</span>
            )}
          </div>

          {/* Confirm Password */}
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password *</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm password"
              className={errors.confirmPassword ? "error" : ""}
            />
            {errors.confirmPassword && (
              <span className="error-text">{errors.confirmPassword}</span>
            )}
          </div>

          {/* LinkedIn (Optional) */}
          <div className="form-group">
            <label htmlFor="linkedin">LinkedIn Profile (Optional)</label>
            <input
              type="url"
              id="linkedin"
              name="linkedin"
              value={formData.linkedin}
              onChange={handleChange}
              placeholder="https://linkedin.com/in/yourprofile"
            />
          </div>

          {/* Phone (Optional) */}
          <div className="form-group">
            <label htmlFor="phone">Phone Number (Optional)</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+1 (555) 123-4567"
            />
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
            {loading ? "Creating Account..." : "Sign Up"}
          </button>

          {/* Sign In Link */}
          <div className="signin-link">
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => navigate("/signin")}
              className="link-btn"
            >
              Sign In
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
