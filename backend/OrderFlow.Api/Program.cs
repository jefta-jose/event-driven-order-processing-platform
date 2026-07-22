using Microsoft.EntityFrameworkCore;
using OrderFlow.Api.Data;
using OrderFlow.Api.Models;
using OrderFlow.Api.Services;

var builder = WebApplication.CreateBuilder(args);

var ordersConnectionString = builder.Configuration.GetConnectionString("Orders")
    ?? throw new InvalidOperationException(
        "The Orders database connection string is required. " +
        "Set it with the ConnectionStrings__Orders environment variable.");

builder.Services.AddDbContext<OrdersDbContext>(options =>
    options.UseNpgsql(ordersConnectionString));
builder.Services.AddScoped<IOrderService, OrderService>();
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddProblemDetails();
builder.Services.AddHealthChecks().AddDbContextCheck<OrdersDbContext>();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddCors(options => options.AddDefaultPolicy(policy =>
    policy.WithOrigins(builder.Configuration["FrontendOrigin"] ?? "http://localhost:5173")
        .AllowAnyHeader()
        .AllowAnyMethod()));

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    await scope.ServiceProvider.GetRequiredService<OrdersDbContext>().Database.EnsureCreatedAsync();
}

app.UseExceptionHandler();
app.UseCors();
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.MapHealthChecks("/health");
var orders = app.MapGroup("/api/orders");

orders.MapGet("/", async (IOrderService service, CancellationToken cancellationToken) =>
    Results.Ok(await service.GetAllAsync(cancellationToken)));

orders.MapGet("/{id:guid}", async (Guid id, IOrderService service, CancellationToken cancellationToken) =>
{
    var order = await service.GetAsync(id, cancellationToken);
    return order is null ? Results.NotFound() : Results.Ok(order);
});

orders.MapPost("/", async (CreateOrderRequest request, IOrderService service, CancellationToken cancellationToken) =>
{
    var order = await service.CreateAsync(request, cancellationToken);
    return Results.Created($"/api/orders/{order.Id}", order);
});

app.Run();

public partial class Program;
