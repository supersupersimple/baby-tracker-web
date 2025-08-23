"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { manualSyncActivities, isOnline } from "@/lib/offline-storage";
import { CompactSyncStatus } from "@/components/SyncStatusIndicator";
import { BatchSyncButton } from "@/components/BatchSyncButton";
import { initSyncService, getSyncService } from "@/lib/sync-service";

export function AppHeader({ selectedBaby, onBabyChange }) {
  const { data: session } = useSession();
  const [babies, setBabies] = useState([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showBatchSyncDialog, setShowBatchSyncDialog] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [clearingAndResyncing, setClearingAndResyncing] = useState(false);
  const [message, setMessage] = useState("");
  const [sharedUsers, setSharedUsers] = useState([]);
  const [quickActionsSettings, setQuickActionsSettings] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('quickActionsSettings');
      return saved ? JSON.parse(saved) : {
        feeding: true,
        sleeping: true,
        diapering: true,
        growth: true,
        health: true,
        leisure: true
      };
    }
    return {
      feeding: true,
      sleeping: true,
      diapering: true,
      growth: true,
      health: true,
      leisure: true
    };
  });
  const [formData, setFormData] = useState({
    babyName: "",
    gender: "GIRL",
    birthday: new Date(),
    description: "",
    shareEmail: "",
    shareRole: "EDITOR"
  });

  // 🔥 NEW: Initialize sync service on component mount
  useEffect(() => {
    // Initialize sync service for background synchronization
    initSyncService();
    
    if (session) {
      fetchUserBabies();
    }
  }, [session]);

  const fetchUserBabies = async () => {
    try {
      const response = await fetch('/api/user/babies');
      const result = await response.json();
      if (result.success) {
        setBabies(result.data);
        // Auto-select first baby if none selected
        if (result.data.length > 0 && !selectedBaby) {
          onBabyChange(result.data[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching babies:', error);
    }
  };

  const handleCreateBaby = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/babies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          birthday: formData.birthday.toISOString()
        }),
      });

      const result = await response.json();
      if (result.success) {
        await fetchUserBabies();
        setShowCreateDialog(false);
        setFormData({
          babyName: "",
          gender: "GIRL", 
          birthday: new Date(),
          description: "",
          shareEmail: "",
          shareRole: "EDITOR"
        });
        onBabyChange(result.data);
      } else {
        console.error('Failed to create baby:', result.error);
      }
    } catch (error) {
      console.error('Error creating baby:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSharedUsers = async (babyId) => {
    try {
      const response = await fetch(`/api/babies/share?babyId=${babyId}`);
      const result = await response.json();
      if (result.success) {
        setSharedUsers(result.data.sharedUsers);
      }
    } catch (error) {
      console.error('Error fetching shared users:', error);
    }
  };

  const handleShareBaby = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/babies/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          babyId: selectedBaby.id,
          email: formData.shareEmail,
          role: formData.shareRole
        }),
      });

      const result = await response.json();
      if (result.success) {
        setFormData({ ...formData, shareEmail: "" });
        await fetchSharedUsers(selectedBaby.id);
      } else {
        console.error('Failed to share baby:', result.error);
      }
    } catch (error) {
      console.error('Error sharing baby:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnshare = async (accessId, email) => {
    if (!confirm(`Remove access for ${email}?`)) return;

    try {
      const response = await fetch('/api/babies/unshare', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessId }),
      });

      const result = await response.json();
      if (result.success) {
        await fetchSharedUsers(selectedBaby.id);
      } else {
        console.error('Failed to remove access:', result.error);
      }
    } catch (error) {
      console.error('Error removing access:', error);
    }
  };

  const handleEditBaby = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`/api/babies/${selectedBaby.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          babyName: formData.babyName,
          gender: formData.gender,
          birthday: formData.birthday.toISOString(),
          description: formData.description
        }),
      });

      const result = await response.json();
      if (result.success) {
        await fetchUserBabies();
        setShowEditDialog(false);
        onBabyChange(result.data);
      } else {
        console.error('Failed to update baby:', result.error);
      }
    } catch (error) {
      console.error('Error updating baby:', error);
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = () => {
    if (selectedBaby) {
      setFormData({
        babyName: selectedBaby.babyName,
        gender: selectedBaby.gender,
        birthday: new Date(selectedBaby.birthday),
        description: selectedBaby.description || "",
        shareEmail: "",
        shareRole: "EDITOR"
      });
      setShowEditDialog(true);
      setShowMenu(false);
    }
  };

  const openShareDialog = async () => {
    if (selectedBaby && selectedBaby.isOwner) {
      await fetchSharedUsers(selectedBaby.id);
      setShowShareDialog(true);
      setShowMenu(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.abt') && !file.name.endsWith('.json')) {
      setMessage("Error: Please select an .abt or .json file");
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
    setShowMenu(false);

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
        setMessage(`✅ Imported ${result.imported} activities!`);
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setMessage(`❌ Import failed: ${result.error}`);
        setTimeout(() => setMessage(""), 5000);
      }
    } catch (error) {
      console.error('Import error:', error);
      setMessage(`❌ Failed to import: ${error.message}`);
      setTimeout(() => setMessage(""), 5000);
    } finally {
      setImporting(false);
      event.target.value = '';
    }
  };

  const handleExportData = async () => {
    if (!selectedBaby) {
      setMessage("❌ Please select a baby first");
      setTimeout(() => setMessage(""), 3000);
      return;
    }

    setMessage("📤 Preparing export...");
    setShowMenu(false);

    try {
      const response = await fetch(`/api/export?babyId=${selectedBaby.id}`);
      
      if (response.ok) {
        const contentDisposition = response.headers.get('content-disposition');
        const filename = contentDisposition 
          ? contentDisposition.split('filename=')[1].replace(/"/g, '')
          : `baby-tracker-export-${new Date().toISOString().split('T')[0]}.json`;

        const blob = await response.blob();
        
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

  const handleQuickActionsSettingsChange = (actionId, enabled) => {
    const newSettings = {
      ...quickActionsSettings,
      [actionId]: enabled
    };
    setQuickActionsSettings(newSettings);
    localStorage.setItem('quickActionsSettings', JSON.stringify(newSettings));
    
    // Trigger custom event to notify other components
    window.dispatchEvent(new CustomEvent('quickActionsSettingsChanged', { 
      detail: newSettings 
    }));
  };

  const openSettingsDialog = () => {
    setShowSettingsDialog(true);
    setShowMenu(false);
  };

  const handleManualSync = async () => {
    if (!isOnline()) {
      setMessage("❌ Cannot sync while offline");
      setTimeout(() => setMessage(""), 5000);
      return;
    }

    if (!selectedBaby) {
      setMessage("❌ Please select a baby first");
      setTimeout(() => setMessage(""), 5000);
      return;
    }

    setSyncing(true);
    setMessage("🔄 Syncing activities...");
    setShowMenu(false);

    try {
      const results = await manualSyncActivities(selectedBaby);
      
      let message = "✅ Sync completed: ";
      const parts = [];
      if (results.localToRemote > 0) parts.push(`${results.localToRemote} pushed to remote`);
      if (results.remoteToLocal > 0) parts.push(`${results.remoteToLocal} pulled from remote`);
      if (results.conflicts > 0) parts.push(`${results.conflicts} conflicts resolved`);
      if (parts.length === 0) parts.push("everything up to date");
      
      message += parts.join(", ");
      
      if (results.errors.length > 0) {
        message += ` (${results.errors.length} errors)`;
        console.error("Sync errors:", results.errors);
      }
      
      setMessage(message);
      
      // Trigger a refresh of the activities list
      window.location.reload();
      
    } catch (error) {
      console.error('Manual sync failed:', error);
      setMessage("❌ Sync failed: " + error.message);
    } finally {
      setSyncing(false);
      setTimeout(() => setMessage(""), 10000);
    }
  };

  const handleClearAndResync = async () => {
    if (!isOnline()) {
      setMessage("❌ Cannot clear and resync while offline");
      setTimeout(() => setMessage(""), 5000);
      return;
    }

    if (!selectedBaby) {
      setMessage("❌ Please select a baby first");
      setTimeout(() => setMessage(""), 5000);
      return;
    }

    // Confirmation dialog
    const confirmed = window.confirm(
      `⚠️ Clear Local Data & Re-sync\n\n` +
      `This will:\n` +
      `• Delete all local activity data\n` +
      `• Download fresh data from server\n` +
      `• Resolve any sync conflicts\n\n` +
      `Are you sure you want to continue?`
    );

    if (!confirmed) {
      return;
    }

    setClearingAndResyncing(true);
    setMessage("🧹 Clearing local data and re-syncing from server...");
    setShowMenu(false);

    try {
      const syncService = getSyncService();
      const result = await syncService.clearLocalAndResync(selectedBaby.id);
      
      if (result.success) {
        setMessage(`✅ ${result.message}`);
        
        // Trigger a refresh after a short delay
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        setMessage("❌ Clear and resync failed");
      }
      
    } catch (error) {
      console.error('Clear and resync failed:', error);
      setMessage(`❌ Clear and resync failed: ${error.message}`);
    } finally {
      setClearingAndResyncing(false);
      setTimeout(() => setMessage(""), 10000);
    }
  };

  if (!session) {
    return (
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-bold text-gray-900">
              Baby Tracker
            </h1>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <>
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex-shrink-0">
              <h1 className="text-xl font-bold text-gray-900">
                Baby Tracker
              </h1>
            </div>

            {/* Baby Selector - Center */}
            <div className="flex-1 max-w-xs sm:max-w-sm mx-2 sm:mx-8">
              {babies.length > 0 ? (
                <select
                  value={selectedBaby?.id || ""}
                  onChange={(e) => {
                    const baby = babies.find(b => b.id === parseInt(e.target.value));
                    onBabyChange(baby);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-base bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {babies.map((baby) => (
                    <option key={baby.id} value={baby.id}>
                      {baby.babyName} ({baby.isOwner ? "Owner" : baby.role})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="text-center text-gray-500 text-base">
                  No babies found
                </div>
              )}
            </div>

            {/* Right Menu */}
            <div className="flex items-center space-x-3">
              {/* 🔥 NEW: Compact sync status in header */}
              <CompactSyncStatus />
              
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowMenu(!showMenu)}
                  className="flex items-center gap-2"
                >
                  {session.user?.image ? (
                    <img
                      src={session.user.image}
                      alt={session.user.name || "User"}
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                      <span className="text-gray-600 text-sm">
                        {session.user?.name?.[0] || session.user?.email?.[0] || 'U'}
                      </span>
                    </div>
                  )}
                  <svg className={`w-4 h-4 transition-transform ${showMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </Button>

                {showMenu && (
                  <>
                    {/* Backdrop */}
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowMenu(false)}
                    ></div>
                    
                    {/* Menu Items */}
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                      <div className="py-1">
                        <div className="px-4 py-2 text-xs text-gray-500 border-b border-gray-100">
                          {session.user?.name || session.user?.email}
                        </div>
                        
                        <button
                          onClick={() => {
                            setShowCreateDialog(true);
                            setShowMenu(false);
                          }}
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <span className="mr-2">➕</span>
                          New Baby
                        </button>

                        {selectedBaby?.isOwner && (
                          <button
                            onClick={openShareDialog}
                            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            <span className="mr-2">👥</span>
                            Share Baby
                          </button>
                        )}

                        {selectedBaby?.isOwner && (
                          <button
                            onClick={openEditDialog}
                            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            <span className="mr-2">✏️</span>
                            Edit Baby
                          </button>
                        )}

                        <div className="border-t border-gray-100 my-1"></div>

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

                        {/* Manual Sync */}
                        <button
                          onClick={handleManualSync}
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          disabled={syncing || !selectedBaby}
                        >
                          <span className="mr-2">{syncing ? '🔄' : '🔄'}</span>
                          {syncing ? 'Syncing...' : 'Manual Sync'}
                        </button>

                        {/* Clear Local & Re-sync */}
                        <button
                          onClick={handleClearAndResync}
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          disabled={clearingAndResyncing || !selectedBaby || !isOnline()}
                        >
                          <span className="mr-2">{clearingAndResyncing ? '🧹' : '🗑️'}</span>
                          {clearingAndResyncing ? 'Clearing & Re-syncing...' : 'Clear Local & Re-sync'}
                        </button>

                        <div className="border-t border-gray-100 my-1"></div>

                        <button
                          onClick={() => {
                            setShowBatchSyncDialog(true);
                            setShowMenu(false);
                          }}
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <span className="mr-2">🔄</span>
                          Sync Activities
                        </button>
                        
                        <button
                          onClick={openSettingsDialog}
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <span className="mr-2">⚙️</span>
                          Settings
                        </button>

                        <button
                          onClick={() => {
                            setShowMenu(false);
                            window.location.href = '/api/auth/signout';
                          }}
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <span className="mr-2">🚪</span>
                          Sign Out
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Create Baby Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Baby</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateBaby} className="space-y-4">
            <div>
              <Label htmlFor="babyName">Baby Name</Label>
              <Input
                id="babyName"
                value={formData.babyName}
                onChange={(e) => setFormData(prev => ({ ...prev, babyName: e.target.value }))}
                placeholder="Enter baby's name"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="gender">Gender</Label>
              <select
                id="gender"
                value={formData.gender}
                onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value }))}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="GIRL">Girl</option>
                <option value="BOY">Boy</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            
            <div>
              <Label htmlFor="birthday">Birthday</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.birthday ? (
                      format(formData.birthday, "MMM d, yyyy")
                    ) : (
                      <span>Select birthday</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.birthday}
                    onSelect={(date) => setFormData(prev => ({ ...prev, birthday: date }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div>
              <Label htmlFor="description">Description (optional)</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Any additional info..."
              />
            </div>
            
            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? "Creating..." : "Create Baby"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Share Baby Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Share {selectedBaby?.babyName}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Share with new user */}
            <form onSubmit={handleShareBaby} className="space-y-4">
              <div>
                <Label htmlFor="shareEmail">Email Address</Label>
                <Input
                  id="shareEmail"
                  type="email"
                  value={formData.shareEmail}
                  onChange={(e) => setFormData(prev => ({ ...prev, shareEmail: e.target.value }))}
                  placeholder="Enter email address..."
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="shareRole">Permission Level</Label>
                <select
                  id="shareRole"
                  value={formData.shareRole}
                  onChange={(e) => setFormData(prev => ({ ...prev, shareRole: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="VIEWER">Viewer (View only)</option>
                  <option value="EDITOR">Editor (View and edit)</option>
                </select>
              </div>
              
              <div className="flex gap-2">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? "Sharing..." : "Share Access"}
                </Button>
              </div>
            </form>
            
            {/* Current shared users */}
            {sharedUsers.length > 0 && (
              <div>
                <h4 className="font-medium mb-3">Shared with:</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {sharedUsers.map((user) => (
                    <div key={user.accessId} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div>
                        <div className="font-medium">{user.name || user.email}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                        <div className="text-xs text-gray-400">{user.role.toLowerCase()}</div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUnshare(user.accessId, user.email)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowShareDialog(false)}
                className="flex-1"
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Baby Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit {selectedBaby?.babyName}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditBaby} className="space-y-4">
            <div>
              <Label htmlFor="editBabyName">Baby Name</Label>
              <Input
                id="editBabyName"
                value={formData.babyName}
                onChange={(e) => setFormData(prev => ({ ...prev, babyName: e.target.value }))}
                placeholder="Enter baby's name"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="editGender">Gender</Label>
              <select
                id="editGender"
                value={formData.gender}
                onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value }))}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="GIRL">Girl</option>
                <option value="BOY">Boy</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            
            <div>
              <Label htmlFor="editBirthday">Birthday</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.birthday ? (
                      format(formData.birthday, "MMM d, yyyy")
                    ) : (
                      <span>Select birthday</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.birthday}
                    onSelect={(date) => setFormData(prev => ({ ...prev, birthday: date }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div>
              <Label htmlFor="editDescription">Description (optional)</Label>
              <Input
                id="editDescription"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Any additional info..."
              />
            </div>
            
            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowEditDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? "Updating..." : "Update Baby"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">Quick Actions Visibility</h3>
              <p className="text-xs text-gray-500 mb-4">Choose which quick action buttons to show on the home page:</p>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🍼</span>
                    <span className="text-sm">Feeding</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={quickActionsSettings.feeding}
                    onChange={(e) => handleQuickActionsSettingsChange('feeding', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">😴</span>
                    <span className="text-sm">Sleep</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={quickActionsSettings.sleeping}
                    onChange={(e) => handleQuickActionsSettingsChange('sleeping', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">👶</span>
                    <span className="text-sm">Diaper</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={quickActionsSettings.diapering}
                    onChange={(e) => handleQuickActionsSettingsChange('diapering', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📏</span>
                    <span className="text-sm">Growth</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={quickActionsSettings.growth}
                    onChange={(e) => handleQuickActionsSettingsChange('growth', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🏥</span>
                    <span className="text-sm">Health</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={quickActionsSettings.health}
                    onChange={(e) => handleQuickActionsSettingsChange('health', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🎉</span>
                    <span className="text-sm">Leisure</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={quickActionsSettings.leisure}
                    onChange={(e) => handleQuickActionsSettingsChange('leisure', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowSettingsDialog(false)}
                className="flex-1"
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 🔥 NEW: Batch Sync Dialog */}
      <Dialog open={showBatchSyncDialog} onOpenChange={setShowBatchSyncDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sync Activities</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="text-sm text-gray-600">
              Synchronize your local activities with the server. This will upload any pending activities and download any new activities from other users.
            </div>
            
            <BatchSyncButton 
              className="w-full"
              onSyncComplete={() => {
                // Optionally close dialog after successful sync
                // setShowBatchSyncDialog(false);
              }}
            />
            
            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowBatchSyncDialog(false)}
                className="flex-1"
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Status Message */}
      {message && (
        <div className="fixed top-20 right-4 z-50">
          <div className={`text-sm p-3 rounded-md shadow-lg ${
            message.includes("❌") 
              ? "bg-red-50 text-red-700 border border-red-200" 
              : message.includes("🚧") || message.includes("⚙️")
              ? "bg-yellow-50 text-yellow-700 border border-yellow-200"
              : "bg-green-50 text-green-700 border border-green-200"
          }`}>
            {message}
          </div>
        </div>
      )}
    </>
  );
}