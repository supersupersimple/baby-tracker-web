# Google OAuth Setup Guide

## Overview
Baby Tracker now uses Google OAuth for secure authentication. Follow this guide to set up Google OAuth for your application.

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note your project ID

## Step 2: Enable Required APIs

1. In the Google Cloud Console, go to **APIs & Services** > **Library**
2. Search for and enable:
   - **Google+ API** (required for profile information)
   - **People API** (recommended for enhanced user data)

## Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services** > **OAuth consent screen**
2. Choose **External** user type (unless you have a Google Workspace)
3. Fill in required information:
   - **App name**: Baby Tracker
   - **User support email**: Your email
   - **Developer contact information**: Your email
   - **App domain**: Your domain (for production)
4. Add scopes:
   - `../auth/userinfo.email`
   - `../auth/userinfo.profile`
   - `openid`
5. Save and continue

## Step 4: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth 2.0 Client IDs**
3. Choose **Web application**
4. Configure:
   - **Name**: Baby Tracker Web App
   - **Authorized JavaScript origins**:
     - `http://localhost:3000` (for development)
     - `https://your-domain.com` (for production)
   - **Authorized redirect URIs**:
     - `http://localhost:3000/api/auth/callback/google` (development)
     - `https://your-domain.com/api/auth/callback/google` (production)

## Step 5: Get Your Credentials

1. After creating, you'll see a modal with:
   - **Client ID**: Copy this
   - **Client Secret**: Copy this
2. Download the JSON file for backup

## Step 6: Configure Environment Variables

Update your `.env` file:

```env
# Replace with your actual credentials
GOOGLE_CLIENT_ID="123456789-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-YourSecretKeyHere"

# Update admin emails with your Google account
ADMIN_EMAILS="your-email@gmail.com"
```

## Step 7: Test Authentication

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to `http://localhost:3000`
3. Click "Sign in with Google"
4. Complete the OAuth flow

## Production Deployment

### For Vercel:
1. Go to your Vercel project dashboard
2. Navigate to **Settings** > **Environment Variables**
3. Add:
   - `GOOGLE_CLIENT_ID`: Your client ID
   - `GOOGLE_CLIENT_SECRET`: Your client secret
   - `NEXTAUTH_URL`: `https://your-domain.com`
   - `ADMIN_EMAILS`: Your admin email(s)

### For other platforms:
Set the same environment variables in your hosting platform.

## Security Notes

1. **Never commit credentials** to version control
2. **Use different OAuth apps** for development and production
3. **Regularly rotate client secrets**
4. **Monitor OAuth usage** in Google Cloud Console
5. **Set up proper CORS** for production domains

## Troubleshooting

### Common Issues:

**Error: "redirect_uri_mismatch"**
- Check that your redirect URI exactly matches what's configured in Google Console
- Ensure you're using the correct protocol (http vs https)

**Error: "invalid_client"**
- Verify your Client ID and Client Secret are correct
- Check that the OAuth app is enabled

**Error: "access_blocked"**
- Your app may need verification for certain scopes
- For development, add test users in OAuth consent screen

**User sees "This app isn't verified"**
- Normal for development mode
- Users can click "Advanced" > "Go to Baby Tracker (unsafe)" for testing
- For production, submit for verification or use internal user type

## Support

If you encounter issues:
1. Check the [NextAuth.js Google Provider docs](https://next-auth.js.org/providers/google)
2. Review Google Cloud Console error logs
3. Check browser developer console for errors