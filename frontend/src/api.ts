import type { NewOrder, Order } from "./types";

const apiUrl = import.meta.env.VITE_API_URL ?? "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, options);
  if (!response.ok) {
    throw new Error(`The server returned ${response.status}. Please try again.`);
  }
  return response.json() as Promise<T>;
}

export const orderApi = {
  list: () => request<Order[]>("/orders"),
  create: (order: NewOrder) =>
    request<Order>("/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(order)
    })
};
