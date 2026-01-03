#!/usr/bin/env bash

# Electron launcher for the new Lumix Link Desktop (React + Vite + Electron)
# Usage: ./Control.sh (runs dev mode: Vite + Electron)

set -euo pipefail

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$SCRIPT_DIR"

if [[ ! -d node_modules ]]; then
  echo "Installing dependencies..."
  npm install
fi

echo "Starting Lumix Link Desktop (dev mode)..."
npm run dev
