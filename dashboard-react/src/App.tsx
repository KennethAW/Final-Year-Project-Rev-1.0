import { BrowserRouter, Routes, Route } from "react-router-dom";
import { DashboardProvider } from "@/context/DashboardContext";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { DashboardPage } from "@/pages/DashboardPage";
import { AnalyticsPage } from "@/pages/AnalyticsPage";
import { SignalExplorerPage } from "@/pages/SignalExplorerPage";
import { BacktestResultsPage } from "@/pages/BacktestResultsPage";
import { FeatureAnalysisPage } from "@/pages/FeatureAnalysisPage";
import { MethodologyPage } from "@/pages/MethodologyPage";

export default function App() {
  return (
    <BrowserRouter>
      <DashboardProvider>
        <Routes>
          <Route element={<DashboardShell />}>
            <Route index element={<DashboardPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="signals" element={<SignalExplorerPage />} />
            <Route path="backtest" element={<BacktestResultsPage />} />
            <Route path="features" element={<FeatureAnalysisPage />} />
            <Route path="methodology" element={<MethodologyPage />} />
          </Route>
        </Routes>
      </DashboardProvider>
    </BrowserRouter>
  );
}
