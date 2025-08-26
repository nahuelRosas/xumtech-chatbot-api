# XumTech Chatbot API — API Documentation

Last updated: 2025-08-26

## Table of Contents

- Overview
- Architecture and modules
- Authentication and AppCheck
- Common response envelope
- Environment variables and configuration
- Endpoints
  - /mastra/chat (POST)
  - /quests (GET, POST, PATCH, DELETE)
- Workflows and data flow (detailed)
  - Authentication + App Check flow
  - Quest engine lifecycle
  - Mastra chat flow
- Examples
  - cURL examples
  - Example request/response JSON
- Error handling and edge cases
- Troubleshooting and notes

## Overview

This document describes the API surface for the XumTech Chatbot API (server). It includes the available endpoints, request/response shapes, guards, important services, and detailed workflows showing how requests travel from the client through guards, services, and external dependencies (Firebase / Firestore and Mastra / AI providers).

This documentation is for API consumers and backend engineers who need to understand the exact behavior of the service.

## Architecture and modules

The server is a NestJS application organized by feature modules. The main modules relevant to the public API are:

- Authentication module
  - Provides two guards: `AppCheckGuard` and `AuthenticationGuard`.
  - Validates Firebase App Check (X-Firebase-AppCheck header) and Firebase Auth JWT (Authorization: Bearer <token>).
- Mastra AI module
  - Exposes an endpoint to send chat messages to a preconfigured agent (`questAgent`).
  - Integrates with Mastra core SDK and a language model provider (Google Generative AI / Gemini) to generate answers.
- Quest Engine module
  - Manages a collection of "quests" (small Q/A items) stored in Firestore via a `FirestoreRepository` abstraction.
  - Provides endpoints to list, create, edit and delete quests. The quest data is also used as prompt context for the Mastra agent.
- Common utilities
  - `ResponseService` - standardizes all responses using a typed envelope `IResponse<T>`.
  - `FirestoreRepository` - Firestore operations (query, save, update, delete, extract data).
  - `EnvConfigService` - retrieves environment config values such as collection names and UUID namespaces.

## Authentication and AppCheck

Two NestJS guards are applied globally to the controllers in this API where endpoints are not explicitly marked as public.

- AppCheckGuard
  - Checks `X-Firebase-AppCheck` header for a Firebase App Check token.
  - Uses the Firebase Admin SDK `appCheck.verifyToken` to verify the token.
  - Bypasses verification in development (NODE_ENV === 'development') or if the route is marked with the public decorator.
  - On success it stores `appCheckClaims` on the Express request object.
  - On failure it throws `UnauthorizedException`.

- AuthenticationGuard
  - Checks `Authorization` header for a `Bearer <token>` value.
  - Validates the token using the project's `AuthenticationService` (wrapping Firebase Auth validation).
  - On success it stores `user` (decoded token payload) on the Express request object.
  - On failure it throws `UnauthorizedException`.

Both guards return early if the route or class is decorated as public with the `@Public()` decorator.

## Common response envelope

All controller methods return values using a common envelope `IResponse<T>`:

- message?: string
- success?: boolean
- statusCode?: number
- payload?: T
- error?: unknown
- type?: keyof typeof HttpStatus

`ResponseService` has helpers to create standard responses (e.g. `createResponse` for OK/CREATED/NOT_FOUND). Controllers typically return these envelope objects directly.

## Environment variables and configuration (high level)

Important configuration keys referenced in code:

- `QUESTS_COLLECTION_NAME` — Firestore collection name where quests are stored.
- `UUID_NAMESPACE` — Namespace used to deterministically generate quest UIDs when none provided.
- `NODE_ENV` — Used to skip AppCheck verification in development.
- Firebase Admin provider `FIREBASE_ADMIN_PROVIDER` must be configured for AppCheck and Firestore access.
- The Mastra module expects a `GEMINI_CLIENT` provider to be injected for the language model.

Refer to the project's env configuration module for more keys if necessary (see `src/common/env_config`).

## Endpoints

The following sections document the available HTTP endpoints, their method, authentication requirements, DTOs, possible responses and examples.

### Common notes

- All endpoints are protected by `AppCheckGuard` and `AuthenticationGuard` unless explicitly decorated as public.
- All responses are wrapped in the `IResponse<T>` envelope.
- UUID parameters are validated by Nest's `ParseUUIDPipe` where present.

### POST /mastra/chat

- Summary: Send a chat message to the Mastra agent and receive a generated answer.
- Path: /mastra/chat
- Method: POST
- Guards: AppCheckGuard, AuthenticationGuard
- Auth: Requires `X-Firebase-AppCheck` header and `Authorization: Bearer <token>` header
- Request body (DTO: CreateChatDto):
  - message: string (required) — user message sent to the agent
  - conversationId: string (UUID) (required) — thread identifier used as Mastra threadId

