import { useEffect, useRef, useState } from "react";
import { getMessages, sendMessage, getMe } from "../api";
import { getSocket } from "../socket";

const TEAM_FROM_ROLE = {
  sound_volunteer: "sound",
  lights_volunteer: "lights",
  media_volunteer: "media",
  worship_volunteer: "worship",
  sound_lead: "sound",
  lights_lead: "lights",
  media_lead: "media",
  worship_lead: "worship",
};

const TEAM_BADGE = {
  sound: "bg-green-100 text-green-800",
  lights: "bg-amber-100 text-amber-800",
  media: "bg-pink-100 text-pink-800",
  worship: "bg-purple-100 text-purple-800",
  admin: "bg-blue-100 text-blue-800",
  team_lead: "bg-blue-100 text-blue-800",
};

const ALL_TEAMS = ["sound", "lights", "media", "worship"];

const formatTime = (ts) =>
  new Date(ts).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });

const Messages = () => {
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState("");
  const [scope, setScope] = useState("broadcast");
  const [teamTarget, setTeamTarget] = useState("");
  const [filterScope, setFilterScope] = useState("all");
  const [loading, setLoading] = useState(true);
  const feedRef = useRef(null);

  // Derive role-based flags once user is loaded
  const userRole = user?.role || null;
  const userTeam = TEAM_FROM_ROLE[userRole] || null;
  const adminUser = userRole === "admin" || userRole === "team_lead";
  const scopeTargets = adminUser ? ALL_TEAMS : userTeam ? [userTeam] : [];
  const filterChips = adminUser
    ? ["all", "broadcast", ...ALL_TEAMS]
    : ["all", "broadcast"];

  // Fetch user once on mount
  useEffect(() => {
    getMe()
      .then(setUser)
      .catch(() => {});
  }, []);

  // Join socket rooms once user is known
  useEffect(() => {
    if (!userRole) return;
    const socket = getSocket();
    socket.emit("join_rooms", { role: userRole });

    socket.on("new_message", (msg) => {
      const visible =
        msg.scope === "broadcast" ||
        adminUser ||
        msg.team_target === userTeam;

      if (visible) {
        setMessages((prev) =>
          prev.find((m) => m.id === msg.id) ? prev : [...prev, msg]
        );
      }
    });

    return () => {
      socket.off("new_message");
    };
  }, [userRole, adminUser, userTeam]);

  // Fetch messages when filter changes (and once user is ready)
  useEffect(() => {
    if (!userRole) return;
    const fetchMessages = async () => {
      setLoading(true);
      try {
        const params = {};
        if (filterScope === "broadcast") {
          params.scope = "broadcast";
        } else if (filterScope !== "all") {
          params.scope = "team";
          params.team_target = filterScope;
        }
        const data = await getMessages(params);
        setMessages(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchMessages();
  }, [filterScope, userRole]);

  // Auto-scroll feed to bottom on new messages
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!content.trim()) return;
    const payload = {
      content: content.trim(),
      scope,
      team_target:
        scope === "team" ? teamTarget || userTeam : undefined,
    };
    setContent("");
    try {
      await sendMessage(payload);
    } catch (err) {
      console.error("Send failed:", err);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-[calc(85vh-16px)] bg-white">

      {/* Filter chips */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto border-b border-ash-grey/30 bg-white flex-shrink-0">
        {filterChips.map((chip) => (
          <button
            key={chip}
            onClick={() => setFilterScope(chip)}
            className={`text-xs px-3 py-1.5 rounded-full border whitespace-nowrap transition-colors capitalize ${
              filterScope === chip
                ? "bg-dark-teal text-white border-dark-teal"
                : "bg-white text-air-force-blue border-ash-grey/40"
            }`}
          >
            {chip === "all" ? "All" : chip}
          </button>
        ))}
      </div>

      {/* Message feed */}
      <div
        ref={feedRef}
        className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3"
      >
        {loading ? (
          <p className="text-center text-ash-grey text-sm mt-8">
            Loading messages…
          </p>
        ) : messages.length === 0 ? (
          <p className="text-center text-ash-grey text-sm mt-8">
            No messages yet.
          </p>
        ) : (
          messages.map((msg) => {
            const isMine = msg.sender_id === user?.id;
            const isBroadcast = msg.scope === "broadcast";
            const senderTeam = TEAM_FROM_ROLE[msg.sender_role] || msg.sender_role;

            if (isBroadcast) {
              return (
                <div
                  key={msg.id}
                  className="bg-sage/20 border border-sage/40 rounded-xl px-3 py-2.5"
                >
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <div className="w-1.5 h-1.5 rounded-full bg-dark-teal flex-shrink-0" />
                    <span className="text-xs font-medium text-dark-teal">
                      {msg.sender_name}
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        TEAM_BADGE[msg.sender_role] || "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {msg.sender_role}
                    </span>
                    <span className="text-[10px] text-ash-grey ml-auto">
                      Broadcast
                    </span>
                  </div>
                  <p className="text-sm text-ink-black pl-3.5">{msg.content}</p>
                  <p className="text-[10px] text-ash-grey pl-3.5 mt-1">
                    {formatTime(msg.created_at)}
                  </p>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`flex flex-col max-w-[80%] gap-1 ${
                  isMine ? "self-end items-end" : "self-start items-start"
                }`}
              >
                {!isMine && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-air-force-blue">
                      {msg.sender_name}
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        TEAM_BADGE[senderTeam] || "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {senderTeam}
                    </span>
                  </div>
                )}
                <div
                  className={`text-sm px-3 py-2 rounded-2xl ${
                    isMine
                      ? "bg-dark-teal text-white rounded-br-sm"
                      : "bg-white border border-ash-grey/30 text-ink-black rounded-bl-sm"
                  }`}
                >
                  {msg.content}
                </div>
                <span className="text-[10px] text-ash-grey px-1">
                  {formatTime(msg.created_at)}
                  {msg.team_target && ` · ${msg.team_target} team`}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* Compose bar */}
      <div className="border-t border-ash-grey/30 bg-white px-4 py-3 flex-shrink-0">
        <div className="flex gap-2 mb-2 flex-wrap">
          <button
            onClick={() => setScope("broadcast")}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${
              scope === "broadcast"
                ? "bg-dark-teal text-white border-dark-teal"
                : "bg-white text-air-force-blue border-ash-grey/40"
            }`}
          >
            Broadcast
          </button>
          {scopeTargets.map((team) => (
            <button
              key={team}
              onClick={() => {
                setScope("team");
                setTeamTarget(team);
              }}
              className={`text-xs px-3 py-1 rounded-full border capitalize transition-colors ${
                scope === "team" &&
                (teamTarget === team ||
                  (!teamTarget && userTeam === team))
                  ? "bg-dark-teal text-white border-dark-teal"
                  : "bg-white text-air-force-blue border-ash-grey/40"
              }`}
            >
              {team}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <textarea
            rows={1}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message…"
            className="flex-1 resize-none bg-off-white border border-ash-grey/30 rounded-2xl px-4 py-2 text-sm text-ink-black placeholder:text-ash-grey focus:outline-none focus:border-dark-teal"
          />
          <button
            onClick={handleSend}
            disabled={!content.trim()}
            className="w-9 h-9 rounded-full bg-dark-teal flex items-center justify-center disabled:opacity-40 transition-opacity flex-shrink-0"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M2 8L14 8M14 8L9 3M14 8L9 13"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Messages;