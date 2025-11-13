# Railway Watch Path Configuration Guide

This guide shows how to configure Railway to only redeploy specific apps when their files change, preventing unnecessary redeployments in a monorepo.

## Problem
With all client mockups in one repository, every git push triggers redeployment of ALL apps on Railway, wasting resources and time.

## Solution
Configure "Watch Paths" for each Railway service to only monitor specific directories.

---

## Step-by-Step Configuration

### For Kelly Enterprises Rental Manager

1. **Go to Railway Dashboard**
   - Visit: https://railway.app/dashboard
   - Log in to your account

2. **Select the Project**
   - Click on the project containing the Rental Manager service

3. **Select the Service**
   - Click on the "Kelly Rental Manager" service (or whatever you named it)

4. **Open Settings**
   - Click the **Settings** tab at the top

5. **Configure Root Directory**
   - Scroll to **"Root Directory"** section
   - Set to: `clients/kelly-enterprises/rental-manager`
   - This tells Railway where the app files are located

6. **Configure Watch Paths**
   - Scroll to **"Watch Paths"** section
   - Click **"Configure Watch Paths"** or **"Add Watch Path"**
   - Add: `clients/kelly-enterprises/rental-manager/**`
   - Click **Save** or **Add**

7. **Verify Configuration**
   - The watch path should now appear in the list
   - Railway will now ONLY redeploy this service when files in this directory change

---

## For Other Deployed Apps

Repeat the same process for each deployed app:

### Cattle Tracker (if deployed)
- **Root Directory**: `clients/besteman-land-cattle/cattle-tracker`
- **Watch Path**: `clients/besteman-land-cattle/cattle-tracker/**`

### Future Apps
- **Root Directory**: `clients/{client-name}/{app-name}`
- **Watch Path**: `clients/{client-name}/{app-name}/**`

---

## Testing the Configuration

1. **Make a change** to the Rental Manager (`clients/kelly-enterprises/rental-manager/index.html`)
2. **Commit and push** to GitHub
3. **Check Railway dashboard** - Only the Rental Manager service should redeploy
4. **Make a change** to a different app (e.g., Cattle Tracker)
5. **Commit and push** to GitHub
6. **Check Railway dashboard** - Only that app should redeploy

---

## Watch Path Pattern Explained

- `**` = Match this directory and all subdirectories
- `clients/kelly-enterprises/rental-manager/**` = Watch everything inside rental-manager folder
- Changes outside this path will NOT trigger redeployment

---

## Troubleshooting

### Service still redeploys for unrelated changes
- **Check**: Verify the watch path is exactly as specified
- **Check**: Make sure there are no extra spaces or typos
- **Check**: Ensure the path matches your actual directory structure

### Service doesn't redeploy when it should
- **Check**: Make sure the watch path includes `/**` at the end
- **Check**: Verify you're pushing changes to the correct directory
- **Check**: Check Railway deployment logs for errors

### Can't find Watch Paths setting
- **Update**: Railway may have moved this setting
- **Look for**: "Service Settings" → "Source" → "Watch Paths"
- **Alternative**: Check under "Triggers" or "Build" settings

---

## Additional Railway Configuration

### Build Configuration (Optional)
For static HTML apps like the Rental Manager, no build configuration is needed. Railway will automatically serve the `index.html` file.

### Environment Variables (If Needed)
If you need to add environment variables:
1. Go to service **Settings**
2. Find **Variables** section
3. Add any needed variables

### Custom Domains
Already configured for Kelly Rental Manager. To add more:
1. Go to service **Settings**
2. Find **Domains** section
3. Click **Custom Domain**
4. Add your domain and configure DNS

---

## Summary

✅ Each service watches only its own directory
✅ No more unnecessary redeployments
✅ Faster deployments and lower resource usage
✅ Better monorepo organization

**Remember**: Configure watch paths for EVERY deployed service in your Railway project!
