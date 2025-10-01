import * as net from 'net';
import { Mastra } from '@mastra/core/mastra';
import { Memory } from '@mastra/memory';
import { PgVector, PostgresStore } from '@mastra/pg';
import { fastembed } from '@mastra/fastembed';
import { EnvConfigService } from 'src/common/env_config/service/envconfig.service';
import { GoogleGenerativeAIProvider } from '@ai-sdk/google';
import { createQuestAgent } from '../agents/quest-agent';
import { ResponseService } from 'src/common/response_service/service/response.service';

export async function createMastra(
  environmentConfigService: EnvConfigService,
  geminiClient: GoogleGenerativeAIProvider,
  responseService: ResponseService,
) {
  responseService.setContext(createMastra.name);
  const model = geminiClient('gemini-2.5-flash-lite');
  const State =
    environmentConfigService.retrieveSetting<string>('STATE_MEMORY') ||
    'memory';
  const host =
    environmentConfigService.retrieveSetting<string>('PG_HOST') || 'localhost';
  const port = Number(
    environmentConfigService.retrieveSetting<string>('PG_PORT') || 5432,
  );
  const user =
    environmentConfigService.retrieveSetting<string>('PG_USER') || 'postgres';
  const password =
    environmentConfigService.retrieveSetting<string>('PG_PASSWORD') ||
    'postgres';
  const database =
    environmentConfigService.retrieveSetting<string>('PG_DATABASE') ||
    'postgres';

  const connectionString =
    environmentConfigService.retrieveSetting<string>('PG_CONNECTION_STRING') ||
    `postgresql://${user}:${password}@${host}:${port}/${database}`;

  const waitForPort = (
    hostToCheck: string,
    portToCheck: number,
    timeout = 1500,
  ) =>
    new Promise<boolean>((resolve) => {
      const socket = new net.Socket();
      let settled = false;
      const onResult = (ok: boolean) => {
        if (settled) return;
        settled = true;
        if (socket && typeof socket.destroy === 'function') socket.destroy();
        resolve(ok);
      };

      socket.setTimeout(timeout);
      socket.once('connect', () => onResult(true));
      socket.once('timeout', () => onResult(false));
      socket.once('error', () => onResult(false));
      socket.connect(portToCheck, hostToCheck);
    });

  const tcpOk = await waitForPort(host, port, 30000).catch(() => false);

  let memory: Memory;
  if (!tcpOk || State === 'memory') {
    responseService.warn(
      `Could not reach Postgres at ${host}:${port} — using in-memory memory instead`,
    );
    memory = new Memory({
      options: {
        lastMessages: 10,
      },
      embedder: fastembed,
    });
  } else {
    memory = new Memory({
      storage: new PostgresStore({
        host,
        port,
        user,
        database,
        password,
      }),
      vector: new PgVector({ connectionString }),
      options: {
        lastMessages: 10,
        semanticRecall: {
          topK: 3,
          messageRange: 2,
          scope: 'resource',
        },
      },
      embedder: fastembed,
    });
  }

  const questAgent = createQuestAgent(model, memory);

  return new Mastra({
    agents: { questAgent },
    telemetry: {
      enabled: false,
    },
  });
}
