import { useLocation, useNavigate } from "react-router-dom";
import { useDashboard, TICKERS, MODELS } from "@/context/DashboardContext";
import { useTheme } from "@/hooks/useTheme";
import { useAdvancedMode, buildAdvancedUrl } from "@/hooks/useAdvancedMode";
import { modelDisplayName } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface TopBarProps {
  onMenuToggle: () => void;
}

export function TopBar({ onMenuToggle }: TopBarProps) {
  const { ticker, setTicker, model, setModel } = useDashboard();
  const { theme, toggleTheme } = useTheme();
  const advancedMode = useAdvancedMode();
  const location = useLocation();
  const navigate = useNavigate();
  const hideControlsPaths = ["/analytics"];
  const showControls = !hideControlsPaths.includes(location.pathname);

  const toggleAdvanced = () => {
    navigate(buildAdvancedUrl(location.pathname, location.search, !advancedMode));
  };

  const advBtn = (
    <button
      onClick={toggleAdvanced}
      title={advancedMode ? "Exit Advanced mode" : "Enter Advanced mode — shows SMA overlays, significance tests, training curves, cost sensitivity"}
      className={cn(
        "h-8 rounded-lg border flex items-center gap-1.5 px-2.5 text-[11px] font-semibold transition-colors cursor-pointer",
        advancedMode
          ? "bg-primary text-white border-primary hover:bg-primary-dark"
          : "border-outline bg-white text-text-secondary hover:text-text-primary hover:bg-surface-container"
      )}
    >
      <span className="material-symbols-outlined text-sm">
        {advancedMode ? "science" : "insights"}
      </span>
      <span className="hidden sm:inline">{advancedMode ? "Advanced" : "Deep Dive"}</span>
    </button>
  );

  const themeBtn = (
    <button
      onClick={toggleTheme}
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className="w-8 h-8 rounded-lg border border-outline bg-white hover:bg-surface-container flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
    >
      <span className="material-symbols-outlined text-base">
        {theme === "dark" ? "light_mode" : "dark_mode"}
      </span>
    </button>
  );

  return (
    <header className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-2 border-b border-outline bg-white/85 backdrop-blur-md px-3 md:px-6 py-2 md:py-3">
      {/* Left: hamburger + title */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Hamburger — mobile only */}
        <button
          onClick={onMenuToggle}
          className="md:hidden w-8 h-8 rounded-lg border border-outline bg-white hover:bg-surface-container flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-base">menu</span>
        </button>

        <h1 className="text-sm md:text-base font-semibold text-text-primary">
          Market Intelligence Terminal
        </h1>
        <span className="hidden md:inline rounded-full bg-surface-container px-2.5 py-1 text-[11px] font-medium text-text-secondary">
          FYP Demo Dashboard
        </span>
        {advancedMode && (
          <span className="hidden sm:inline rounded-full bg-primary/10 text-primary px-2.5 py-1 text-[11px] font-bold tracking-wide">
            ADVANCED MODE
          </span>
        )}
      </div>

      {showControls && (
        <>
          {/* Center: ticker tabs — horizontally scrollable on mobile */}
          <div className="flex items-center gap-1 rounded-lg bg-surface-container p-1 overflow-x-auto order-last md:order-none w-full md:w-auto">
            {TICKERS.map((t) => (
              <button
                key={t}
                onClick={() => setTicker(t)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap flex-shrink-0",
                  ticker === t
                    ? "bg-white shadow-sm text-primary ring-1 ring-primary/10"
                    : "text-text-secondary hover:text-text-primary"
                )}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Right: model selector + toggles */}
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-xs font-medium text-text-secondary">Model:</span>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="rounded-lg border border-outline bg-white px-2 md:px-3 py-1.5 text-xs font-semibold text-text-primary outline-none focus:ring-2 focus:ring-primary/20"
            >
              {MODELS.map((m) => (
                <option key={m} value={m}>
                  {modelDisplayName(m)}
                </option>
              ))}
            </select>
            {advBtn}
            {themeBtn}
          </div>
        </>
      )}
      {!showControls && (
        <div className="flex items-center gap-2">
          {advBtn}
          {themeBtn}
        </div>
      )}
    </header>
  );
}
