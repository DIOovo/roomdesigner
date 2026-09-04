export function safeGenerationError(stage: string) {
  if (stage.includes("after")) return "We could not create the redesigned room. Please try again with a clearer photo.";
  if (stage.includes("video") || stage.includes("submitting")) return "The video provider could not complete this generation. Please try again.";
  if (stage.includes("watermark")) return "The protected download could not be prepared. Your generation was not charged.";
  return "Generation failed because of a temporary system error. Please try again.";
}
