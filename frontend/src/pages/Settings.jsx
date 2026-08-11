import { useState, useEffect } from "react";
import { Lock, Bell, BellOff, CheckCircle, AlertCircle } from "lucide-react";
import { updatePassword, subscribePush, unsubscribePush } from "../api";

const Settings = () => {
    const [passwords, setPasswords] = useState({ current: "", new: "", confirm: "" });
    const [status, setStatus] = useState({ loading: false, error: "", success: "" });
    const [pushStatus, setPushStatus] = useState("checking"); // checking | unsupported | off | on | error
    const [pushLoading, setPushLoading] = useState(false);

    useEffect(() => {
        const check = async () => {
            if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
                setPushStatus("unsupported");
                return;
            }
            const reg = await navigator.serviceWorker.ready;
            const existing = await reg.pushManager.getSubscription();
            setPushStatus(existing ? "on" : "off");
        };
        check();
    }, []);

    const handleChange = (e) => {
        setPasswords({ ...passwords, [e.target.name]: e.target.value });
        setStatus({ loading: false, error: "", success: "" });
    };

    const handlePasswordUpdate = async (e) => {
        e.preventDefault();

        if (passwords.new !== passwords.confirm) {
            setStatus({ loading: false, error: "New passwords do not match", success: "" });
            return;
        }
        if (passwords.new.length < 8) {
            setStatus({ loading: false, error: "New password must be at least 8 characters", success: "" });
            return;
        }
        if (passwords.new === passwords.current) {
            setStatus({ loading: false, error: "New password must be different from current password", success: "" });
            return;
        }

        setStatus({ loading: true, error: "", success: "" });
        try {
            await updatePassword({ currentPassword: passwords.current, newPassword: passwords.new });
            setStatus({ loading: false, error: "", success: "Password updated successfully" });
            setPasswords({ current: "", new: "", confirm: "" });
        } catch (err) {
            setStatus({ loading: false, error: err.message || "Failed to update password", success: "" });
        }
    };

    function urlBase64ToUint8Array(base64String) {
        const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
        const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
        const rawData = atob(base64);
        return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
    }

    const handleEnablePush = async () => {
        setPushLoading(true);
        try {
            const reg = await navigator.serviceWorker.ready;
            const sub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(import.meta.env.VITE_VAPID_PUBLIC_KEY),
            });
            await subscribePush(sub);
            setPushStatus("on");
        } catch (err) {
            console.error("Push subscribe failed:", err);
            setPushStatus("error");
        } finally {
            setPushLoading(false);
        }
    };

    const handleDisablePush = async () => {
        setPushLoading(true);
        try {
            const reg = await navigator.serviceWorker.ready;
            const sub = await reg.pushManager.getSubscription();
            if (sub) {
                await unsubscribePush(sub.endpoint);
                await sub.unsubscribe();
            }
            setPushStatus("off");
        } catch (err) {
            console.error("Push unsubscribe failed:", err);
            setPushStatus("error");
        } finally {
            setPushLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-dark-teal to-ash-grey p-6 md:p-12">
            <div className="max-w-2xl mx-auto bg-white/10 border border-beige/20 rounded-3xl p-8 md:p-12 mt-10 shadow-xl">
                <h1 className="text-3xl font-bold text-beige mb-8 tracking-tight">Settings</h1>

                <section className="mb-10">
                    <div className="flex items-center gap-3 mb-6">
                        <Bell className="text-beige" size={24} />
                        <h2 className="text-xl font-semibold text-beige">Notifications</h2>
                    </div>

                    {pushStatus === "unsupported" && (
                        <p className="text-beige/70 text-sm">
                            Push notifications aren't supported on this browser. On iOS, add this site to your Home Screen first (iOS 16.4+).
                        </p>
                    )}

                    {pushStatus === "checking" && (
                        <p className="text-beige/70 text-sm">Checking notification status…</p>
                    )}

                    {(pushStatus === "on" || pushStatus === "off" || pushStatus === "error") && (
                        <div className="flex items-center justify-between gap-4">
                            <p className="text-beige/80 text-sm">
                                {pushStatus === "on"
                                    ? "You'll be notified for live events, segment changes, and reminders."
                                    : "Turn on notifications for live events, segment changes, and reminders."}
                            </p>
                            <button
                                onClick={pushStatus === "on" ? handleDisablePush : handleEnablePush}
                                disabled={pushLoading}
                                className="shrink-0 flex items-center gap-2 px-5 py-3 bg-teal-700 hover:bg-teal-600 disabled:opacity-50 text-beige font-medium rounded-xl transition-colors"
                            >
                                {pushStatus === "on" ? <BellOff size={18} /> : <Bell size={18} />}
                                {pushLoading ? "…" : pushStatus === "on" ? "Turn off" : "Turn on"}
                            </button>
                        </div>
                    )}

                    {pushStatus === "error" && (
                        <p className="text-red-300 text-sm mt-2">Something went wrong. Try again.</p>
                    )}
                </section>

                <section className="mb-10">
                    <div className="flex items-center gap-3 mb-6">
                        <Lock className="text-beige" size={24} />
                        <h2 className="text-xl font-semibold text-beige">Security</h2>
                    </div>

                    <form onSubmit={handlePasswordUpdate} className="flex flex-col gap-4">
                        <input
                            type="password"
                            name="current"
                            placeholder="Current Password"
                            value={passwords.current}
                            onChange={handleChange}
                            required
                            className="w-full px-5 py-4 rounded-xl text-beige text-md placeholder-beige/60 bg-black/20 border border-beige/30 focus:outline-none focus:border-beige transition-colors"
                        />
                        <input
                            type="password"
                            name="new"
                            placeholder="New Password"
                            value={passwords.new}
                            onChange={handleChange}
                            required
                            className="w-full px-5 py-4 rounded-xl text-beige text-md placeholder-beige/60 bg-black/20 border border-beige/30 focus:outline-none focus:border-beige transition-colors"
                        />
                        <input
                            type="password"
                            name="confirm"
                            placeholder="Confirm New Password"
                            value={passwords.confirm}
                            onChange={handleChange}
                            required
                            className="w-full px-5 py-4 rounded-xl text-beige text-md placeholder-beige/60 bg-black/20 border border-beige/30 focus:outline-none focus:border-beige transition-colors"
                        />

                        {status.error && (
                            <div className="flex items-center gap-2 text-red-300 text-sm">
                                <AlertCircle size={16} />
                                <span>{status.error}</span>
                            </div>
                        )}
                        {status.success && (
                            <div className="flex items-center gap-2 text-green-300 text-sm">
                                <CheckCircle size={16} />
                                <span>{status.success}</span>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={status.loading}
                            className="mt-2 w-full md:w-auto self-start px-8 py-3 bg-teal-700 hover:bg-teal-600 disabled:bg-teal-900 disabled:cursor-not-allowed text-beige font-medium rounded-xl transition-colors"
                        >
                            {status.loading ? "Updating..." : "Update Password"}
                        </button>
                    </form>
                </section>
            </div>
        </div>
    );
};

export default Settings;