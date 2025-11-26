# Waiterix Frontend - AWS Amplify Deployment Guide

This guide walks you through deploying the Waiterix Frontend to AWS Amplify from a separate repository.

## 📋 Prerequisites

- AWS Account with Amplify access
- GitHub account
- Domain name (optional, for custom domain)

## 🚀 Step-by-Step Deployment

### Step 1: Create New Repository

1. **Create a new GitHub repository**
   ```bash
   # On GitHub, create a new repository named "waiterix-frontend"
   # Don't initialize with README, .gitignore, or license
   ```

2. **Copy frontend files to new repository**
   ```bash
   # Copy the entire waiterix-frontend directory contents
   # Include all files: src/, public/, package.json, amplify.yml, etc.
   ```

3. **Initialize and push to new repository**
   ```bash
   cd waiterix-frontend
   git init
   git add .
   git commit -m "Initial commit: Waiterix Frontend"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/waiterix-frontend.git
   git push -u origin main
   ```

### Step 2: Connect to AWS Amplify

1. **Open AWS Amplify Console**
   - Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify/)
   - Click "New app" → "Host web app"

2. **Connect Repository**
   - Select "GitHub" as source
   - Authorize AWS Amplify to access your GitHub account
   - Select your `waiterix-frontend` repository
   - Choose the `main` branch

3. **Configure Build Settings**
   - Amplify will auto-detect the `amplify.yml` file
   - Review the build configuration:
   ```yaml
   version: 1
   frontend:
     phases:
       preBuild:
         commands:
           - npm ci
       build:
         commands:
           - npm run build
     artifacts:
       baseDirectory: dist
       files:
         - '**/*'
     cache:
       paths:
         - node_modules/**/*
   ```

### Step 3: Configure Environment Variables

In the Amplify Console, add these environment variables:

| Variable Name | Value | Description |
|---------------|-------|-------------|
| `VITE_API_URL` | `https://your-backend-api.com` | Backend API endpoint |
| `VITE_FIREBASE_API_KEY` | `your_firebase_api_key` | Firebase API key |
| `VITE_FIREBASE_PROJECT_ID` | `your_project_id` | Firebase project ID |
| `VITE_FIREBASE_APP_ID` | `your_app_id` | Firebase app ID |
| `VITE_STRIPE_PUBLIC_KEY` | `pk_live_...` | Stripe publishable key (production) |

**Important Notes:**
- Use production values for live deployment
- Use `pk_live_` Stripe keys for production (not `pk_test_`)
- Ensure your backend API supports CORS for your Amplify domain

### Step 4: Deploy

1. **Review and Deploy**
   - Click "Save and deploy"
   - Monitor the build process (typically 3-5 minutes)
   - Check build logs if any issues occur

2. **Verify Deployment**
   - Once deployed, test the application
   - Check that all features work correctly
   - Verify API connections and payments

### Step 5: Custom Domain (Optional)

1. **Add Custom Domain**
   - In Amplify Console → "Domain management"
   - Click "Add domain"
   - Enter your domain name

2. **Configure DNS**
   - Follow AWS instructions to configure DNS
   - Add CNAME records as specified
   - Wait for SSL certificate provisioning (up to 24 hours)

## 🔧 Build Optimization

### Performance Improvements

The current build shows a large bundle size. Consider these optimizations:

1. **Code Splitting**
   ```typescript
   // In vite.config.ts, add manual chunks
   export default defineConfig({
     build: {
       rollupOptions: {
         output: {
           manualChunks: {
             vendor: ['react', 'react-dom'],
             ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
             firebase: ['firebase'],
             stripe: ['@stripe/stripe-js', '@stripe/react-stripe-js']
           }
         }
       }
     }
   });
   ```

2. **Lazy Loading**
   ```typescript
   // Implement lazy loading for pages
   const CustomerMenu = lazy(() => import('./pages/CustomerMenu'));
   const AdminPage = lazy(() => import('./pages/AdminPage'));
   ```

## 🚨 Troubleshooting

### Common Issues

1. **Build Fails**
   - Check environment variables are set
   - Verify Node.js version (should be 18+)
   - Check build logs for specific errors

2. **App Loads but API Calls Fail**
   - Verify `VITE_API_URL` is correct
   - Check CORS configuration on backend
   - Ensure backend is accessible from Amplify

3. **Firebase Authentication Issues**
   - Verify Firebase configuration variables
   - Check Firebase project settings
   - Ensure domain is added to Firebase authorized domains

4. **Stripe Payment Issues**
   - Verify Stripe public key is correct
   - Check Stripe webhook endpoints
   - Ensure using production keys for live site

### Build Logs

Access build logs in Amplify Console:
1. Go to your app in Amplify Console
2. Click on the build you want to inspect
3. View detailed logs for each build phase

## 🔄 Continuous Deployment

Amplify automatically deploys when you push to the connected branch:

1. **Make changes locally**
2. **Commit and push**
   ```bash
   git add .
   git commit -m "Update feature"
   git push origin main
   ```
3. **Amplify automatically builds and deploys**

### Branch-based Deployments

Set up staging environments:
1. Create a `develop` branch
2. Connect it to Amplify as a separate app
3. Use different environment variables for staging

## 📊 Monitoring

### Amplify Metrics

Monitor your app performance:
- **Build duration**: Track build times
- **Deploy frequency**: Monitor deployment frequency  
- **Error rates**: Watch for build failures

### Custom Monitoring

Consider adding:
- Google Analytics
- Error tracking (Sentry)
- Performance monitoring
- User feedback tools

## 🔒 Security Best Practices

1. **Environment Variables**
   - Never commit `.env` files
   - Use different keys for staging/production
   - Rotate keys regularly

2. **Access Control**
   - Limit AWS IAM permissions
   - Use least privilege principle
   - Monitor access logs

3. **Content Security**
   - Implement CSP headers
   - Use HTTPS only
   - Validate all user inputs

## 📞 Support

If you encounter issues:
1. Check AWS Amplify documentation
2. Review build logs in Amplify Console
3. Contact AWS Support for infrastructure issues
4. Check GitHub issues for application-specific problems