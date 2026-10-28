#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
nix flake update nixpkgs
nix flake check --print-build-logs
nix build .#discord --no-link --print-build-logs
