//Registration frontend
//Imports
import { useState } from "react";
import { registerUser } from "../api";
import { Link, useNavigate } from "react-router-dom";

const ROLES = ["volunteer", "lighting", "sound", "media", "instrumentalists"];

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validate = (form) => {
  const errors = {};

  // Full name: must have at least two words
  const nameParts = form.name.trim().split(/\s+/);
  if (!form.name.trim()) {
    errors.name = "Full name is required.";
  } else if (nameParts.length < 2) {
    errors.name = "Please enter your first and last name.";
  }

  // Email
  if (!form.email.trim()) {
    errors.email = "Email is required.";
  } else if (!emailRegex.test(form.email)) {
    errors.email = "Please enter a valid email address.";
  }

  // Password
  if (!form.password) {
    errors.password = "Password is required.";
  } else if (form.password.length < 8) {
    errors.password = "Password must be at least 8 characters.";
  }

  // Confirm password
  if (!form.confirmPassword) {
    errors.confirmPassword = "Please confirm your password.";
  } else if (form.password !== form.confirmPassword) {
    errors.confirmPassword = "Passwords do not match.";
  }

  // Role
  if (!form.role) {
    errors.role = "Please select a role.";
  }

  return errors;
};

const FieldError = ({ message }) =>
  message ? (
    <p className="text-red-300 text-xs mt-1 pl-1">{message}</p>
  ) : null;

const Register = () => {
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "", role: "" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }))
    // Clear the error for this field as the user types
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");

    // Error handling
    const errors = validate(form);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    try {
      setLoading(true);
      // Strip confirmPassword before sending to API
      const { confirmPassword: _confirmPassword, ...payload } = form;
      const data = await registerUser(payload);
      alert(data?.message || "Registered successfully.");
      navigate("/login");
    } catch (err) {
      setServerError(err?.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  //Styling for all input fields 
  const inputClass = (field) =>
    `w-full px-6 py-4 rounded-2xl text-beige text-lg placeholder-beige/70 outline-none bg-white/15 border transition-colors ${
      fieldErrors[field]
        ? "border-red-400"
        : "border-beige/60 focus:border-beige"
    }`;

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-b from-dark-teal to-ash-grey">
      <div className="w-full max-w-sm px-8 flex flex-col items-center">

        <div className="mb-16 text-center">
          <h1 className="text-5xl font-bold text-beige tracking-tight">EpiskopOS</h1>
          <p className="text-beige text-lg mt-2 opacity-80">an Overseer</p>
        </div>

        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4" noValidate>
          <h2 className="text-xl mb-2 font-semibold text-beige">Register</h2>

          {/* Full Name */}
          <div className="flex flex-col gap-1">
            <label className="sr-only" htmlFor="name">Full Name</label>
            <input
              id="name"
              name="name"
              type="text"
              value={form.name}
              placeholder="Full Name"
              onChange={handleChange}
              autoComplete="name"
              className={inputClass("name")}
            />
            <FieldError message={fieldErrors.name} />
          </div>

          {/* Email */}
          <div className="flex flex-col gap-1">
            <label className="sr-only" htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              value={form.email}
              placeholder="example@email.com"
              onChange={handleChange}
              autoComplete="email"
              className={inputClass("email")}
            />
            <FieldError message={fieldErrors.email} />
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1">
            <label className="sr-only" htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              value={form.password}
              placeholder="Password (min. 8 characters)"
              onChange={handleChange}
              autoComplete="new-password"
              className={inputClass("password")}
            />
            <FieldError message={fieldErrors.password} />
          </div>

          {/* Confirm Password */}
          <div className="flex flex-col gap-1">
            <label className="sr-only" htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={form.confirmPassword}
              placeholder="Confirm password"
              onChange={handleChange}
              autoComplete="new-password"
              className={inputClass("confirmPassword")}
            />
            <FieldError message={fieldErrors.confirmPassword} />
          </div>

          {/* Role */}
          <div className="flex flex-col gap-2">
            <label htmlFor="role" className="text-beige/80 text-sm font-medium pl-1">Role</label>
            <select
              id="role"
              name="role"
              value={form.role}
              onChange={handleChange}
              className={`${inputClass("role")} appearance-none`}
            >
              <option value="" disabled className="text-ink-black bg-beige">
                Select your role
              </option>
              {ROLES.map((r) => (
                <option key={r} value={r} className="text-ink-black bg-beige capitalize">
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </option>
              ))}
            </select>
            <FieldError message={fieldErrors.role} />
          </div>

          {/* Server error */}
          {serverError && (
            <p className="text-sm text-red-300 bg-red-900/30 border border-red-400/40 rounded-xl px-4 py-3">
              {serverError}
            </p>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="px-12 py-3 rounded-full text-beige text-lg tracking-wide bg-ash-grey/30 border border-ash-grey hover:bg-ash-grey/50 disabled:opacity-60 transition-colors"
          >
            {loading ? "Registering..." : "Register"}
          </button>

          <p className="mt-6 text-beige/60 text-sm text-center">
            Already have an account?{" "}
            <Link to="/login" className="text-beige/90 underline hover:opacity-100">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Register;