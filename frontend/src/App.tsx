import { useState } from "react";
import { 
  Search, 
  UploadCloud, 
  BarChart3, 
  Cpu,
  Layers,
  Menu,
  X,
  ChevronRight,
  Zap
} from "lucide-react";

import { QuerySection } from "./components/QuerySection";
import { UploadSection } from "./components/UploadSection";
import { GraphsSection } from "./components/GraphsSection";
import { ArchitectureSection } from "./components/ArchitectureSection";

type NavTab = "query" | "upload" | "graphs" | "architecture";

export function App() {
  const [activeTab, setActiveTab] = useState<NavTab>("query");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const navItems = [
    {
      id: "query" as NavTab,
      label: "Ask & Query",
      subtitle: "Diagnostics & Voice",
      icon: Search,
    },
    {
      id: "upload" as NavTab,
      label: "Upload Manuals",
      subtitle: "MinIO S3 & Indexing",
      icon: UploadCloud,
    },
    {
      id: "graphs" as NavTab,
      label: "Graphs & Stats",
      subtitle: "Telemetry & Audit",
      icon: BarChart3,
    },
    {
      id: "architecture" as NavTab,
      label: "Architecture & Strategy",
      subtitle: "Chunking, Retrieval & Safety",
      icon: Layers,
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col font-sans selection:bg-[#FFBB00] selection:text-[#0F172A]">
      {/* Top Header Bar */}
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur-md sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors border border-slate-200 cursor-pointer shadow-xs"
              title={sidebarOpen ? "Collapse Sidebar" : "Open Sidebar"}
            >
              {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>

            <div className="w-9 h-9 rounded-xl bg-[#FFBB00] flex items-center justify-center text-slate-900 font-bold shadow-md shadow-[#FFBB00]/30 border border-amber-300">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span>Cognivex Industrial RAG</span>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                  v2.4
                </span>
              </h1>
              <p className="text-[11px] text-slate-500 hidden md:block font-medium">
                Multilingual Machine Diagnostics • Hybrid ChromaDB & MinIO S3
              </p>
            </div>
          </div>

          {/* Quick Top Tab Bar for Mobile / Convenience */}
          <nav className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    activeTab === item.id
                      ? "bg-[#FFBB00] text-slate-950 font-bold shadow-xs border border-amber-300"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/70"
                  }`}
                  title={item.label}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{item.label.split(" ")[0]}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Body Layout with Sidebar */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 flex gap-6">
        {/* Collapsible Left Sidebar */}
        {sidebarOpen && (
          <aside className="w-64 shrink-0 hidden md:block">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm sticky top-22 space-y-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 block mb-2">
                  System Navigation
                </span>
                <nav className="space-y-1.5">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-all cursor-pointer ${
                          isActive
                            ? "bg-[#FFBB00] text-slate-950 font-bold shadow-sm border border-amber-300"
                            : "text-slate-700 hover:bg-slate-100/80 hover:text-slate-950"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon className={`w-4 h-4 ${isActive ? "text-slate-950" : "text-amber-600"}`} />
                          <div>
                            <span className="text-xs font-bold block">{item.label}</span>
                            <span className={`text-[10px] block ${isActive ? "text-slate-800" : "text-slate-400"}`}>
                              {item.subtitle}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className={`w-3.5 h-3.5 opacity-60 ${isActive ? "text-slate-950" : "text-slate-400"}`} />
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Architecture Quick Notes Box */}
              <div className="pt-3 border-t border-slate-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 block mb-2">
                  System Highlights
                </span>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-[11px] text-slate-600">
                  <div className="flex items-center gap-2 text-slate-800 font-bold">
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    <span>Hybrid Search RRF</span>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    Dense MiniLM vectors + BM25 keyword matching with strict 50% refusal guardrail.
                  </p>
                </div>
              </div>
            </div>
          </aside>
        )}

        {/* Dynamic Main Workspace Area */}
        <main className="flex-1 min-w-0">
          {activeTab === "query" && <QuerySection />}
          {activeTab === "upload" && <UploadSection />}
          {activeTab === "graphs" && <GraphsSection />}
          {activeTab === "architecture" && <ArchitectureSection />}
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <p>Industrial Machine Troubleshooting System • RAG & ChromaDB Hybrid Retrieval • MinIO S3 Object Storage</p>
      </footer>
    </div>
  );
}

export default App;