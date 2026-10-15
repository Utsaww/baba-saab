import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { lookup } from "./lookup";

const db = DynamoDBDocumentClient.from(new DynamoDBClient());
const tables = { invitation: process.env.INVITATION_TABLE ?? "", slug: process.env.INVITATION_SLUG_TABLE ?? "" };

export const handler = async (event: { arguments: { slug: string; previewToken?: string | null } }) => {
  try {
    return await lookup(db, tables, event.arguments);
  } catch (err) {
    console.error("invitation-public failed", err);
    throw new Error("Something went wrong. Please try again.");
  }
};
