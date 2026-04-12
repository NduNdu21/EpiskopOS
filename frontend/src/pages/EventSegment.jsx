import { useState, useCallback, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, Plus, GripVertical } from "lucide-react";
import { getEvents, getSegments, createSegment, updateSegment, deleteSegment, goLive } from "../api";
import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const TEAMS = ["admin", "volunteer", "lighting", "sound", "media", "instrumentalists"];

const TeamSelector = ({ selected, onChange }) => (
    <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-ink-black/70 pl-1">Teams</label>
        <div className="flex flex-wrap gap-2">
            {TEAMS.map((team) => {
                const isSelected = selected.includes(team);
                return (
                    <button
                        key={team}
                        type="button"
                        onClick={() =>
                            onChange(
                                isSelected
                                    ? selected.filter((t) => t !== team)
                                    : [...selected, team]
                            )
                        }
                        className={`px-3 py-1.5 rounded-full text-sm font-medium capitalize border transition-colors ${isSelected
                            ? "bg-dark-teal text-white border-dark-teal"
                            : "bg-gray-50 text-gray-400 border-gray-200"
                            }`}
                    >
                        {team}
                    </button>
                );
            })}
        </div>
    </div>
);

const SortableSegmentCard = ({ seg, isAdmin, onTap }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: seg.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="bg-white rounded-2xl px-4 py-4 shadow-sm flex items-start gap-3"
        >
            {/* Drag handle — only visible to admins */}
            {isAdmin && (
                <button
                    className="mt-0.5 text-gray-300 hover:text-gray-400 touch-none flex-shrink-0"
                    {...attributes}
                    {...listeners}
                >
                    <GripVertical size={18} />
                </button>
            )}

            {/* Card content — tappable to edit */}
            <div
                className="flex-1 cursor-pointer"
                onClick={() => onTap(seg)}
            >
                <div className="flex items-center justify-between">
                    <h4 className="text-ink-black font-semibold">{seg.title}</h4>
                    <span className="text-ink-black font-medium text-sm ml-4">
                        {seg.duration_minutes} min
                    </span>
                </div>

                {seg.teams?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                        {seg.teams.map((team) => (
                            <span
                                key={team}
                                className="bg-dark-teal/10 text-dark-teal text-xs px-2.5 py-1 rounded-full capitalize font-medium"
                            >
                                {team}
                            </span>
                        ))}
                    </div>
                )}

                {seg.notes && (
                    <p className="text-gray-400 text-sm mt-1.5">{seg.notes}</p>
                )}
            </div>
        </div>
    );
};

const EMPTY_SEGMENT_FORM = {
    title: "", duration_minutes: "", teams: [], notes: "", order_index: ""
};

const SegmentFormFields = ({ values, onChangeField, onTeamsChange }) => (
    <>
        <input
            name="title"
            value={values.title}
            onChange={onChangeField}
            placeholder="Segment title"
            className="border border-gray-200 rounded-xl px-4 py-3 text-ink-black outline-none focus:border-dark-teal"
        />
        <div className="flex flex-col gap-1">
            <input
                name="duration_minutes"
                type="number"
                value={values.duration_minutes}
                onChange={onChangeField}
                placeholder="Duration in minutes"
                className="border border-gray-200 rounded-xl px-4 py-3 text-ink-black outline-none focus:border-dark-teal"
            />
            {values.duration_minutes !== "" && (
                Number(values.duration_minutes) < 2 ? (
                    <p className="text-amber-500 text-xs pl-1">That seems very short — are you sure?</p>
                ) : Number(values.duration_minutes) > 120 ? (
                    <p className="text-amber-500 text-xs pl-1">That seems very long — are you sure?</p>
                ) : null
            )}
        </div>
        <TeamSelector
            selected={values.teams}
            onChange={onTeamsChange}
        />
        <input
            name="notes"
            value={values.notes}
            onChange={onChangeField}
            placeholder="Notes (optional)"
            className="border border-gray-200 rounded-xl px-4 py-3 text-ink-black outline-none focus:border-dark-teal"
        />
    </>
);

