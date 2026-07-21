using Microsoft.EntityFrameworkCore;
using OrderFlow.Api.Data;
using OrderFlow.Api.Models;
using OrderFlow.Api.Services;

namespace OrderFlow.Api.Tests;

public sealed class OrderServiceTests
{
    [Fact]
    public async Task CreateAsync_PersistsAndCalculatesOrderTotal()
    {
        await using var db = CreateDatabase();
        var service = new OrderService(db, TimeProvider.System);

        var result = await service.CreateAsync(
            new CreateOrderRequest("Ada", "Mechanical keyboard", 2, 75.50m),
            CancellationToken.None);

        Assert.Equal(151.00m, result.Total);
        Assert.Equal("Pending", result.Status);
        Assert.Equal(1, await db.Orders.CountAsync());
    }

    [Fact]
    public async Task GetAllAsync_ReturnsNewestOrderFirst()
    {
        await using var db = CreateDatabase();
        db.Orders.AddRange(
            NewOrder("Older", DateTimeOffset.Parse("2025-01-01T00:00:00Z")),
            NewOrder("Newer", DateTimeOffset.Parse("2025-01-02T00:00:00Z")));
        await db.SaveChangesAsync();

        var result = await new OrderService(db, TimeProvider.System).GetAllAsync(CancellationToken.None);

        Assert.Equal(new[] { "Newer", "Older" }, result.Select(order => order.CustomerName));
    }

    private static OrdersDbContext CreateDatabase() => new(
        new DbContextOptionsBuilder<OrdersDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    private static Order NewOrder(string customer, DateTimeOffset createdAt) => new()
    {
        Id = Guid.NewGuid(),
        CustomerName = customer,
        ProductName = "Product",
        Quantity = 1,
        UnitPrice = 10,
        CreatedAt = createdAt
    };
}
