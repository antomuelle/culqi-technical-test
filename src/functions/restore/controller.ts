import { redisClient } from "@libs/clients"
import type { CardPK, CardFix } from "@libs/types"

type Body = { token: string }

export function validateBody(body: Body): boolean|string {
  const token = body.token
  if (typeof token === "string" && token.length === 16)
    return true

  return "invalid token "
}

export async function getCard(token: string, pk: string): Promise<CardFix|null> {
  if (!redisClient.isOpen)
    await redisClient.connect()

  const value = await redisClient.get(token)
  if (!value) return null

  const card: CardPK = JSON.parse(value)
  if (card.pk !== pk) return null
  
  const { cvv, ...copy } = card
  return copy
}