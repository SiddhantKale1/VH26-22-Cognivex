import React, { useState, useEffect, useRef } from "react";
import { 
  UploadCloud, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  RefreshCw, 
  HardDrive, 
  Layers, 
  ShieldCheck,
  Trash2,
  Database,
  ExternalLink,
  FileCheck
} from "lucide-react";
import { 
  getDocuments, 
  uploadDocument, 
  deleteDocument, 
  getMinioStatus,
  getManualStreamUrl,
  type DocumentInfo,
  type MinioStatus
} from "../services/api";

export const UploadSection: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [pgStatus, setPgStatus] = useState<MinioStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [uploading, setUploading] = useState<boolean>(false);
  const [deletingFilename, setDeletingFilename] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
    chunks?: number;
    docId?: string;
  }>({ type: null, message: "" });
  const [dragActive, setDragActive] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocs = async () => {
    setLoading(true);
    try {
      const [docs, minio] = await Promise.all([
        getDocuments(),
        getMinioStatus(),
      ]);
      setDocuments(docs);
      setPgStatus(minio);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  const handleFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setUploadStatus({
        type: "error",
        message: "Only PDF technical manuals are supported (.pdf).",
      });
      return;
    }

    setUploading(true);
    setUploadStatus({ type: null, message: "" });

    try {
      const res = await uploadDocument(file);
      setUploadStatus({
        type: "success",
        message: res.message || `Successfully stored "${file.name}" in PostgreSQL and indexed into ChromaDB.`,
        chunks: res.chunks_added,
      });
      await fetchDocs();
    } catch (err: any) {
      setUploadStatus({
        type: "error",
        message: err.message || "Failed to upload and index document.",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (doc: DocumentInfo) => {
    const filename = doc.filename || doc.name;
    if (!filename) return;

    if (!window.confirm(`Are you sure you want to delete "${doc.name}" (${filename})? This will remove all its vector embeddings.`)) {
      return;
    }

    setDeletingFilename(filename);
    setUploadStatus({ type: null, message: "" });

    try {
      const res = await deleteDocument(filename);
      setUploadStatus({
        type: "success",
        message: res.message || `Deleted "${filename}" successfully.`,
      });
      await fetchDocs();
    } catch (err: any) {
      setUploadStatus({
        type: "error",
        message: err.message || `Failed to delete "${filename}".`,
      });
    } finally {
      setDeletingFilename(null);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* MinIO / S3 Object Storage Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">MinIO / S3-Compatible Object Storage</h3>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                pgStatus?.connected 
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                  : "bg-blue-100 text-blue-800 border border-blue-300"
              }`}>
                {pgStatus?.connected ? "● MinIO S3 Bucket Connected" : "● Local S3 Emulation Active"}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Bucket: <code className="font-mono text-slate-700 font-bold">cognivex-manuals</code> • Endpoint: <code className="font-mono text-slate-700 font-bold">{pgStatus?.endpoint || "localhost:9000"}</code> • S3 API & Presigned Streaming active
            </p>
          </div>
        </div>

        <button
          onClick={fetchDocs}
          disabled={loading}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-300 cursor-pointer shadow-xs shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-amber-500" : ""}`} />
          Sync Object Store
        </button>
      </div>

      {/* Upload Zone */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <UploadCloud className="w-6 h-6 text-amber-500" />
              Upload & Ingest Machine Manual
            </h2>
            <p className="text-sm text-slate-500">
              Upload PDF operating instructions, system manuals, or fault catalogs. Manuals are stored in MinIO S3 bucket (<code className="font-mono text-slate-700 font-bold">cognivex-manuals</code>) and automatically vectorized into ChromaDB.
            </p>
          </div>
        </div>

        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
            dragActive
              ? "border-amber-500 bg-amber-50/50 scale-[1.01]"
              : "border-slate-300 hover:border-amber-500 bg-slate-50/70 hover:bg-amber-50/20"
          } ${uploading ? "opacity-60 pointer-events-none" : ""}`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleChange}
            className="hidden"
          />

          {uploading ? (
            <div className="flex flex-col items-center justify-center py-4 space-y-3">
              <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
              <p className="text-sm font-bold text-slate-900">
                Storing in PostgreSQL, extracting text & indexing into ChromaDB...
              </p>
              <p className="text-xs text-slate-500">This may take 10–30 seconds for large multi-hundred-page PDFs.</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 ring-4 ring-amber-50 border border-amber-200">
                <UploadCloud className="w-7 h-7" />
              </div>
              <div>
                <p className="text-base font-bold text-slate-900">
                  Click to select or drag and drop PDF manual
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Supports Siemens SINAMICS, SIMATIC S7, or any standard industrial PDF
                </p>
              </div>
            </div>
          )}
        </div>

        {uploadStatus.type && (
          <div
            className={`mt-4 p-4 rounded-xl flex items-start gap-3 text-sm ${
              uploadStatus.type === "success"
                ? "bg-emerald-50 border border-emerald-300 text-emerald-900"
                : "bg-red-50 border border-red-300 text-red-900"
            }`}
          >
            {uploadStatus.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-bold">{uploadStatus.message}</p>
              {uploadStatus.chunks !== undefined && (
                <p className="text-xs mt-1 text-emerald-800 font-semibold">
                  Added {uploadStatus.chunks} dense vector chunks into ChromaDB index.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Indexed Manuals Library */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-amber-500" />
              Database Knowledge Base ({documents.length} Manuals)
            </h3>
            <p className="text-xs text-slate-500">
              Technical manuals stored in database and searchable via hybrid dense vector & BM25 retrieval.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-slate-500 gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
            <span>Loading database manuals...</span>
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p>No manuals found. Upload a PDF manual above to begin.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {documents.map((doc) => {
              const isDeleting = deletingFilename === (doc.filename || doc.name);
              const streamUrl = getManualStreamUrl(doc.filename || doc.name);

              return (
                <div
                  key={doc.id}
                  className="bg-slate-50 border border-slate-200 hover:border-amber-300 rounded-xl p-4 transition-all flex flex-col justify-between group shadow-xs hover:shadow-sm"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 border border-amber-300 text-amber-900">
                        <Layers className="w-3 h-3 text-amber-700" />
                        {doc.machine}
                      </span>

                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full font-bold">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          Ready
                        </span>

                        {/* Stream PDF in browser */}
                        <a
                          href={streamUrl}
                          target="_blank"
                          rel="noreferrer"
                          title="Stream and view original PDF in browser"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-blue-50 border border-transparent hover:border-blue-200 transition-all"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>

                        {/* Delete Button */}
                        <button
                          onClick={() => handleDelete(doc)}
                          disabled={isDeleting}
                          title={`Delete ${doc.name}`}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-all cursor-pointer disabled:opacity-50"
                        >
                          {isDeleting ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-red-600" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <h4 className="font-bold text-slate-900 text-sm mt-2.5 line-clamp-2" title={doc.name}>
                      {doc.name}
                    </h4>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                    <span className="truncate max-w-[200px] flex items-center gap-1" title={doc.filename}>
                      <FileCheck className="w-3.5 h-3.5 text-slate-400" />
                      {doc.filename || doc.name}
                    </span>
                    <span className="text-slate-600 font-mono text-[11px]">
                      {doc.manufacturer} • {doc.version}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
