import { useState } from "react";
import { 
  Search, 
  UploadCloud, 
  BarChart3, 
  Cpu 
} from "lucide-react";

import { QuerySection } from "./components/QuerySection";
import { UploadSection } from "./components/UploadSection";
import { GraphsSection } from "./components/GraphsSection";

export function App() {
  const [activeTab, setActiveTab] = useState<"query" | "upload" | "graphs">("query");

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col font-sans selection:bg-[#FFBB00] selection:text-[#0F172A]">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-md sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FFBB00] flex items-center justify-center text-slate-900 font-bold shadow-md shadow-[#FFBB00]/30 border border-amber-300">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 tracking-tight">
                Industrial RAG Assistant
              </h1>
              <p className="text-[11px] text-slate-500 hidden sm:block font-medium">
                Technical Manuals Ingestion, Neural Diagnostics & System Telemetry
              </p>
            </div>
          </div>

          {/* 3 Main Action Tabs */}
          <nav className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
            <button
              onClick={() => setActiveTab("query")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "query"
                  ? "bg-[#FFBB00] text-slate-900 font-bold shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/70"
              }`}
            >
              <Search className="w-4 h-4" />
              <span>Ask & Query</span>
            </button>

            <button
              onClick={() => setActiveTab("upload")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "upload"
                  ? "bg-[#FFBB00] text-slate-900 font-bold shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/70"
              }`}
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload Manuals</span>
            </button>

            <button
              onClick={() => setActiveTab("graphs")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "graphs"
                  ? "bg-[#FFBB00] text-slate-900 font-bold shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/70"
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Graphs & Stats</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
        {activeTab === "query" && <QuerySection />}
        {activeTab === "upload" && <UploadSection />}
        {activeTab === "graphs" && <GraphsSection />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <p>Industrial Machine Troubleshooting System • RAG & ChromaDB Hybrid Retrieval</p>
      </footer>
    </div>
  );
}

export default App;