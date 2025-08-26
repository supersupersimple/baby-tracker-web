"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { storeActivityLocally, syncLocalActivities, isOnline, getAllLocalActivities } from "@/lib/offline-storage";
import { useSession } from "next-auth/react";

// Quick action data - subtype-based for direct access
const quickActions = [
  // Feeding subtypes
  {
    id: "feeding-bottle",
    type: "feeding",
    subtype: "BOTTLE",
    icon: "🍼",
    label: "Bottle",
    color: "bg-blue-50 hover:bg-blue-100 text-blue-700",
    borderColor: "border-blue-200 hover:border-blue-300"
  },
  {
    id: "feeding-meal",
    type: "feeding", 
    subtype: "MEAL",
    icon: "🥄",
    label: "Meal",
    color: "bg-blue-50 hover:bg-blue-100 text-blue-700",
    borderColor: "border-blue-200 hover:border-blue-300"
  },
  {
    id: "sleeping",
    type: "sleeping",
    subtype: "SLEEP",
    icon: "😴", 
    label: "Sleep",
    color: "bg-purple-50 hover:bg-purple-100 text-purple-700",
    borderColor: "border-purple-200 hover:border-purple-300"
  },
  {
    id: "diapering-pee",
    type: "diapering",
    subtype: "PEE",
    icon: "💧",
    label: "Pee",
    color: "bg-green-50 hover:bg-green-100 text-green-700", 
    borderColor: "border-green-200 hover:border-green-300"
  },
  {
    id: "diapering-poo",
    type: "diapering",
    subtype: "POO", 
    icon: "💩",
    label: "Poo",
    color: "bg-green-50 hover:bg-green-100 text-green-700",
    borderColor: "border-green-200 hover:border-green-300"
  }
];

// All actions for the "All Actions" dropdown - type-based
const allActions = [
  {
    id: "feeding",
    icon: "🍼",
    label: "Feeding",
    color: "bg-blue-50 hover:bg-blue-100 text-blue-700",
    borderColor: "border-blue-200 hover:border-blue-300"
  },
  {
    id: "sleeping",
    icon: "😴", 
    label: "Sleep",
    color: "bg-purple-50 hover:bg-purple-100 text-purple-700",
    borderColor: "border-purple-200 hover:border-purple-300"
  },
  {
    id: "diapering",
    icon: "👶",
    label: "Diaper",
    color: "bg-green-50 hover:bg-green-100 text-green-700", 
    borderColor: "border-green-200 hover:border-green-300"
  },
  {
    id: "growth",
    icon: "📏",
    label: "Growth",
    color: "bg-yellow-50 hover:bg-yellow-100 text-yellow-700",
    borderColor: "border-yellow-200 hover:border-yellow-300"
  },
  {
    id: "health",
    icon: "🏥",
    label: "Health", 
    color: "bg-red-50 hover:bg-red-100 text-red-700",
    borderColor: "border-red-200 hover:border-red-300"
  },
  {
    id: "leisure",
    icon: "🎉",
    label: "Leisure", 
    color: "bg-orange-50 hover:bg-orange-100 text-orange-700",
    borderColor: "border-orange-200 hover:border-orange-300"
  }
];

