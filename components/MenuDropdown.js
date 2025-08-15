"use client";
// WARNING: This component makes hardcoded API calls without baby ID - DO NOT USE
// This component is not currently in use and needs refactoring before use

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function MenuDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState("");

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      setMessage("Error: Please select a JSON file");
      setTimeout(() => setMessage(""), 3000);
      return;
    }

    setImporting(true);
    setMessage("");
    setIsOpen(false); // Close menu during import

    try {
      // Read the file content
      const fileContent = await file.text();
      const jsonData = JSON.parse(fileContent);

      // Send to import API
      const response = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jsonData),
      });

      const result = await response.json();

      if (result.success) {
        setMessage(`✅ Imported ${result.imported} activities!`);
        // Refresh the page to show new data
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setMessage(`❌ Import failed: ${result.error}`);
        if (result.errors && result.errors.length > 0) {
          console.error("Import errors:", result.errors);
        }
        setTimeout(() => setMessage(""), 5000);
      }
    } catch (error) {
      console.error('Import error:', error);
      setMessage(`❌ Failed to import: ${error.message}`);
      setTimeout(() => setMessage(""), 5000);
    } finally {
      setImporting(false);
      // Reset the file input
      event.target.value = '';
    }
  };

  const handleExportData = async () => {
    setMessage("📤 Preparing export...");
    setIsOpen(false);

    try {
      // Call the export API
      const response = await fetch('/api/export');
      
      if (response.ok) {
        // Get the filename from the response headers
        const contentDisposition = response.headers.get('content-disposition');
        const filename = contentDisposition 
          ? contentDisposition.split('filename=')[1].replace(/"/g, '')
          : `baby-tracker-export-${new Date().toISOString().split('T')[0]}.json`;

        // Get the JSON data
        const blob = await response.blob();
        
        // Create download link
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        setMessage("✅ Data exported successfully!");
      } else {
        const errorData = await response.json();
        setMessage(`❌ Export failed: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Export error:', error);
      setMessage("❌ Failed to export data");
    }

    setTimeout(() => setMessage(""), 5000);
  };

  return (
    <div className="relative">
      {/* Menu Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
        disabled={importing}
      >
        {importing ? (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
        ) : (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </Button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop to close menu when clicking outside */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          ></div>
          
          {/* Menu Items */}
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50">
            <div className="py-1">
              {/* Import Data */}
              <label className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
                <span className="mr-2">📂</span>
                Import Data
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  disabled={importing}
                  className="hidden"
                />
              </label>
              
              {/* Export Data */}
              <button
                onClick={handleExportData}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                disabled={importing}
              >
                <span className="mr-2">📤</span>
                Export Data
              </button>
              
              {/* Divider */}
              <div className="border-t border-gray-100 my-1"></div>
              
              {/* Settings (placeholder) */}
              <button
                onClick={() => {
                  setMessage("⚙️ Settings coming soon!");
                  setIsOpen(false);
                  setTimeout(() => setMessage(""), 3000);
                }}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                disabled={importing}
              >
                <span className="mr-2">⚙️</span>
                Settings
              </button>
            </div>
          </div>
        </>
      )}

      {/* Status Message - positioned absolutely */}
      {message && (
        <div className={`absolute top-full right-0 mt-2 z-50 text-xs p-2 rounded-md shadow-lg min-w-48 ${
          message.includes("❌") 
            ? "bg-red-50 text-red-700 border border-red-200" 
            : message.includes("🚧") || message.includes("⚙️")
            ? "bg-yellow-50 text-yellow-700 border border-yellow-200"
            : "bg-green-50 text-green-700 border border-green-200"
        }`}>
          {message}
        </div>
      )}
    </div>
  );
}