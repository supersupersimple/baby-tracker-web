"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function ImportData({ onImportComplete, selectedBaby }) {
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState("");

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.abt') && !file.name.endsWith('.json')) {
      setMessage("Error: Please select an .abt or .json file");
      return;
    }

    if (!selectedBaby) {
      setMessage("❌ Please select a baby first");
      return;
    }

    setImporting(true);
    setMessage("");

    try {
      let response;
      
      if (file.name.endsWith('.abt')) {
        // Handle .abt file upload using FormData
        const formData = new FormData();
        formData.append('file', file);

        response = await fetch(`/api/import?babyId=${selectedBaby.id}`, {
          method: 'POST',
          body: formData,
        });
      } else {
        // Handle .json file upload (backward compatibility)
        const fileContent = await file.text();
        const jsonData = JSON.parse(fileContent);
        
        response = await fetch(`/api/import?babyId=${selectedBaby.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(jsonData),
        });
      }

      const result = await response.json();

      if (result.success) {
        setMessage(`✅ Successfully imported ${result.imported} activities!`);
        if (onImportComplete) onImportComplete();
        
        // Clear message after 5 seconds
        setTimeout(() => {
          setMessage("");
        }, 5000);
      } else {
        setMessage(`❌ Import failed: ${result.error}`);
        if (result.errors && result.errors.length > 0) {
          console.error("Import errors:", result.errors);
        }
      }
    } catch (error) {
      console.error('Import error:', error);
      setMessage(`❌ Failed to import data: ${error.message}`);
    } finally {
      setImporting(false);
      // Reset the file input
      event.target.value = '';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base sm:text-lg flex items-center">
          <span className="mr-2">📂</span>
          Import Data
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-700">
              📋 Import activities from an .abt file (recommended) or JSON file. The file should contain baby tracker data exported from this app.
            </p>
          </div>
          
          <div className="flex flex-col space-y-2">
            <input
              type="file"
              accept=".abt,.json"
              onChange={handleFileUpload}
              disabled={importing}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-medium
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100
                file:disabled:opacity-50
                file:disabled:cursor-not-allowed"
            />
            
            {importing && (
              <div className="flex items-center justify-center py-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-sm text-gray-600">Importing data...</span>
              </div>
            )}
          </div>
        </div>

        {/* Status Message */}
        {message && (
          <div className={`mt-4 text-sm p-3 rounded-md ${
            message.includes("❌") 
              ? "bg-red-50 text-red-700 border border-red-200" 
              : "bg-green-50 text-green-700 border border-green-200"
          }`}>
            {message}
          </div>
        )}
      </CardContent>
    </Card>
  );
}