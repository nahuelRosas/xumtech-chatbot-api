import * as admin from 'firebase-admin';

export const FIRESTORE_REPOSITORY = 'FIRESTORE_REPOSITORY';

export type FirestoreDocument = FirebaseFirestore.DocumentData;
export type FirestoreCollection =
  FirebaseFirestore.CollectionReference<FirestoreDocument>;
export type FirestoreDocumentRef =
  FirebaseFirestore.DocumentReference<FirestoreDocument>;

export enum EnumOrderDirection {
  ASC = 'asc',
  DESC = 'desc',
}

export interface FetchDocumentByIdParams {
  collectionName: string;
  id: string;
}

export interface DocumentExistsParams {
  collectionName: string;
  id: string;
}

export interface WriteDocumentParams<T> {
  collectionName: string;
  document: T;
  id?: string;
  uid?: string;
}

export interface UpdateDocumentParams<T> {
  collectionName: string;
  id: string;
  partialDocument: Partial<T>;
}

export interface DeleteDocumentParams {
  collectionName: string;
  id: string;
}

export interface IQueryFilter {
  field: string | admin.firestore.FieldPath;
  operator: WhereFilterOp;
  value: unknown;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface QueryCollectionParams<T> {
  collectionName: string;
  filters?: IQueryFilter[];
  selects?: string[];
  orderBy?: string;
  orderDirection?: EnumOrderDirection;
  limit?: number;
  count?: boolean;
}

export interface IExtractDataFromSnapshotParams<T> {
  limit?: number;
  snapshot: FirebaseFirestore.QuerySnapshot<T>;
  shuffle?: boolean;
}

export enum WhereFilterOp {
  INEQUAL = '!=',
  EQUAL = '==',
  LESS_THAN = '<',
  LESS_THAN_OR_EQUAL = '<=',
  GREATER_THAN = '>',
  GREATER_THAN_OR_EQUAL = '>=',
  ARRAY_CONTAINS = 'array-contains',
  IN = 'in',
  ARRAY_CONTAINS_ANY = 'array-contains-any',
  NOT_IN = 'not-in',
}
