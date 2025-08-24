import { Injectable, Inject } from '@nestjs/common';
import * as admin from 'firebase-admin';
import {
  FirestoreCollection,
  FirestoreDocumentRef,
  EnumOrderDirection,
  FetchDocumentByIdParams,
  DocumentExistsParams,
  WriteDocumentParams,
  UpdateDocumentParams,
  DeleteDocumentParams,
  QueryCollectionParams,
  IExtractDataFromSnapshotParams,
} from '../application/interfaces/firestore.repository.interface';
import {
  FIREBASE_ADMIN_PROVIDER,
  IFirebaseAdminProvider,
} from '../application/interfaces/firebase.interface';
import { RESPONSE_SERVICE } from 'src/common/response_service/interface/response.interface';
import { instanceToPlain } from 'class-transformer';
import { BaseService } from 'src/common/base/application/service/base.service';
import { ResponseService } from 'src/common/response_service/service/response.service';

@Injectable()
export class FirestoreRepository extends BaseService {
  public database: FirebaseFirestore.Firestore;

  constructor(
    @Inject(RESPONSE_SERVICE)
    private readonly responseService: ResponseService,
    @Inject(FIREBASE_ADMIN_PROVIDER)
    private readonly firebaseApps: IFirebaseAdminProvider,
  ) {
    super();
    this.database = firebaseApps['default'].admin.firestore();
    this.database.settings({ ignoreUndefinedProperties: true });
    this.responseService.setContext(FirestoreRepository.name);
  }

  public setProject(selectedApp: string): void {
    if (!this.firebaseApps[selectedApp]) {
      this.responseService.errorHandler({
        error: new Error(`Firebase app ${selectedApp} not found`),
      });
    }
    this.database = this.firebaseApps[selectedApp].admin.firestore();
  }

  private getCollectionRef(collectionName: string): FirestoreCollection {
    return this.database.collection(collectionName);
  }

  private getDocumentRef(
    collectionName: string,
    documentId: string,
  ): FirestoreDocumentRef {
    return this.getCollectionRef(collectionName).doc(documentId);
  }

  private async handleSnapshot(
    collectionName: string,
    id: string,
  ): Promise<FirebaseFirestore.DocumentSnapshot | null> {
    try {
      return await this.getDocumentRef(collectionName, id).get();
    } catch (error) {
      this.responseService.errorHandler({ error });
      return null;
    }
  }

  public async fetchDocumentById<T>({
    collectionName,
    id,
  }: FetchDocumentByIdParams): Promise<T | null> {
    try {
      const snapshot = await this.handleSnapshot(collectionName, id);
      return snapshot?.exists ? (snapshot.data() as T) : null;
    } catch (error) {
      this.responseService.errorHandler({ error });
      return null;
    }
  }

  public async documentExists({
    collectionName,
    id,
  }: DocumentExistsParams): Promise<boolean> {
    const snapshot = await this.handleSnapshot(collectionName, id);
    return snapshot?.exists || false;
  }

  public async saveDocument<T>({
    collectionName,
    document,
    id,
  }: WriteDocumentParams<T>): Promise<FirebaseFirestore.WriteResult> {
    try {
      const plainDocument = instanceToPlain(document, {
        exposeUnsetFields: false,
      });
      const uid = id ?? this.database.collection(collectionName).doc().id;
      plainDocument.uid = uid;
      return await this.getCollectionRef(collectionName)
        .doc(uid)
        .set(plainDocument);
    } catch (error) {
      this.responseService.errorHandler({ error });
      return null;
    }
  }

  public async updateDocument<T>({
    collectionName,
    id,
    partialDocument,
  }: UpdateDocumentParams<T>): Promise<FirebaseFirestore.WriteResult> {
    try {
      const plainDocument = instanceToPlain(partialDocument, {
        exposeUnsetFields: false,
      });
      return await this.getDocumentRef(collectionName, id).update(
        plainDocument,
      );
    } catch (error) {
      this.responseService.errorHandler({ error });
      return null;
    }
  }

  public async deleteDocument({
    collectionName,
    id,
  }: DeleteDocumentParams): Promise<FirebaseFirestore.WriteResult> {
    try {
      return await this.getDocumentRef(collectionName, id).delete();
    } catch (error) {
      this.responseService.errorHandler({ error });
      return null;
    }
  }

  public async queryCollection<T>({
    collectionName,
    filters = [],
    orderBy,
    orderDirection = EnumOrderDirection.ASC,
    selects = [],
    limit,
  }: QueryCollectionParams<T>): Promise<
    FirebaseFirestore.QuerySnapshot<T, FirebaseFirestore.DocumentData>
  > {
    try {
      let query = this.getCollectionRef(
        collectionName,
      ) as admin.firestore.Query<
        admin.firestore.DocumentData,
        admin.firestore.DocumentData
      >;

      if (selects.length) {
        query = query.select(...selects);
      }

      filters.forEach(({ field, operator, value }) => {
        query = query.where(field, operator, value);
      });

      if (orderBy) query = query.orderBy(orderBy, orderDirection);
      if (limit) query = query.limit(limit);

      return (await query.get()) as unknown as FirebaseFirestore.QuerySnapshot<
        T,
        FirebaseFirestore.DocumentData
      >;
    } catch (error) {
      this.responseService.errorHandler({ error });
      return null;
    }
  }

  public extractDataFromSnapshot<T>({
    snapshot,
    limit,
    shuffle,
  }: IExtractDataFromSnapshotParams<T>): T[] {
    if (!snapshot || !snapshot.docs || !snapshot.docs.length) {
      return [];
    }

    let elements = snapshot.docs;

    if (shuffle) {
      elements = this.shuffleArray(elements);
    }

    if (limit && limit < elements.length) {
      elements = elements.slice(0, limit);
    }

    return elements.map((doc) => doc.data());
  }
}
