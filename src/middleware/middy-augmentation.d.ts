/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-empty-object-type */
import type { ODataMiddlewareContext } from "./types";

declare module "@middy/core" {
  interface Request<
    TEvent = any,
    TResult = any,
    TErr = Error,
    TContext = any,
    TInternal extends Record<string, unknown> = {},
  > {
    odata?: ODataMiddlewareContext;
  }
}
