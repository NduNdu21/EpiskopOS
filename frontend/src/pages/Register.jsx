//Registration frontend
//Imports
import { useState } from "react";
import { registerUser } from "../api";

const Register = () => {
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "user" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
      // Assuming API returns 201 + JSON of user or { message }
      alert(data?.message || "Registered successfully.");
      // optionally redirect here
    } catch (err) {
      setError(err?.message || "Registration failed.");
    } finally {
      setLoading(false);
    }

  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <form onSubmit={handleSubmit} className="w-full max-w-md p-6 bg-white shadow rounded">
        <h2 className="text-xl mb-4 font-semibold">Register</h2>

        {/* Name */}
        <div className="space-y-1">
          <label htmlFor="name" >Name</label>
          <input
            name="name"
            type="text"
            value={form.name}
            placeholder="Name"
            onChange={handleChange}
            className="border p-2 mb-3 w-full"
          />
        </div>

        {/* Email */}
        <input
          name="email"
          type="email"
          placeholder="Email"
          onChange={handleChange}
          className="border p-2 mb-3 w-full"
        />

        {/* Password */}
        <input
          name="password"
          type="password"
          placeholder="Password"
          onChange={handleChange}
          className="border p-2 mb-3 w-full"
        />

        {/* Role */}
        <input
          name="role"
          type="radio"
          value="pastor"
        />


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
          className="w-full rounded-md bg-indigo-600 text-white py-2.5 font-medium hover:bg-indigo-700 disabled:opacity-60"
        >
          {loading ? "Registering..." : "Register"}
        </button>

      </form>
    </div>
  );
};

export default Register;