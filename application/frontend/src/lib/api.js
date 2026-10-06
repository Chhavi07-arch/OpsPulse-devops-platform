// All calls go to the same origin under /api; Nginx, the Ingress or the Vite dev proxy routes them.
const BASE = "/api";

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

function describe(detail) {
  if (Array.isArray(detail)) {
    return detail.map((d) => `${d.loc?.slice(1).join(".") || "field"}: ${d.msg}`).join("; ");
  }
  return detail || "Request failed";
}

async function request(path, { method = "GET", body, params } = {}) {
  const query = params
    ? "?" +
      new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ""))
    : "";
  const response = await fetch(`${BASE}${path}${query}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(describe(data?.detail), response.status);
  return data;
}

export const api = {
  meta: () => request("/meta"),
  stats: (days) => request("/stats", { params: { days } }),
  statusPage: (days) => request("/status", { params: { days } }),

  services: () => request("/services"),
  createService: (body) => request("/services", { method: "POST", body }),
  updateService: (id, body) => request(`/services/${id}`, { method: "PUT", body }),
  deleteService: (id) => request(`/services/${id}`, { method: "DELETE" }),

  incidents: (params) => request("/incidents", { params }),
  incident: (id) => request(`/incidents/${id}`),
  declareIncident: (body) => request("/incidents", { method: "POST", body }),
  updateIncident: (id, body) => request(`/incidents/${id}`, { method: "PUT", body }),
  postUpdate: (id, body) => request(`/incidents/${id}/updates`, { method: "POST", body }),
  deleteIncident: (id) => request(`/incidents/${id}`, { method: "DELETE" }),
};
