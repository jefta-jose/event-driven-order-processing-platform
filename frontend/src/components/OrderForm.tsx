import { FormEvent, useState } from "react";
import type { NewOrder } from "../types";

interface Props {
  submitting: boolean;
  onSubmit: (order: NewOrder) => Promise<void>;
}

const initialOrder: NewOrder = {
  customerName: "",
  productName: "",
  quantity: 1,
  unitPrice: 0
};

export function OrderForm({ submitting, onSubmit }: Props) {
  const [order, setOrder] = useState(initialOrder);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit(order);
    setOrder(initialOrder);
  }

  return (
    <form className="order-form" onSubmit={submit}>
      <div className="form-heading">
        <div>
          <p className="eyebrow">New order</p>
          <h2>Create an order</h2>
        </div>
        <span className="step">01</span>
      </div>

      <label>
        Customer name
        <input
          required
          maxLength={100}
          value={order.customerName}
          onChange={(event) => setOrder({ ...order, customerName: event.target.value })}
          placeholder="e.g. Ada Lovelace"
        />
      </label>

      <label>
        Product
        <input
          required
          maxLength={150}
          value={order.productName}
          onChange={(event) => setOrder({ ...order, productName: event.target.value })}
          placeholder="e.g. Mechanical keyboard"
        />
      </label>

      <div className="form-row">
        <label>
          Quantity
          <input
            required
            type="number"
            min="1"
            max="10000"
            value={order.quantity}
            onChange={(event) => setOrder({ ...order, quantity: Number(event.target.value) })}
          />
        </label>
        <label>
          Unit price
          <input
            required
            type="number"
            min="0.01"
            step="0.01"
            value={order.unitPrice || ""}
            onChange={(event) => setOrder({ ...order, unitPrice: Number(event.target.value) })}
            placeholder="0.00"
          />
        </label>
      </div>

      <button type="submit" disabled={submitting}>
        {submitting ? "Creating…" : "Create order"}
        <span aria-hidden="true">→</span>
      </button>
    </form>
  );
}
