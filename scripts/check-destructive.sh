#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 || -z "${1}" ]]; then
  echo "Uso: scripts/check-destructive.sh <ref-base>" >&2
  exit 1
fi

BASE="$1"

mapfile -t added < <(git diff --name-only --diff-filter=A "${BASE}...HEAD" -- 'drizzle/*.sql')

status=0
pattern='DROP[[:space:]]+TABLE|DROP[[:space:]]+COLUMN|TRUNCATE|DELETE[[:space:]]+FROM|ALTER[[:space:]]+COLUMN[[:space:]]+[^;]*TYPE'

for file in "${added[@]}"; do
  [[ -z "${file}" ]] && continue
  [[ -f "${file}" ]] || continue
  # -z trata o arquivo inteiro como um registro, para ALTER COLUMN ... TYPE em várias linhas.
  if grep -Eiqz "${pattern}" "${file}" && ! grep -Fq -- '-- destructive-approved' "${file}"; then
    printf '%s\n' "${file}"
    status=1
  fi
done

exit "${status}"
