import * as express from 'express';

function wrapArgument(arg: any): any {
  if (typeof arg === "function") {
    if (arg.length === 4) {
      // do not wrap error handler
      return arg;
    }
    return function(req: any, res: any, next: any) {
      const result = arg(...arguments);
      if (result instanceof Promise) {
        result.catch(next);
      }
      return result;
    }
  }
  if (arg instanceof Array) {
    return arg.map(wrapArgument);
  }
  return arg;
}

function makeAsyncSafeMethod(fn: any): any {
  return function(this: any) {
    return fn.call(this, ...wrapArgument([...arguments]));
  }
}

export function MakeAsyncSafe<T extends express.IRouter>(router: T): T {
  for (const method of ["all", "get", "post", "put", "delete", "patch", "options", "head", "use"] as const) {
    router[method] = makeAsyncSafeMethod(router[method]);
  }
  return router;
}