import React, { useState, useRef } from 'react';
import { PDFDocument } from 'pdf-lib';
import {
  FolderOpen,
  FileCheck,
  Merge,
  Download,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FolderSync,
  RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const App = () => {
  const [folders, setFolders] = useState({
    folderA: { files: [], path: '' },
    folderB: { files: [], path: '' },
    folderC: { files: [], path: '' },
  });
  const [outputFolder, setOutputFolder] = useState({ name: '', handle: null });
  const [mergeAll, setMergeAll] = useState(true);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('idle'); // idle, processing, completed, error
  const [error, setError] = useState('');

  const fileInputRefs = {
    folderA: useRef(null),
    folderB: useRef(null),
    folderC: useRef(null),
  };

  const handleFileSelect = (key, event) => {
    const files = Array.from(event.target.files).filter(f => f.name.toLowerCase().endsWith('.pdf'));
    if (files.length === 0) return;

    // Show first file name or a summary if multiple files selected
    const displayPath = files.length === 1
      ? files[0].name
      : `${files.length} files selected`;

    setFolders(prev => ({
      ...prev,
      [key]: { files, path: displayPath }
    }));
  };

  const handleOutputFolderSelect = async () => {
    try {
      if (!('showDirectoryPicker' in window)) {
        throw new Error('Your browser does not support folder selection for saving. Please use a modern browser like Chrome or Edge.');
      }
      const handle = await window.showDirectoryPicker();
      setOutputFolder({ name: handle.name, handle: handle });
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message);
      }
    }
  };

  const mergePDFs = async () => {
    try {
      setStatus('processing');
      setProgress(10);
      setError('');

      const mergedPdf = await PDFDocument.create();

      const maxSets = Math.max(folders.folderA.files.length, folders.folderB.files.length, folders.folderC.files.length);

      if (maxSets === 0) {
        throw new Error('No PDF files selected.');
      }

      for (let i = 0; i < maxSets; i++) {
        // 1. Process File A (PMA) - Page 1
        if (folders.folderA.files[i]) {
          const pdfA = await PDFDocument.load(await folders.folderA.files[i].arrayBuffer());
          const pagesA = await mergedPdf.copyPages(pdfA, pdfA.getPageIndices());

          if (pagesA.length > 0) {
            mergedPdf.addPage(pagesA[0]); // PMA Page 1
          }

          // 2. Process File B (Q1) - All Pages
          if (folders.folderB.files[i]) {
            const pdfB = await PDFDocument.load(await folders.folderB.files[i].arrayBuffer());
            const pagesB = await mergedPdf.copyPages(pdfB, pdfB.getPageIndices());
            pagesB.forEach(p => mergedPdf.addPage(p));
          }

          // 3. Process File A (PMA) - Page 2
          if (pagesA.length > 1) {
            mergedPdf.addPage(pagesA[1]); // PMA Page 2
          }

          // 4. Process File C (Q2) - All Pages
          if (folders.folderC.files[i]) {
            const pdfC = await PDFDocument.load(await folders.folderC.files[i].arrayBuffer());
            const pagesC = await mergedPdf.copyPages(pdfC, pdfC.getPageIndices());
            pagesC.forEach(p => mergedPdf.addPage(p));
          }
        } else {
          // If no File A but B or C exists, just append them sequentially
          if (folders.folderB.files[i]) {
            const pdfB = await PDFDocument.load(await folders.folderB.files[i].arrayBuffer());
            const pagesB = await mergedPdf.copyPages(pdfB, pdfB.getPageIndices());
            pagesB.forEach(p => mergedPdf.addPage(p));
          }
          if (folders.folderC.files[i]) {
            const pdfC = await PDFDocument.load(await folders.folderC.files[i].arrayBuffer());
            const pagesC = await mergedPdf.copyPages(pdfC, pdfC.getPageIndices());
            pagesC.forEach(p => mergedPdf.addPage(p));
          }
        }

        setProgress(Math.round(10 + ((i + 1) / maxSets) * 80));
      }

      const pdfBytes = await mergedPdf.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });

      let prefix = `Merged_PDF_${new Date().toISOString().slice(0, 10)}`;
      const firstFile = folders.folderA.files[0] || folders.folderB.files[0] || folders.folderC.files[0];
      if (firstFile) {
        prefix = firstFile.name.replace(/\.[^/.]+$/, "")
          .replace("PMA Report_", "")
          .replace(" - PMA Report", "");
      }
      const fileName = `${prefix} - Merged.pdf`;

      if (outputFolder.handle) {
        try {
          const fileHandle = await outputFolder.handle.getFileHandle(fileName, { create: true });
          const writable = await fileHandle.createWritable();
          await writable.write(blob);
          await writable.close();
        } catch (err) {
          console.error('Failed to save to folder:', err);
          // Fallback to manual download if folder writing fails
          triggerDownload(blob, fileName);
        }
      } else {
        triggerDownload(blob, fileName);
      }

      setProgress(100);
      setStatus('completed');
    } catch (err) {
      console.error(err);
      setError(err.message || 'An error occurred during merging.');
      setStatus('error');
    }
  };

  const triggerDownload = (blob, fileName) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setFolders({
      folderA: { files: [], path: '' },
      folderB: { files: [], path: '' },
      folderC: { files: [], path: '' },
    });
    setOutputFolder({ name: '', handle: null });
    setMergeAll(true);
    setProgress(0);
    setStatus('idle');
    setError('');

    // Clear input values to allow re-selection of the same files
    Object.values(fileInputRefs).forEach(ref => {
      if (ref.current) ref.current.value = '';
    });
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6 text-white overflow-hidden">
      {/* Background blobs */}
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-primary/10 blur-[120px] rounded-full -z-10 animate-pulse" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand-secondary/10 blur-[120px] rounded-full -z-10 animate-pulse delay-700" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl glass rounded-3xl p-8 shadow-2xl relative overflow-hidden"
      >
        {/* Header */}
        <div className="text-center mb-10">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="inline-flex items-center justify-center w-24 h-24 rounded-[2rem] bg-brand-primary/10 mb-6 p-2 blur-fix"
          >
            <img
              src="/assets/logo.png"
              alt="Logo"
              className="w-full h-full object-contain drop-shadow-[0_0_20px_rgba(239,68,68,0.4)]"
            />
          </motion.div>
          <h1 className="text-4xl font-bold tracking-tight mb-2 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            PDF Folder Merger
          </h1>
          <p className="text-red-400/80 font-medium text-sm italic">
            Note: This version can merge Q1-Q4 but Phase 2 only
          </p>
        </div>

        {/* Action List */}
        <div className="space-y-6 mb-8">
          {[
            { id: 'folderA', label: 'Select PDF File(s) for File A (PMA Report, 2 pages)', color: 'blue' },
            { id: 'folderB', label: 'Select PDF File(s) for File B (Log ไตรมาสที่ 1 or 3, 3 pages)', color: 'purple' },
            { id: 'folderC', label: 'Select PDF File(s) for File C (Log ไตรมาสที่ 2 or 4, 3 pages)', color: 'emerald' },
          ].map((item) => (
            <div key={item.id} className="relative group">
              <p className="text-sm text-gray-400 mb-2 ml-1">{item.label}</p>
              <div className="flex gap-3">
                <div className="flex-1 glass bg-white/5 rounded-xl px-4 py-3 flex items-center border border-white/5 group-hover:border-white/20 transition-all duration-300 truncate">
                  <span className={cn(
                    "text-sm transition-colors",
                    folders[item.id].path ? "text-gray-200" : "text-gray-500"
                  )}>
                    {folders[item.id].path || "No files selected..."}
                  </span>
                  {folders[item.id].files.length > 0 && (
                    <span className="ml-auto bg-white/10 px-2 py-0.5 rounded-full text-[10px] uppercase font-bold text-gray-400">
                      {folders[item.id].files.length} PDFs
                    </span>
                  )}
                </div>
                <button
                  onClick={() => fileInputRefs[item.id].current.click()}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/10 hover:bg-white/15 transition-all text-sm font-semibold border border-white/10 active:scale-95"
                >
                  <FolderOpen size={18} />
                  Browse
                </button>
                <input
                  type="file"
                  ref={fileInputRefs[item.id]}
                  style={{ display: 'none' }}
                  onChange={(e) => handleFileSelect(item.id, e)}
                  accept=".pdf"
                  multiple
                />
              </div>
            </div>
          ))}

          {/* Output Folder Selection */}
          <div className="relative group pt-4 border-t border-white/5">
            <p className="text-sm text-brand-primary font-bold mb-2 ml-1 flex items-center gap-2">
              <Download size={16} />
              Select Save Folder (ที่เก็บไฟล์)
            </p>
            <div className="flex gap-3">
              <div className="flex-1 glass bg-white/5 rounded-xl px-4 py-3 flex items-center border border-white/5 group-hover:border-white/20 transition-all duration-300 truncate">
                <span className={cn(
                  "text-sm transition-colors",
                  outputFolder.name ? "text-gray-200" : "text-gray-500"
                )}>
                  {outputFolder.name || "Default: Downloads folder"}
                </span>
              </div>
              <button
                onClick={handleOutputFolderSelect}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-brand-primary/10 hover:bg-brand-primary/20 transition-all text-sm font-semibold border border-brand-primary/20 active:scale-95 text-brand-primary"
              >
                <FolderOpen size={18} />
                Browse Folder
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-10 px-1">
          <input
            id="merge-all-check-prod"
            type="checkbox"
            className="sr-only"
            checked={mergeAll}
            onChange={() => setMergeAll(prev => !prev)}
          />
          <label htmlFor="merge-all-check-prod" className="flex items-center gap-3 cursor-pointer group">
            <div className="relative">
              <div className={cn(
                "w-5 h-5 border-2 rounded transition-all flex items-center justify-center",
                mergeAll ? "bg-brand-primary border-brand-primary" : "border-white/20 group-hover:border-white/40"
              )}>
                {mergeAll && <FileCheck size={14} className="text-white" />}
              </div>
            </div>
            <span className="text-sm text-gray-300 font-medium whitespace-nowrap">Merge all group PDFs into a single file</span>
          </label>
        </div>

        {/* Progress & Actions */}
        <div className="space-y-6">
          <AnimatePresence>
            {status !== 'idle' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2 overflow-hidden"
              >
                <div className="flex justify-between text-xs font-medium text-gray-400">
                  <span>{status === 'processing' ? 'Processing...' : status === 'completed' ? 'Success!' : 'Error'}</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className={cn(
                      "h-full rounded-full transition-all duration-300",
                      status === 'error' ? "bg-red-500" : "bg-gradient-to-r from-brand-primary to-brand-secondary"
                    )}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {error && (
            <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm">
              <AlertCircle size={18} className="shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <div className="flex gap-4">
            <button
              onClick={handleReset}
              disabled={status === 'processing'}
              className="flex-1 py-4 rounded-2xl flex items-center justify-center gap-3 font-bold text-lg transition-all bg-white/5 hover:bg-white/10 active:scale-[0.98] border border-white/10"
            >
              <RotateCcw size={24} />
              Reset
            </button>
            <button
              onClick={mergePDFs}
              disabled={status === 'processing' || (!folders.folderA.files.length && !folders.folderB.files.length && !folders.folderC.files.length)}
              className={cn(
                "flex-[2] py-4 rounded-2xl flex items-center justify-center gap-3 font-bold text-lg transition-all shadow-xl shadow-brand-primary/20",
                status === 'processing'
                  ? "bg-brand-primary/50 cursor-not-allowed opacity-70"
                  : "bg-brand-primary hover:bg-brand-primary/90 active:scale-[0.98]"
              )}
            >
              {status === 'processing' ? (
                <>
                  <Loader2 size={24} className="animate-spin" />
                  Merging...
                </>
              ) : status === 'completed' ? (
                <>
                  <CheckCircle2 size={24} />
                  Merge Again
                </>
              ) : (
                <>
                  <Merge size={24} />
                  Merge PDF
                </>
              )}
            </button>
          </div>
        </div>

        {/* Footer decoration */}
        <div className="mt-8 pt-8 border-t border-white/5 flex justify-center text-[10px] text-gray-500 font-bold tracking-[0.2em] uppercase">
          Client-side Processing Ready
        </div>
      </motion.div>
    </div>
  );
};

export default App;
