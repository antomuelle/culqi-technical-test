import { ValidatedEventAPIGatewayProxyEvent, formatJSONResponse, jsonError } from "@libs/api-gateway";
import { middyfy } from "@libs/lambda";
import * as TokenController from "./controller";
import schema from "./schema";
import { getPK } from "@functions/tokens/controller";

const restore: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async (event) => {
  const isValid = TokenController.validateBody(event.body)
  if (typeof isValid === "string")
    return jsonError(isValid)

  const pk = getPK(event.headers)
  if (pk === false)
    return jsonError("invalid pk")

  const token = event.body.token
  const card = await TokenController.getCard(token, pk)
  if (!card)
    return jsonError("invalid or expired token")

  return formatJSONResponse({
    status: "ok",
    card
  });
};

export const main = middyfy(restore)