import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { getEvents, createEvent } from "../api";

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

const Events = () => {
    //const navigate = useNavigate();
    //const role = localStorage.getItem("role");
    //const isAdmin = role === "admin";

    //const [events, setEvents] = useState([]);
    //const [loading, setLoading] = useState(true);
    const [weekStart, setWeekStart] = useState(getWeekStart(new Date()));
    const [selectedDate, setSelectedDate] = useState(new Date());

    // Create event form
    /*const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({
        title: "", description: "", event_date: "", location: "", duration_minutes: ""
    });
    const [formLoading, setFormLoading] = useState(false);
    const [formError, setFormError] = useState("");*/

    /*useEffect(() => {
        fetchEvents();
    }, []);

    /*const fetchEvents = async () => {
        try {
            setLoading(true);
            const data = await getEvents();
            setEvents(data);
        } catch (err) {
            console.error("fetchEvents error:", err.message);
        } finally {
            setLoading(false);
        }
    };*/

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
    /*const eventsByDate = events.reduce((acc, event) => {
        const dateKey = new Date(event.event_date).toDateString();
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(event);
        return acc;
    }, {});

    // Get dates that have events this week
    /*const weekDatesWithEvents = weekDays
        .map((d) => d.toDateString())
        .filter((dateStr) => eventsByDate[dateStr]);

    const handleFormChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    /*const handleCreateEvent = async (e) => {
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
    };*/

    const isToday = (date) => {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    };

    const isSelected = (date) => {
        return date.toDateString() === selectedDate.toDateString();
    };

    /*const hasEvents = (date) => {
        return !!eventsByDate[date.toDateString()];
    };*/

    // Month label for the week displayed
    const monthLabel = `${MONTH_NAMES[weekStart.getMonth()]} ${weekStart.getFullYear()}`;

    return (
        <div className="min-h-screen bg-beige flex flex-col">
            {/* Top Bar */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4">
                <button className="text-ink-black">
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
                            <div
                                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-colors
                                        ${isSelected(date)
                                        ? "bg-dark-teal text-white"
                                        : isToday(date)
                                            ? "bg-ash-grey/40 text-ink-black"
                                            : "text-ink-black"
                                    }`}
                            >
                                {date.getDate()}
                            </div>
                            {/* Dot for days with events }
                            <div className={`w-1.5 h-1.5 rounded-full ${hasEvents(date) ? "bg-dark-teal" : "bg-transparent"}`} />
                            { */}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )
}

export default Events;