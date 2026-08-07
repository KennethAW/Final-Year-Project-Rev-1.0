const EXECUTION_GUIDE_URL = "/EXECUTION_GUIDE.md"
// VS Code protocol handler — opens the project root in VS Code when clicked.
// Forward slashes + URL-encoded spaces for Windows compatibility.
const VSCODE_URL =
  "vscode://file/C:/Users/kencl/Desktop/Final%20Year%20Project%20Rev%201.0/"

export function Footer() {
  return (
    <footer className="fixed bottom-7 w-full z-40 flex justify-between items-end pl-24 pr-12 pt-6 pb-4 bg-transparent pointer-events-none">
      <div className="font-[family-name:var(--font-family-label)] text-[10px] uppercase tracking-widest opacity-50 text-white pointer-events-auto">
        &copy; 2026 Multi-Modal Feature Integration for ML-Based Stock Prediction | Kenneth Anthony Wijaya
      </div>
      <div className="flex gap-8 pointer-events-auto">
        <a
          href={EXECUTION_GUIDE_URL}
          target="_blank"
          rel="noopener noreferrer"
          title="Open the EXECUTION_GUIDE.md in a new tab"
          className="font-[family-name:var(--font-family-label)] text-[10px] uppercase tracking-widest text-white/30 hover:text-emerald-400 transition-colors"
        >
          Technical Documentation
        </a>
        <a
          href={VSCODE_URL}
          title="Open the project folder in VS Code (local)"
          className="font-[family-name:var(--font-family-label)] text-[10px] uppercase tracking-widest text-white/30 hover:text-emerald-400 transition-colors"
        >
          Source Code
        </a>
      </div>
    </footer>
  )
}
