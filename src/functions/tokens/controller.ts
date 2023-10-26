import { validateCCV, validateCard, validateEmail, validateMonth, validateYear } from "../../libs/helpers";
import { customAlphabet } from "../../libs/nanoid";
import { redisClient } from "../../libs/clients"
import type { APIGatewayProxyEventHeaders } from "aws-lambda";
import type { BodyCard } from "../../libs/types.d";

const nanoid = customAlphabet("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789", 16)
const pk_prefix = "pk_test_"

export function validateBodyCard(body: BodyCard): boolean|string {
  const { card_number, cvv, expiration_month, expiration_year, email } = body

  if (!validateCard(String(card_number))) return "invalid card"

  if (!validateCCV(cvv)) return "invalid cvv"

  if (!validateMonth(expiration_month)) return "invalid expiration month"

  if (!validateYear(expiration_year)) return "invalid expiration year"

  if (!validateEmail(email)) return "invalid email"

  return true
}

export function getPK(headers: APIGatewayProxyEventHeaders): string|false {
  const authorization = headers.authorization || headers.Authorization
  if (!authorization) return false
  const token = authorization.replace(/^Bearer\s+/, "")
  if (!token) return false
  if (!token.startsWith(pk_prefix)) return false

  const alpha_num = token.substring(pk_prefix.length)
  if (!/^[a-zA-Z0-9]{16}$/.test(alpha_num)) return false

  return token
}

export async function tokenize(body: BodyCard, pk: string): Promise<string> {
  const token = nanoid()
  if (!redisClient.isOpen)
    await redisClient.connect()
  
  await redisClient.set(token, JSON.stringify({ ...body, pk }))
  redisClient.expire(token, 900)
  return token
}