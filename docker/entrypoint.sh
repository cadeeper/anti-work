#!/bin/sh
set -e

echo "🔄 Running database migrations..."
npx prisma db push --skip-generate

echo "🚀 Starting application..."
exec node dist/index.js
