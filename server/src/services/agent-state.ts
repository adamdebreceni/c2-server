export const PendingUpdates = new Map<string, {files: AssetInfo[], resolve: ()=>void, reject: (reason?: string)=>void}>();
export const PendingRestart = new Map<string, {resolve: ()=>void, reject: ()=>void}>();
export const PendingDebugInfo = new Map<string, {resolve: (file: string)=>void, reject: ()=>void}>();
export const PendingOperationRequest = new Map<string, {request: object, resolve: (answer?: string)=>void, reject: (reason?: string)=>void}>();

export const PendingComponentStop = new Map<string, {id: string, resolve: ()=>void, reject: ()=>void}>();
export const PendingComponentStart = new Map<string, {id: string, resolve: ()=>void, reject: ()=>void}>();

export const PendingOperations = new Map<string, {resolve: (data?: any)=>void, reject: (reason?: string)=>void}>()
export const PendingPropertyUpdates = new Map<string, {properties: {name: string, value: string, persist: boolean}[], cb: {resolve: ()=>void, reject: ()=>void}}>();