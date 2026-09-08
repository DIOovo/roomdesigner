import "server-only";
import { WaffoPancake } from "@waffo/pancake-ts";

type CheckoutClient = Pick<WaffoPancake, "checkout">;

export async function createWaffoCheckout(input: {
  userId: string;
  email: string;
  productId: string;
  productKey: "test_credits";
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
      product_id: input.productId,
      checkout_reference: input.checkoutReference,
    },
  });
}

function getWaffoClient(env: NodeJS.ProcessEnv = process.env) {
  const merchantId = env.WAFFO_MERCHANT_ID?.trim();
  const privateKey = env.WAFFO_PRIVATE_KEY?.trim();
  if (!merchantId || !privateKey) throw new Error("Waffo Pancake credentials are not configured.");
  return new WaffoPancake({ merchantId, privateKey });
}
