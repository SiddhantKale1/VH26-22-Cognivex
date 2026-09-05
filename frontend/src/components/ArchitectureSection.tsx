import React, { useState } from "react";
import {
  Layers,
  Search,
  ShieldCheck,
  Cpu,
  FileText,
  Database,
  Terminal,
  Zap,
  AlertTriangle,
  BookOpen,
  GitBranch,
  Filter,
  Globe2,
  HardDrive
} from "lucide-react";

export const ArchitectureSection: React.FC = () => {
  const [activeSection, setActiveSection] = useState<"all" | "chunking" | "retrieval" | "hallucination">("all");

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-100 text-amber-900 border border-amber-200">
              <Cpu className="w-5 h-5 text-amber-600" />
            </span>
            <h2 className="text-xl font-bold text-slate-900">
              Cognivex RAG System Architecture
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1.5 max-w-2xl">
            Architectural technical specifications explaining our structure-aware chunking pipeline, multilingual hybrid search, and deterministic hallucination guardrails.
          </p>
        </div>

        {/* Section Quick Filters */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold shrink-0">
          <button
            onClick={() => setActiveSection("all")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeSection === "all" ? "bg-white text-slate-900 shadow-xs border border-slate-200" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            All Strategy
          </button>
          <button
            onClick={() => setActiveSection("chunking")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeSection === "chunking" ? "bg-white text-slate-900 shadow-xs border border-slate-200" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            1. Chunking
          </button>
          <button
            onClick={() => setActiveSection("retrieval")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeSection === "retrieval" ? "bg-white text-slate-900 shadow-xs border border-slate-200" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            2. Retrieval
          </button>
          <button
            onClick={() => setActiveSection("hallucination")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeSection === "hallucination" ? "bg-white text-slate-900 shadow-xs border border-slate-200" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            3. Guardrails
          </button>
        </div>
      </div>

      {/* High-Level Pipeline Flowchart */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800">
        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 block mb-2">
          End-to-End Execution Flow
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/80">
            <span className="w-5 h-5 rounded-full bg-amber-400/20 text-amber-300 font-bold flex items-center justify-center mb-2 text-[10px] border border-amber-400/40">1</span>
            <p className="font-bold text-slate-100">PDF Ingestion & OCR</p>
            <p className="text-slate-400 text-[11px] mt-1">PyMuPDF native text + EasyOCR fallback for scanned schematics.</p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/80">
            <span className="w-5 h-5 rounded-full bg-amber-400/20 text-amber-300 font-bold flex items-center justify-center mb-2 text-[10px] border border-amber-400/40">2</span>
            <p className="font-bold text-slate-100">Hierarchical Chunking</p>
            <p className="text-slate-400 text-[11px] mt-1">500-token sliding window, 100-token overlap, preserving tables.</p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/80">
            <span className="w-5 h-5 rounded-full bg-amber-400/20 text-amber-300 font-bold flex items-center justify-center mb-2 text-[10px] border border-amber-400/40">3</span>
            <p className="font-bold text-slate-100">Hybrid Search Indexing</p>
            <p className="text-slate-400 text-[11px] mt-1">Multilingual MiniLM dense embeddings + BM25 keyword matching.</p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/80">
            <span className="w-5 h-5 rounded-full bg-amber-400/20 text-amber-300 font-bold flex items-center justify-center mb-2 text-[10px] border border-amber-400/40">4</span>
            <p className="font-bold text-slate-100">Grounded LLM Synthesis</p>
            <p className="text-slate-400 text-[11px] mt-1">Deterministic JSON schema, refusal gateway & page citation tags.</p>
          </div>
        </div>
      </div>

      {/* 1. CHUNKING STRATEGY */}
      {(activeSection === "all" || activeSection === "chunking") && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-200">
              <Layers className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                1. Structure-Aware Chunking Strategy
              </h3>
              <p className="text-xs text-slate-500">
                How technical manuals, parameter lists, and schematics are segmented without loss of context.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="font-bold text-slate-900 block text-sm flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-amber-600" />
                Sliding Window & Overlap
              </span>
              <p className="text-slate-600 leading-relaxed">
                Manuals are segmented with a <strong>500-token chunk size</strong> and a <strong>100-token rolling overlap (20%)</strong>. This ensures technical fault procedures spanning across page breaks are not truncated mid-sentence.
              </p>
              <div className="font-mono text-[11px] bg-white p-2 rounded border border-slate-200 text-slate-700">
                Chunk Size: 500 tokens<br/>
                Overlap: 100 tokens (20%)
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="font-bold text-slate-900 block text-sm flex items-center gap-1.5">
                <HardDrive className="w-4 h-4 text-amber-600" />
                Parameter Register Integrity
              </span>
              <p className="text-slate-600 leading-relaxed">
                Industrial tables (e.g. parameter registers <code className="text-amber-800 font-mono bg-amber-50 px-1 py-0.5 rounded font-bold">p2175</code>, <code className="text-amber-800 font-mono bg-amber-50 px-1 py-0.5 rounded font-bold">r1538</code>) are preserved intact with column headers appended to each row chunk to avoid disjointed data cells.
              </p>
              <div className="font-mono text-[11px] bg-white p-2 rounded border border-slate-200 text-slate-700">
                Format: Header + Row Unit<br/>
                Boundaries: Section/Heading tags
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="font-bold text-slate-900 block text-sm flex items-center gap-1.5">
                <Globe2 className="w-4 h-4 text-amber-600" />
                Multilingual OCR Fallback
              </span>
              <p className="text-slate-600 leading-relaxed">
                Hybrid extraction uses high-speed native text parsing for electronic PDFs, automatically triggering selective CLAHE contrast + deskewed <strong>EasyOCR / Tesseract</strong> on scanned Japanese, German, or English schematic pages.
              </p>
              <div className="font-mono text-[11px] bg-white p-2 rounded border border-slate-200 text-slate-700">
                Engines: PyMuPDF + EasyOCR<br/>
                Languages: EN, JA, DE, HI, ES
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. RETRIEVAL STRATEGY */}
      {(activeSection === "all" || activeSection === "retrieval") && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-200">
              <Search className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                2. Multilingual Hybrid Retrieval Strategy
              </h3>
              <p className="text-xs text-slate-500">
                Combining dense semantic vector search with sparse keyword indexing and machine scoping.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="font-bold text-slate-900 block text-sm flex items-center gap-1.5">
                <Database className="w-4 h-4 text-amber-600" />
                Dense Vector Embedding
              </span>
              <p className="text-slate-600 leading-relaxed">
                Powered by <code className="font-mono text-[11px] bg-white px-1 py-0.5 rounded border border-slate-200 font-bold">paraphrase-multilingual-MiniLM-L12-v2</code> (384 dimensions). Maps queries and manual chunks in 50+ languages into a shared vector space, allowing English queries to match Japanese manuals.
              </p>
              <div className="font-mono text-[11px] bg-white p-2 rounded border border-slate-200 text-slate-700">
                Store: ChromaDB Vector DB<br/>
                Metric: Cosine Similarity
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="font-bold text-slate-900 block text-sm flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-600" />
                Sparse Lexical / BM25
              </span>
              <p className="text-slate-600 leading-relaxed">
                BM25 exact-keyword scoring guarantees 100% precision for critical alpha-numeric fault codes (<code className="font-mono font-bold text-amber-800">F07900</code>, <code className="font-mono font-bold text-amber-800">8013</code>, <code className="font-mono font-bold text-amber-800">0x0041</code>) that semantic models might otherwise blur with generic terms.
              </p>
              <div className="font-mono text-[11px] bg-white p-2 rounded border border-slate-200 text-slate-700">
                Algorithm: BM25 Okapi<br/>
                Target: Exact Error & Param IDs
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="font-bold text-slate-900 block text-sm flex items-center gap-1.5">
                <Filter className="w-4 h-4 text-amber-600" />
                Reciprocal Rank Fusion & Scoping
              </span>
              <p className="text-slate-600 leading-relaxed">
                Combines dense vector scores and sparse BM25 ranks using <strong>Reciprocal Rank Fusion (RRF)</strong> with automated machine model metadata filters (<code className="font-mono">sinamics-drive</code>, <code className="font-mono">s7-1200</code>, <code className="font-mono">s7-1500</code>).
              </p>
              <div className="font-mono text-[11px] bg-white p-2 rounded border border-slate-200 text-slate-700">
                Fusion: 0.6 Dense + 0.4 BM25<br/>
                Top-K: 6 Re-ranked Chunks
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. HALLUCINATION-CONTROL STRATEGY */}
      {(activeSection === "all" || activeSection === "hallucination") && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-200">
              <ShieldCheck className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                3. Hallucination-Control & Grounding Strategy
              </h3>
              <p className="text-xs text-slate-500">
                Deterministic guardrails preventing invented fixes or ungrounded machine actions.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="font-bold text-slate-900 block text-sm flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Confidence Threshold & Refusal
              </span>
              <p className="text-slate-600 leading-relaxed">
                If the highest retrieval similarity score is <strong>&lt; 50%</strong> or no relevant chunks exist in the indexed manuals, the system triggers a <strong>Deterministic Graceful Refusal</strong> rather than attempting plausible guesswork.
              </p>
              <div className="font-mono text-[11px] bg-white p-2 rounded border border-slate-200 text-slate-700">
                Threshold: Score &gt;= 0.50<br/>
                Status: "Insufficient Data"
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="font-bold text-slate-900 block text-sm flex items-center gap-1.5">
                <GitBranch className="w-4 h-4 text-amber-600" />
                Cross-Manual Ambiguity Detection
              </span>
              <p className="text-slate-600 leading-relaxed">
                When an error code appears in multiple manuals with differing meanings (e.g. Code <code className="font-mono font-bold">8013</code> in PLC vs Frequency Drive), the system pauses synthesis and asks a clarifying question to ensure safety.
              </p>
              <div className="font-mono text-[11px] bg-white p-2 rounded border border-slate-200 text-slate-700">
                Detection: Cross-Doc Conflict<br/>
                Action: Interactive Disambiguation
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="font-bold text-slate-900 block text-sm flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-amber-600" />
                Strict Schema & Verifiable Citations
              </span>
              <p className="text-slate-600 leading-relaxed">
                The Groq LLaMA-3.3 engine is constrained to return a strict JSON schema. Every statement in <code className="font-mono">meaning</code>, <code className="font-mono">possible_causes</code>, and <code className="font-mono">recommended_actions</code> is backed by verified page numbers and snippet citations.
              </p>
              <div className="font-mono text-[11px] bg-white p-2 rounded border border-slate-200 text-slate-700">
                Format: Strict Valid JSON<br/>
                Trace: Direct Page & Manual Link
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Technical Specifications Summary Table */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
          <Terminal className="w-4 h-4 text-amber-600" />
          Technical Parameters & Specifications Matrix
        </h4>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                <th className="py-2.5 px-3">Layer</th>
                <th className="py-2.5 px-3">Technology / Algorithm</th>
                <th className="py-2.5 px-3">Configured Parameter</th>
                <th className="py-2.5 px-3">Target Objective</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              <tr className="hover:bg-slate-50/60">
                <td className="py-2.5 px-3 font-bold text-slate-900">Chunking</td>
                <td className="py-2.5 px-3">Hierarchical Sliding Window</td>
                <td className="py-2.5 px-3 font-mono text-[11px] text-amber-800 font-bold">500 tokens (100 token overlap)</td>
                <td className="py-2.5 px-3 text-slate-600">Context preservation across page boundaries</td>
              </tr>
              <tr className="hover:bg-slate-50/60">
                <td className="py-2.5 px-3 font-bold text-slate-900">OCR</td>
                <td className="py-2.5 px-3">PyMuPDF + EasyOCR Multilingual</td>
                <td className="py-2.5 px-3 font-mono text-[11px] text-amber-800 font-bold">min_chars=40, lang=['en','ja']</td>
                <td className="py-2.5 px-3 text-slate-600">Selective rasterization of scanned schematics</td>
              </tr>
              <tr className="hover:bg-slate-50/60">
                <td className="py-2.5 px-3 font-bold text-slate-900">Embeddings</td>
                <td className="py-2.5 px-3">SentenceTransformer MiniLM-L12</td>
                <td className="py-2.5 px-3 font-mono text-[11px] text-amber-800 font-bold">384-dim, normalized cosine</td>
                <td className="py-2.5 px-3 text-slate-600">Multilingual cross-lingual semantic search</td>
              </tr>
              <tr className="hover:bg-slate-50/60">
                <td className="py-2.5 px-3 font-bold text-slate-900">Retrieval</td>
                <td className="py-2.5 px-3">Hybrid RRF (Dense + BM25)</td>
                <td className="py-2.5 px-3 font-mono text-[11px] text-amber-800 font-bold">Top-K=6, Score Weight: 0.6 / 0.4</td>
                <td className="py-2.5 px-3 text-slate-600">Exact error code precision + semantic recall</td>
              </tr>
              <tr className="hover:bg-slate-50/60">
                <td className="py-2.5 px-3 font-bold text-slate-900">Guardrails</td>
                <td className="py-2.5 px-3">Deterministic Refusal Gateway</td>
                <td className="py-2.5 px-3 font-mono text-[11px] text-amber-800 font-bold">Similarity threshold &lt; 0.50</td>
                <td className="py-2.5 px-3 text-slate-600">Zero tolerance for hallucinated repairs</td>
              </tr>
              <tr className="hover:bg-slate-50/60">
                <td className="py-2.5 px-3 font-bold text-slate-900">LLM Synthesis</td>
                <td className="py-2.5 px-3">Groq LLaMA-3.3 70B Versatile</td>
                <td className="py-2.5 px-3 font-mono text-[11px] text-amber-800 font-bold">temperature=0.0, strict JSON</td>
                <td className="py-2.5 px-3 text-slate-600">Deterministic structured technician checklist</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
