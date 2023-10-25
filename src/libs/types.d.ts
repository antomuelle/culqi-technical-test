export type Card = {
  card_number: number,
  expiration_month: string,
  expiration_year: string,
  cvv: number,
}

export type BodyCard = Card & { email: string }

export type CardPK = BodyCard & { pk: string }

export type CardFix = Omit<CardPK, 'cvv'>;