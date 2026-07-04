import crypto from "crypto";
import Razorpay from "razorpay";
import { env } from "../config/env";

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
}

const razorpay = env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET
  ? new Razorpay({
      key_id: env.RAZORPAY_KEY_ID,
      key_secret: env.RAZORPAY_KEY_SECRET
    })
  : null;

const ensureClient = (): Razorpay => {
  if (!razorpay) {
    throw new Error("Razorpay is not configured.");
  }
  return razorpay;
};

export async function createOrder(
  amount: number,
  currency: string,
  receipt: string
): Promise<RazorpayOrder> {
  const client = ensureClient();
  const order = await client.orders.create({
    amount,
    currency,
    receipt
  });

  return {
    id: order.id,
    amount: typeof order.amount === "number" ? order.amount : Number(order.amount),
    currency: order.currency,
    receipt: order.receipt ?? receipt
  };
}

export function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  if (!env.RAZORPAY_KEY_SECRET) {
    return false;
  }
  const payload = `${orderId}|${paymentId}`;
  const expected = crypto
    .createHmac("sha256", env.RAZORPAY_KEY_SECRET)
    .update(payload)
    .digest("hex");
  return expected === signature;
}

export async function refundPayment(paymentId: string, amount: number): Promise<void> {
  const client = ensureClient();
  await client.payments.refund(paymentId, { amount });
}
