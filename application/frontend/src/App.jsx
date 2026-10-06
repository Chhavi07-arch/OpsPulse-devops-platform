import { Suspense, lazy } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import ToastProvider from "./components/ToastProvider";
import { Skeleton } from "./components/ui";

// Pages load on demand, so e.g. the charting library is only fetched for the overview.
const Overview = lazy(() => import("./pages/Overview"));
const Incidents = lazy(() => import("./pages/Incidents"));
const IncidentDetail = lazy(() => import("./pages/IncidentDetail"));
const Services = lazy(() => import("./pages/Services"));
const StatusPage = lazy(() => import("./pages/StatusPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <Suspense fallback={<Skeleton height={120} count={3} />}>
          <Routes>
            <Route path="/status" element={<StatusPage />} />
            <Route element={<Layout />}>
              <Route index element={<Overview />} />
              <Route path="incidents" element={<Incidents />} />
              <Route path="incidents/:id" element={<IncidentDetail />} />
              <Route path="services" element={<Services />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </Suspense>
      </ToastProvider>
    </BrowserRouter>
  );
}
