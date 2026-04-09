import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Plus, Pencil } from "lucide-react";
import { getEvents, createEvent, updateEvent, deleteEvent } from "../api";

const getWeekStart = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

const getWeekDays = (start) => {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
};

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];
const DAY_LABELS_FULL = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

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

const prioritySubTextClass = (priority) =>
  priority === "high" ? "text-white/70" : "text-gray-500";

const toDateTimeLocal = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const EMPTY_FORM = {
  title: "", description: "", event_date: "",
  location: "", duration_hours: "", priority: "medium",
};

const PriorityPicker = ({ value, onChange }) => (
  <div className="flex flex-col gap-2">
    <label className="text-sm font-medium text-ink-black/70 pl-1">Priority</label>
    <div className="flex gap-2">
      {PRIORITY_LABELS.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          className={`flex-1 py-2 rounded-xl text-sm font-medium capitalize border transition-colors ${
            value === p
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

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

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

  const eventsByDate = events.reduce((acc, event) => {
    const dateKey = new Date(event.event_date).toDateString();
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(event);
    return acc;
  }, {});

  Object.keys(eventsByDate).forEach((dateKey) => {
    eventsByDate[dateKey].sort((a, b) => {
      const priorityDiff =
        (PRIORITY_ORDER[a.priority] ?? 1) - (PRIORITY_ORDER[b.priority] ?? 1);
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(a.event_date) - new Date(b.event_date);
    });
  });

  const weekDatesWithEvents = weekDays
    .map((d) => d.toDateString())
    .filter((dateStr) => eventsByDate[dateStr]);

  // Selected day's events
  const selectedDateStr = selectedDate.toDateString();
  const selectedDayEvents = eventsByDate[selectedDateStr] || [];

  const handleFormChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleEditFormChange = (e) =>
    setEditForm({ ...editForm, [e.target.name]: e.target.value });

  const openEditModal = (e, event) => {
    e.stopPropagation();
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

  const formatTime = (dateStr) =>
    new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const formatDateHeading = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" });
  };

  const isToday = (date) => date.toDateString() === new Date().toDateString();
  const isSelected = (date) => date.toDateString() === selectedDate.toDateString();
  const hasEvents = (date) => !!eventsByDate[date.toDateString()];

  const monthLabel = `${MONTH_NAMES[weekStart.getMonth()]} ${weekStart.getFullYear()}`;

  // Reusable event card used in both mobile and desktop panels
  const EventCard = ({ event }) => (
    <div className="relative">
      <button
        onClick={() => navigate(`/events/${event.id}`)}
        className={`w-full text-left rounded-2xl px-5 py-4 shadow-sm transition-opacity hover:opacity-90 ${priorityCardClass(event.priority)}`}
      >
        <p className={`text-sm mb-1 ${prioritySubTextClass(event.priority)}`}>
          {formatTime(event.event_date)}
          {event.duration_hours ? ` · ${event.duration_hours} hr` : ""}
        </p>
        <h3 className="font-bold text-lg leading-tight pr-8">{event.title}</h3>
        {event.location && (
          <p className={`text-sm mt-0.5 ${prioritySubTextClass(event.priority)}`}>
            📍 {event.location}
          </p>
        )}
        {event.description && (
          <p className={`text-sm mt-1 ${prioritySubTextClass(event.priority)}`}>
            {event.description}
          </p>
        )}
      </button>
      {isAdmin && (
        <button
          onClick={(e) => openEditModal(e, event)}
          className={`absolute top-4 right-4 p-1 rounded-lg transition-opacity hover:opacity-70 ${
            event.priority === "high" ? "text-white/80" : "text-ink-black/40"
          }`}
        >
          <Pencil size={15} />
        </button>
      )}
    </div>
  );

  return (
    <div className="min-h-full flex flex-col md:flex-row md:h-[calc(100vh-65px)] md:overflow-hidden">

      {/* ── Left panel — calendar ── */}
      <div className="md:w-[40%] md:border-r md:border-ash-grey/30 md:overflow-y-auto md:flex-shrink-0 bg-off-white">
        <div className="px-6 py-4 md:px-8 md:py-6">

          {/* Month + navigation */}
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <span className="text-ink-black font-semibold text-base md:text-lg">{monthLabel}</span>
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
          <div className="grid grid-cols-7 gap-1 md:gap-2">
            {weekDays.map((date, i) => (
              <button
                key={i}
                onClick={() => setSelectedDate(date)}
                className="flex flex-col items-center gap-1"
              >
                {/* Short label on mobile, fuller on desktop */}
                <span className="text-xs md:text-sm text-gray-500">
                  <span className="md:hidden">{DAY_LABELS[i]}</span>
                  <span className="hidden md:inline">{DAY_LABELS_FULL[i]}</span>
                </span>
                <div className={`w-9 h-9 md:w-11 md:h-11 rounded-full flex items-center justify-center text-sm md:text-base font-semibold transition-colors ${
                  isSelected(date)
                    ? "bg-dark-teal text-white"
                    : isToday(date)
                      ? "bg-ash-grey/40 text-ink-black"
                      : "text-ink-black"
                }`}>
                  {date.getDate()}
                </div>
                <div className={`w-1.5 h-1.5 rounded-full ${
                  hasEvents(date) ? "bg-dark-teal" : "bg-transparent"
                }`} />
              </button>
            ))}
          </div>

          {/* Desktop: week summary below calendar */}
          <div className="hidden md:block mt-8">
            <div className="border-t border-ash-grey/30 pt-6">
              <h3 className="text-xs font-bold text-gray-500 tracking-widest uppercase mb-4">
                This Week
              </h3>
              {weekDatesWithEvents.length === 0 ? (
                <p className="text-gray-400 text-sm">No events this week.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {weekDatesWithEvents.map((dateStr) => (
                    <button
                      key={dateStr}
                      onClick={() => setSelectedDate(new Date(dateStr))}
                      className={`w-full text-left px-4 py-3 rounded-xl transition-colors ${
                        dateStr === selectedDateStr
                          ? "bg-dark-teal/10 border border-dark-teal/30"
                          : "bg-white hover:bg-ash-grey/10 border border-ash-grey/20"
                      }`}
                    >
                      <p className={`text-xs font-semibold uppercase tracking-widest mb-0.5 ${
                        dateStr === selectedDateStr ? "text-dark-teal" : "text-gray-400"
                      }`}>
                        {new Date(dateStr).toLocaleDateString([], {
                          weekday: "short", day: "numeric", month: "short",
                        })}
                      </p>
                      <p className="text-sm font-medium text-ink-black">
                        {eventsByDate[dateStr].length} event{eventsByDate[dateStr].length !== 1 ? "s" : ""}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Desktop: Add Event button in left panel */}
          {isAdmin && (
            <div className="hidden md:block mt-6">
              <button
                onClick={() => setShowForm(true)}
                className="w-full py-3 rounded-2xl border-2 border-dashed border-dark-teal/50 text-dark-teal font-medium flex items-center justify-center gap-2 hover:bg-ash-grey/20 transition-colors"
              >
                <Plus size={18} />
                Add event
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Right panel — events for selected day ── */}
      <div className="md:w-[60%] md:overflow-y-auto bg-beige">
        <div className="px-6 pb-32 md:px-8 md:pb-12 md:pt-6">

          {/* Selected day heading */}
          <h2 className="text-ink-black font-semibold text-base md:text-xl mb-3 md:mb-5 pt-4 md:pt-0">
            {formatDateHeading(selectedDateStr)}
          </h2>

          {loading ? (
            <p className="text-gray-500 text-sm md:text-base">Loading events...</p>
          ) : selectedDayEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-gray-400 text-sm md:text-base">No events on this day.</p>
              <p className="text-gray-300 text-xs md:text-sm mt-1">
                Select another day or add a new event.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3 md:gap-4">
              {selectedDayEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mobile: Add Event button */}
      {isAdmin && (
        <div className="md:hidden fixed bottom-20 left-0 right-0 px-6">
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
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center md:justify-center">
          <div className="bg-white w-full md:max-w-lg md:rounded-3xl rounded-t-3xl px-6 py-8 max-h-[90vh] overflow-y-auto">
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
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center md:justify-center">
          <div className="bg-white w-full md:max-w-lg md:rounded-3xl rounded-t-3xl px-6 py-8 max-h-[90vh] overflow-y-auto">
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
  );
};

export default Events;