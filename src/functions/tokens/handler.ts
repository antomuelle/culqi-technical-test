import { ValidatedEventAPIGatewayProxyEvent, formatJSONResponse, jsonError } from "@libs/api-gateway";
import { middyfy } from "@libs/lambda";
import schema from "./schema";
import * as TokenController from "./controller";

const tokens: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async (event) => {

  const isValid = TokenController.validateBodyCard(event.body)
  if (typeof isValid === "string")
    return jsonError(isValid)

  const pk = TokenController.getPK(event.headers)
  if (pk === false)
    return jsonError("invalid pk")

  const token = await TokenController.tokenize(event.body, pk)

  return formatJSONResponse({
    status: "ok",
    token,
  })
}

export const main = middyfy(tokens)