#!/bin/bash

# FlowMind - Quick Setup Script
# Installs dependencies and configures the app

set -e  # Exit on error

echo "🧠 FlowMind - Neurodivergent-Friendly Planning App"
echo "=================================================="
echo ""

# Check if in correct directory
if [ ! -d "client" ] || [ ! -d "server" ]; then
    echo "❌ Error: Please run this script from the flowmind root directory"
    exit 1
fi

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 18+ first."
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Install server dependencies
echo ""
echo "📦 Installing server dependencies..."
cd server
npm install
cd ..
echo "✅ Server dependencies installed"

# Install client dependencies
echo ""
echo "📦 Installing client dependencies..."
cd client
npm install
echo "✅ Client dependencies installed"

# Install Expo packages
echo ""
echo "📦 Installing Expo packages..."
npx expo install expo-notifications expo-av expo-speech
echo "✅ Expo packages installed"

cd ..

# Check for .env files
echo ""
echo "🔍 Checking environment files..."

if [ ! -f "server/.env" ]; then
    echo "⚠️  server/.env not found. Creating template..."
    cat > server/.env << EOF
# ENV variables

PORT=3001
NS_API_KEY=your_neuralseek_api_key_here
NS_API_ENDPOINT=https://api.neuralseek.com/maistro_stream
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key_here
EOF
    echo "✅ Created server/.env template - Please fill in your credentials"
else
    echo "✅ server/.env exists"
fi

if [ ! -f "client/.env" ]; then
    echo "⚠️  client/.env not found. Creating..."
    cat > client/.env << EOF

EXPO_PUBLIC_API_BASE_URL=http://localhost:3001
EOF
    echo "✅ Created client/.env"
else
    echo "✅ client/.env exists"
fi

# Summary
echo ""
echo "🎉 Setup Complete!"
echo "=================="
echo ""
echo "📋 Next steps:"
echo ""
echo "1. Set up Supabase:"
echo "   - Go to https://supabase.com and create a project"
echo "   - Run the SQL from SETUP.md (creates profiles & weekly_plans tables)"
echo "   - Copy your Project URL and anon key to server/.env"
echo ""
echo "2. Get NeuralSeek API key:"
echo "   - Sign up at https://neuralseek.com"
echo "   - Create 'neuro-weekly-planner' agent (see SETUP.md)"
echo "   - Copy API key to server/.env"
echo ""
echo "3. Start the app:"
echo "   Terminal 1: cd server && npm start"
echo "   Terminal 2: cd client && npm run ios"
echo ""
echo "📖 Full instructions: See SETUP.md"
echo ""
echo "Made with 🧠 for minds that flow differently"
