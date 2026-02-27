
const API_BASE = import.meta.env.VITE_API_BASE;


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


export const registerUser = async (data) => {
    const response = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json"},
        body: JSON.stringify(data),
    });

    return handleResponse(response);
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
