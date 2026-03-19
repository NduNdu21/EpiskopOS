import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Menu, ChevronLeft, ChevronRight, Plus, Home, Film, MessageSquare, Users } from "lucide-react";
import { getEvents, createEvent } from "../api";
import { Sidebar } from "../components/Sidebar";

// Helper: get the Monday of the week containing a given date
const getWeekStart = (date) => {
    const d = new Date(date);
    const day = d.getDay(); //0 = Sunday
    const diff = day === 0 ? -6 : 1 - day; // adjust to Monday
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

// Helper: generate 7 days from a start date
const getWeekDays = (start) => {
    return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        return d;
    });
};

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

const NAV_ITEMS = [
    { label: "Home", icon: Home, path: "/" },
    { label: "Events", icon: Film, path: "/events" },
    { label: "Messages", icon: MessageSquare, path: "/messages" },
    { label: "Members", icon: Users, path: "/members" },
];

const Events = () => {
    const navigate = useNavigate();
    const role = localStorage.getItem("role");
    const isAdmin = role === "admin";
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [weekStart, setWeekStart] = useState(getWeekStart(new Date()));
    const [selectedDate, setSelectedDate] = useState(new Date());

    // Create event form
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({
        title: "", description: "", event_date: "", location: "", duration_minutes: ""
    });
    const [formLoading, setFormLoading] = useState(false);
    const [formError, setFormError] = useState("");

    useEffect(() => {
        fetchEvents();
    }, []);

    const fetchEvents = async () => {
        try {
            setLoading(true);
            const data = await getEvents();
            setEvents(data);
        } catch (err) {
            console.error("fetchEvents error:", err.message);
        } finally {
            setLoading(false);
        }
    };

    const weekDays = getWeekDays(weekStart);

    const prevWeek = () => {
        const d = new Date(weekStart);
        d.setDate(d.getDate() - 7);
        setWeekStart(d);
    };

    const nextWeek = () => {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + 7);
        setWeekStart(d);
    };

    // Group events by date string
    const eventsByDate = events.reduce((acc, event) => {
        const dateKey = new Date(event.event_date).toDateString();
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(event);
        return acc;
    }, {});

    // Get dates that have events this week
    const weekDatesWithEvents = weekDays
        .map((d) => d.toDateString())
        .filter((dateStr) => eventsByDate[dateStr]);

    const handleFormChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleCreateEvent = async (e) => {
        e.preventDefault();
        setFormError("");
        if (!form.title || !form.event_date) {
            setFormError("Title and date are required.");
            return;
        }
        try {
            setFormLoading(true);
            await createEvent(form);
            setForm({ title: "", description: "", event_date: "", location: "", duration_minutes: "" });
            setShowForm(false);
            fetchEvents();
        } catch (err) {
            setFormError(err.message || "Failed to create event.");
        } finally {
            setFormLoading(false);
        }
    };

    const formatTime = (dateStr) => {
        return new Date(dateStr).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const formatDateHeading = (dateStr) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" });
    };

    const isToday = (date) => {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    };

    const isSelected = (date) => {
        return date.toDateString() === selectedDate.toDateString();
    };

    const hasEvents = (date) => {
        return !!eventsByDate[date.toDateString()];
    };

    // Month label for the week displayed
    const monthLabel = `${MONTH_NAMES[weekStart.getMonth()]} ${weekStart.getFullYear()}`;

    return (
        <div className="min-h-screen bg-beige flex flex-col">

            <Sidebar
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
            />

            {/* Top Bar */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4">
                <button className="text-ink-black" onClick={() => setSidebarOpen(true)}>
                    <Menu size={26} />
                </button>
                <h1 className="text-lg font-bold text-ink-black">EpiskopOS</h1>
                <div className="w-9 h-9 rounded-full bg-dark-teal flex items-center justify-center">
                    <span className="text-white text-sm font-bold">
                        {localStorage.getItem("name")?.slice(0, 2).toUpperCase() || "?"}
                    </span>
                </div>
            </div>

            {/* Calendar Strip */}
            <div className="px-6 pb-4">

                {/* Month + navigation */}
                <div className="flex items-center justify-between mb-4">
                    <span className="text-ink-black font-semibold text-base">{monthLabel}</span>
                    <div className="flex gap-2">
                        <button onClick={prevWeek} className="text-ink-black hover:opacity-60">
                            <ChevronLeft size={20} />
                        </button>
                        <button onClick={nextWeek} className="text-ink-black hover:opacity-60">
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>

                {/* Day columns */}
                <div className="grid grid-cols-7 gap-1">
                    {weekDays.map((date, i) => (
                        <button
                            key={i}
                            onClick={() => setSelectedDate(date)}
                            className="flex flex-col items-center gap-1"
                        >
                            <span className="text-xs text-gray-500">{DAY_LABELS[i]}</span>
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-colors
                                    ${isSelected(date)
                                    ? "bg-dark-teal text-white"
                                    : isToday(date)
                                        ? "bg-ash-grey/40 text-ink-black"
                                        : "text-ink-black"
                                }`}>
                                {date.getDate()}
                            </div>
                            {/* Dot for days with events */}
                            <div className={`w-1.5 h-1.5 rounded-full ${hasEvents(date) ? "bg-dark-teal" : "bg-transparent"}`} />
                        </button>
                    ))}
                </div>
            </div>

            <div className="border-t border-gray-200 mx-6 mb-4" />

            {/* Events List */}
            <div className="flex-1 px-6 pb-32 overflow-y-auto">
                {loading ? (
                    <p className="text-gray-500">Loading events...</p>
                ) : weekDatesWithEvents.length === 0 ? (
                    <p className="text-gray-500 text-sm">No events this week.</p>
                ) : (
                    weekDatesWithEvents
                        .sort((a, b) => new Date(b) - new Date(a)) // most recent first
                        .map((dateStr) => (
                            <div key={dateStr} className="mb-6">
                                <h2 className="text-ink-black font-semibold text-base mb-3">
                                    {formatDateHeading(dateStr)}
                                </h2>
                                <div className="flex flex-col gap-3">
                                    {eventsByDate[dateStr].map((event) => {
                                        const isMainEvent = event === eventsByDate[dateStr][0];
                                        return (
                                            <button
                                                key={event.id}
                                                onClick={() => navigate(`/events/${event.id}`)}
                                                className={`w-full text-left rounded-2xl px-5 py-4 shadow-sm transition-opacity hover:opacity-90
                                                    ${isMainEvent
                                                        ? "bg-dark-teal text-white"
                                                        : "bg-ash-grey/30 text-ink-black"
                                                    }`}
                                            >
                                                <p className={`text-sm mb-1 ${isMainEvent ? "text-white/70" : "text-gray-500"}`}>
                                                    {formatTime(event.event_date)}
                                                    {event.duration_minutes ? ` · ${event.duration_minutes} min` : ""}
                                                </p>
                                                <h3 className="font-bold text-lg leading-tight">{event.title}</h3>
                                                {event.description && (
                                                    <p className={`text-sm mt-1 ${isMainEvent ? "text-white/70" : "text-gray-500"}`}>
                                                        {event.description}
                                                    </p>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))
                )}
            </div>

            {/* Add Event Button (admin only) */}
            {isAdmin && (
                <div className="fixed bottom-20 left-0 right-0 px-6">
                    <button
                        onClick={() => setShowForm(true)}
                        className="w-full py-4 rounded-2xl border-2 border-dashed border-dark-teal/50 text-dark-teal font-medium flex items-center justify-center gap-2 bg-beige hover:bg-ash-grey/20 transition-colors"
                    >
                        <Plus size={20} />
                        Add event
                    </button>
                </div>
            )}

            {/* Create Event Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-end">
                    <div className="bg-white w-full rounded-t-3xl px-6 py-8">
                        <h2 className="text-xl font-bold text-ink-black mb-6">New Event</h2>
                        <form onSubmit={handleCreateEvent} className="flex flex-col gap-4">
                            <input
                                name="title"
                                value={form.title}
                                onChange={handleFormChange}
                                placeholder="Event title"
                                className="border border-gray-200 rounded-xl px-4 py-3 text-ink-black outline-none focus:border-dark-teal"
                            />
                            <input
                                name="location"
                                value={form.location}
                                onChange={handleFormChange}
                                placeholder="Location (optional)"
                                className="border border-gray-200 rounded-xl px-4 py-3 text-ink-black outline-none focus:border-dark-teal"
                            />
                            <input
                                name="event_date"
                                type="datetime-local"
                                value={form.event_date}
                                onChange={handleFormChange}
                                className="border border-gray-200 rounded-xl px-4 py-3 text-ink-black outline-none focus:border-dark-teal"
                            />
                            <input
                                name="duration_minutes"
                                type="number"
                                value={form.duration_minutes}
                                onChange={handleFormChange}
                                placeholder="Duration in minutes (optional)"
                                className="border border-gray-200 rounded-xl px-4 py-3 text-ink-black outline-none focus:border-dark-teal"
                            />
                            <textarea
                                name="description"
                                value={form.description}
                                onChange={handleFormChange}
                                placeholder="Description (optional)"
                                rows={3}
                                className="border border-gray-200 rounded-xl px-4 py-3 text-ink-black outline-none focus:border-dark-teal resize-none"
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
                                    {formLoading ? "Creating..." : "Create Event"}
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

            {/* Nav bar bottom */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center px-4 py-3">
                {NAV_ITEMS.map(({ label, icon: Icon, path }) => {
                    const isActive = location.pathname === path;
                    return (
                        <Link
                            key={label}
                            to={path}
                            className={`flex flex-col items-center gap-1 ${isActive ? "text-dark-teal" : "text-ink-black"
                                }`}
                        >
                            <Icon size={26} strokeWidth={isActive ? 2.5 : 1.5} />
                            <span className="text-xs font-medium">{label}</span>
                        </Link>
                    );
                })}
            </div>
        </div>
    )
}

export default Events;