import { useState } from "react";
import { registerOrganization } from "../api";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Copy, Check } from "lucide-react";

const usernameRegex = /^[a-zA-Z0-9._-]{3,50}$/;
const inviteCodeRegex = /^[a-zA-Z0-9]{4,20}$/;

const validate = (form) => {
  const errors = {};

  if (!form.orgName.trim()) {
    errors.orgName = "Organization name is required.";
  }

  const nameParts = form.name.trim().split(/\s+/);
  if (!form.name.trim()) {
    errors.name = "Full name is required.";
  } else if (nameParts.length < 2) {
    errors.name = "Please enter your first and last name.";
  }

  if (!form.username.trim()) {
    errors.username = "Username is required.";
  } else if (!usernameRegex.test(form.username)) {
    errors.username = "3-50 characters: letters, numbers, dots, dashes, underscores only.";
  }

  if (!form.inviteCode.trim()) {
    errors.inviteCode = "Invite code is required.";
  } else if (!inviteCodeRegex.test(form.inviteCode.trim())) {
    errors.inviteCode = "4-20 characters: letters and numbers only.";
  }

  if (!form.password) {
    errors.password = "Password is required.";
  } else if (form.password.length < 8) {
    errors.password = "Password must be at least 8 characters.";
  }

  if (!form.confirmPassword) {
    errors.confirmPassword = "Please confirm your password.";
  } else if (form.password !== form.confirmPassword) {
    errors.confirmPassword = "Passwords do not match.";
  }

  return errors;
};

const FieldError = ({ message }) =>
  message ? <p className="text-red-300 text-xs mt-1 pl-1">{message}</p> : null;

const CreateOrganization = () => {
  const [form, setForm] = useState({
    orgName: "",
    name: "",
    username: "",
    inviteCode: "",
    password: "",
    confirmPassword: "",
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [result, setResult] = useState(null); // { inviteCode }
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");

    const errors = validate(form);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    try {
      setLoading(true);
      const { confirmPassword: _confirmPassword, ...payload } = form;
      const data = await registerOrganization(payload);
      localStorage.setItem("role", "admin");
      setResult({ inviteCode: data.inviteCode });
    } catch (err) {
      setServerError(err?.message || "Could not create organization. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!result?.inviteCode) return;
    await navigator.clipboard.writeText(result.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const inputClass = (field) =>
    `w-full px-6 py-4 rounded-2xl text-beige text-lg placeholder-beige/70 outline-none bg-white/15 border transition-colors ${
      fieldErrors[field] ? "border-red-400" : "border-beige/60 focus:border-beige"
    }`;

  if (result) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-b from-dark-teal to-ash-grey">
        <div className="w-full max-w-sm px-8 text-center">
          <h1 className="text-5xl font-bold text-beige tracking-tight mb-10">EpiskopOS</h1>
          <div className="bg-white/10 border border-beige/20 rounded-2xl px-6 py-8">
            <h2 className="text-xl font-semibold text-beige mb-3">Organization created</h2>
            <p className="text-beige/70 text-sm leading-relaxed mb-6">
              Share this invite code with your team so they can join. Write it
              down somewhere safe — you'll need it yourself to log back in.
            </p>

            <div className="flex items-center justify-between gap-3 bg-white/15 border border-beige/40 rounded-2xl px-5 py-4 mb-6">
              <span className="text-beige text-xl font-mono tracking-widest">{result.inviteCode}</span>
              <button
                type="button"
                onClick={handleCopy}
                className="text-beige/70 hover:text-beige transition-colors shrink-0"
                aria-label="Copy invite code"
              >
                {copied ? <Check size={20} /> : <Copy size={20} />}
              </button>
            </div>

            <button
              type="button"
              onClick={() => navigate("/")}
              className="w-full px-12 py-3 rounded-full text-beige text-lg tracking-wide bg-ash-grey/30 border border-ash-grey hover:bg-ash-grey/50 transition-colors"
            >
              Continue to EpiskopOS
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-b from-dark-teal to-ash-grey">
      <div className="w-full max-w-sm px-8 flex flex-col items-center">

        <div className="mb-16 text-center">
          <h1 className="text-5xl font-bold text-beige tracking-tight">EpiskopOS</h1>
          <p className="text-beige text-lg mt-2 opacity-80">an Overseer</p>
        </div>

        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4" noValidate>
          <h2 className="text-xl mb-2 font-semibold text-beige">Create your organization</h2>
          <p className="text-beige/70 text-sm -mt-2 mb-2">
            You'll be the first admin. Choose an invite code your team will use to join.
          </p>

          <div className="flex flex-col gap-1">
            <label className="sr-only" htmlFor="orgName">Organization name</label>
            <input
              id="orgName"
              name="orgName"
              type="text"
              value={form.orgName}
              placeholder="Organization name"
              onChange={handleChange}
              className={inputClass("orgName")}
            />
            <FieldError message={fieldErrors.orgName} />
          </div>

          <div className="flex flex-col gap-1">
            <label className="sr-only" htmlFor="name">Full Name</label>
            <input
              id="name"
              name="name"
              type="text"
              value={form.name}
              placeholder="Your full name"
              onChange={handleChange}
              autoComplete="name"
              className={inputClass("name")}
            />
            <FieldError message={fieldErrors.name} />
          </div>

          <div className="flex flex-col gap-1">
            <label className="sr-only" htmlFor="username">Username</label>
            <input
              id="username"
              name="username"
              type="text"
              value={form.username}
              placeholder="Username"
              onChange={handleChange}
              autoComplete="username"
              className={inputClass("username")}
            />
            <FieldError message={fieldErrors.username} />
          </div>

          <div className="flex flex-col gap-1">
            <label className="sr-only" htmlFor="inviteCode">Invite code</label>
            <input
              id="inviteCode"
              name="inviteCode"
              type="text"
              value={form.inviteCode}
              placeholder="Invite code for your team"
              onChange={handleChange}
              autoComplete="off"
              autoCapitalize="characters"
              className={inputClass("inviteCode")}
            />
            <FieldError message={fieldErrors.inviteCode} />
          </div>

          <div className="flex flex-col gap-1">
            <label className="sr-only" htmlFor="password">Password</label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={form.password}
                placeholder="Password (min. 8 characters)"
                onChange={handleChange}
                autoComplete="new-password"
                className={`${inputClass("password")} pr-14`}
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

          <div className="flex flex-col gap-1">
            <label className="sr-only" htmlFor="confirmPassword">Confirm Password</label>
            <div className="relative">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={form.confirmPassword}
                placeholder="Confirm password"
                onChange={handleChange}
                autoComplete="new-password"
                className={`${inputClass("confirmPassword")} pr-14`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-beige/60 hover:text-beige transition-colors"
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            <FieldError message={fieldErrors.confirmPassword} />
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
            {loading ? "Creating..." : "Create organization"}
          </button>

          <p className="mt-6 text-beige/60 text-sm text-center">
            Joining an existing organization?{" "}
            <Link to="/register" className="text-beige/90 underline hover:opacity-100">
              Register with an invite code
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default CreateOrganization;