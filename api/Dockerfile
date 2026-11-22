# Multi-stage build (vodič, pogl. 35): SDK samo za build, mali runtime image za pokretanje.
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Prvo samo projektni fajlovi: restore se kešira dok se zavisnosti ne promene.
COPY Hunter.sln ./
COPY src/Hunter.Core/Hunter.Core.csproj src/Hunter.Core/
COPY src/Hunter.Api/Hunter.Api.csproj src/Hunter.Api/
COPY tests/Hunter.Core.Tests/Hunter.Core.Tests.csproj tests/Hunter.Core.Tests/
RUN dotnet restore src/Hunter.Api/Hunter.Api.csproj

COPY src/ src/
RUN dotnet publish src/Hunter.Api/Hunter.Api.csproj -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app .
USER $APP_UID
EXPOSE 8080
ENTRYPOINT ["dotnet", "Hunter.Api.dll"]
