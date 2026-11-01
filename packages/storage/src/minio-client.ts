/**
 * Aevum — AI Core Platform
 * Copyright (c) 2026 Aevum. All rights reserved.
 * Licensed under the MIT License.
 *
 * File: packages/storage/src/minio-client.ts
 * Purpose: S3-compatible client for tamper-proof WORM storage sidecar
 */

import { logger } from '@aevum/shared';
import {
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

export interface StorageConfig {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  useSsl: boolean;
}

export class WormStorageClient {
  private client: S3Client;
  private bucket: string;

  constructor(config: StorageConfig) {
    this.bucket = config.bucket;
    this.client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      forcePathStyle: true,
      tls: config.useSsl,
    });
  }

  public async putObject(
    key: string,
    body: string,
    contentType = 'application/json',
  ): Promise<void> {
    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
        }),
      );
    } catch (err) {
      logger.error({ key, bucket: this.bucket, err }, 'Failed to write object to WORM storage');
      throw err;
    }
  }

  public async getObject(key: string): Promise<string> {
    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
    if (!response.Body) {
      throw new Error(`Empty body returned for key: ${key}`);
    }
    return response.Body.transformToString();
  }

  public async headObject(key: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
      return true;
    } catch {
      return false;
    }
  }

  public async listObjects(prefix = ''): Promise<string[]> {
    const response = await this.client.send(
      new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
      }),
    );
    return (response.Contents || []).map((item) => item.Key || '').filter(Boolean);
  }
}

export function createWormStorageClient(config?: Partial<StorageConfig>): WormStorageClient {
  return new WormStorageClient({
    endpoint: config?.endpoint || process.env.MINIO_ENDPOINT || 'http://localhost:9000',
    region: config?.region || process.env.MINIO_REGION || 'us-east-1',
    accessKeyId: config?.accessKeyId || process.env.MINIO_ACCESS_KEY || 'aevum',
    secretAccessKey: config?.secretAccessKey || process.env.MINIO_SECRET_KEY || 'aevum_dev_only',
    bucket: config?.bucket || process.env.MINIO_AUDIT_BUCKET || 'aevum-audit',
    useSsl: config?.useSsl ?? process.env.MINIO_USE_SSL === 'true',
  });
}
