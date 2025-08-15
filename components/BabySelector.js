"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";

export function BabySelector({ selectedBaby, onBabyChange }) {
  const { data: session } = useSession();
  const [babies, setBabies] = useState([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sharedUsers, setSharedUsers] = useState([]);
  const [formData, setFormData] = useState({
    babyName: "",
    gender: "GIRL",
    birthday: new Date(),
    description: "",
    shareEmail: "",
    shareRole: "EDITOR"
  });

  useEffect(() => {
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
        alert('Failed to create baby: ' + result.error);
      }
    } catch (error) {
      console.error('Error creating baby:', error);
      alert('Failed to create baby');
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

  const openShareDialog = async () => {
    if (selectedBaby && selectedBaby.isOwner) {
      await fetchSharedUsers(selectedBaby.id);
      setShowShareDialog(true);
    }
  };

  if (!session) {
    return null;
  }

  return (
    <>
      <div className="flex items-center gap-2 mb-4 p-3 bg-gray-50 rounded-lg">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Select Baby:
          </label>
          <select
            value={selectedBaby?.id || ""}
            onChange={(e) => {
              const baby = babies.find(b => b.id === parseInt(e.target.value));
              onBabyChange(baby);
            }}
            className="w-full p-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="">Select a baby...</option>
            {babies.map((baby) => (
              <option key={baby.id} value={baby.id}>
                {baby.babyName} ({baby.isOwner ? "Owner" : "Shared"})
              </option>
            ))}
          </select>
        </div>
        
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => setShowCreateDialog(true)}
            className="text-xs"
          >
            + New Baby
          </Button>
          {selectedBaby?.isOwner && (
            <Button
              size="sm"
              variant="outline"
              onClick={openShareDialog}
              className="text-xs"
            >
              Share Baby
            </Button>
          )}
        </div>
      </div>

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
              <DatePicker
                value={formData.birthday}
                onChange={(date) => setFormData(prev => ({ ...prev, birthday: date }))}
                placeholder="Select birthday"
                className="w-full"
              />
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
    </>
  );
}