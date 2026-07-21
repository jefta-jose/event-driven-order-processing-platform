using Microsoft.EntityFrameworkCore;
using OrderFlow.Api.Data;
using OrderFlow.Api.Models;

namespace OrderFlow.Api.Services;

public interface IOrderService
{
    Task<IReadOnlyList<OrderResponse>> GetAllAsync(CancellationToken cancellationToken);
    Task<OrderResponse?> GetAsync(Guid id, CancellationToken cancellationToken);
    Task<OrderResponse> CreateAsync(CreateOrderRequest request, CancellationToken cancellationToken);
}

public sealed class OrderService(OrdersDbContext dbContext, TimeProvider timeProvider) : IOrderService
{
    public async Task<IReadOnlyList<OrderResponse>> GetAllAsync(CancellationToken cancellationToken)
    {
        var orders = await dbContext.Orders
            .AsNoTracking()
            .OrderByDescending(order => order.CreatedAt)
            .ToListAsync(cancellationToken);

        return orders.Select(OrderResponse.From).ToList();
    }

    public async Task<OrderResponse?> GetAsync(Guid id, CancellationToken cancellationToken)
    {
        var order = await dbContext.Orders.AsNoTracking()
            .SingleOrDefaultAsync(order => order.Id == id, cancellationToken);
        return order is null ? null : OrderResponse.From(order);
    }

    public async Task<OrderResponse> CreateAsync(CreateOrderRequest request, CancellationToken cancellationToken)
    {
        var order = new Order
        {
            Id = Guid.NewGuid(),
            CustomerName = request.CustomerName.Trim(),
            ProductName = request.ProductName.Trim(),
            Quantity = request.Quantity,
            UnitPrice = request.UnitPrice,
            CreatedAt = timeProvider.GetUtcNow()
        };

        dbContext.Orders.Add(order);
        await dbContext.SaveChangesAsync(cancellationToken);
        return OrderResponse.From(order);
    }
}
