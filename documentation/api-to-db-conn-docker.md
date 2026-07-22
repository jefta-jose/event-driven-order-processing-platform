## 1. Connect the API container to PostgreSQL

The connection string should **not** use `localhost`.

Inside a container:

```text
localhost = this container
```

Your API must use the PostgreSQL container name—or the Docker Compose service nam([Docker Documentation][1])the same user-defined Docker network can resolve each other through Docker DNS. ([docs.docker.com][1])

### Check the PostgreSQL container name

```bash
docker ps
```

Assume it is named:

```text
postgres_db
```

### Create a shared network

```bash
docker network create orderflow-network
```

Connect the existing PostgreSQL container:

```bash
docker network connect orderflow-network postgres_db
```

You can verify this with:

```bash
docker network inspect orderflow-network
```

### Run the API on the same network

For an ASP.NET Core API:

```bash
docker run \
  --name orderflow-api \
  --network orderflow-network \
  -p 8080:8080 \
  -e 'ConnectionStrings__DefaultConnection=Host=postgres_db;Port=5432;Database=****;Username=****;Password=****' \
  orderflow-api:local
```