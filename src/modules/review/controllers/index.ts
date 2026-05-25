import type { FastifyReply, FastifyRequest } from "fastify";
import { pullRequestReviewRequestSchema, reviewRequestSchema } from "@shared";
import { BadRequestError, handleUnknownError } from "@/infrastructure/errors";
import type { ReviewService } from "@/modules/review/services";
import type { PullRequestReviewService } from "@/modules/review/pull-request";

export class ReviewController {
  constructor(
    private readonly reviewService: ReviewService,
    private readonly pullRequestReviewService?: PullRequestReviewService,
  ) {}

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

    let sentError = false;
    let sentDone = false;
    const sendSSE = (event: string, data: unknown) => {
      sentError = sentError || event === "error";
      sentDone = sentDone || event === "done";
      reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    try {
      await this.reviewService.executeStream(parsed.data, (event, data) => {
        sendSSE(event, data);
      });
      if (!sentDone) {
        sendSSE("done", {});
      }
    } catch (error) {
      if (!sentDone) {
        const handled = handleUnknownError(error);
        if (!sentError) {
          sendSSE("error", { message: handled.message });
        }
        sendSSE("done", {});
      }
    } finally {
      reply.raw.end();
    }
  }

  async executePullRequest(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const parsed = pullRequestReviewRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new BadRequestError("Payload invalido para review de pull request.", parsed.error.flatten());
      }

      const service = this.requirePullRequestReviewService();
      const output = await service.execute(parsed.data);
      reply.status(200).send(output);
    } catch (error) {
      throw handleUnknownError(error);
    }
  }

  private requirePullRequestReviewService(): PullRequestReviewService {
    if (!this.pullRequestReviewService) {
      throw new Error("Servico de review de pull request nao configurado.");
    }

    return this.pullRequestReviewService;
  }
}
