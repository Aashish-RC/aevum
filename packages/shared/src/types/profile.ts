/**
 * Aevum — AI Core Platform
 * Copyright (c) 2026 Aevum. All rights reserved.
 * Licensed under the MIT License.
 *
 * File: packages/shared/src/types/profile.ts
 * Purpose: Domain types for user profiles (basic and AI customization)
 */

export type AiProfileTone = 'concise' | 'balanced' | 'verbose';
export type AiProfileFormality = 'casual' | 'neutral' | 'formal';
export type AiProfileExpertise = 'beginner' | 'intermediate' | 'expert';

export interface ProfileAi {
  userId: string;
  tone: AiProfileTone;
  formality: AiProfileFormality;
  preferredModalities: string[];
  expertiseLevel: AiProfileExpertise;
  preferredResponseLanguage: string | null;
  customInstructions: string | null;
  updatedAt: Date;
}

export interface UserBasicProfile {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  locale: string;
  timezone: string;
}

export interface FullUserProfile {
  user: UserBasicProfile;
  ai: ProfileAi | null;
}
