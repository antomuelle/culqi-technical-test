import type { BodyCard } from "../src/libs/types.d";

export default {
  valid: {
    card_number: 4213550030432123,
    expiration_month: "08",
    expiration_year: "2026",
    cvv: 482,
    email: "usermail@gmail.com"
  },

  invalid: {
    card_number: 4283550130532825,
    card_number2: 428355013053,
    card_number3: 42835501,
    expiration_month: "13",
    expiration_month2: "00",
    expiration_month3: "20",
    expiration_year: "2010",
    expiration_year2: "2030",
    expiration_year3: "1850",
    cvv: 82,
    cvv2: 482856,
    cvv3: 48274586,
    email: "usermail@example.com",
    email2: "usermail@@@gmail.com",
    email3: "with space@example.com",
  }
}

export const VALID_CARD: BodyCard = {
  card_number: 4213550030432123,
  expiration_month: "12",
  expiration_year: "2025",
  cvv: 256,
  email: "myname@gmail.com",
}

export const INVALID_CARD: BodyCard = {
  card_number: 4283550130532827,
  cvv: 256,
  expiration_month: "12",
  expiration_year: "2025",
  email: "myname@otherdomain.com",
}