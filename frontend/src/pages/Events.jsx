import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Plus, Pencil } from "lucide-react";
import { getEvents, createEvent, updateEvent, deleteEvent } from "../api";

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

//Prioririties for events
const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };
const PRIORITY_LABELS = ["high", "medium", "low"];

const priorityCardClass = (priority) => {
    switch (priority) {
        case "high": return "bg-dark-teal text-white";
        case "medium": return "bg-ash-grey/40 text-ink-black";
        case "low": return "bg-white text-ink-black";
        default: return "bg-ash-grey/40 text-ink-black";
    }
};

const prioritySubTextClass = (priority) => {
    return priority === "high" ? "text-white/70" : "text-gray-500";
};

// Converts a JS Date or ISO string to the format required by datetime-local input
const toDateTimeLocal = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const EMPTY_FORM = {
    title: "", description: "", event_date: "",
    location: "", duration_hours: "", priority: "medium"
};

// Reusable priority picker used in both modals
const PriorityPicker = ({ value, onChange }) => (
    <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-ink-black/70 pl-1">Priority</label>
        <div className="flex gap-2">
            {PRIORITY_LABELS.map((p) => (
                <button
                    key={p}
                    type="button"
                    onClick={() => onChange(p)}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium capitalize border transition-colors ${value === p
                        ? p === "high"
                            ? "bg-dark-teal text-white border-dark-teal"
                            : p === "medium"
                                ? "bg-ash-grey/60 text-ink-black border-ash-grey"
                                : "bg-white text-ink-black border-gray-300 shadow-sm"
                        : "bg-gray-50 text-gray-400 border-gray-200"
                        }`}
                >
                    {p}
                </button>
            ))}
        </div>
    </div>
);

// Shared modal form fields to avoid duplication
const EventFormFields = ({ values, onChange, onPriorityChange }) => (
    <>
        <input
            name="title"
            value={values.title}
            onChange={onChange}
            placeholder="Event title"
            className="border border-gray-200 rounded-xl px-4 py-3 text-ink-black outline-none focus:border-dark-teal"
        />
        <input
            name="location"
            value={values.location}
            onChange={onChange}
            placeholder="Location (optional)"
            className="border border-gray-200 rounded-xl px-4 py-3 text-ink-black outline-none focus:border-dark-teal"
        />
        <input
            name="event_date"
            type="datetime-local"
            value={values.event_date}
            onChange={onChange}
            className="border border-gray-200 rounded-xl px-4 py-3 text-ink-black outline-none focus:border-dark-teal"
        />
        <input
            name="duration_hours"
            type="number"
            value={values.duration_hours}
            onChange={onChange}
            placeholder="Duration in hours (optional)"
            className="border border-gray-200 rounded-xl px-4 py-3 text-ink-black outline-none focus:border-dark-teal"
        />
        <textarea
            name="description"
            value={values.description}
            onChange={onChange}
            placeholder="Description (optional)"
            rows={3}
            className="border border-gray-200 rounded-xl px-4 py-3 text-ink-black outline-none focus:border-dark-teal resize-none"
        />
        <PriorityPicker value={values.priority} onChange={onPriorityChange} />
    </>
);

const Events = () => {
    const navigate = useNavigate();
    const role = localStorage.getItem("role");
    const isAdmin = role === "admin";

    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [weekStart, setWeekStart] = useState(getWeekStart(new Date()));
    const [selectedDate, setSelectedDate] = useState(new Date());

    // Create event modal
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);
    const [formLoading, setFormLoading] = useState(false);
    const [formError, setFormError] = useState("");

    // Edit event modal
    const [editingEvent, setEditingEvent] = useState(null);
    const [editForm, setEditForm] = useState(EMPTY_FORM);
    const [editLoading, setEditLoading] = useState(false);
    const [editError, setEditError] = useState("");

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
    Object.keys(eventsByDate).forEach((dateKey) => {
        eventsByDate[dateKey].sort((a, b) => {
            const priorityDiff =
                (PRIORITY_ORDER[a.priority] ?? 1) - (PRIORITY_ORDER[b.priority] ?? 1);
            if (priorityDiff !== 0) return priorityDiff;
            return new Date(a.event_date) - new Date(b.event_date);
        });
    });

    const weekDatesWithEvents = weekDays.map((d) => d.toDateString()).filter((dateStr) => eventsByDate[dateStr]);

    const handleFormChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleEditFormChange = (e) => {
        setEditForm({ ...editForm, [e.target.name]: e.target.value });
    };

    const openEditModal = (e, event) => {
        e.stopPropagation(); // prevent navigating to event detail
        setEditingEvent(event);
        setEditForm({
            title: event.title,
            description: event.description,
            event_date: toDateTimeLocal(event.event_date),
            location: event.location,
            duration_hours: event.duration_hours,
            priority: event.priority,
        });
        setEditError("");
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
            setForm(EMPTY_FORM);
            setShowForm(false);
            fetchEvents();
        } catch (err) {
            setFormError(err.message || "Failed to create event.");
        } finally {
            setFormLoading(false);
        }
    };

    const handleUpdateEvent = async (e) => {
        e.preventDefault();
        setEditError("");
        if (!editForm.title || !editForm.event_date) {
            setEditError("Title and date are required.");
            return;
        }
        try {
            setEditLoading(true);
            await updateEvent(editingEvent.id, editForm);
            setEditingEvent(null);
            fetchEvents();
        } catch (err) {
            setEditError(err.message || "Failed to update event.");
        } finally {
            setEditLoading(false);
        }
    };

    const handleDeleteEvent = async () => {
        if (!window.confirm(`Delete "${editingEvent.title}"? This cannot be undone.`)) return;
        try {
            setEditLoading(true);
            await deleteEvent(editingEvent.id);
            setEditingEvent(null);
            fetchEvents();
        } catch (err) {
            setEditError(err.message || "Failed to delete event.");
        } finally {
            setEditLoading(false);
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

    const isToday = (date) => date.toDateString() === new Date().toDateString();
    const isSelected = (date) => date.toDateString() === selectedDate.toDateString();
    const hasEvents = (date) => !!eventsByDate[date.toDateString()];

    // Month label for the week displayed
    const monthLabel = `${MONTH_NAMES[weekStart.getMonth()]} ${weekStart.getFullYear()}`;

    return (
        <div className="min-h-full flex flex-col">

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
                    weekDatesWithEvents.map((dateStr) => (
                        <div key={dateStr} className="mb-6">
                            <h2 className="text-ink-black font-semibold text-base mb-3">
                                {formatDateHeading(dateStr)}
                            </h2>
                            <div className="flex flex-col gap-3">
                                {eventsByDate[dateStr].map((event) => (
                                    <div key={event.id} className="relative">
                                        <button
                                            onClick={() => navigate(`/events/${event.id}`)}
                                            className={`w-full text-left rounded-2xl px-5 py-4 shadow-sm transition-opacity hover:opacity-90 ${priorityCardClass(event.priority)}`}
                                        >
                                            <p className={`text-sm mb-1 ${prioritySubTextClass(event.priority)}`}>
                                                {formatTime(event.event_date)}
                                                {event.duration_hours ? ` · ${event.duration_hours} hr` : ""}
                                            </p>
                                            <h3 className="font-bold text-lg leading-tight pr-8">{event.title}</h3>
                                            {event.description && (
                                                <p className={`text-sm mt-1 ${prioritySubTextClass(event.priority)}`}>
                                                    {event.description}
                                                </p>
                                            )}
                                        </button>

                                        {/* Edit button — admin only, sits top-right of card */}
                                        {isAdmin && (
                                            <button
                                                onClick={(e) => openEditModal(e, event)}
                                                className={`absolute top-4 right-4 p-1 rounded-lg transition-opacity hover:opacity-70 ${event.priority === "high" ? "text-white/80" : "text-ink-black/40"
                                                    }`}
                                            >
                                                <Pencil size={15} />
                                            </button>
                                        )}
                                    </div>
                                ))}
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
                    <div className="bg-white w-full rounded-t-3xl px-6 py-8 max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-bold text-ink-black mb-6">New Event</h2>
                        <form onSubmit={handleCreateEvent} className="flex flex-col gap-4" noValidate>
                            <EventFormFields
                                values={form}
                                onChange={handleFormChange}
                                onPriorityChange={(p) => setForm((prev) => ({ ...prev, priority: p }))}
                            />
                            {formError && <p className="text-red-500 text-sm">{formError}</p>}
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

            {/* Edit Event Modal */}
            {editingEvent && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-end">
                    <div className="bg-white w-full rounded-t-3xl px-6 py-8 max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-bold text-ink-black mb-6">Edit Event</h2>
                        <form onSubmit={handleUpdateEvent} className="flex flex-col gap-4" noValidate>
                            <EventFormFields
                                values={editForm}
                                onChange={handleEditFormChange}
                                onPriorityChange={(p) => setEditForm((prev) => ({ ...prev, priority: p }))}
                            />
                            {editError && <p className="text-red-500 text-sm">{editError}</p>}
                            <div className="flex gap-3 mt-2">
                                <button
                                    type="submit"
                                    disabled={editLoading}
                                    className="flex-1 bg-dark-teal text-white py-3 rounded-xl font-medium hover:opacity-90 disabled:opacity-60"
                                >
                                    {editLoading ? "Saving..." : "Save Changes"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setEditingEvent(null); setEditError(""); }}
                                    className="flex-1 bg-gray-100 text-ink-black py-3 rounded-xl font-medium hover:bg-gray-200"
                                >
                                    Cancel
                                </button>
                            </div>
                            <button
                                type="button"
                                onClick={handleDeleteEvent}
                                disabled={editLoading}
                                className="w-full py-3 rounded-xl font-medium text-red-500 border border-red-200 hover:bg-red-50 disabled:opacity-60 transition-colors"
                            >
                                Delete Event
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Events;