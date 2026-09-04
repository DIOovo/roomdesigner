export type GenerateAfterFrameInput = {
  firstFrame: string;
  roomType: string;
  style: string;
  prompt: string;
};

export type GenerateAfterFrameResult = { imageUrl: string; provider: string };

export interface AfterFrameProvider {
  readonly name: string;
  generate(input: GenerateAfterFrameInput): Promise<GenerateAfterFrameResult>;
}
