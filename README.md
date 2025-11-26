# Waiterix Frontend

AI-Powered Restaurant Experience Frontend - A modern React application built with Vite, TypeScript, and Tailwind CSS.

## 🚀 Features

- **AI-Powered Ordering**: Voice-enabled menu interaction with AI assistance
- **Multi-language Support**: Internationalization with dynamic language switching
- **Payment Integration**: Stripe payment processing with multiple gateway support
- **Real-time Updates**: Live order tracking and notifications
- **Responsive Design**: Mobile-first design with Tailwind CSS
- **Voice Recognition**: Continuous speech recognition for hands-free interaction
- **QR Code Integration**: Table-based ordering system

## 🛠️ Tech Stack

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with shadcn/ui components
- **State Management**: TanStack Query (React Query)
- **Authentication**: Firebase Auth
- **Payments**: Stripe
- **Voice**: Web Speech API
- **Routing**: Wouter
- **Forms**: React Hook Form with Zod validation

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- AWS Amplify account (for deployment)

## 🔧 Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# API Configuration
VITE_API_URL=https://your-backend-api.com

# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_APP_ID=your_firebase_app_id

# Stripe Configuration
VITE_STRIPE_PUBLIC_KEY=pk_test_your_stripe_public_key
```

## 🚀 Getting Started

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/waiterix-frontend.git
   cd waiterix-frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your actual values
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

### Build for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

## 🌐 AWS Amplify Deployment

This application is configured for AWS Amplify hosting with the included `amplify.yml` build specification.

### Quick Deploy to Amplify

1. **Connect Repository**
   - Go to AWS Amplify Console
   - Click "New app" → "Host web app"
   - Connect your GitHub repository
   - Select the branch (usually `main` or `master`)

2. **Configure Build Settings**
   - Amplify will automatically detect the `amplify.yml` file
   - Review the build settings (should match the amplify.yml configuration)

3. **Environment Variables**
   Add the following environment variables in Amplify Console:
   ```
   VITE_API_URL=https://your-backend-api.com
   VITE_FIREBASE_API_KEY=your_firebase_api_key
   VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
   VITE_FIREBASE_APP_ID=your_firebase_app_id
   VITE_STRIPE_PUBLIC_KEY=pk_live_your_stripe_public_key
   ```

4. **Deploy**
   - Click "Save and deploy"
   - Wait for the build to complete (typically 3-5 minutes)

### Custom Domain (Optional)

1. In Amplify Console, go to "Domain management"
2. Add your custom domain
3. Follow the DNS configuration instructions

## 📁 Project Structure

```
waiterix-frontend/
├── public/
│   └── _redirects          # SPA routing configuration
├── src/
│   ├── components/         # Reusable UI components
│   ├── pages/             # Page components
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utility libraries
│   ├── contexts/          # React contexts
│   └── assets/            # Static assets
├── amplify.yml            # AWS Amplify build configuration
├── vite.config.ts         # Vite configuration
├── tailwind.config.js     # Tailwind CSS configuration
└── package.json           # Dependencies and scripts
```

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run check` - Type check without emitting files

## 🌍 Environment-Specific Configuration

### Development
- Uses `http://localhost:3001` as default API URL
- Hot module replacement enabled
- Source maps included

### Production
- Optimized bundle with code splitting
- Assets compressed and cached
- Environment variables from Amplify Console

## 🔒 Security Notes

- All environment variables must be prefixed with `VITE_`
- Never commit `.env` files to version control
- Use different Stripe keys for development and production
- Configure CORS properly on your backend API

## 🐛 Troubleshooting

### Build Issues
- Ensure all environment variables are set
- Check that Node.js version is 18+
- Clear `node_modules` and reinstall if needed

### Deployment Issues
- Verify environment variables in Amplify Console
- Check build logs in Amplify Console
- Ensure `amplify.yml` is in the root directory

### Runtime Issues
- Check browser console for errors
- Verify API endpoints are accessible
- Ensure Firebase configuration is correct

## 📝 License

MIT License - see LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For support, please contact [your-email@example.com] or create an issue in the repository.