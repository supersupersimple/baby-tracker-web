# Baby Tracker Activity Testing Guide

## Overview

This guide provides step-by-step instructions for manually testing all activity types in the Baby Tracker web application. Since automated testing with Puppeteer isn't available in the current environment, this manual approach will help verify that all recent fixes for activity creation and display are working correctly.

## Prerequisites

1. **Development server running**: Ensure `npm run dev` is active at http://localhost:3000
2. **Authentication**: You must be signed in with a Google account
3. **Baby selected**: Have at least one baby profile created and selected
4. **Browser**: Use Chrome, Firefox, or Safari for best compatibility

## Testing Checklist

### 1. Initial Setup Verification

- [ ] Navigate to http://localhost:3000
- [ ] Verify the app loads without JavaScript errors (check browser console)
- [ ] Confirm you're signed in (should not see "Welcome to Baby Tracker" screen)
- [ ] Ensure a baby is selected from the dropdown (should not see "Select your baby" message)
- [ ] Verify Quick Actions section is visible with 6 activity buttons

### 2. Feeding Activities (🍼)

#### Bottle Feeding
- [ ] Click the "🍼 Feeding" button
- [ ] Verify dialog opens with title "Record Feeding"
- [ ] Confirm "🍼 Bottle" is selected by default
- [ ] Enter amount (e.g., 120) and select unit (ML or OZ)
- [ ] Select category (Formula or Breast Milk)
- [ ] Click "Start" button
- [ ] Verify success message appears: "✅ Activity saved!"
- [ ] Confirm new feeding appears in Recent Activities list
- [ ] Note the timestamp should be the current time (when saved)

#### Meal/Solid Feeding
- [ ] Click "🍼 Feeding" button again
- [ ] Switch to "🥄 Meal" subtype
- [ ] Enter meal details (e.g., "Baby cereal")
- [ ] Click "Save" button
- [ ] Verify meal activity appears in Recent Activities

#### Breastfeeding (Left/Right)
- [ ] Test "🤱 Left" breast feeding option
- [ ] Test "🤱 Right" breast feeding option
- [ ] Verify both create activities without amount/unit/category fields

### 3. Sleep Activities (😴)

#### Direct Sleep Action
- [ ] Click the "😴 Sleep" button
- [ ] Verify no dialog opens (sleep starts immediately)
- [ ] Confirm success message: "✅ Sleep activity started!"
- [ ] Check that sleep activity appears in Recent Activities
- [ ] Verify timestamp is current time

### 4. Diaper Activities (👶)

- [ ] Click the "👶 Diaper" button
- [ ] Verify dialog opens with diaper change options
- [ ] Test each subtype:
  - [ ] "💧 Pee" - creates pee-only diaper change
  - [ ] "💩 Poo" - creates poo-only diaper change
  - [ ] "🌊 Both" - creates combination diaper change
- [ ] Add optional notes if desired
- [ ] Verify activities appear in Recent Activities with correct subtypes

### 5. Growth Activities (📏)

#### Weight Measurement
- [ ] Click "📏 Growth" button
- [ ] Select "⚖️ Weight" subtype
- [ ] Enter weight in kg (e.g., 3.5)
- [ ] Click "Save"
- [ ] Verify weight measurement appears in Recent Activities

#### Height Measurement
- [ ] Test "📏 Height" subtype
- [ ] Enter height in cm (e.g., 52.3)
- [ ] Verify height measurement is recorded

#### Head Circumference
- [ ] Test "🧠 Head" subtype
- [ ] Enter head circumference in cm (e.g., 35.2)
- [ ] Verify measurement is recorded correctly

### 6. Health Activities (🏥)

#### Medication
- [ ] Click "🏥 Health" button
- [ ] Select "💊 Medication" subtype
- [ ] Add medication notes
- [ ] Verify medication activity is created

