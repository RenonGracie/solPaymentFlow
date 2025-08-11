#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   ./scripts/optimize_videos.sh remux    # fast, +faststart only (no quality change)
#   ./scripts/optimize_videos.sh encode   # re-encode smaller files with good quality
#
# Prereqs: awscli v2, ffmpeg, jq (optional)
#   brew install ffmpeg awscli jq
#   aws configure (or have env creds)
#
# Configure these
BUCKET="surveyflowvideos"
REGION="us-east-2"
DISTRIBUTION_ID="EYSGKKIDMNWHJ"
CACHE_CONTROL="public, max-age=31536000, immutable"

# Keys to process (relative to bucket root)
VIDEO_KEYS=(
  "onboarding-video-16x9.mp4"
  "onboarding-video-9x16.mp4"
  "how-it-works-16x9.mp4"
  "how-it-works-9x16.mp4"
  "emotional-well-being.mp4"
  "measuring-anxiety.mp4"
)

MODE="${1:-remux}"   # remux | encode

WORKDIR="$(mktemp -d -t videoopt-XXXXXXXX)"
echo "Working dir: $WORKDIR"
trap 'rm -rf "$WORKDIR"' EXIT

process_one() {
  local key="$1"
  local in="$WORKDIR/in.mp4"
  local out="$WORKDIR/out.mp4"

  echo "\n=== Processing: s3://$BUCKET/$key ==="
  aws s3 cp "s3://$BUCKET/$key" "$in" --region "$REGION" --only-show-errors

  if [[ "$MODE" == "encode" ]]; then
    echo "Re-encoding with H.264 CRF 22, preset veryfast (+faststart)"
    ffmpeg -y -i "$in" -c:v libx264 -preset veryfast -crf 22 -c:a aac -b:a 128k -movflags +faststart "$out" < /dev/null
  else
    echo "Remuxing only (+faststart)"
    ffmpeg -y -i "$in" -c copy -movflags +faststart "$out" < /dev/null
  fi

  # Upload with correct metadata and strong caching
  aws s3 cp "$out" "s3://$BUCKET/$key" \
    --region "$REGION" \
    --content-type "video/mp4" \
    --cache-control "$CACHE_CONTROL" \
    --metadata-directive REPLACE \
    --only-show-errors

  echo "Uploaded: s3://$BUCKET/$key"
}

# Loop all keys
for key in "${VIDEO_KEYS[@]}"; do
  process_one "$key"
done

# Invalidate CloudFront so changes take effect immediately
if [[ -n "$DISTRIBUTION_ID" ]]; then
  echo "\nCreating CloudFront invalidation..."
  # Build JSON paths array
  PATHS=()
  for key in "${VIDEO_KEYS[@]}"; do
    PATHS+=("/$key")
  done
  aws cloudfront create-invalidation \
    --distribution-id "$DISTRIBUTION_ID" \
    --paths "${PATHS[@]}" >/dev/null
  echo "Invalidation submitted for: ${PATHS[*]}"
fi

echo "\nDone." 