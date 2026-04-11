#!/bin/bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
output_path="${1:-$repo_root/mmmma-eb-deploy.zip}"

if [[ "$output_path" != /* ]]; then
  output_path="$repo_root/$output_path"
fi

staging_dir="$(mktemp -d)"
tmp_file="$(mktemp)"
trap 'rm -rf "$staging_dir" "$tmp_file"' EXIT

mkdir -p "$(dirname "$output_path")"
rm -f "$output_path"

echo "Building Next.js app locally for Elastic Beanstalk..."
(
  cd "$repo_root"
  NEXT_TELEMETRY_DISABLED=1 npm run build
)

if [[ -f "$repo_root/.ebignore" ]]; then
  rsync -a --exclude-from="$repo_root/.ebignore" "$repo_root"/ "$staging_dir"/
else
  git -C "$repo_root" ls-files -z > "$tmp_file"

  while IFS= read -r -d '' tracked_path; do
    mkdir -p "$staging_dir/$(dirname "$tracked_path")"
    cp -p "$repo_root/$tracked_path" "$staging_dir/$tracked_path"
  done < "$tmp_file"
fi

(
  cd "$staging_dir"
  zip -q -r "$output_path" .
)

echo "Elastic Beanstalk bundle created at: $output_path"
