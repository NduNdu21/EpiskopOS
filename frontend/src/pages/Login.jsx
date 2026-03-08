import { useState } from "react";
import { loginUser } from "../api";

const Login = () => {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.email || !form.password) {
      setError("Email and password are required.");
      return;
    }

    try {
      setLoading(true);
      const data = await loginUser(form);
      const token = data?.token;
      const role = data?.role;

      if (token) {
        localStorage.setItem("token", token);
        localStorage.setItem("role", role);
        alert("Login successful");
      }
    } catch (err) {
      setError(err.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-b from-dark-teal to-ash-grey">
      <div className="w-full max-w-sm px-8 flex flex-col items-center">

        <div className="mb-24 text-center">
          <h1 className="text-5xl font-bold text-beige tracking-tight">EpiskopOS</h1>
          <p className="text-beige text-lg mt-2 opacity-80">an Overseer</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 rounded w-full flex flex-col">
          <h2 className="text-xl mb-4 font-semibold text-beige">Login</h2>

          <div className="w-full rounded-3xl overflow-hidden mb-10 border border-beige/60">
            {/*<label className="text-sm font-medium text-beige">Email</label>*/}
            <input
              name="email"
              type="email"
              placeholder="You@example.com"
              value={form.email}
              onChange={handleChange}
              className="w-full px-6 py-5 text-beige text-lg placeholder-beige/70 outline-none bg-white/15 border-b border-beige/60"
            />

            {/*<label className="text-sm font-medium text-beige">Password</label>*/}
            <input
              name="password"
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={handleChange}
              className="w-full px-6 py-5 text-beige text-lg placeholder-beige/70 outline-none bg-white/15"
            />
          </div>
          
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2 mb-3">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="px-12 py-3 rounded-full text-lg bg-ash-grey/30 text-beige border border-ash-grey hover:bg-ash-grey/50 disabled:opacity-60 transition-colors"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;