/**
 * Aevum — AI Core Platform
 * Copyright (c) 2026 Aevum. All rights reserved.
 * Licensed under the MIT License.
 *
 * File: packages/storage/src/local-fs.ts
 * Purpose: Local filesystem storage driver fallback for testing and development
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';

export class LocalFsStorage {
  private baseDir: string;

  constructor(baseDir = './data/storage') {
    this.baseDir = path.resolve(baseDir);
  }

  public async put(key: string, data: string): Promise<void> {
    const filePath = path.join(this.baseDir, key);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, data, 'utf8');
  }

  public async get(key: string): Promise<string> {
    const filePath = path.join(this.baseDir, key);
    return fs.readFile(filePath, 'utf8');
  }

  public async exists(key: string): Promise<boolean> {
    try {
      const filePath = path.join(this.baseDir, key);
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  public async delete(key: string): Promise<void> {
    try {
      const filePath = path.join(this.baseDir, key);
      await fs.unlink(filePath);
    } catch {
      // Ignore if file doesn't exist
    }
  }
}
