import { useState } from "react";
import { setUsername as setUsernameRequest } from "../api";
import { useNavigate } from "react-router-dom";

const usernameRegex = /^[a-zA-Z0-9._-]{3,50}$/;

const SetUsername = () => {
  const [username, setUsername] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setUsername(e.target.value);
    if (fieldError) setFieldError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");

    if (!usernameRegex.test(username)) {
      setFieldError("3-50 characters: letters, numbers, dots, dashes, underscores only.");
      return;
    }

    try {
      setLoading(true);
      await setUsernameRequest(username);
      navigate("/");
    } catch (err) {
      setServerError(err?.message || "Could not set username. Please try again.");
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

        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4" noValidate>
          <h2 className="text-xl mb-2 font-semibold text-beige">Choose a username</h2>
          <p className="text-beige/70 text-sm mb-2 leading-relaxed">
            We're moving to username-based sign in. Pick a username to continue —
            you'll use it alongside your organization's invite code next time you log in.
          </p>

          <div className="flex flex-col gap-1">
            <label className="sr-only" htmlFor="username">Username</label>
            <input
              id="username"
              name="username"
              type="text"
              value={username}
              placeholder="Username"
              onChange={handleChange}
              autoComplete="username"
              autoFocus
              className={`w-full px-6 py-4 rounded-2xl text-beige text-lg placeholder-beige/70 outline-none bg-white/15 border transition-colors ${
                fieldError ? "border-red-400" : "border-beige/60 focus:border-beige"
              }`}
            />
            {fieldError && <p className="text-red-300 text-xs mt-1 pl-1">{fieldError}</p>}
          </div>

          {serverError && (
            <p className="text-sm text-red-300 bg-red-900/30 border border-red-400/40 rounded-xl px-4 py-3">
              {serverError}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="px-12 py-3 rounded-full text-beige text-lg tracking-wide bg-ash-grey/30 border border-ash-grey hover:bg-ash-grey/50 disabled:opacity-60 transition-colors"
          >
            {loading ? "Saving..." : "Continue"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SetUsername;