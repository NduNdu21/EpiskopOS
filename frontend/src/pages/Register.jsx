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
    <div className="flex items-center justify-center h-screen">
      <form onSubmit={handleSubmit} className="p-6 bg-white shadow rounded">
        <h2 className="text-xl mb-4">Register</h2>

        <input
          name="name"
          placeholder="Name"
          onChange={handleChange}
          className="border p-2 mb-3 w-full"
        />

        <input
          name="email"
          type="email"
          placeholder="Email"
          onChange={handleChange}
          className="border p-2 mb-3 w-full"
        />

        <input
          name="password"
          type="password"
          placeholder="Password"
          onChange={handleChange}
          className="border p-2 mb-3 w-full"
        />

        <input
          name="role"
          type="radio"
          value="pastor"
        />

        <button className="bg-green-500 text-white px-4 py-2 w-full">
          Register
        </button>
      </form>
    </div>
  );
};

export default Register;