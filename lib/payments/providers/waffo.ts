import "server-only";
import { createPrivateKey } from "node:crypto";
import { WaffoPancake } from "@waffo/pancake-ts";
import type { PaymentProductKey } from "@/lib/payments/catalog";

type CheckoutClient = Pick<WaffoPancake, "checkout">;

export async function createWaffoCheckout(input: {
  userId: string;
  email: string;
  productId: string;
  productKey: PaymentProductKey;
  checkoutReference: string;
  successUrl: string;
}, options: { client?: CheckoutClient; env?: NodeJS.ProcessEnv } = {}) {
  const client = options.client ?? getWaffoClient(options.env);
  return client.checkout.createSession({
    productId: input.productId,
    currency: "USD",
    buyerEmail: input.email,
    successUrl: input.successUrl,
    orderMerchantExternalId: input.checkoutReference,
    metadata: {
      user_id: input.userId,
      product_key: input.productKey,
      waffo_product_id: input.productId,
      checkout_reference: input.checkoutReference,
    },
  });
}

function getWaffoClient(env: NodeJS.ProcessEnv = process.env) {
  const merchantId = env.WAFFO_MERCHANT_ID?.trim();
  const encodedPrivateKey = env.WAFFO_PRIVATE_KEY_BASE64?.trim();
  const legacyPrivateKey = env.WAFFO_PRIVATE_KEY?.replace(/\\n/g, "\n").trim();
  const keySource = encodedPrivateKey ? "base64" : legacyPrivateKey ? "legacy" : "missing";
  const privateKey = encodedPrivateKey
    ? Buffer.from(encodedPrivateKey, "base64").toString("utf8").trim()
    : legacyPrivateKey ?? "";
  const hasPemHeader = /^-----BEGIN (?:RSA )?PRIVATE KEY-----/.test(privateKey);
  const hasPemFooter = /-----END (?:RSA )?PRIVATE KEY-----$/.test(privateKey);
  const hasNewline = privateKey.includes("\n");
  let keyParseable = false;

  if (privateKey) {
    try {
      createPrivateKey(privateKey);
      keyParseable = true;
    } catch {
      keyParseable = false;
    }
  }

  console.info("Waffo private key diagnostics", {
    keySource,
    hasPemHeader,
    hasPemFooter,
    hasNewline,
    keyParseable,
  });

  if (keySource === "missing") {
    throw new Error("WAFFO private key environment variable is missing");
  }
  if (keySource === "base64" && !hasPemHeader) {
    throw new Error("Decoded WAFFO_PRIVATE_KEY_BASE64 is not a PEM private key");
  }
  if (!keyParseable) {
    throw new Error("Decoded Waffo private key is not parseable by Node crypto");
  }
  if (!merchantId) throw new Error("WAFFO merchant ID is not configured.");
  return new WaffoPancake({ merchantId, privateKey });
}
