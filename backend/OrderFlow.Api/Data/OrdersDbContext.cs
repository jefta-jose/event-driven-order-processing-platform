using Microsoft.EntityFrameworkCore;
using OrderFlow.Api.Models;

namespace OrderFlow.Api.Data;

public sealed class OrdersDbContext(DbContextOptions<OrdersDbContext> options) : DbContext(options)
{
    public DbSet<Order> Orders => Set<Order>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        var order = modelBuilder.Entity<Order>();
        order.HasKey(x => x.Id);
        order.Property(x => x.CustomerName).HasMaxLength(100).IsRequired();
        order.Property(x => x.ProductName).HasMaxLength(150).IsRequired();
        order.Property(x => x.UnitPrice).HasPrecision(18, 2);
        order.Property(x => x.Status).HasConversion<string>().HasMaxLength(20);
        order.Ignore(x => x.Total);
    }
}
