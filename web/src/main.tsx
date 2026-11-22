import { lazy, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider } from "react-router";
import { Layout } from "./components/Layout";
import { runBoot } from "./boot";
// Svaka stranica je poseban deo bundle-a i preuzima se tek kad se prvi put otvori (vodič, pogl. 28).
// Stranice izvoze imenovane komponente, a React.lazy traži default, pa se mapira ovde.
const StatusPage = lazy(() => import("./pages/StatusPage").then((m) => ({ default: m.StatusPage })));
const MapPage = lazy(() => import("./pages/MapPage").then((m) => ({ default: m.MapPage })));
const ChapterPage = lazy(() => import("./pages/ChapterPage").then((m) => ({ default: m.ChapterPage })));
const TestPage = lazy(() => import("./pages/TestPage").then((m) => ({ default: m.TestPage })));
const BossPage = lazy(() => import("./pages/BossPage").then((m) => ({ default: m.BossPage })));
const LibraryPage = lazy(() => import("./pages/LibraryPage").then((m) => ({ default: m.LibraryPage })));
const SettingsPage = lazy(() => import("./pages/SettingsPage").then((m) => ({ default: m.SettingsPage })));
import "./styles.css";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 10_000, retry: 1, refetchOnWindowFocus: false } },
});

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: "/", element: <StatusPage /> },
      { path: "/map", element: <MapPage /> },
      { path: "/chapters/:id", element: <ChapterPage /> },
      { path: "/chapters/:id/test", element: <TestPage /> },
      { path: "/boss/:code", element: <BossPage /> },
      { path: "/library", element: <LibraryPage /> },
      { path: "/settings", element: <SettingsPage /> },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);

// Boot ekran iz index.html: podaci za „OK” redove idu kroz isti QueryClient, pa ostaju u kešu za prvu stranicu.
runBoot(queryClient);
