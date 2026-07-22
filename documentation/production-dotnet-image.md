## Recommended production pattern

A production image should:

* Compile in an SDK image but run in an ASP.NET runtime image.
* Run as the built-in non-root `$APP_UID`.
* Contain only published application files.
* Listen on unprivileged port `8080`.
* Use a minimal runtime such as Ubuntu Chiseled.
* Keep secrets and environment-specific configuration outside the image.
* Be scanned, rebuilt regularly and identified by an immutable application tag.

Microsoft’s current sample follows the same multi-stage, restore-cache, port `8080`, and non-root pattern. ([GitHub][2])

## Production Dockerfile

Assuming this structure:

```text
.
├── src/
│   └── MyApi/
│       ├── MyApi.csproj
│       └── Program.cs
├── MySolution.sln
├── Dockerfile
└── .dockerignore
```

Use:

```dockerfile
# syntax=docker/dockerfile:1

ARG DOTNET_VERSION=8.0

# ------------------------------------------------------------
# Build stage
# ------------------------------------------------------------
FROM --platform=$BUILDPLATFORM \
    mcr.microsoft.com/dotnet/sdk:${DOTNET_VERSION}-noble AS build

ARG TARGETARCH

WORKDIR /source

# Copy dependency manifests first so source changes don't
# invalidate the NuGet restore layer.
COPY ["src/MyApi/MyApi.csproj", "src/MyApi/"]

RUN --mount=type=cache,target=/root/.nuget/packages \
    dotnet restore "src/MyApi/MyApi.csproj" \
        --arch "$TARGETARCH"

# Copy the remaining source only after restore.
COPY . .

RUN --mount=type=cache,target=/root/.nuget/packages \
    dotnet publish "src/MyApi/MyApi.csproj" \
        --configuration Release \
        --arch "$TARGETARCH" \
        --no-restore \
        --output /app/publish \
        /p:UseAppHost=false \
        /p:DebugType=None \
        /p:DebugSymbols=false

# ------------------------------------------------------------
# Runtime stage
# ------------------------------------------------------------
FROM mcr.microsoft.com/dotnet/aspnet:${DOTNET_VERSION}-noble-chiseled-extra AS runtime

WORKDIR /app

ENV ASPNETCORE_HTTP_PORTS=8080

EXPOSE 8080

COPY --link --from=build /app/publish .

# Built into official modern .NET Linux images.
USER $APP_UID

ENTRYPOINT ["dotnet", "MyApi.dll"]
```

### Why `noble-chiseled-extra`?

Chiseled images remove the shell, package manager and unnecessary OS packages, reducing image size and attack surface. The `extra` variant includes ICU, timezone data and C++ runtime support, making it safer for normal business applications that process cultures, currencies, dates or time zones. The smaller non-`extra` Chiseled variant requires globalization-invariant applications. ([Microsoft Learn][3])

Once you have verified that the application does not need globalization, you can reduce it to:

```dockerfile
FROM mcr.microsoft.com/dotnet/aspnet:10.0-noble-chiseled
```

## Add proper health endpoints

In `Program.cs`:

```csharp
using Microsoft.AspNetCore.Diagnostics.HealthChecks;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddHealthChecks();

// Register readiness dependency checks here.
// For example: database, Redis or downstream service checks.

var app = builder.Build();

// Liveness only proves that the process can serve HTTP.
// It should not depend on external infrastructure.
app.MapHealthChecks(
    "/health/live",
    new HealthCheckOptions
    {
        Predicate = _ => false
    });

// Readiness executes all registered health checks.
app.MapHealthChecks("/health/ready");

app.MapControllers();

app.Run();
```

Your orchestrator should use:

```text
Liveness:  GET /health/live
Readiness: GET /health/ready
```

ASP.NET health endpoints are designed for orchestrators and load balancers to determine whether an instance should receive traffic or be restarted. ([Microsoft Learn][4])

Do **not** add this common pattern to a Chiseled image:

```dockerfile
HEALTHCHECK CMD curl http://localhost:8080/health/live
```

Chiseled images have no shell or `curl`. Let Kubernetes, ECS, an ALB or another orchestrator call the endpoint externally. ([GitHub][2])

## `.dockerignore`

```gitignore
# Build output
**/bin/
**/obj/
**/publish/

# Source-control and editor metadata
.git/
.github/
.vs/
.vscode/
.idea/

# Test and coverage output
TestResults/
coverage/
*.trx
*.coverage
*.coveragexml

# Local configuration
.env
.env.*
*.user
*.suo

# Never send certificates or keys into the build context
**/*.pfx
**/*.p12
**/*.pem
**/*.key

# Local documentation and tooling
README*
docker-compose*.yml
docker-compose*.yaml
```

A small build context improves build performance and reduces the risk of accidentally copying credentials or local artifacts into an image layer. Docker explicitly recommends using `.dockerignore`. ([Docker Documentation][5])

