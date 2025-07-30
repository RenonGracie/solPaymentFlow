import {
    IErrorWithMessage,
    IDetailedError,
    IValidationError,
  } from '../api/types/errors';
  
  export const isErrorWithMessage = (
    error: unknown,
  ): error is IErrorWithMessage => {
    return (
      typeof error === 'object' &&
      error !== null &&
      'Message' in error &&
      typeof (error as Record<string, unknown>).Message === 'string'
    );
  };
  
  export const isDetailedError = (error: unknown): error is IDetailedError => {
    return (
      typeof error === 'object' &&
      error !== null &&
      'error' in error &&
      typeof (error as Record<string, unknown>).error === 'string'
    );
  };
  
  export const isValidationError = (
    error: unknown,
  ): error is IValidationError[] => {
    return (
      Array.isArray(error) &&
      error.length > 0 &&
      error.every(
        (item) =>
          typeof item === 'object' &&
          item !== null &&
          'loc' in item &&
          'msg' in item &&
          'type' in item,
      )
    );
  };
  
  export const formatApiError = (error: unknown): string => {
    if (isErrorWithMessage(error)) {
      return error.Message;
    }
  
    if (isDetailedError(error)) {
      return error.error;
    }
  
    if (isValidationError(error)) {
      return error.map((err) => `${err.loc.join('.')}: ${err.msg}`).join(', ');
    }
  
    if (typeof error === 'string') {
      return error;
    }
  
    return 'Unknown error';
  };