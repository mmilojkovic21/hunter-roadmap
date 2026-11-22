/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// U razvoju Vite prosleđuje /api na .NET API (dotnet run sluša na 8080 kroz launchSettings / ASPNETCORE_URLS).
// U Dockeru isto radi nginx (web/nginx.conf), pa frontend uvek zove relativni /api.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { "/api": "http://localhost:8080" },
  },
  test: {
    environment: "node",
  },
});
