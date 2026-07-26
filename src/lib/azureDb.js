import { TableClient, AzureSASCredential } from "@azure/data-tables";

const accountName = "hbplusstorage";
const sasToken = process.env.NEXT_PUBLIC_AZURE_SAS_TOKEN;
const endpoint = `https://${accountName}.table.core.windows.net`;

/**
 * Utility to get a Table Client
 * @param {string} tableName 
 */
export const getTableClient = (tableName) => {
  return new TableClient(endpoint, tableName, new AzureSASCredential(sasToken));
};

// Common Table Names
export const TABLES = {
  PROFILES: "Profiles",
  TASKS: "Tasks",
  SUBMISSIONS: "Submissions",
  CLANS: "Clans",
  FLASHCARDS: "Flashcards",
  MANUAL_AWARDS: "ManualAwards"
};

/**
 * Fetch all entities from a table
 */
export const getAllEntities = async (tableName) => {
  const client = getTableClient(tableName);
  const entities = [];
  const iterator = client.listEntities();
  for await (const entity of iterator) {
    entities.push(entity);
  }
  return entities;
};

/**
 * Upsert an entity (Create or Update)
 * @param {string} tableName 
 * @param {object} entity Must have partitionKey and rowKey
 */
export const upsertEntity = async (tableName, entity) => {
  const client = getTableClient(tableName);
  await client.upsertEntity(entity, "Merge");
};
