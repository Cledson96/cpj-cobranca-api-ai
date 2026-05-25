import type { FastifyReply, FastifyRequest } from "fastify";
import { reviewRequestSchema } from "@shared";
import { BadRequestError, handleUnknownError } from "@/infrastructure/errors";
import type { ReviewService } from "@/modules/review/services";

export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  async execute(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const parsed = reviewRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new BadRequestError("Payload invalido para code review.", parsed.error.flatten());
      }

      const output = await this.reviewService.execute(parsed.data);
      reply.status(200).send(output);
    } catch (error) {
      throw handleUnknownError(error);
    }
  }

  async executeStream(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const parsed = reviewRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new BadRequestError("Payload invalido para stream de review.", parsed.error.flatten());
    }

    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "Content-Encoding": "none",
    });

    const sendSSE = (event: string, data: unknown) => {
      reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    try {
      await this.reviewService.executeStream(parsed.data, (event, data) => {
        sendSSE(event, data);
      });
    } catch (error) {
      const handled = handleUnknownError(error);
      sendSSE("error", { message: handled.message });
      sendSSE("done", {});
    } finally {
      reply.raw.end();
    }
  }
}
