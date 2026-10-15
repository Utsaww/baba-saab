import { util } from "@aws-appsync/utils";
import * as ddb from "@aws-appsync/utils/dynamodb";

// Version-checked save: writes only if nobody else has saved since this editor loaded the invitation.
// An unknown id has no stored version, so it is reported as a conflict too.
export function request(ctx) {
  const { id, expectedVersion, content, templateId, mainDate, coupleNames, searchText, musicTrackId, updatedBy } = ctx.args;
  return ddb.update({
    key: { id },
    update: {
      // AWSJSON arrives parsed; a plain object here would become per-field paths that DynamoDB
      // rejects when a nested map is new, so the whole content is replaced in one SET.
      content: ddb.operations.replace(content),
      templateId,
      mainDate: mainDate ?? null,
      coupleNames,
      searchText,
      musicTrackId: musicTrackId ?? null,
      updatedBy,
      updatedAt: util.time.nowISO8601(),
      version: ddb.operations.increment(1),
    },
    condition: { version: { eq: expectedVersion } },
  });
}

export function response(ctx) {
  if (ctx.error) {
    if (ctx.error.type === "DynamoDB:ConditionalCheckFailedException") {
      util.error("Updated by someone else — reload", "VersionConflict");
    }
    util.error(ctx.error.message, ctx.error.type);
  }
  return ctx.result;
}
