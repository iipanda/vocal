#!/bin/bash

# Post-install script to make vocal CLI available in PATH
# This runs after the app is installed to /Applications/

APP_PATH="/Applications/Vocal.app/Contents/MacOS/vocal"
SYMLINK_PATH="/usr/local/bin/vocal"

echo "Setting up Vocal CLI..."

# Check if the app binary exists
if [ ! -f "$APP_PATH" ]; then
    echo "Error: Vocal app binary not found at $APP_PATH"
    exit 1
fi

# Create /usr/local/bin if it doesn't exist
if [ ! -d "/usr/local/bin" ]; then
    mkdir -p "/usr/local/bin"
fi

# Remove existing symlink if it exists
if [ -L "$SYMLINK_PATH" ]; then
    rm "$SYMLINK_PATH"
fi

# Create symlink to make vocal CLI available in PATH
ln -s "$APP_PATH" "$SYMLINK_PATH"

if [ $? -eq 0 ]; then
    echo "✅ Vocal CLI installed successfully!"
    echo "You can now run: vocal setup-hooks"
else
    echo "⚠️  Warning: Could not create symlink. You may need to run:"
    echo "   sudo ln -s '$APP_PATH' '$SYMLINK_PATH'"
fi

echo "Installation complete!"