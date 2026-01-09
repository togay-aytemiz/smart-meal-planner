#!/bin/bash

# Reset development environment
# Clears caches and reinstalls dependencies

echo "🧹 Cleaning development environment..."

# Clear Metro bundler cache
rm -rf $TMPDIR/metro-*

# Clear React Native cache
rm -rf $TMPDIR/react-*

# Clear Expo cache
rm -rf .expo

# Remove node_modules and reinstall
rm -rf node_modules
npm install

echo "✅ Environment reset complete!"
echo "Run 'npm start' to start the development server"