export function QuickActions({ onActivityAdded, selectedBaby, quickActionsSettings }) {
  const { data: session } = useSession();
  const [selectedAction, setSelectedAction] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [floatingMessage, setFloatingMessage] = useState("");
  const [showAllActionsDropdown, setShowAllActionsDropdown] = useState(false);

  // Handle PWA shortcuts from URL parameters
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const actionParam = urlParams.get('action');
      
      if (actionParam && selectedBaby) {
        // Check both quickActions and allActions for backward compatibility
        let action = quickActions.find(a => a.id === actionParam);
        if (!action) {
          action = allActions.find(a => a.id === actionParam);
        }
        if (action) {
          // Delay to ensure component is fully loaded
          setTimeout(() => {
            handleActionClick(action);
          }, 100);
          
          // Clean up URL without reloading
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    }
  }, [selectedBaby]); // Re-run when selectedBaby changes

  const handleActionClick = async (action) => {
    // Check if user has permission to add activities
    if (!selectedBaby) {
      setFloatingMessage("❌ Please select a baby first");
      setTimeout(() => setFloatingMessage(""), 3000);
      return;
    }

    if (selectedBaby.role === 'VIEWER') {
      setFloatingMessage("❌ You only have viewer access. Need editor access to add activities.");
      setTimeout(() => setFloatingMessage(""), 3000);
      return;
    }

    // Handle sleep directly without dialog
    if (action.id === "sleeping" || (action.type === "sleeping")) {
      await handleDirectSleepActivity();
      return;
    }
    
    setSelectedAction(action);
    
    // Get the action type and subtype
    const actionType = action.type || action.id; // support both new and old format
    const preselectedSubtype = action.subtype || getDefaultSubtype(actionType);
    
    // Get last bottle feeding amount if it's a feeding action
    let lastAmount = "";
    let lastUnit = "ML";
    
    // 🔥 NEW: Get last feeding amount from local storage first, then API
    if (actionType === "feeding") {
      try {
        // First try to get from local storage (faster)
        const localActivities = getAllLocalActivities();
        const localFeedings = localActivities
          .filter(activity => 
            activity.babyId === selectedBaby.id &&
            activity.type === 'FEEDING' &&
            activity.amount && 
            activity.amount > 0
          )
          .sort((a, b) => new Date(b.fromDate) - new Date(a.fromDate));
        
        if (localFeedings.length > 0) {
          const lastFeeding = localFeedings[0];
          lastAmount = lastFeeding.amount.toString();
          // Convert database unit format to form format
          if (lastFeeding.unit === "MILLILITRES") {
            lastUnit = "ML";
          } else if (lastFeeding.unit === "OUNCES") {
            lastUnit = "OZ";
          } else {
            lastUnit = "ML"; // Default fallback
          }
        } else if (isOnline()) {
          // Fallback to API if no local data and online
          const response = await fetch(`/api/activities?babyId=${selectedBaby.id}&type=FEEDING`);
          const result = await response.json();
          if (result.success && result.data.length > 0) {
            const feedingsWithAmount = result.data
              .filter(activity => 
                activity.amount && 
                activity.amount > 0
              )
              .sort((a, b) => new Date(b.fromDate) - new Date(a.fromDate));
            
            if (feedingsWithAmount.length > 0) {
              const lastFeeding = feedingsWithAmount[0];
              lastAmount = lastFeeding.amount.toString();
              if (lastFeeding.unit === "MILLILITRES") {
                lastUnit = "ML";
              } else if (lastFeeding.unit === "OUNCES") {
                lastUnit = "OZ";
              } else {
                lastUnit = "ML";
              }
            }
          }
        }
      } catch (error) {
        console.log("Could not fetch last feeding amount:", error);
      }
    }
    
    setFormData({
      time: new Date().toISOString().slice(0, 16), // Default to current time
      endTime: "",
      amount: lastAmount,
      unit: lastUnit,
      subtype: preselectedSubtype,
      category: "FORMULA", // Default category for bottle feeding
      details: ""
    });
    setIsDialogOpen(true);
  };

  // 🔥 NEW: Local-first sleep activity handler
  const handleDirectSleepActivity = async () => {
    setSaving(true);

    try {
      const activityData = {
        babyId: selectedBaby.id,
        type: "SLEEPING",
        subtype: "SLEEP",
        fromDate: new Date().toISOString(),
        toDate: null,
        unit: null,
        amount: null,
        category: null,
        details: ""
      };

      // 🚀 LOCAL-FIRST: Store immediately to local storage
      const localActivity = storeActivityLocally(activityData);
      
      // Immediate UI feedback - user sees instant response
      setFloatingMessage("✅ Sleep activity started!");
      setTimeout(() => setFloatingMessage(""), 2000);
      if (onActivityAdded) onActivityAdded();
      
      // 🔄 BACKGROUND SYNC: Schedule background synchronization
      if (isOnline()) {
        // Import sync service dynamically to avoid circular dependencies
        try {
          const { getSyncService } = await import('@/lib/sync-service');
          const syncService = getSyncService();
          syncService.scheduleSync(localActivity.id);
        } catch (syncError) {
          console.warn('Background sync scheduling failed:', syncError);
          // Activity is still saved locally, sync will happen later
        }
      }
      
    } catch (error) {
      console.error('Error starting sleep activity:', error);
      setFloatingMessage("❌ Failed to save sleep activity");
      setTimeout(() => setFloatingMessage(""), 3000);
    } finally {
      setSaving(false);
    }
  };

  const getDefaultUnit = (actionId) => {
    switch (actionId) {
      case "feeding": return "ML";
      case "growth": return "KG"; 
      case "health": return "CELSIUS";
      default: return "";
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('🚀 handleSubmit called', { selectedAction: selectedAction?.id, saving });
    setSaving(true);

    try {
      // Get the action type from the selected action
      const actionType = selectedAction.type || selectedAction.id;
      
      // For feeding activities (bottle, meal, breastfeeding), diaper activities, growth activities, health activities, and leisure activities, use current time as start time (when save is clicked)
      const fromDate = (actionType === "feeding" && (formData.subtype === "BOTTLE" || formData.subtype === "MEAL" || formData.subtype === "LEFT_BREAST" || formData.subtype === "RIGHT_BREAST")) || actionType === "diapering" || actionType === "growth" || actionType === "health" || actionType === "leisure"
        ? new Date().toISOString() 
        : formData.time;

      // Prepare activity data based on activity type
      let activityData = {
        babyId: selectedBaby.id,
        type: actionType === "growth" ? "GROWTH" : (actionType === "health" ? "HEALTH" : (actionType === "leisure" ? "LEISURE" : actionType.toUpperCase())),
        subtype: formData.subtype || getDefaultSubtype(actionType),
        fromDate: fromDate,
        toDate: formData.endTime || null,
        unit: null,
        amount: null,
        category: null,
        details: ""
      };

      // Set unit, amount, and category based on activity type
      if (actionType === "feeding" && formData.subtype === "BOTTLE") {
        // Only bottle feeding should have unit/amount/category
        activityData.unit = formData.unit === "ML" ? "MILLILITRES" : (formData.unit === "OZ" ? "OUNCES" : "MILLILITRES");
        activityData.amount = formData.amount ? parseFloat(formData.amount) : null;
        activityData.category = formData.category || "FORMULA";
      } else if (actionType === "growth") {
        // Growth activities have measurements
        activityData.unit = formData.subtype === "GROWTH_WEIGHT" ? "KILOGRAMS" : "CENTIMETERS";
        activityData.amount = formData.amount ? parseFloat(formData.amount) : null;
        activityData.category = "NONE";
      } else if (actionType === "health" && formData.subtype === "HEALTH_TEMPERATURE") {
        // Only temperature measurements have unit/amount
        activityData.unit = "CELSIUS";
        activityData.amount = formData.amount ? parseFloat(formData.amount) : null;
        activityData.category = "NONE";
      } else {
        // All other activities (diapering, medication, sleeping, leisure, etc.) should not have unit/amount/category
        activityData.unit = null;
        activityData.amount = null;
        activityData.category = null;
      }

      // Handle details - just use the details as entered (category is handled separately)
      activityData.details = formData.details || "";

      // 🚀 LOCAL-FIRST APPROACH: Store immediately to local storage
      console.log('💾 About to store activity locally:', activityData);
      const localActivity = storeActivityLocally(activityData);
      console.log('✅ Stored activity locally:', localActivity?.id);
      
      // Immediate UI feedback - user sees instant response
      setFloatingMessage("✅ Activity saved!");
      setTimeout(() => setFloatingMessage(""), 2000);
      setIsDialogOpen(false);
      console.log('🔄 Calling onActivityAdded callback');
      if (onActivityAdded) onActivityAdded();
      
      // 🔄 BACKGROUND SYNC: Schedule background synchronization
      if (isOnline()) {
        try {
          const { getSyncService } = await import('@/lib/sync-service');
          const syncService = getSyncService();
          syncService.scheduleSync(localActivity.id);
        } catch (syncError) {
          console.warn('Background sync scheduling failed:', syncError);
          // Activity is still saved locally, will sync later when connection is available
        }
      } else {
        // Show offline indicator
        setTimeout(() => {
          setFloatingMessage("📵 Saved offline - will sync when online");
          setTimeout(() => setFloatingMessage(""), 2000);
        }, 2100);
      }
      
    } catch (error) {
      console.error('❌ Error in handleSubmit:', error);
      setFloatingMessage("❌ Failed to save activity");
      setTimeout(() => setFloatingMessage(""), 3000);
      setIsDialogOpen(false);
    } finally {
      console.log('🏁 handleSubmit finally block, setting saving to false');
      setSaving(false);
    }
  };

  const getDefaultSubtype = (actionId) => {
    switch (actionId) {
      case "feeding": return "BOTTLE";
      case "sleeping": return "NONE";
      case "diapering": return "PEE";
      case "growth": return "GROWTH_WEIGHT";
      case "health": return "HEALTH_MEDICATIONS";
      default: return "";
    }
  };

  const renderDialogContent = () => {
    if (!selectedAction) return null;

    const actionType = selectedAction.type || selectedAction.id;

    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Time Input - hidden for feeding activities (bottle, meal, breastfeeding), diaper activities, growth activities, health activities, and leisure activities as they use save time */}
        {!(actionType === "feeding" && (formData.subtype === "BOTTLE" || formData.subtype === "MEAL" || formData.subtype === "LEFT_BREAST" || formData.subtype === "RIGHT_BREAST")) && actionType !== "diapering" && actionType !== "growth" && actionType !== "health" && actionType !== "leisure" && (
          <div>
            <Label htmlFor="time">Time</Label>
            <Input
              id="time"
              type="datetime-local"
              value={formData.time}
              onChange={(e) => handleInputChange("time", e.target.value)}
              required
            />
          </div>
        )}

        {/* Note for feeding activities */}
        {actionType === "feeding" && (formData.subtype === "BOTTLE" || formData.subtype === "MEAL" || formData.subtype === "LEFT_BREAST" || formData.subtype === "RIGHT_BREAST") && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-700">
              ⏰ {formData.subtype === "BOTTLE" ? "Bottle feeding" : 
                   formData.subtype === "MEAL" ? "Meal" : 
                   "Breastfeeding"} time will be recorded when you {formData.subtype === "MEAL" ? "save" : "start"}
            </p>
          </div>
        )}

        {/* Note for diaper activities */}
        {actionType === "diapering" && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-sm text-green-700">
              ⏰ Diaper change time will be recorded when you save
            </p>
          </div>
        )}

        {/* Note for growth activities */}
        {actionType === "growth" && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-700">
              ⏰ Growth measurement time will be recorded when you save
            </p>
          </div>
        )}

        {/* Note for health activities */}
        {actionType === "health" && (formData.subtype === "HEALTH_MEDICATIONS" || formData.subtype === "HEALTH_VACCINATIONS") && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-700">
              ⏰ {formData.subtype === "HEALTH_MEDICATIONS" ? "Medication" : "Vaccination"} time will be recorded when you save
            </p>
          </div>
        )}

        {/* Type-specific inputs */}
        {actionType === "feeding" && (
          <>
            <div>
              <Label htmlFor="subtype">Feeding Type</Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <Button
                  type="button"
                  variant={formData.subtype === "BOTTLE" ? "default" : "outline"}
                  onClick={() => handleInputChange("subtype", "BOTTLE")}
                  className="text-xs"
                >
                  🍼 Bottle
                </Button>
                <Button
                  type="button"
                  variant={formData.subtype === "MEAL" ? "default" : "outline"}
                  onClick={() => handleInputChange("subtype", "MEAL")}
                  className="text-xs"
                >
                  🥄 Meal
                </Button>
                <Button
                  type="button"
                  variant={formData.subtype === "LEFT_BREAST" ? "default" : "outline"}
                  onClick={() => handleInputChange("subtype", "LEFT_BREAST")}
                  className="text-xs"
                >
                  🤱 Left
                </Button>
                <Button
                  type="button"
                  variant={formData.subtype === "RIGHT_BREAST" ? "default" : "outline"}
                  onClick={() => handleInputChange("subtype", "RIGHT_BREAST")}
                  className="text-xs"
                >
                  🤱 Right
                </Button>
              </div>
            </div>

            {/* Bottle-specific inputs */}
            {formData.subtype === "BOTTLE" && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="amount">Amount</Label>
                    <Input
                      id="amount"
                      type="number"
                      value={formData.amount}
                      onChange={(e) => handleInputChange("amount", e.target.value)}
                      placeholder="Enter amount"
                    />
                  </div>
                  <div>
                    <Label htmlFor="unit">Unit</Label>
                    <div className="grid grid-cols-2 gap-1 mt-1">
                      <Button
                        type="button"
                        size="sm"
                        variant={formData.unit === "ML" ? "default" : "outline"}
                        onClick={() => handleInputChange("unit", "ML")}
                        className="text-xs"
                      >
                        ML
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={formData.unit === "OZ" ? "default" : "outline"}
                        onClick={() => handleInputChange("unit", "OZ")}
                        className="text-xs"
                      >
                        OZ
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="category">Category</Label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <Button
                      type="button"
                      variant={formData.category === "FORMULA" ? "default" : "outline"}
                      onClick={() => handleInputChange("category", "FORMULA")}
                      className="text-xs"
                    >
                      🍼 Formula
                    </Button>
                    <Button
                      type="button"
                      variant={formData.category === "BREAST_MILK" ? "default" : "outline"}
                      onClick={() => handleInputChange("category", "BREAST_MILK")}
                      className="text-xs"
                    >
                      🤱 Breast Milk
                    </Button>
                  </div>
                </div>

              </>
            )}

            {/* Breast feeding inputs (left/right) - only notes needed, finish button will handle end time */}

            {/* Details for all feeding types */}
            <div>
              <Label htmlFor="details">
                {formData.subtype === "MEAL" ? "Meal Details" : "Notes (optional)"}
              </Label>
              <Input
                id="details"
                value={formData.details}
                onChange={(e) => handleInputChange("details", e.target.value)}
                placeholder={
                  formData.subtype === "MEAL" 
                    ? "What did baby eat?" 
                    : "Add any notes..."
                }
required={false}
              />
            </div>
          </>
        )}


        {actionType === "diapering" && (
          <>
            <div>
              <Label htmlFor="subtype">Diaper Type</Label>
              <div className="grid grid-cols-3 gap-2 mt-1">
                <Button
                  type="button"
                  variant={formData.subtype === "PEE" ? "default" : "outline"}
                  onClick={() => handleInputChange("subtype", "PEE")}
                >
                  💧 Pee
                </Button>
                <Button
                  type="button"
                  variant={formData.subtype === "POO" ? "default" : "outline"}
                  onClick={() => handleInputChange("subtype", "POO")}
                >
                  💩 Poo
                </Button>
                <Button
                  type="button"
                  variant={formData.subtype === "PEEPOO" ? "default" : "outline"}
                  onClick={() => handleInputChange("subtype", "PEEPOO")}
                >
                  🌊 Both
                </Button>
              </div>
            </div>
            <div>
              <Label htmlFor="details">Notes (optional)</Label>
              <Input
                id="details"
                value={formData.details}
                onChange={(e) => handleInputChange("details", e.target.value)}
                placeholder="Add any notes..."
              />
            </div>
          </>
        )}

        {actionType === "growth" && (
          <>
            <div>
              <Label htmlFor="subtype">Growth Type</Label>
              <div className="grid grid-cols-3 gap-2 mt-1">
                <Button
                  type="button"
                  variant={formData.subtype === "GROWTH_WEIGHT" ? "default" : "outline"}
                  onClick={() => handleInputChange("subtype", "GROWTH_WEIGHT")}
                  className="text-xs"
                >
                  ⚖️ Weight
                </Button>
                <Button
                  type="button"
                  variant={formData.subtype === "GROWTH_HEIGHT" ? "default" : "outline"}
                  onClick={() => handleInputChange("subtype", "GROWTH_HEIGHT")}
                  className="text-xs"
                >
                  📏 Height
                </Button>
                <Button
                  type="button"
                  variant={formData.subtype === "GROWTH_HEAD" ? "default" : "outline"}
                  onClick={() => handleInputChange("subtype", "GROWTH_HEAD")}
                  className="text-xs"
                >
                  🧠 Head
                </Button>
              </div>
            </div>

            {/* Weight measurement */}
            {formData.subtype === "GROWTH_WEIGHT" && (
              <div>
                <Label htmlFor="amount">Weight (kg)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => handleInputChange("amount", e.target.value)}
                  placeholder="e.g. 3.5"
                  required
                />
              </div>
            )}

            {/* Height measurement */}
            {formData.subtype === "GROWTH_HEIGHT" && (
              <div>
                <Label htmlFor="amount">Height (cm)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.1"
                  value={formData.amount}
                  onChange={(e) => handleInputChange("amount", e.target.value)}
                  placeholder="e.g. 52.3"
                  required
                />
              </div>
            )}

            {/* Head circumference measurement */}
            {formData.subtype === "GROWTH_HEAD" && (
              <div>
                <Label htmlFor="amount">Head Circumference (cm)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.1"
                  value={formData.amount}
                  onChange={(e) => handleInputChange("amount", e.target.value)}
                  placeholder="e.g. 35.2"
                  required
                />
              </div>
            )}

            <div>
              <Label htmlFor="details">Notes (optional)</Label>
              <Input
                id="details"
                value={formData.details}
                onChange={(e) => handleInputChange("details", e.target.value)}
                placeholder="Add any notes..."
              />
            </div>
          </>
        )}

        {actionType === "health" && (
          <>
            <div>
              <Label htmlFor="subtype">Health Type</Label>
              <div className="grid grid-cols-3 gap-2 mt-1">
                <Button
                  type="button"
                  variant={formData.subtype === "HEALTH_MEDICATIONS" ? "default" : "outline"}
                  onClick={() => handleInputChange("subtype", "HEALTH_MEDICATIONS")}
                  className="text-xs"
                >
                  💊 Medication
                </Button>
                <Button
                  type="button"
                  variant={formData.subtype === "HEALTH_TEMPERATURE" ? "default" : "outline"}
                  onClick={() => handleInputChange("subtype", "HEALTH_TEMPERATURE")}
                  className="text-xs"
                >
                  🌡️ Temperature
                </Button>
                <Button
                  type="button"
                  variant={formData.subtype === "HEALTH_VACCINATIONS" ? "default" : "outline"}
                  onClick={() => handleInputChange("subtype", "HEALTH_VACCINATIONS")}
                  className="text-xs"
                >
                  💉 Vaccination
                </Button>
              </div>
            </div>

            {/* Temperature measurement */}
            {formData.subtype === "HEALTH_TEMPERATURE" && (
              <div>
                <Label htmlFor="amount">Temperature (°C)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.1"
                  value={formData.amount}
                  onChange={(e) => handleInputChange("amount", e.target.value)}
                  placeholder="e.g. 37.5"
                  required
                />
              </div>
            )}

            <div>
              <Label htmlFor="details">Notes (optional)</Label>
              <Input
                id="details"
                value={formData.details}
                onChange={(e) => handleInputChange("details", e.target.value)}
                placeholder="Add any notes..."
              />
            </div>
          </>
        )}

        {actionType === "leisure" && (
          <>
            <div>
              <Label htmlFor="subtype">Leisure Type</Label>
              <div className="grid grid-cols-3 gap-2 mt-1">
                <Button
                  type="button"
                  variant={formData.subtype === "LEISURE_TUMMY" ? "default" : "outline"}
                  onClick={() => handleInputChange("subtype", "LEISURE_TUMMY")}
                  className="text-xs"
                >
                  🥰 Tummy Time
                </Button>
                <Button
                  type="button"
                  variant={formData.subtype === "LEISURE_BATH" ? "default" : "outline"}
                  onClick={() => handleInputChange("subtype", "LEISURE_BATH")}
                  className="text-xs"
                >
                  🛁 Bath
                </Button>
                <Button
                  type="button"
                  variant={formData.subtype === "LEISURE_WALK" ? "default" : "outline"}
                  onClick={() => handleInputChange("subtype", "LEISURE_WALK")}
                  className="text-xs"
                >
                  🚶 Walk
                </Button>
              </div>
            </div>

            {/* Note for leisure activities */}
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <p className="text-sm text-orange-700">
                ⏰ {formData.subtype === "LEISURE_TUMMY" ? "Tummy time" : 
                     formData.subtype === "LEISURE_BATH" ? "Bath" : 
                     "Walk"} start time will be recorded when you start
              </p>
            </div>

            <div>
              <Label htmlFor="details">Notes (optional)</Label>
              <Input
                id="details"
                value={formData.details}
                onChange={(e) => handleInputChange("details", e.target.value)}
                placeholder="Add any notes..."
              />
            </div>
          </>
        )}


        {/* Submit Button */}
        <div className="flex gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsDialogOpen(false)}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button type="submit" disabled={saving} className="flex-1">
            {saving ? "Saving..." : 
             (actionType === "feeding" && (formData.subtype === "BOTTLE" || formData.subtype === "LEFT_BREAST" || formData.subtype === "RIGHT_BREAST")) ? "Start" : "Save"}
          </Button>
        </div>

      </form>
    );
  };

  return (
    <>
      <div className="w-full">
        <div className="pb-0 pt-2 px-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl flex items-center font-semibold">
              <span className="mr-2">⚡</span>
              Quick Actions
            </h2>
            
            {/* All Actions Dropdown */}
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAllActionsDropdown(!showAllActionsDropdown)}
                className="text-xs px-2 py-1 h-auto"
              >
                All Actions ▼
              </Button>

              {showAllActionsDropdown && (
                <>
                  {/* Backdrop */}
                  <div 
                    className="fixed inset-0 z-30" 
                    onClick={() => setShowAllActionsDropdown(false)}
                  ></div>
                  
                  {/* Dropdown Menu */}
                  <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-40">
                    <div className="py-1">
                      {allActions.map((action) => (
                        <button
                          key={action.id}
                          onClick={() => {
                            handleActionClick(action);
                            setShowAllActionsDropdown(false);
                          }}
                          className="flex items-center w-full px-3 py-2 text-sm font-normal text-left text-gray-700 hover:bg-gray-100 transition-colors"
                          style={{ 
                            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                            fontWeight: 'normal',
                            fontStyle: 'normal'
                          }}
                        >
                          <span className="mr-2 text-base">{action.icon}</span>
                          {action.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="pt-2 px-2 pb-2">
          <div className="overflow-x-auto scrollbar-hide">
            <div className="flex gap-2 pb-2 w-max">
              {quickActions
                .filter(action => {
                  // For new subtype-based actions, check the action.id (e.g., 'feeding-bottle')
                  // For old type-based actions, check action.type or action.id
                  return quickActionsSettings?.[action.id] !== false;
                })
                .slice(0, 5)
                .map((action) => (
                  <button
                    key={action.id}
                    onClick={() => handleActionClick(action)}
                    className={`
                      flex-shrink-0 p-3 sm:p-2 rounded-lg border-2 transition-all duration-200 
                      ${action.color} ${action.borderColor}
                      hover:scale-105 active:scale-95
                      focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                      flex flex-col items-center 
                      w-[70px] sm:w-[80px]
                      min-h-[80px] sm:min-h-[70px]
                      tap-target
                    `}
                  >
                    <div className="text-2xl mb-1">{action.icon}</div>
                    <div className="text-xs font-medium text-center leading-tight">{action.label}</div>
                  </button>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Message */}
      {floatingMessage && (
        <div className="fixed top-24 right-4 z-50">
          <div className={`text-sm p-3 rounded-md shadow-lg ${
            floatingMessage.includes("❌") 
              ? "bg-red-50 text-red-700 border border-red-200" 
              : floatingMessage.includes("📵")
              ? "bg-yellow-50 text-yellow-700 border border-yellow-200"
              : "bg-green-50 text-green-700 border border-green-200"
          }`}>
            {floatingMessage}
          </div>
        </div>
      )}

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <span className="text-2xl mr-2">{selectedAction?.icon}</span>
              Record {selectedAction?.label}
            </DialogTitle>
          </DialogHeader>
          {renderDialogContent()}
        </DialogContent>
      </Dialog>
    </>
  );
}
