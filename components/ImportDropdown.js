"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ImportDropdown({ selectedBaby }) {
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

    if (!selectedBaby) {
      setMessage("❌ Please select a baby first");
      setTimeout(() => setMessage(""), 3000);
      return;
    }

    setImporting(true);
    setMessage("");

    try {
      // Read the file content
      const fileContent = await file.text();
      const jsonData = JSON.parse(fileContent);

      // Send to import API with baby ID
      const response = await fetch(`/api/import?babyId=${selectedBaby.id}`, {
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

  return (
    <div className="relative">
      {/* Import Button */}
      <label className="cursor-pointer">
        <Button
          variant="outline"
          size="sm"
          disabled={importing}
          className="text-xs px-2 py-1 h-8 bg-white hover:bg-gray-50 border-gray-300"
        >
          {importing ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-3 w-3 border-b border-gray-600 mr-1"></div>
              Importing...
            </div>
          ) : (
            <div className="flex items-center">
              <span className="mr-1">📂</span>
              Import
            </div>
          )}
        </Button>
        <input
          type="file"
          accept=".json"
          onChange={handleFileUpload}
          disabled={importing}
          className="hidden"
        />
      </label>

      {/* Status Message - positioned absolutely */}
      {message && (
        <div className={`absolute top-full right-0 mt-2 z-50 text-xs p-2 rounded-md shadow-lg min-w-48 ${
          message.includes("❌") 
            ? "bg-red-50 text-red-700 border border-red-200" 
            : "bg-green-50 text-green-700 border border-green-200"
        }`}>
          {message}
        </div>
      )}
    </div>
  );
}