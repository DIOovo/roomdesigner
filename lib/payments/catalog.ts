export const paymentProductKeys = ["starter", "pro", "credits", "test_credits"] as const;

export type PaymentProductKey = (typeof paymentProductKeys)[number];

export const paymentCatalog = {
  starter: {
    key: "starter",
    type: "subscription",
    interval: "month",
    currency: "USD",
    creditsPerPeriod: 20,
    commercialLicense: false,
    priorityQueue: false,
    creemProductEnv: "CREEM_PRODUCT_STARTER",
    waffoProductEnv: "WAFFO_PRODUCT_STARTER",
    testOnly: false,
  },
  pro: {
    key: "pro",
    type: "subscription",
    interval: "month",
    currency: "USD",
    creditsPerPeriod: 60,
    commercialLicense: true,
    priorityQueue: true,
    creemProductEnv: "CREEM_PRODUCT_PRO",
    waffoProductEnv: "WAFFO_PRODUCT_PRO",
    testOnly: false,
  },
  credits: {
    key: "credits",
    type: "one_time",
    currency: "USD",
    credits: 30,
    expiresInDays: 365,
    commercialLicense: false,
    priorityQueue: false,
    creemProductEnv: "CREEM_PRODUCT_CREDIT_PACK",
    waffoProductEnv: "WAFFO_PRODUCT_CREDIT_PACK",
    testOnly: false,
  },
  test_credits: {
    key: "test_credits",
    type: "one_time",
    currency: "USD",
    credits: 5,
    expiresInDays: 365,
    commercialLicense: false,
    priorityQueue: false,
    creemProductEnv: "CREEM_PRODUCT_TEST_CREDITS",
    waffoProductEnv: "WAFFO_PRODUCT_TEST_CREDITS",
    testOnly: true,
  },
} as const satisfies Record<PaymentProductKey, {
  key: PaymentProductKey;
  type: "subscription" | "one_time";
  currency: "USD";
  commercialLicense: boolean;
  priorityQueue: boolean;
  creemProductEnv: string;
  waffoProductEnv: string | null;
  testOnly: boolean;
  interval?: "month";
  creditsPerPeriod?: number;
  credits?: number;
  expiresInDays?: number;
}>;

export function isPaymentProductKey(value: unknown): value is PaymentProductKey {
  return typeof value === "string" && paymentProductKeys.includes(value as PaymentProductKey);
}

export function getPaymentProduct(key: PaymentProductKey) {
  return paymentCatalog[key];
}

export function isPaymentProductEnabled(key: PaymentProductKey, testMode = process.env.PAYMENTS_TEST_MODE) {
  return !paymentCatalog[key].testOnly || testMode === "true";
}

export function getEnabledPaymentProduct(key: PaymentProductKey, testMode = process.env.PAYMENTS_TEST_MODE) {
  if (!isPaymentProductEnabled(key, testMode)) throw new Error("The requested payment product is not enabled.");
  return paymentCatalog[key];
}

export function getCreemProductId(key: PaymentProductKey, env: NodeJS.ProcessEnv = process.env) {
  const product = getEnabledPaymentProduct(key, env.PAYMENTS_TEST_MODE);
  const productId = env[product.creemProductEnv];
  if (!productId) throw new Error(`${product.creemProductEnv} is not configured.`);
  return productId;
}

export function getPaymentProductKeyByCreemId(productId: string, env: NodeJS.ProcessEnv = process.env) {
  const matches = paymentProductKeys.filter((key) => {
    const configured = env[paymentCatalog[key].creemProductEnv]?.trim();
    return configured && configured === productId;
  });
  return matches.length === 1 ? matches[0] : null;
}

export function getWaffoProductId(key: PaymentProductKey, env: NodeJS.ProcessEnv = process.env) {
  const product = getEnabledPaymentProduct(key, env.PAYMENTS_TEST_MODE);
  if (!product.waffoProductEnv) throw new Error("The requested product is not available through Waffo checkout.");
  const productId = env[product.waffoProductEnv]?.trim();
  if (!productId) throw new Error(`${product.waffoProductEnv} is not configured.`);
  return productId;
}

export function getPaymentProductKeyByWaffoId(productId: string, env: NodeJS.ProcessEnv = process.env) {
  const matches = paymentProductKeys.filter((key) => {
    const envName = paymentCatalog[key].waffoProductEnv;
    return envName && env[envName]?.trim() === productId;
  });
  return matches.length === 1 ? matches[0] : null;
}
