import type { Order } from "../types";

interface Props {
  orders: Order[];
  loading: boolean;
}

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export function OrderList({ orders, loading }: Props) {
  return (
    <section className="orders" aria-labelledby="orders-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Live ledger</p>
          <h2 id="orders-heading">Recent orders</h2>
        </div>
        <span className="order-count">{orders.length} total</span>
      </div>

      {loading ? (
        <p className="empty-state">Loading orders…</p>
      ) : orders.length === 0 ? (
        <div className="empty-state">
          <span aria-hidden="true">◇</span>
          <p>No orders yet. Create your first one.</p>
        </div>
      ) : (
        <div className="order-table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Qty</th>
                <th>Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>
                    <strong>{order.productName}</strong>
                    <small>#{order.id.slice(0, 8)}</small>
                  </td>
                  <td>{order.customerName}</td>
                  <td>{order.quantity}</td>
                  <td>{currency.format(order.total)}</td>
                  <td><span className={`status status-${order.status.toLowerCase()}`}>{order.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
