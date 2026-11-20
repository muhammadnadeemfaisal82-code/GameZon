#!/usr/bin/env bash
set -e
echo "=================================================="
echo "  News World (newsworld.life) Clean Firebase Deploy"
echo "  CEO Muhammad Nadeem Faisal"
echo "=================================================="

if ! command -v firebase >/dev/null 2>&1; then
  echo "Installing firebase-tools..."
  npm install -g firebase-tools
fi

if ! firebase projects:list >/dev/null 2>&1; then
  echo "Opening Firebase login (Termux mode)..."
  firebase login --no-localhost
fi

PROJECTS_OUT=$(firebase projects:list 2>/dev/null || true)

if echo "$PROJECTS_OUT" | grep -q "newsworld-c7ec9"; then
  echo "Deploying fresh News World website to newsworld-c7ec9 (https://newsworld-c7ec9.web.app & https://newsworld.life)..."
  firebase deploy --only hosting --project newsworld-c7ec9
elif echo "$PROJECTS_OUT" | grep -q "gen-lang-client-0657637047"; then
  echo "Deploying fresh News World website & Firestore rules to gen-lang-client-0657637047..."
  firebase deploy --only hosting,firestore:rules --project gen-lang-client-0657637047
else
  echo "Select your News World Firebase Hosting project:"
  firebase use --add
  firebase deploy --only hosting
fi

echo "✅ Deployment Complete! Hard-refresh https://newsworld.life to view latest updates."
