import { useState } from 'react';
import { Download, FileText, Table, ChevronDown } from 'lucide-react';

interface ExportActionsProps {
  onExportCSV: () => void;
  onExportPDF: () => void;
  disabled?: boolean;
}

export function ExportActions({ onExportCSV, onExportPDF, disabled }: ExportActionsProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
      >
        <Download className="w-4 h-4" />
        Export
        <ChevronDown className="w-4 h-4" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-20">
            <button
              onClick={() => {
                onExportCSV();
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <Table className="w-4 h-4 text-emerald-600" />
              <div className="text-left">
                <div className="font-medium">Export CSV</div>
                <div className="text-xs text-gray-500">Excel compatible</div>
              </div>
            </button>
            <button
              onClick={() => {
                onExportPDF();
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <FileText className="w-4 h-4 text-red-600" />
              <div className="text-left">
                <div className="font-medium">Export PDF</div>
                <div className="text-xs text-gray-500">Print-ready format</div>
              </div>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
