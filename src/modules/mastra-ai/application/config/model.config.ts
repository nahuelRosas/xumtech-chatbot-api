import {
  createGoogleGenerativeAI,
  GoogleGenerativeAIProvider,
} from '@ai-sdk/google';
import { EnvConfigService } from 'src/common/env_config/service/envconfig.service';

export const GEMINI_CLIENT = 'GEMINI_CLIENT';

export function createGeminiClient(
  envConfigService: EnvConfigService,
): GoogleGenerativeAIProvider {
  return createGoogleGenerativeAI({
    apiKey:
      envConfigService.retrieveSetting<string>(
        'GOOGLE_GENERATIVE_AI_API_KEY',
      ) || '',

    fetch: (input: RequestInfo | URL, init?: RequestInit) => {
      try {
        let modifiedInit: RequestInit = init ?? {};
        try {
          const body = JSON.parse(
            typeof modifiedInit.body === 'string' ? modifiedInit.body : '{}',
          );

          if (!body.generationConfig) {
            body.generationConfig = {};
          }

          const hasFunctionDeclarations = (() => {
            try {
              if (
                Array.isArray(
                  body?.toolConfig?.functionCallingConfig?.functionDeclarations,
                ) &&
                body.toolConfig.functionCallingConfig.functionDeclarations
                  .length > 0
              ) {
                return true;
              }

              if (
                Array.isArray(
                  body?.toolConfig?.functionCallingConfig
                    ?.function_declarations,
                ) &&
                body.toolConfig.functionCallingConfig.function_declarations
                  .length > 0
              ) {
                return true;
              }

              if (Array.isArray(body?.tools)) {
                for (const t of body.tools) {
                  if (
                    Array.isArray(t?.function_declarations) &&
                    t.function_declarations.length > 0
                  ) {
                    return true;
                  }
                  if (
                    Array.isArray(t?.functionDeclarations) &&
                    t.functionDeclarations.length > 0
                  ) {
                    return true;
                  }
                }
              }

              if (
                Array.isArray(body?.toolConfig?.function_declarations) &&
                body.toolConfig.function_declarations.length > 0
              ) {
                return true;
              }

              return false;
            } catch {
              return false;
            }
          })();

          if (hasFunctionDeclarations) {
            if (!body.toolConfig) {
              body.toolConfig = {};
            }
            if (!body.toolConfig.functionCallingConfig) {
              body.toolConfig.functionCallingConfig = {};
            }

            if (body.generationConfig.responseSchema) {
              body.toolConfig.functionCallingConfig.mode = 'AUTO';
            } else {
              body.toolConfig.functionCallingConfig.mode = 'ANY';
            }
          }

          modifiedInit = {
            ...modifiedInit,
            body: JSON.stringify(body),
          };
        } catch (error) {
          console.error('Error modifying request body:', error);
        }

        return globalThis.fetch(input, modifiedInit);
      } catch (error) {
        console.error('Error in custom fetch:', error);
        throw error;
      }
    },
  });
}
