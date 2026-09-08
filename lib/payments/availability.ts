export function isPaymentsLive(value: string | undefined) {
  return value === "true";
}

export function paymentTestEmails(value = process.env.PAYMENTS_TEST_EMAILS) {
  return new Set((value ?? "").split(",").map((email) => email.trim().toLowerCase()).filter(Boolean));
}

export function canUsePaymentTest(email: string | null | undefined, env: NodeJS.ProcessEnv = process.env) {
  return env.PAYMENTS_TEST_MODE === "true"
    && typeof email === "string"
    && paymentTestEmails(env.PAYMENTS_TEST_EMAILS).has(email.trim().toLowerCase());
}
