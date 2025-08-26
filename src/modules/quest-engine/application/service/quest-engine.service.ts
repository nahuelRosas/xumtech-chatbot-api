import { Inject, Injectable } from '@nestjs/common';
import {
  IResponse,
  RESPONSE_SERVICE,
} from 'src/common/response_service/interface/response.interface';
import { ResponseService } from 'src/common/response_service/service/response.service';
import { FIRESTORE_REPOSITORY } from 'src/common/firebase/application/interfaces/firestore.repository.interface';
import { FirestoreRepository } from 'src/common/firebase/repository/firestore.repository';
import { v5 as uuidv5 } from 'uuid';
import { APP_ENVIRONMENT_SERVICE } from 'src/common/env_config/interface/envconfig.interface';
import { EnvConfigService } from 'src/common/env_config/service/envconfig.service';
import { CreateQuestDto } from '../dto/create-quest.dto';
import { UpdateQuestDto } from '../dto/update-quest.dto';

@Injectable()
export class QuestEngineService {
  private readonly collection: string;
  private questsState: Record<string, CreateQuestDto> | null = null;
  constructor(
    @Inject(RESPONSE_SERVICE)
    private readonly responseService: ResponseService,
    @Inject(FIRESTORE_REPOSITORY)
    private readonly firestoreRepository: FirestoreRepository,
    @Inject(APP_ENVIRONMENT_SERVICE)
    private readonly configService: EnvConfigService,
  ) {
    this.responseService.setContext(QuestEngineService.name);
    this.collection = configService.retrieveSetting<string>(
      'QUESTS_COLLECTION_NAME',
    );
  }

  public async getAllQuests(): Promise<IResponse<CreateQuestDto[]>> {
    try {
      await this.ensureStateLoaded();

      const quests = Object.values(this.questsState ?? {});

      if (!quests.length)
        return this.responseService.createResponse({
          message: 'No quests found',
          payload: [],
          type: 'NOT_FOUND',
        });

      return this.responseService.createResponse({
        message: 'Quest retrieved successfully',
        payload: quests,
        type: 'OK',
      });
    } catch (error) {
      this.responseService.errorHandler({ error });
    }
  }

  public async getQuest(
    text: string,
  ): Promise<IResponse<CreateQuestDto | null>> {
    try {
      const uid = uuidv5(
        `${text}`,
        this.configService.retrieveSetting<string>('UUID_NAMESPACE'),
      );

      await this.ensureStateLoaded();

      const quest = this.questsState ? (this.questsState[uid] ?? null) : null;

      if (!quest) {
        return this.responseService.createResponse({
          message: 'Quest not found',
          payload: null,
          type: 'NOT_FOUND',
        });
      }

      return this.responseService.createResponse({
        message: 'Quest retrieved successfully',
        payload: quest,
        type: 'OK',
      });
    } catch (error) {
      this.responseService.errorHandler({ error });
    }
  }

  public async createQuests(
    payload: Partial<CreateQuestDto> | Partial<CreateQuestDto>[],
  ) {
    try {
      const items = Array.isArray(payload) ? payload : [payload];

      const created: CreateQuestDto[] = [];

      for (const item of items) {
        const questionStr = item?.question ?? '';
        const answerStr = item?.answer ?? '';

        const uid =
          item?.uid ??
          uuidv5(
            `${questionStr}`,
            this.configService.retrieveSetting<string>('UUID_NAMESPACE'),
          );

        const document: CreateQuestDto = {
          uid,
          question: questionStr,
          answer: answerStr,
        };

        await this.firestoreRepository.saveDocument<CreateQuestDto>({
          collectionName: this.collection,
          document,
          id: uid,
        });

        created.push(document);
      }

      await this.ensureStateLoaded();
      for (const doc of created) {
        if (!this.questsState) this.questsState = {};
        this.questsState[doc.uid] = doc;
      }

      return this.responseService.createResponse({
        message: 'Quest(s) created successfully',
        payload: Array.isArray(payload) ? created : created[0],
        type: 'CREATED',
      });
    } catch (error) {
      this.responseService.errorHandler({ error });
    }
  }

  public async editQuest(uid: string, payload: UpdateQuestDto) {
    try {
      const updates = {} as Partial<UpdateQuestDto>;
      if (payload.question !== undefined) updates.question = payload.question;
      if (payload.answer !== undefined) updates.answer = payload.answer;

      await this.firestoreRepository.updateDocument<UpdateQuestDto>({
        collectionName: this.collection,
        id: uid,
        partialDocument: updates,
      });

      if (this.questsState && this.questsState[uid]) {
        const existing = this.questsState[uid];
        this.questsState[uid] = { ...existing, ...updates } as CreateQuestDto;
      }

      return this.responseService.createResponse({
        message: 'Quest updated successfully',
        payload: { uid, ...updates },
        type: 'OK',
      });
    } catch (error) {
      this.responseService.errorHandler({ error });
    }
  }

  public async deleteQuest(uid: string) {
    try {
      await this.firestoreRepository.deleteDocument({
        collectionName: this.collection,
        id: uid,
      });

      if (this.questsState && this.questsState[uid]) {
        delete this.questsState[uid];
      }

      return this.responseService.createResponse({
        message: 'Quest deleted successfully',
        payload: { uid },
        type: 'OK',
      });
    } catch (error) {
      this.responseService.errorHandler({ error });
    }
  }

  private async ensureStateLoaded(): Promise<void> {
    if (this.questsState !== null) return;

    this.questsState = {};

    const snapshot =
      await this.firestoreRepository.queryCollection<CreateQuestDto>({
        collectionName: this.collection,
      });

    if (!snapshot || !snapshot.docs) return;

    const quests = this.firestoreRepository.extractDataFromSnapshot({
      snapshot,
    });

    for (const q of quests) {
      if (q?.uid) this.questsState[q.uid] = q;
    }
  }
}
