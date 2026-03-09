//Registration frontend
//Imports
import { useState } from "react";
import { registerUser } from "../api";
import { Link } from "react-router-dom";

const Register = () => {
  const [form, setForm] = useState({ email: "", password: "" });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }))
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");


    // Simple client-side checks
    if (!form.email || !form.password || !form.name) {
      setError("Please fill in name, email, and password.");
      return;
    }
    if (!form.role) {
      setError("Please select a role.");
      return;
    }


    try {
      setLoading(true);
      const data = await registerUser(form);
      alert(data?.message || "Registered successfully.");
    } catch (err) {
      setError(err?.message || "Registration failed.");
    } finally {
      setLoading(false);
    }

  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-b from-dark-teal to-ash-grey">
      <div className="w-full max-w-sm px-8 flex flex-col items-center">

        <div className="mb-16 text-center">
          <h1 className="text-5xl font-bold text-beige tracking-tight">EpiskopOS</h1>
          <p className="text-beige text-lg mt-2 opacity-80">an Overseer</p>
        </div>

        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
          <h2 className="text-xl mb-2 font-semibold text-beige">Register</h2>

          {/* Name */}
          <div className="flex flex-col gap-1">
            <label className="sr-only" htmlFor="name" >Name</label>
            <input
              name="name"
              type="text"
              value={form.name}
              placeholder="Name"
              onChange={handleChange}
              className="w-full px-6 py-4 rounded-2xl text-beige text-lg placeholder-beige/70 outline-none bg-white/15 border border-beige/60"
            />
          </div>

          {/* Email */}
          <div className="flex flex-col gap-1">
            <label className="sr-only" htmlFor="email">Email</label>
            <input
              name="email"
              type="email"
              value={form.email}
              placeholder="example@email.com"
              onChange={handleChange}
              className="w-full px-6 py-4 rounded-2xl text-beige text-lg placeholder-beige/70 outline-none bg-white/15 border border-beige/60"
            />
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1">
            <label className="sr-only" htmlFor="password">Password</label>
            <input
              name="password"
              type="password"
              value={form.password}
              placeholder="Enter password"
              onChange={handleChange}
              className="w-full px-6 py-4 rounded-2xl text-beige text-lg placeholder-beige/70 outline-none bg-white/15 border border-beige/60"
            />
          </div>

          {/* Role */}
          <div className="flex flex-col gap-2">
            <label htmlFor="role" className="text-beige/80 text-sm font-medium pl-1">Role</label>
            <select
              id="role"
              name="role"
              value={form.role}
              onChange={handleChange}
              className="w-full px-6 py-4 rounded-2xl text-beige text-lg outline-none bg-white/15 border border-beige/60"
            >
              {["admin", "volunteer", "lighting", "sound", "media", "instrumentalists"].map((r) => (
                <option key={r} value={r} className="text-ink-black bg-beige">
                  <span className="capitalize">{r}</span>
                </option>
              ))}
            </select>
          </div>

          {/* Error display */}
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
              {error}
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