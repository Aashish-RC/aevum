#!/bin/sh
set -e

echo "Waiting for MinIO..."
until mc alias set local http://localhost:9000 "${MINIO_ROOT_USER:-aevum}" "${MINIO_ROOT_PASSWORD:-aevum_dev_only}"; do
  sleep 1
done

echo "Configuring buckets..."
mc mb --ignore-existing --with-lock local/aevum-audit
mc retention set --default governance 2555d local/aevum-audit
mc mb --ignore-existing local/aevum-media

echo "MinIO buckets initialized successfully."