const EventSegment = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const role = localStorage.getItem("role");
    const isAdmin = role === "admin";

    const [event, setEvent] = useState(null);
    const [segments, setSegments] = useState([]);
    const [loading, setLoading] = useState(true);

    // Create form
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState(EMPTY_SEGMENT_FORM);
    const [formLoading, setFormLoading] = useState(false);
    const [formError, setFormError] = useState("");

    // Edit form
    const [editingSegment, setEditingSegment] = useState(null);
    const [editForm, setEditForm] = useState(EMPTY_SEGMENT_FORM);
    const [editLoading, setEditLoading] = useState(false);
    const [editError, setEditError] = useState("");

    // Live functions
    const [isLive, setIsLive] = useState(false);
    const [goLiveLoading, setGoLiveLoading] = useState(false);
    const [goLiveError, setGoLiveError] = useState("");

    const handleGoLive = async () => {
        if (goLiveLoading) return;
        setGoLiveLoading(true);
        setGoLiveError("");
        try {
            await goLive(id);
            setIsLive(true);
        } catch (err) {
            setGoLiveError(err.message || "Failed to go live.");
        } finally {
            setGoLiveLoading(false);
        }
    };

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(TouchSensor, {
            activationConstraint: { delay: 200, tolerance: 5 },
        })
    );

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [allEvents, segs] = await Promise.all([
                getEvents(),
                getSegments(id),
            ]);
            const found = allEvents.find((e) => e.id === id);
            setEvent(found || null);
            setIsLive(found?.is_live || false);

            // Normalise teams field from PostgreSQL array string to JS array
            const normalised = segs.map((seg) => ({
                ...seg,
                teams: Array.isArray(seg.teams)
                    ? seg.teams
                    : seg.teams
                        ? seg.teams.replace(/[{}]/g, "").split(",").filter(Boolean)
                        : [],
            }));
            setSegments(normalised);
        } catch (err) {
            console.error("fetchData error:", err.message);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleDragEnd = async (dragEvent) => {
        const { active, over } = dragEvent;
        if (!over || active.id === over.id) return;

        const oldIndex = segments.findIndex((s) => s.id === active.id);
        const newIndex = segments.findIndex((s) => s.id === over.id);
        const reordered = arrayMove(segments, oldIndex, newIndex);

        // Optimistic update
        setSegments(reordered);

        // Persist new order_index values for each segment
        try {
            await Promise.all(
                reordered.map((seg, index) =>
                    updateSegment(id, seg.id, { ...seg, order_index: index })
                )
            );
        } catch (err) {
            console.error("reorder error:", err.message);
            fetchData(); // revert on failure
        }
    };

    const handleFormChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleEditFormChange = (e) => {
        setEditForm({ ...editForm, [e.target.name]: e.target.value });
    };

    const openEditModal = (seg) => {
        if (!isAdmin) return;
        setEditingSegment(seg);
        setEditForm({
            title: seg.title || "",
            duration_minutes: seg.duration_minutes || "",
            teams: seg.teams || [],
            notes: seg.notes || "",
            order_index: seg.order_index ?? "",
        });
        setEditError("");
    };

    const handleUpdateSegment = async (e) => {
        e.preventDefault();
        setEditError("");
        if (!editForm.title || !editForm.duration_minutes) {
            setEditError("Title and duration are required.");
            return;
        }
        try {
            setEditLoading(true);
            await updateSegment(id, editingSegment.id, editForm);
            setEditingSegment(null);
            fetchData();
        } catch (err) {
            setEditError(err.message || "Failed to update segment.");
        } finally {
            setEditLoading(false);
        }
    };

    const handleDeleteSegment = async () => {
        if (!window.confirm("Delete this segment?")) return;
        try {
            setEditLoading(true);
            await deleteSegment(id, editingSegment.id);
            setEditingSegment(null);
            fetchData();
        } catch (err) {
            setEditError(err.message || "Failed to delete segment.");
        } finally {
            setEditLoading(false);
        }
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
            setForm(EMPTY_SEGMENT_FORM);
            setShowForm(false);
            fetchData();
        } catch (err) {
            setFormError(err.message || "Failed to create segment.");
        } finally {
            setFormLoading(false);
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
                        {event.duration_hours ? ` · ${event.duration_hours} hr` : ""}
                    </p>
                    <span className="bg-white/20 text-white text-xs px-3 py-1 rounded-full">
                        {segments.length} segment{segments.length !== 1 ? "s" : ""}
                    </span>

                    {isAdmin && (
                        <div className="mt-4">
                            {isLive ? (
                                <span className="flex items-center gap-2 text-sm text-white/80 font-medium">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                                    </span>
                                    Service is live
                                </span>
                            ) : (
                                <button
                                    onClick={handleGoLive}
                                    disabled={goLiveLoading || segments.length === 0}
                                    className="bg-white/20 hover:bg-white/30 text-white text-sm font-semibold px-4 py-2 rounded-xl disabled:opacity-40 transition-colors"
                                >
                                    {goLiveLoading ? "Going live…" : "Go Live"}
                                </button>
                            )}
                            {goLiveError && (
                                <p className="text-red-300 text-xs mt-2">{goLiveError}</p>
                            )}
                        </div>
                    )}
                </div>

                {/* Order of Service */}
                <div className="mb-4">
                    <h3 className="text-xs font-bold text-gray-500 tracking-widest uppercase mb-3">
                        Order of Service
                    </h3>

                    {segments.length === 0 ? (
                        <p className="text-gray-400 text-sm">No segments added yet.</p>
                    ) : (
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                        >
                            <SortableContext
                                items={segments.map((s) => s.id)}
                                strategy={verticalListSortingStrategy}
                            >
                                <div className="flex flex-col gap-3">
                                    {segments.map((seg) => (
                                        <SortableSegmentCard
                                            key={seg.id}
                                            seg={seg}
                                            isAdmin={isAdmin}
                                            onTap={openEditModal}
                                        />
                                    ))}
                                </div>
                            </SortableContext>
                        </DndContext>
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

            {/* Create Segment Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-end">
                    <div className="bg-white w-full rounded-t-3xl px-6 py-8 max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-bold text-ink-black mb-6">New Segment</h2>
                        <form onSubmit={handleCreateSegment} className="flex flex-col gap-4" noValidate>
                            <SegmentFormFields
                                values={form}
                                onChangeField={handleFormChange}
                                onTeamsChange={(teams) =>
                                    setForm((prev) => ({ ...prev, teams }))
                                }
                            />
                            {formError && <p className="text-red-500 text-sm">{formError}</p>}
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

            {/* Edit Segment Modal */}
            {editingSegment && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-end">
                    <div className="bg-white w-full rounded-t-3xl px-6 py-8 max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-bold text-ink-black mb-6">Edit Segment</h2>
                        <form onSubmit={handleUpdateSegment} className="flex flex-col gap-4" noValidate>
                            <SegmentFormFields
                                values={editForm}
                                onChangeField={handleEditFormChange}
                                onTeamsChange={(teams) =>
                                    setEditForm((prev) => ({ ...prev, teams }))
                                }
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
                                    onClick={() => { setEditingSegment(null); setEditError(""); }}
                                    className="flex-1 bg-gray-100 text-ink-black py-3 rounded-xl font-medium hover:bg-gray-200"
                                >
                                    Cancel
                                </button>
                            </div>
                            <button
                                type="button"
                                onClick={handleDeleteSegment}
                                disabled={editLoading}
                                className="w-full py-3 rounded-xl font-medium text-red-500 border border-red-200 hover:bg-red-50 disabled:opacity-60 transition-colors"
                            >
                                Delete Segment
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EventSegment;