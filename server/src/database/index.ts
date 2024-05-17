/// <reference path="index.d.ts" />

import { CreateSQLite } from "./sqlite";

export async function CreateDatabase(): Promise<Database> {
  return CreateSQLite();
}