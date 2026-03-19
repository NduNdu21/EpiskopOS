
const API_BASE = import.meta.env.VITE_API_BASE;

console.log("API_BASE:", API_BASE);

async function handleResponse(res) {
  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json() : null;
  if (!res.ok) {
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


export const assignVolunteer = async (eventId, userId) => {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_BASE}/events/${eventId}/assign`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ user_id: userId }),
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

export const deleteSegment = async (eventId, segmentId) => {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_BASE}/events/${eventId}/segments/${segmentId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
};
