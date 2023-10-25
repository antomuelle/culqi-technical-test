import crypto from 'node:crypto'

export const VALID_DOMAINS = [
	'gmail.com',
	'hotmail.com',
	'yahoo.es'
]

export function validateCard(card: string): boolean {
	if (card.length < 13 || card.length > 16) return false;

  // Accept only digits, dashes or spaces
	if (/[^0-9-\s]+/.test(card)) return false;

	let nCheck = 0, bEven = false;
	card = card.replace(/\D/g, "");

	for (var n = card.length - 1; n >= 0; n--) {
		var cDigit = card.charAt(n),
			  nDigit = parseInt(cDigit, 10);

		if (bEven && (nDigit *= 2) > 9) nDigit -= 9;

		nCheck += nDigit;
		bEven = !bEven;
	}

	return (nCheck % 10) == 0;
}

export function validateCCV(cvv: number) {
	const secret = String(cvv)
	return (secret.length >= 3 && secret.length <= 4)
}

export function validateMonth(value: string) {
	const len = value.length
	const month = parseInt(value)
	return !(len < 1 || len > 2 || month < 1 || month > 12)
}

export function validateYear(value: string) {
	const year = parseInt(value)
	const now = new Date().getFullYear()
	return !(value.length < 4 || year < now || year > (now + 5) || isNaN(year))
}

export function validateEmail(email: string): boolean {
	if (email.length < 5 || email.length > 100) return false;

	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return false;

	return VALID_DOMAINS.includes(email.substring(email.lastIndexOf('@') + 1));
}

crypto.getRandomValues(Buffer.allocUnsafe(21))