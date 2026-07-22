# Use the modern Dockerfile frontend required for BuildKit features such as cache mounts.
# syntax=docker/dockerfile:1

# Keep the .NET version configurable from one place.
ARG DOTNET_VERSION=8.0

# Run the SDK on the builder's native CPU architecture for faster multi-platform builds.
FROM --platform=$BUILDPLATFORM mcr.microsoft.com/dotnet/sdk:${DOTNET_VERSION}-noble AS build

# Provided automatically by BuildKit, for example amd64 or arm64.
ARG TARGETARCH

WORKDIR /source

# Copy the project file first so dependency restore stays cached when only source code changes.
COPY ["OrderFlow.Api/OrderFlow.Api.csproj", "OrderFlow.Api/"]

# Temporarily mount a reusable NuGet cache, then restore packages for the target architecture.
RUN --mount=type=cache,target=/root/.nuget/packages \
    dotnet restore "OrderFlow.Api/OrderFlow.Api.csproj" \
        --arch "$TARGETARCH"

# Copy the remaining application source after restoring dependencies.
COPY . .

# Mount the same NuGet cache, compile a Release build, and write deployable files to /app/publish.
RUN --mount=type=cache,target=/root/.nuget/packages \
    dotnet publish "OrderFlow.Api/OrderFlow.Api.csproj" \
        --configuration Release \
        --arch "$TARGETARCH" \
        --no-restore \
        --output /app/publish \
        /p:UseAppHost=false \
        /p:DebugType=None \
        /p:DebugSymbols=false

# Use the smaller, hardened ASP.NET runtime image without the SDK or a shell.
FROM mcr.microsoft.com/dotnet/aspnet:${DOTNET_VERSION}-noble-chiseled-extra AS runtime

WORKDIR /app

# Configure ASP.NET Core to listen for HTTP traffic on port 8080.
ENV ASPNETCORE_HTTP_PORTS=8080

# Document the port used by the application.
EXPOSE 8080

# Copy published files into an independent reusable BuildKit layer.
COPY --link --from=build /app/publish .

# Run as the non-root user provided by the official .NET image.
USER $APP_UID

# Start the application when the container runs.
ENTRYPOINT ["dotnet", "OrderFlow.Api.dll"]