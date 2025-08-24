import * as admin from 'firebase-admin';
import { z } from 'zod';
import { IFactoryFirebaseApp } from '../interfaces/firebase.interface';
import { InternalServerErrorException } from '@nestjs/common';
import { initializeApp, FirebaseApp } from 'firebase/app';

const adminConfigSchema = z.object({
  type: z.string(),
  universe_domain: z.string(),
  auth_provider_x509_cert_url: z.string().url(),
  token_uri: z.string().url(),
  auth_uri: z.string().url(),
  projectId: z.string(),
  private_key_id: z.string(),
  privateKey: z.string().transform((value) => value.replace(/\\n/g, '\n')),
  clientEmail: z.string().email(),
  client_id: z.string(),
  client_x509_cert_url: z.string().url(),
});

const clientConfigSchema = z.object({
  apiKey: z.string(),
  authDomain: z.string().regex(/^[a-zA-Z0-9-]+\.firebaseapp\.com$/, {
    message:
      "Invalid authDomain format. It should match 'project-id.firebaseapp.com'.",
  }),
  projectId: z.string(),
  storageBucket: z.string(),
  messagingSenderId: z.string(),
  appId: z.string(),
  measurementId: z.string(),
});

export default function createFirebaseApp({
  environmentConfigService,
  name,
  firebaseProjectService,
  responseService,
}: IFactoryFirebaseApp): {
  admin: admin.app.App;
  client: FirebaseApp;
  credentials: {
    projectId: string;
    client_email: string;
    private_key: string;
  };
} {
  responseService.setContext(`CreateFirebaseApp ${name}`);
  try {
    const prefix = `FIREBASE_${name.toUpperCase()}_`;
    const getConfigValue = (key: string) =>
      environmentConfigService.retrieveSetting<string>(`${prefix}${key}`);

    const adminConfig = {
      type: environmentConfigService.retrieveSetting('FIREBASE_TYPE'),
      universe_domain: environmentConfigService.retrieveSetting(
        'FIREBASE_UNIVERSAL_DOMAIN',
      ),
      auth_provider_x509_cert_url: environmentConfigService.retrieveSetting(
        'FIREBASE_AUTH_CERT_URL',
      ),
      token_uri: environmentConfigService.retrieveSetting('FIREBASE_TOKEN_URI'),
      auth_uri: environmentConfigService.retrieveSetting('FIREBASE_AUTH_URI'),
      projectId: getConfigValue('PROJECT_ID'),
      private_key_id: getConfigValue('PRIVATE_KEY_ID'),
      privateKey: getConfigValue('PRIVATE_KEY'),
      clientEmail: getConfigValue('CLIENT_EMAIL'),
      client_id: getConfigValue('CLIENT_ID'),
      client_x509_cert_url: getConfigValue('CLIENT_CERT_URL'),
    };

    const clientConfig = {
      apiKey: getConfigValue('API_KEY'),
      authDomain: getConfigValue('AUTH_DOMAIN'),
      projectId: adminConfig.projectId,
      storageBucket: `${adminConfig.projectId}.appspot.com`,
      messagingSenderId: getConfigValue('MESSAGING_SENDER_ID'),
      appId: getConfigValue('APP_ID'),
      measurementId: getConfigValue('MEASUREMENT_ID'),
    };

    const parsedAdminConfig = adminConfigSchema.safeParse(adminConfig);
    if (!parsedAdminConfig.success) {
      throw new InternalServerErrorException(
        `Invalid Firebase admin configuration for app ${name}: ${parsedAdminConfig.error.message}`,
      );
    }

    const parsedClientConfig = clientConfigSchema.safeParse(clientConfig);
    if (!parsedClientConfig.success) {
      throw new InternalServerErrorException(
        `Invalid Firebase client configuration for app ${name}: ${parsedClientConfig.error.message}`,
      );
    }

    firebaseProjectService.addProject(parsedAdminConfig.data.projectId, name);
    return {
      admin: admin.initializeApp(
        {
          credential: admin.credential.cert(
            parsedAdminConfig.data as admin.ServiceAccount,
          ),
          databaseURL: `https://${parsedAdminConfig.data.projectId}.firebaseio.com`,
          storageBucket: parsedClientConfig.data.storageBucket,
          projectId: parsedClientConfig.data.projectId,
          serviceAccountId: parsedAdminConfig.data.clientEmail,
          databaseAuthVariableOverride: {
            uid: 'internal-dashboard-api',
          },
        },
        name,
      ),
      client: initializeApp(parsedClientConfig.data, name),
      credentials: {
        projectId: parsedAdminConfig.data.projectId,
        client_email: parsedAdminConfig.data.clientEmail,
        private_key: parsedAdminConfig.data.privateKey,
      },
    };
  } catch (error) {
    responseService.errorHandler({ error });
  }
}