- Processing steps (high-level):
  1. Controller extracts user UUID from `@UserUUID()` decorator (reads from validated request user payload).
  2. Controller calls `MastraService.chatWithAgent(dto, uuid)`.
  3. `MastraService` fetches all allowed questions from `QuestEngineService.getAllQuests()` and builds an assistant prompt listing allowed Q/A pairs.
  4. `MastraService` calls Mastra's `getAgent('questAgent').generateVNext(...)` with:
     - input user message
     - context containing the assistant prompt
     - resourceId set to the user UUID (or 'anon')
     - threadId set to `conversationId`
     - an output zod schema requiring `text: string`
     - input processors (UnicodeNormalizer)
     - providerOptions with safety settings and thinking config
  5. `MastraService` parses the returned object using `zod` and returns `IResponse<{ answer: string }>` via `ResponseService`.

- Successful response example (200 OK - envelope):
  {
  "message": "Answer generated by agent (fallback)",
  "type": "OK",
  "payload": { "answer": "The agent's answer text" }
  }

- Error cases:
  - Missing or invalid App Check token -> 401 Unauthorized
  - Missing or invalid Auth token -> 401 Unauthorized
  - Mastra provider errors -> handled through `ResponseService.errorHandler` (envelope with error info)

### GET /quests

- Summary: Retrieve all quests
- Path: /quests
- Method: GET
- Guards: AppCheckGuard, AuthenticationGuard
- Request: none
- Response: IResponse<CreateQuestDto[]>

Successful example (200 OK):
{
"message": "Quest retrieved successfully",
"type": "OK",
"payload": [ { "uid": "...", "question": "...", "answer": "..." } ]
}

If no quests found, response type is `NOT_FOUND` with `payload: []` and message "No quests found".

### POST /quests

- Summary: Create one or many quests
- Path: /quests
- Method: POST
- Guards: AppCheckGuard, AuthenticationGuard
- Request body (single or array of CreateQuestDto):
  - question: string (required)
  - answer?: string
  - uid?: uuid (optional; if not provided the service generates one using UUID v5 with configured namespace)

- Successful response: type `CREATED` with payload being the created object(s).

- Example request (single):
  {
  "question": "What is X?",
  "answer": "X is ..."
  }

- Example response (201 CREATED):
  {
  "message": "Quest(s) created successfully",
  "type": "CREATED",
  "payload": { "uid": "...", "question": "What is X?", "answer": "X is ..." }
  }

Notes:

- The service saves each quest by calling `FirestoreRepository.saveDocument` with the computed `uid` as document id.
- The in-memory `questsState` cache is updated after writes.

### PATCH /quests/:uid

- Summary: Edit a quest by uid
- Path: /quests/:uid
- Method: PATCH
- Guards: AppCheckGuard, AuthenticationGuard
- Path param: uid (UUID) — validated by `ParseUUIDPipe`
- Request body (UpdateQuestDto): one of
  - question?: string
  - answer?: string

- Successful response example:
  {
  "message": "Quest updated successfully",
  "type": "OK",
  "payload": { "uid": "...", "question": "updated?", "answer": "..." }
  }

- Notes:
  - The repository `updateDocument` is called with `partialDocument` containing only provided updates.
  - `questsState` is patched in memory when present.

### DELETE /quests/:uid

- Summary: Delete a quest by uid
- Path: /quests/:uid
- Method: DELETE
- Guards: AppCheckGuard, AuthenticationGuard
- Path param: uid (UUID)

- Example success response:
  {
  "message": "Quest deleted successfully",
  "type": "OK",
  "payload": { "uid": "..." }
  }

- Notes:
  - `FirestoreRepository.deleteDocument` is invoked and `questsState` is mutated to remove the deleted quest.

## Workflows and data flow (detailed)

This section explains step-by-step the main flows in the API: the authentication + app-check verification, quest lifecycle, and the Mastra chat flow that ties everything together.

### Authentication + AppCheck flow (request validation)

1. Client constructs request and includes:
   - `Authorization: Bearer <Firebase ID token>`
   - `X-Firebase-AppCheck: <App Check token>`
2. `AppCheckGuard.canActivate` runs first (guard order is AppCheckGuard, AuthenticationGuard):
   - If route is public or NODE_ENV === 'development' -> allow.
   - Extract `X-Firebase-AppCheck` header, verify with Firebase Admin `appCheck.verifyToken`.
   - On success attach `appCheckClaims` to `request` object and return true.
   - On failure -> throw `UnauthorizedException`.
3. `AuthenticationGuard.canActivate` runs:
   - If route is public -> allow.
   - Extract bearer token from `Authorization` header. If missing or malformed -> throw `UnauthorizedException`.
   - Validate token via `AuthenticationService.validateToken` (Firebase Auth via admin SDK).
   - Attach the decoded payload to `request.user` and return true.

