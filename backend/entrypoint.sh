#!/bin/sh
set -e
echo "Starting Triconta API (migrations will run on startup)..."
exec node dist/index.js
