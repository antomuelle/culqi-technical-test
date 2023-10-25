// import type { BodyCard } from "../src/libs/types.d";
import * as TokenController from "../src/functions/tokens/controller"
import { validateCCV, validateCard, validateEmail, validateMonth, validateYear } from "../src/libs/helpers";
import data, { INVALID_CARD, VALID_CARD } from "./constants";

describe("Validate card and email", ()=> {
  test("should return true for a valid card", ()=> {
    expect(validateCard(String(data.valid.card_number))).toStrictEqual(true)
  })
  test("should return true for a valid cvv", ()=> {
    expect(validateCCV(data.valid.cvv)).toStrictEqual(true)
  })
  test("should return true for a valid expiration month", ()=> {
    expect(validateMonth(data.valid.expiration_month)).toStrictEqual(true)
  })
  test("should return true for a valid expiration year", ()=> {
    expect(validateYear(data.valid.expiration_year)).toStrictEqual(true)
  })
  test("should return true for a valid email", ()=> {
    expect(validateEmail(data.valid.email)).toStrictEqual(true)
  })

  test("should return false for invalid values", ()=> {
    expect(validateCard(String(data.invalid.card_number))).toStrictEqual(false)
    expect(validateCCV(data.invalid.cvv)).toStrictEqual(false)
    expect(validateMonth(data.invalid.expiration_month)).toStrictEqual(false)
    expect(validateYear(data.invalid.expiration_year)).toStrictEqual(false)
    expect(validateEmail(data.invalid.email)).toStrictEqual(false)
  })

  test("should return true for a valid card", () => {
    expect(TokenController.validateBodyCard(VALID_CARD)).toBe(true)
  })
  test("should return a message string for a invalid card", () => {
    expect(typeof TokenController.validateBodyCard(INVALID_CARD)).toBe("string")
  })
})