After both guards pass, the controller handlers execute.

### Quest engine lifecycle

- Retrieval (GET): `QuestEngineService.getAllQuests` invokes `ensureStateLoaded`:
  - If `questsState` is null it queries Firestore collection (configured by `QUESTS_COLLECTION_NAME`) via `FirestoreRepository.queryCollection`.
  - Extracts data and fills `questsState` map keyed by uid.
  - Returns an array of quests.

- Creation (POST): `createQuests` accepts a partial payload or array. For each item:
  - Compute uid (provided or computed using UUID v5 with `UUID_NAMESPACE`).
  - Create `CreateQuestDto` object and call `FirestoreRepository.saveDocument` with `id: uid`.
  - Update `questsState` in memory and respond with CREATED.

- Update (PATCH): `editQuest` forms a `partialDocument` with only provided fields and calls `FirestoreRepository.updateDocument`. It also merges the changes in `questsState` when available.

- Delete (DELETE): `deleteQuest` calls `FirestoreRepository.deleteDocument` and removes from `questsState`.

Caching notes:

- `questsState` is an in-memory cache kept in the service instance; it's loaded once on demand. If multiple server instances run behind a load balancer, each has its own cache.

### Mastra chat flow

1. Client calls `POST /mastra/chat` with `message` and `conversationId`.
2. Route guards validate App Check and Auth as described above.
3. Controller retrieves the request user UUID using `@UserUUID()` decorator that reads the user payload added by `AuthenticationGuard`.
4. Controller calls `MastraService.chatWithAgent(dto, uuid)`.
5. `MastraService` fetches the list of allowed quests from `QuestEngineService.getAllQuests()` — this is used to construct an `assistantPrompt` that enumerates allowed Q/A pairs. This acts as additional context to the agent.
6. The service uses the injected `Mastra` provider and `geminiClient` to call `mastra.getAgent('questAgent').generateVNext(...)` with:
   - User message as role 'user'
   - Context with role 'assistant' content containing the allowed questions/answers
   - resourceId (user UUID) and threadId (conversationId)
   - Output schema enforced by `zod` (expects object with `text: string`)
   - Input processor `UnicodeNormalizer`
   - Provider options for Google Generative AI including strict safety settings
7. The resulting response is parsed and returned inside the `IResponse<{answer: string}>` envelope through `ResponseService`.

Safety and limits:

- The service sets safety settings for the Google provider to block hate speech, dangerous content, harassment and sexually explicit content at a low threshold and above.
- The call uses `stepCountIs(15)` as a stopping condition and generous `maxOutputTokens`.

## Examples

Replace placeholders with real values.

cURL example for Mastra chat:

```bash
curl -X POST 'https://api.example.com/mastra/chat' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <FIREBASE_ID_TOKEN>' \
  -H 'X-Firebase-AppCheck: <APP_CHECK_TOKEN>' \
  -d '{ "message": "Hello", "conversationId": "<UUID>" }'
```

Example response:

{
"message": "Answer generated by agent (fallback)",
"type": "OK",
"payload": { "answer": "Hello! How can I help you today?" }
}

cURL example for creating a quest:

```bash
curl -X POST 'https://api.example.com/quests' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <FIREBASE_ID_TOKEN>' \
  -H 'X-Firebase-AppCheck: <APP_CHECK_TOKEN>' \
  -d '{ "question": "What is X?", "answer": "X is..." }'
```

## Error handling and edge cases

- Missing headers -> 401 Unauthorized
- Invalid UUID path param -> 400 Bad Request (Nest's `ParseUUIDPipe`)
- Mastra generation failure or schema mismatch -> handled by `ResponseService.errorHandler` and the filter `AllExceptionsFilter` which formats unhandled exceptions into the response envelope.
- Firestore repository errors -> captured by `ResponseService.errorHandler`.
- Large payloads / rate limiting -> not implemented in the codebase; handle on infra/edge (API gateway) if required.

## Troubleshooting and notes

- If quests are not appearing after a create call, confirm `QUESTS_COLLECTION_NAME` env var points to the right Firestore collection and that the Firebase Admin provider has permission to read the collection.
- If App Check fails in local development, set `NODE_ENV=development` to bypass AppCheck verification, or provide a valid AppCheck token when testing.
- Ensure `GEMINI_CLIENT` provider configuration and credentials are present for the Mastra language model calls.

## Appendix: DTOs (Type definitions)

CreateChatDto (server side):

- message: string
- conversationId: string (UUID)

CreateQuestDto:

- question: string
- answer?: string
- uid?: string (UUID)

UpdateQuestDto:

- question?: string
- answer?: string
