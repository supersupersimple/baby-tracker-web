# Mobile Layout Fixes for Baby Tracker

## Issue 1: Baby Selector Too Narrow on Mobile

**Problem**: The baby selector is constrained to 200px on mobile, causing text truncation and cramped appearance.

**File**: `/home/bobo/projects/baby-tracker-web/components/AppHeader.js` (line 500)

**Current Code**:
```jsx
<div className="flex-1 min-w-0 max-w-[200px] sm:max-w-xs mx-2 sm:mx-4">
```

**Recommended Fix**:
```jsx
<div className="flex-1 min-w-0 max-w-[240px] sm:max-w-xs mx-1 sm:mx-4">
```

**Changes**:
- Increased mobile max-width from 200px to 240px
- Reduced horizontal margin from 8px (mx-2) to 4px (mx-1) on mobile to create more space

---

## Issue 2: User Profile Dropdown Too Wide on Mobile

**Problem**: The dropdown menu uses `w-72` (288px) which is too wide for small mobile screens.

**File**: `/home/bobo/projects/baby-tracker-web/components/AppHeader.js` (line 548)

**Current Code**:
```jsx
<div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden max-w-[calc(100vw-1rem)]">
```

**Recommended Fix**:
```jsx
<div className="absolute right-0 mt-2 w-64 sm:w-72 lg:w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden max-w-[calc(100vw-1rem)]">
```

**Changes**:
- Reduced mobile width from 288px (w-72) to 256px (w-64)
- Added progressive sizing: mobile (256px), tablet (288px), desktop (320px)

---

## Issue 3: Header Height Too Restrictive on Mobile

**Problem**: Fixed height of 64px (h-16) may not accommodate the baby selector content properly.

**File**: `/home/bobo/projects/baby-tracker-web/components/AppHeader.js` (line 491)

**Current Code**:
```jsx
<div className="flex justify-between items-center h-16 sm:h-20">
```

**Recommended Fix**:
```jsx
<div className="flex justify-between items-center min-h-[4rem] h-16 sm:h-20">
```

**Changes**:
- Added `min-h-[4rem]` to ensure minimum height while allowing expansion if needed

---

## Issue 4: Baby Selector Button Padding Too Large on Mobile

**Problem**: The baby selector button uses large padding that may make it feel cramped on small screens.

**File**: `/home/bobo/projects/baby-tracker-web/components/EnhancedBabySelector.js` (line 28)

**Current Code**:
```jsx
className={`
  w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 
  bg-gradient-to-r from-blue-50 to-purple-50 
  ...
`}
```

**Recommended Fix**:
```jsx
className={`
  w-full flex items-center gap-2 sm:gap-3 px-2 sm:px-4 py-1.5 sm:py-3 
  bg-gradient-to-r from-blue-50 to-purple-50 
  ...
`}
```

**Changes**:
- Reduced mobile horizontal padding from 12px (px-3) to 8px (px-2)
- Reduced mobile vertical padding from 8px (py-2) to 6px (py-1.5)

---

## Issue 5: Profile Button and Avatar Spacing

**Problem**: The profile button area might need better spacing control on mobile.

**File**: `/home/bobo/projects/baby-tracker-web/components/AppHeader.js` (line 510)

**Current Code**:
```jsx
<div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
```

**Recommended Fix**:
```jsx
<div className="flex items-center space-x-1 sm:space-x-3 flex-shrink-0">
```

**Changes**:
- Reduced mobile spacing from 8px (space-x-2) to 4px (space-x-1)

---

## Implementation Priority

1. **High Priority**: Fix baby selector width (Issue 1) and dropdown width (Issue 2)
2. **Medium Priority**: Adjust header height (Issue 3) and button padding (Issue 4)
3. **Low Priority**: Fine-tune spacing (Issue 5)

## Testing Recommendations

After implementing these fixes, test on:
- iPhone SE (375px width) - smallest modern iPhone
- Samsung Galaxy S8 (360px width) - common Android size
- iPhone 12 (390px width) - modern iPhone size

## Manual Testing Steps

1. Open browser DevTools
2. Toggle device mode (Ctrl+Shift+M)
3. Select mobile device preset
4. Check for:
   - Baby name truncation in selector
   - Dropdown menu extending beyond screen
   - Cramped appearance of buttons
   - Touch target sizes (minimum 44px recommended)