import { z } from 'zod';

export const FirebaseErrorSchema = z.object({
  errorInfo: z
    .object({
      message: z.string(),
    })
    .optional(),
});

export const ProjectAuthConfigSchema = z.object({
  projectKey: z.string(),
});

export const DecodedIdTokenSchema = z.object({
  aud: z.string(),
  auth_time: z.number(),
  email: z.string().email().optional(),
  email_verified: z.boolean().optional(),
  exp: z.number(),
  firebase: z.object({
    identities: z.record(z.string(), z.array(z.string())),
    sign_in_provider: z.string(),
  }),
  iat: z.number(),
  iss: z.string(),
  sub: z.string(),
  uid: z.string(),
});

export const TokenValidationRequestSchema = z.object({
  idToken: z.string(),
});

export const UserRetailerDataSchema = z.object({
  uid: z.string(),
  retailerConfig: z.record(z.string(), z.unknown()).optional(),
});

export type FirebaseError = z.infer<typeof FirebaseErrorSchema>;
export type ProjectAuthConfig = z.infer<typeof ProjectAuthConfigSchema>;
export type DecodedIdToken = z.infer<typeof DecodedIdTokenSchema>;
export type TokenValidationRequest = z.infer<
  typeof TokenValidationRequestSchema
>;
export type UserRetailerData = z.infer<typeof UserRetailerDataSchema>;
