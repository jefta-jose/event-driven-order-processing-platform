import { useCallback, useEffect, useState } from "react";
import { orderApi } from "./api";
import { OrderForm } from "./components/OrderForm";
import { OrderList } from "./components/OrderList";
import type { NewOrder, Order } from "./types";

export default function App() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const loadOrders = useCallback(async () => {
    try {
      setError("");
      setOrders(await orderApi.list());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load orders.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadOrders(); }, [loadOrders]);

  async function createOrder(order: NewOrder) {
    setSubmitting(true);
    setError("");
    try {
      const created = await orderApi.create(order);
      setOrders((current) => [created, ...current]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create the order.");
      throw caught;
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="/" aria-label="OrderFlow home">
          <span>OF</span> OrderFlow
        </a>
        <div className="system-status"><i /> System ready</div>
      </header>

      <section className="hero">
        <p className="eyebrow">Order operations, simplified</p>
        <h1>From cart to<br /><em>completion.</em></h1>
        <p className="hero-copy">Create, track, and manage every order from one focused workspace.</p>
      </section>

      {error && <div className="error" role="alert">{error}</div>}

      <div className="workspace">
        <OrderForm submitting={submitting} onSubmit={createOrder} />
        <OrderList orders={orders} loading={loading} />
      </div>

      <footer>OrderFlow <span>·</span> Local development application</footer>
    </main>
  );
}
