import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

describe("OrderFlow app", () => {
  beforeEach(() => vi.stubGlobal("fetch", vi.fn()));
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("shows an empty state when no orders exist", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }));
    render(<App />);
    expect(await screen.findByText("No orders yet. Create your first one.")).toBeInTheDocument();
  });

  it("submits and displays a new order", async () => {
    const created = {
      id: "e9521304-26af-44a1-a2a7-81449e4229c7",
      customerName: "Ada Lovelace",
      productName: "Keyboard",
      quantity: 2,
      unitPrice: 75,
      total: 150,
      status: "Pending",
      createdAt: "2026-01-01T00:00:00Z"
    };
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(created), { status: 201 }));

    render(<App />);
    await screen.findByText("No orders yet. Create your first one.");
    await userEvent.type(screen.getByLabelText("Customer name"), "Ada Lovelace");
    await userEvent.type(screen.getByLabelText("Product"), "Keyboard");
    await userEvent.clear(screen.getByLabelText("Quantity"));
    await userEvent.type(screen.getByLabelText("Quantity"), "2");
    await userEvent.type(screen.getByLabelText("Unit price"), "75");
    await userEvent.click(screen.getByRole("button", { name: /create order/i }));

    await waitFor(() => expect(screen.getByText("Keyboard")).toBeInTheDocument());
    expect(screen.getByText("$150.00")).toBeInTheDocument();
  });
});
