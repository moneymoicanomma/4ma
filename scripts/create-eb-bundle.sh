#!/bin/bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
output_path="${1:-$repo_root/mmmma-eb-deploy.zip}"

tmp_file="$(mktemp)"
trap 'rm -f "$tmp_file"' EXIT

git -C "$repo_root" ls-files -z > "$tmp_file"
rm -f "$output_path"

(
  cd "$repo_root"
  tr '\0' '\n' < "$tmp_file" | zip -q "$output_path" -@
)

echo "Elastic Beanstalk bundle created at: $output_path"