## Build and test locally

```bash
docker buildx build \
  --pull \
  --platform linux/amd64 \
  --tag myapi:local \
  --load \
  .
```

Run it with a hardened runtime configuration:

```bash
docker run --rm \
  --name myapi \
  --publish 8080:8080 \
  --read-only \
  --tmpfs /tmp:rw,noexec,nosuid,size=64m \
  --cap-drop ALL \
  --security-opt no-new-privileges:true \
  --memory 512m \
  --cpus 1 \
  myapi:local
```

Test it:

```bash
curl --fail http://localhost:8080/health/live
curl --fail http://localhost:8080/health/ready
```

Running as a non-root user, dropping unnecessary capabilities and preventing privilege escalation provide multiple independent containment layers. ([Docker Documentation][6])

## Production CI build

Tag application images with the commit SHA, not only `latest`:

```bash
docker buildx build \
  --pull \
  --platform linux/amd64,linux/arm64 \
  --tag registry.example.com/myapi:${GIT_SHA} \
  --tag registry.example.com/myapi:production \
  --sbom=true \
  --provenance=mode=max \
  --push \
  .
```

This produces multi-architecture images and attaches SBOM and provenance attestations. Docker Scout can use those attestations for vulnerability, base-image freshness and supply-chain policy evaluation. ([Docker Documentation][7])

A sensible CI gate is:

```bash
dotnet test --configuration Release

docker buildx build \
  --pull \
  --platform linux/amd64 \
  --tag myapi:${GIT_SHA} \
  --load \
  .

docker scout cves \
  --only-severity critical,high \
  myapi:${GIT_SHA}
```

## Important production concerns outside the Dockerfile

**Base-image freshness:** A tag such as `10.0-noble-chiseled-extra` receives patched base-image revisions, but your existing image does not update automatically. Rebuild regularly with `--pull`. For stronger reproducibility, pin the base image by digest and configure Renovate, Dependabot or another updater to open digest-update PRs. Docker recommends both fresh rebuilds and controlled base-image pinning. ([Docker Documentation][5])

**Private NuGet feeds:** Never pass tokens through `ARG`, `ENV` or copied configuration. Use BuildKit secret mounts because build arguments and layers can expose credentials. ([Docker Documentation][8])

**Data Protection:** Applications using cookie authentication, antiforgery tokens or sessions should persist ASP.NET Data Protection keys in Redis, object storage, a shared volume or another external provider. Container-local keys disappear during replacement and can invalidate authentication across replicas. ([Microsoft Learn][9])

**Writable files:** Keep the root filesystem read-only. Mount explicit writable locations for uploads, temporary files or generated content instead of letting the application write anywhere inside `/app`.

**Configuration:** Inject connection strings and secrets through the runtime platform—Kubernetes Secrets, AWS Secrets Manager, Azure Key Vault or equivalent. Do not bake production secrets into `appsettings.json` or image layers. Microsoft explicitly recommends keeping production secrets out of source and deployments. ([Microsoft Learn][10])

The key systems-thinking distinction is that a **production-ready Dockerfile creates a secure artifact**, while a **production-ready container workload** additionally requires probes, resource limits, immutable deployment references, secret management, observability, vulnerability management and an automated patching policy.

[1]: https://learn.microsoft.com/en-us/dotnet/core/releases-and-support ".NET releases, patches, and support - .NET | Microsoft Learn"
[2]: https://github.com/dotnet/dotnet-docker/blob/main/README.aspnet.md "dotnet-docker/README.aspnet.md at main · dotnet/dotnet-docker · GitHub"
[3]: https://learn.microsoft.com/en-us/dotnet/core/docker/container-images ".NET container images - .NET | Microsoft Learn"
[4]: https://learn.microsoft.com/en-us/aspnet/core/host-and-deploy/health-checks?view=aspnetcore-10.0 "Health checks in ASP.NET Core | Microsoft Learn"
[5]: https://docs.docker.com/build/building/best-practices/ "Building best practices | Docker Docs"
[6]: https://docs.docker.com/engine/security/?utm_source=chatgpt.com "Docker Engine security"
[7]: https://docs.docker.com/scout/policy/?utm_source=chatgpt.com "Policy Evaluation - Docker Scout"
[8]: https://docs.docker.com/build/building/secrets/ "Build secrets | Docker Docs"
[9]: https://learn.microsoft.com/en-us/aspnet/core/security/data-protection/configuration/default-settings?view=aspnetcore-10.0&utm_source=chatgpt.com "Data Protection key management and lifetime in ASP.NET ..."
[10]: https://learn.microsoft.com/en-us/aspnet/core/security/app-secrets?view=aspnetcore-10.0&utm_source=chatgpt.com "Safe storage of app secrets in development in ASP.NET Core"
