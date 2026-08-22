import { useState } from "react";
import { loginUser } from "../api";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validate = (form, mode) => {
  const errors = {};

  if (mode === "email") {
    if (!form.email.trim()) {
      errors.email = "Email is required.";
    } else if (!emailRegex.test(form.email)) {
      errors.email = "Please enter a valid email address.";
    }
  } else {
    if (!form.username.trim()) {
      errors.username = "Username is required.";
    }
    if (!form.inviteCode.trim()) {
      errors.inviteCode = "Organization invite code is required.";
    }
  }

  if (!form.password) {
    errors.password = "Password is required.";
  } else if (form.password.length < 8) {
    errors.password = "Password must be at least 8 characters.";
  }
  return errors;
};

const FieldError = ({ message }) =>
  message ? <p className="text-red-300 text-xs mt-2 pl-1">{message}</p> : null;

const Login = () => {
  const [mode, setMode] = useState("email"); // "email" | "username"
  const [form, setForm] = useState({ email: "", username: "", inviteCode: "", password: "" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setFieldErrors({});
    setServerError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");
    const errors = validate(form, mode);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    try {
      setLoading(true);
      const payload =
        mode === "email"
          ? { email: form.email, password: form.password }
          : { username: form.username, inviteCode: form.inviteCode, password: form.password };

      const data = await loginUser(payload);
      const token = data?.token;
      const role = data?.role;
      if (token) {
        localStorage.setItem("token", token);
        localStorage.setItem("role", role);
        navigate(data?.mustSetUsername ? "/set-username" : "/");
      }
    } catch (err) {
      setServerError(err.message || "Login failed.");
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

        <form onSubmit={handleSubmit} className="p-6 rounded w-full flex flex-col" noValidate>
          <h2 className="text-xl mb-4 font-semibold text-beige">Login</h2>

          {/* Mode toggle */}
          <div className="flex mb-4 rounded-2xl border border-beige/40 overflow-hidden">
            <button
              type="button"
              onClick={() => switchMode("email")}
              className={`flex-1 py-2 text-sm transition-colors ${
                mode === "email" ? "bg-beige/20 text-beige" : "text-beige/60 hover:text-beige"
              }`}
            >
              Email
            </button>
            <button
              type="button"
              onClick={() => switchMode("username")}
              className={`flex-1 py-2 text-sm transition-colors ${
                mode === "username" ? "bg-beige/20 text-beige" : "text-beige/60 hover:text-beige"
              }`}
            >
              Username
            </button>
          </div>

          {mode === "email" ? (
            <div className="flex flex-col gap-1 mb-4">
              <label className="sr-only" htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="You@example.com"
                value={form.email}
                onChange={handleChange}
                autoComplete="email"
                className={`w-full px-6 py-4 rounded-2xl text-beige text-lg placeholder-beige/70 outline-none bg-white/15 border transition-colors ${
                  fieldErrors.email ? "border-red-400" : "border-beige/60 focus:border-beige"
                }`}
              />
              <FieldError message={fieldErrors.email} />
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-1 mb-4">
                <label className="sr-only" htmlFor="username">Username</label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  placeholder="Username"
                  value={form.username}
                  onChange={handleChange}
                  autoComplete="username"
                  className={`w-full px-6 py-4 rounded-2xl text-beige text-lg placeholder-beige/70 outline-none bg-white/15 border transition-colors ${
                    fieldErrors.username ? "border-red-400" : "border-beige/60 focus:border-beige"
                  }`}
                />
                <FieldError message={fieldErrors.username} />
              </div>

              <div className="flex flex-col gap-1 mb-4">
                <label className="sr-only" htmlFor="inviteCode">Organization invite code</label>
                <input
                  id="inviteCode"
                  name="inviteCode"
                  type="text"
                  placeholder="Organization invite code"
                  value={form.inviteCode}
                  onChange={handleChange}
                  className={`w-full px-6 py-4 rounded-2xl text-beige text-lg placeholder-beige/70 outline-none bg-white/15 border transition-colors ${
                    fieldErrors.inviteCode ? "border-red-400" : "border-beige/60 focus:border-beige"
                  }`}
                />
                <FieldError message={fieldErrors.inviteCode} />
              </div>
            </>
          )}

          {/* Password */}
          <div className="flex flex-col gap-1 mb-4">
            <label className="sr-only" htmlFor="password">Password</label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={form.password}
                onChange={handleChange}
                autoComplete="current-password"
                className={`w-full px-6 py-4 pr-14 rounded-2xl text-beige text-lg placeholder-beige/70 outline-none bg-white/15 border transition-colors ${
                  fieldErrors.password ? "border-red-400" : "border-beige/60 focus:border-beige"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-beige/60 hover:text-beige transition-colors"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            <FieldError message={fieldErrors.password} />
          </div>

          {serverError && (
            <p className="text-sm text-red-300 bg-red-900/30 border border-red-400/40 rounded-xl px-4 py-3 mt-3">
              {serverError}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="px-12 py-3 rounded-full text-lg bg-ash-grey/30 text-beige border border-ash-grey hover:bg-ash-grey/50 disabled:opacity-60 transition-colors"
          >
            {loading ? "Logging in..." : "Login"}
          </button>

          <p className="mt-6 text-beige/60 text-sm">
            Don't have an account?{" "}
            <Link to="/register" className="text-beige/90 underline hover:opacity-100">
              Register
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Login;