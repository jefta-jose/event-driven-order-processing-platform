namespace OrderFlow.Api.Models;

public sealed class Order
{
    public Guid Id { get; set; }
    public required string CustomerName { get; set; }
    public required string ProductName { get; set; }
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public OrderStatus Status { get; set; } = OrderStatus.Pending;
    public DateTimeOffset CreatedAt { get; set; }
    public decimal Total => Quantity * UnitPrice;
}

public enum OrderStatus
{
    Pending,
    Processing,
    Completed,
    Failed
}