#### Temperature
- [ ] Select "🌡️ Temperature" subtype
- [ ] Enter temperature in Celsius (e.g., 37.5)
- [ ] Verify temperature measurement is recorded

#### Vaccination
- [ ] Test "💉 Vaccination" subtype
- [ ] Add vaccination notes
- [ ] Verify vaccination activity is created

### 7. Leisure Activities (🎉)

- [ ] Click "🎉 Leisure" button
- [ ] Test all subtypes:
  - [ ] "🥰 Tummy Time"
  - [ ] "🛁 Bath"
  - [ ] "🚶 Walk"
- [ ] Verify each creates appropriate leisure activity
- [ ] Add notes if desired

### 8. Consecutive Activity Testing

This tests duplicate detection and ensures multiple activities of the same type work correctly.

- [ ] Create 3 bottle feeding activities in quick succession:
  - [ ] 100ml formula
  - [ ] 110ml formula  
  - [ ] 120ml formula
- [ ] Verify all 3 activities appear in Recent Activities
- [ ] Confirm no duplicate detection issues
- [ ] Check timestamps are slightly different

### 9. UI/UX Verification

#### Quick Actions Section
- [ ] Verify all 6 activity buttons are visible and clickable
- [ ] Test "All Actions" dropdown shows all activities
- [ ] Confirm button icons and colors match expectations
- [ ] Test button hover effects work

#### Dialog Behavior
- [ ] Verify dialogs open and close properly
- [ ] Test "Cancel" button closes dialog without saving
- [ ] Confirm "Escape" key closes dialogs
- [ ] Check form validation works (required fields)

#### Recent Activities Display
- [ ] Verify activities appear immediately after creation
- [ ] Check activities display correct icons, timestamps, and details
- [ ] Confirm activities are sorted by newest first
- [ ] Test scrolling if many activities exist

### 10. Offline Testing

- [ ] Disconnect from internet (disable WiFi/ethernet)
- [ ] Create several activities while offline
- [ ] Verify "📵 Saved offline - will sync when online" message appears
- [ ] Reconnect to internet
- [ ] Verify activities sync to server automatically
- [ ] Check activities persist after page refresh

### 11. Error Handling

#### Permission Testing
- [ ] If you have access to a viewer account, test that viewers cannot create activities
- [ ] Verify appropriate error message for insufficient permissions

#### Network Issues
- [ ] Test behavior when server is unavailable
- [ ] Verify graceful error handling for API failures

### 12. Cross-Browser Testing

Repeat key tests in different browsers:
- [ ] Chrome
- [ ] Firefox  
- [ ] Safari (if on Mac)
- [ ] Mobile browsers (if testing on mobile)

## Expected Results

### Success Criteria
- All 6 activity types create activities successfully
- Activities appear immediately in Recent Activities list
- Correct data validation based on activity type
- Offline functionality works properly
- No JavaScript errors in browser console
- Smooth UI interactions and animations

### Common Issues to Watch For
- Activities not appearing in Recent Activities
- Incorrect validation (e.g., bottle feeding without amount)
- Dialog forms not opening or closing properly
- JavaScript errors during activity creation
- Offline sync not working
- Timestamp issues

## Reporting Issues

When reporting issues, please include:

1. **Activity Type**: Which activity type had the issue
2. **Steps to Reproduce**: Exact steps that caused the problem
3. **Expected Behavior**: What should have happened
4. **Actual Behavior**: What actually happened
5. **Browser**: Which browser and version
6. **Console Errors**: Any JavaScript errors from browser console
7. **Screenshots**: If applicable

## Test Environment Details

- **Application URL**: http://localhost:3000
- **Test Date**: Run `date` to get current timestamp
- **Development Server**: npm run dev
- **Authentication**: Google OAuth required
- **Database**: Local development database

## Automation Note

This manual testing guide compensates for the inability to run automated Puppeteer tests due to system constraints. The comprehensive code analysis showed all activity types have proper implementation structure, but manual verification ensures the UI and user flows work correctly in practice.