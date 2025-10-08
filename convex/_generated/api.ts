/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
const fullApi = {} as ApiFromModules<{
  apiKeys: {
    createApiKey: FunctionReference<
      "mutation",
      "public",
      { name: string; userId: string },
      string
    >;
    getApiKeys: FunctionReference<
      "query",
      "public",
      { userId: string },
      Array<any>
    >;
    revokeApiKey: FunctionReference<
      "mutation",
      "public",
      { apiKeyId: string; userId: string },
      void
    >;
    validateApiKey: FunctionReference<
      "query",
      "public",
      { apiKey: string },
      any
    >;
  };
  logos: {
    createLogo: FunctionReference<
      "mutation",
      "public",
      {
        name: string;
        userId: string;
        originalUrl: string;
        format: string;
        metadata?: any;
      },
      string
    >;
    getLogos: FunctionReference<
      "query",
      "public",
      { userId: string },
      Array<any>
    >;
    getLogoById: FunctionReference<"query", "public", { logoId: string }, any>;
    deleteLogo: FunctionReference<
      "mutation",
      "public",
      { logoId: string; userId: string },
      void
    >;
  };
  presets: {
    getPresets: FunctionReference<"query", "public", {}, Array<any>>;
    getPresetById: FunctionReference<
      "query",
      "public",
      { presetId: string },
      any
    >;
    createCustomPreset: FunctionReference<
      "mutation",
      "public",
      {
        name: string;
        userId: string;
        config: any;
      },
      string
    >;
    createPreset: FunctionReference<
      "mutation",
      "public",
      {
        clerkUserId: string;
        name: string;
        width: number;
        height: number;
        category?: string;
        description?: string;
        settings?: any;
        isPublic?: boolean;
      },
      string
    >;
    getAllPresetsForUser: FunctionReference<
      "query",
      "public",
      { clerkUserId: string },
      Array<any>
    >;
    getPublicPresets: FunctionReference<
      "query",
      "public",
      { limit: number },
      Array<any>
    >;
    updatePreset: FunctionReference<
      "mutation",
      "public",
      { presetId: any; [key: string]: any },
      void
    >;
    deletePreset: FunctionReference<
      "mutation",
      "public",
      { presetId: any },
      void
    >;
  };
  webhooks: {
    handleClerkWebhook: FunctionReference<
      "mutation",
      "public",
      { type: string; data: any },
      void
    >;
  };
}>;

export const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
> = fullApi;

export const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
> = fullApi;
