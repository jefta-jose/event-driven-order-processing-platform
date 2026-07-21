using System.ComponentModel.DataAnnotations;

namespace OrderFlow.Api.Models;

public sealed record CreateOrderRequest(
    [property: Required, StringLength(100)] string CustomerName,
    [property: Required, StringLength(150)] string ProductName,
    [property: Range(1, 10_000)] int Quantity,
    [property: Range(typeof(decimal), "0.01", "1000000")] decimal UnitPrice);

public sealed record OrderResponse(
    Guid Id,
    string CustomerName,
    string ProductName,
    int Quantity,
    decimal UnitPrice,
    decimal Total,
    string Status,
    DateTimeOffset CreatedAt)
{
    public static OrderResponse From(Order order) => new(
        order.Id,
        order.CustomerName,
        order.ProductName,
        order.Quantity,
        order.UnitPrice,
        order.Total,
        order.Status.ToString(),
        order.CreatedAt);
}
