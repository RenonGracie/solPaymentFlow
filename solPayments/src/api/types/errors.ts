export interface IErrorWithMessage {
    Message: string;
  }
  
  export interface IDetailedError {
    error: string;
    details?: Record<string, unknown>;
  }
  
  export interface IValidationError {
    loc: string[];
    msg: string;
    type: string;
  }
  
  export type TApiError =
    | IErrorWithMessage
    | IDetailedError
    | IValidationError[]
    | string;