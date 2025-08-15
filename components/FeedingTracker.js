"use client";
// WARNING: This component contains hardcoded baby ID and user ID - DO NOT USE
// This component is not currently in use and needs refactoring before use

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export function FeedingTracker({ onActivityAdded }) {
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("milk"); // milk or solid
  const [time, setTime] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    
    try {
      // For now, we'll use baby ID 1 and user ID 1 from our seed data
      // In a real app, these would come from authentication
      const activityData = {
        babyId: 1,
        recorder: 1,
        type: "feeding",
        subtype: type === "milk" ? "bottle" : "meal",
        startTime: time,
        unit: "ML",
        amount: parseFloat(amount),
        details: `${type} feeding`
      };

      const response = await fetch('/api/activities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(activityData),
      });

      const result = await response.json();

      if (result.success) {
        setMessage("Feeding recorded successfully!");
        // Reset form
        setAmount("");
        setTime("");
        setType("milk");
        
        // Notify parent component to refresh activities
        if (onActivityAdded) {
          onActivityAdded();
        }
        
        // Clear success message after 3 seconds
        setTimeout(() => setMessage(""), 3000);
      } else {
        setMessage("Error: " + (result.error || "Failed to save feeding"));
      }
    } catch (error) {
      console.error('Error saving feeding:', error);
      setMessage("Error: Failed to save feeding");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center">
          <span className="mr-2">🍼</span>
          Record Feeding
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type Selection - Mobile optimized */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={type === "milk" ? "default" : "outline"}
                onClick={() => setType("milk")}
                className="w-full text-sm py-2"
              >
                🍼 Milk
              </Button>
              <Button
                type="button"
                variant={type === "solid" ? "default" : "outline"}
                onClick={() => setType("solid")}
                className="w-full text-sm py-2"
              >
                🥄 Solid Food
              </Button>
            </div>
          </div>

          {/* Time Input */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Time
            </label>
            <Input
              type="datetime-local"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
              className="w-full"
            />
          </div>

          {/* Amount Input */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Amount (ml/g)
            </label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              required
              className="w-full"
            />
          </div>

          {/* Submit Button */}
          <Button 
            type="submit" 
            className="w-full py-3" 
            disabled={saving}
          >
            {saving ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </span>
            ) : (
              "Save Feeding Record"
            )}
          </Button>

          {/* Status Message */}
          {message && (
            <div className={`text-sm p-3 rounded-md ${
              message.includes("Error") 
                ? "bg-red-50 text-red-700 border border-red-200" 
                : "bg-green-50 text-green-700 border border-green-200"
            }`}>
              {message}
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
