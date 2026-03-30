
const API_BASE = import.meta.env.VITE_API_BASE;

console.log("API_BASE:", API_BASE);

async function handleResponse(res) {
  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json() : null;
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
      return;
    }
    const message = data?.message || data?.error || res.statusText;
    const err = new Error(message);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

//Users
export const registerUser = async (data) => {
    const response = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json"},
        body: JSON.stringify(data),
    });

    const text = await response.text();
    const json = text ? JSON.parse(text) : {};
    if (!response.ok) throw new Error(json.message);
    return json;
}


export const loginUser = async (payload) => {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await handleResponse(res);
  const token = data?.data?.token || data?.token;
  if (token) localStorage.setItem("token", token);
  return data;
};


export const getProtectedData = async () => {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_BASE}/test/protected`, {
    headers: { Authorization: token ? `Bearer ${token}` : "" },
  });
  return handleResponse(res);
};

export const getMe = async () => {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_BASE}/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
};

//Events
export const getEvents = async () => {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_BASE}/events`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
};


export const getMyEvents = async () => {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_BASE}/events/my`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
};


export const createEvent = async (data) => {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_BASE}/events`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
};


export const updateEvent = async (id, data) => {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_BASE}/events/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
};


export const deleteEvent = async (id) => {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_BASE}/events/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
};

export const getCurrentAndNext = async () => {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_BASE}/events/current`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
};

//Segments
export const getSegments = async (eventId) => {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_BASE}/events/${eventId}/segments`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
};

export const createSegment = async (eventId, data) => {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_BASE}/events/${eventId}/segments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
};

export const updateSegment = async (eventId, segmentId, data) => {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_BASE}/events/${eventId}/segments/${segmentId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
};

export const deleteSegment = async (eventId, segmentId) => {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_BASE}/events/${eventId}/segments/${segmentId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
};

export const addSegmentTeam = async (eventId, segmentId, team) => {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_BASE}/events/${eventId}/segments/${segmentId}/teams`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ team }),
  });
  return handleResponse(res);
};

export const removeSegmentTeam = async (eventId, segmentId, team) => {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_BASE}/events/${eventId}/segments/${segmentId}/teams/${team}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
};

//Live services
export const getLiveEvent = async () => {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_BASE}/events/live`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
};

export const goLive = async (eventId) => {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_BASE}/events/${eventId}/golive`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
};

export const nextSegment = async (eventId) => {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_BASE}/events/${eventId}/next`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
};

export const prevSegment = async (eventId) => {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_BASE}/events/${eventId}/prev`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
};

export const endService = async (eventId) => {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_BASE}/events/${eventId}/end`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
};

// Messages 
export const getMessages = async (params = {}) => {
  const token = localStorage.getItem("token");
  const query = new URLSearchParams();
  if (params.scope) query.append("scope", params.scope);
  if (params.team_target) query.append("team_target", params.team_target);
  if (params.event_id) query.append("event_id", params.event_id);
  const res = await fetch(`${API_BASE}/messages?${query.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
};

export const sendMessage = async (data) => {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_BASE}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
};