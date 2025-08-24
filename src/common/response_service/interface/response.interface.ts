import { HttpStatus, type HttpException } from '@nestjs/common';

export const RESPONSE_SERVICE = 'RESPONSE_SERVICE';

export interface IResponse<T> {
  message?: string;
  success?: boolean;
  statusCode?: number;
  payload?: T;
  error?: unknown;
  type?: keyof typeof HttpStatus;
}

export type IPromiseResponse<T> = Promise<IResponse<T>>;

export type TCreateResponse = <T>({
  type,
  message,
  payload,
}: {
  type: keyof typeof HttpStatus;
  message: string;
  payload?: T;
}) => IResponse<T>;

export type TErrorResponse = ({
  type,
  error,
}: {
  type?: keyof typeof HttpStatus;
  error?: ErrorType | ErrorType[];
}) => void;

export type ErrorType = Error | HttpException | undefined;
