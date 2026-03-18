import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, Plus, Trash2 } from "lucide-react";
import { getEvents, getSegments, createSegment, deleteSegment } from "../api";

const EventDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const role = localStorage.getItem("role");
    const isAdmin = role === "admin";

    const [event, setEvent] = useState(null);
    const [segments, setSegments] = useState([]);
    const [loading, setLoading] = useState(true);

    // Segment form
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({
        title: "", duration_minutes: "", assigned_team: "", notes: "", order_index: ""
    });
    const [formLoading, setFormLoading] = useState(false);
    const [formError, setFormError] = useState("");

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [allEvents, segs] = await Promise.all([
                getEvents(),
                getSegments(id),
            ]);
            const found = allEvents.find((e) => e.id === id);
            setEvent(found || null);
            setSegments(segs);
        } catch (err) {
            console.error("fetchData error:", err.message);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleFormChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleCreateSegment = async (e) => {
        e.preventDefault();
        setFormError("");
        if (!form.title || !form.duration_minutes) {
            setFormError("Title and duration are required.");
            return;
        }
        try {
            setFormLoading(true);
            await createSegment(id, {
                ...form,
                order_index: form.order_index || segments.length,
            });
            setForm({ title: "", duration_minutes: "", assigned_team: "", notes: "", order_index: "" });
            setShowForm(false);
            fetchData();
        } catch (err) {
            setFormError(err.message || "Failed to create segment.");
        } finally {
            setFormLoading(false);
        }
    };

    const handleDeleteSegment = async (segmentId) => {
        if (!window.confirm("Delete this segment?")) return;
        try {
            await deleteSegment(id, segmentId);
            fetchData();
        } catch (err) {
            console.error("deleteSegment error:", err.message);
        }
    };

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString([], {
            weekday: "short", day: "numeric", month: "short",
        });
    };

    const formatTime = (dateStr) => {
        return new Date(dateStr).toLocaleTimeString([], {
            hour: "2-digit", minute: "2-digit",
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-beige flex items-center justify-center">
                <p className="text-gray-500">Loading...</p>
            </div>
        );
    }

    if (!event) {
        return (
            <div className="min-h-screen bg-beige flex items-center justify-center">
                <p className="text-gray-500">Event not found.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-beige flex flex-col">

            {/* Header */}
            <div className="flex items-center gap-3 px-6 pt-6 pb-4">
                <button onClick={() => navigate("/events")} className="text-dark-teal">
                    <ChevronLeft size={24} />
                </button>
                <h1 className="text-lg font-bold text-ink-black">{event.title}</h1>
            </div>

            <div className="flex-1 px-6 pb-24 overflow-y-auto">

                {/* Event Summary Card */}
                <div className="bg-dark-teal rounded-2xl px-6 py-5 mb-6">
                    <h2 className="text-white font-bold text-2xl leading-tight mb-2">
                        {event.title}
                    </h2>
                    <p className="text-white/70 text-sm mb-4">
                        {formatDate(event.event_date)} · {formatTime(event.event_date)}
                        {event.duration_minutes ? ` · ${event.duration_minutes} min` : ""}
                    </p>

                    {/* Team tags */}
                    <div className="flex flex-wrap gap-2 mb-3">
                        {["Sound", "Projection", "Lighting"].map((tag) => (
                            <span
                                key={tag}
                                className="bg-white/20 text-white text-xs px-3 py-1 rounded-full"
                            >
                                {tag}
                            </span>
                        ))}
                    </div>

                    <span className="bg-white/20 text-white text-xs px-3 py-1 rounded-full">
                        {segments.length} segments
                    </span>
                </div>

                {/* Order of Service */}
                <div className="mb-4">
                    <h3 className="text-xs font-bold text-gray-500 tracking-widest uppercase mb-3">
                        Order of Service
                    </h3>

                    {segments.length === 0 ? (
                        <p className="text-gray-400 text-sm">No segments added yet.</p>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {segments.map((seg) => (
                                <div
                                    key={seg.id}
                                    className="bg-white rounded-2xl px-5 py-4 flex items-center justify-between shadow-sm"
                                >
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-ink-black font-semibold">{seg.title}</h4>
                                            <span className="text-ink-black font-medium text-sm ml-4">
                                                {seg.duration_minutes} min
                                            </span>
                                        </div>
                                        <p className="text-gray-400 text-sm mt-0.5">
                                            {seg.assigned_team && `${seg.assigned_team}`}
                                            {seg.assigned_team && seg.notes && " · "}
                                            {seg.notes && `${seg.notes}`}
                                            {!seg.assigned_team && !seg.notes && "No notes"}
                                        </p>
                                    </div>
                                    {isAdmin && (
                                        <button
                                            onClick={() => handleDeleteSegment(seg.id)}
                                            className="ml-4 text-red-300 hover:text-red-500 transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Add Segment Button (admin only) */}
                {isAdmin && (
                    <button
                        onClick={() => setShowForm(true)}
                        className="w-full py-4 rounded-2xl border-2 border-dashed border-dark-teal/50 text-dark-teal font-medium flex items-center justify-center gap-2 hover:bg-ash-grey/20 transition-colors mt-2"
                    >
                        <Plus size={20} />
                        Add segment
                    </button>
                )}
            </div>

            {/* Add Segment Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-end">
                    <div className="bg-white w-full rounded-t-3xl px-6 py-8">
                        <h2 className="text-xl font-bold text-ink-black mb-6">New Segment</h2>
                        <form onSubmit={handleCreateSegment} className="flex flex-col gap-4">
                            <input
                                name="title"
                                value={form.title}
                                onChange={handleFormChange}
                                placeholder="Segment title"
                                className="border border-gray-200 rounded-xl px-4 py-3 text-ink-black outline-none focus:border-dark-teal"
                            />
                            <input
                                name="duration_minutes"
                                type="number"
                                value={form.duration_minutes}
                                onChange={handleFormChange}
                                placeholder="Duration in minutes"
                                className="border border-gray-200 rounded-xl px-4 py-3 text-ink-black outline-none focus:border-dark-teal"
                            />
                            <input
                                name="assigned_team"
                                value={form.assigned_team}
                                onChange={handleFormChange}
                                placeholder="Assigned team (optional)"
                                className="border border-gray-200 rounded-xl px-4 py-3 text-ink-black outline-none focus:border-dark-teal"
                            />
                            <input
                                name="notes"
                                value={form.notes}
                                onChange={handleFormChange}
                                placeholder="Notes (optional)"
                                className="border border-gray-200 rounded-xl px-4 py-3 text-ink-black outline-none focus:border-dark-teal"
                            />
                            <input
                                name="order_index"
                                type="number"
                                value={form.order_index}
                                onChange={handleFormChange}
                                placeholder="Order (optional, defaults to last)"
                                className="border border-gray-200 rounded-xl px-4 py-3 text-ink-black outline-none focus:border-dark-teal"
                            />

                            {formError && (
                                <p className="text-red-500 text-sm">{formError}</p>
                            )}

                            <div className="flex gap-3 mt-2">
                                <button
                                    type="submit"
                                    disabled={formLoading}
                                    className="flex-1 bg-dark-teal text-white py-3 rounded-xl font-medium hover:opacity-90 disabled:opacity-60"
                                >
                                    {formLoading ? "Adding..." : "Add Segment"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setShowForm(false); setFormError(""); }}
                                    className="flex-1 bg-gray-100 text-ink-black py-3 rounded-xl font-medium hover:bg-gray-200"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
};

export default EventDetail;