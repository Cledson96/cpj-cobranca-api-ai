import type { FastifyReply, FastifyRequest } from "fastify";
import { pullRequestTestsRequestSchema, testsRequestSchema } from "@shared";
import { BadRequestError, handleUnknownError } from "@/infrastructure/errors";
import type { TestsService } from "@/modules/tests/services";
import type { PullRequestTestsService } from "@/modules/tests/pull-request";

export class TestsController {
  constructor(
    private readonly testsService: TestsService,
    private readonly pullRequestTestsService?: PullRequestTestsService,
  ) {}

  async execute(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const parsed = testsRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new BadRequestError("Payload invalido para geracao de testes.", parsed.error.flatten());
      }

      const output = await this.testsService.execute(parsed.data);
      reply.status(200).send(output);
    } catch (error) {
      throw handleUnknownError(error);
    }
  }

  async executePullRequest(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const parsed = pullRequestTestsRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new BadRequestError("Payload invalido para geracao de testes por pull request.", parsed.error.flatten());
      }

      const service = this.requirePullRequestTestsService();
      const output = await service.execute(parsed.data);
      reply.status(200).send(output);
    } catch (error) {
      throw handleUnknownError(error);
    }
  }

  private requirePullRequestTestsService(): PullRequestTestsService {
    if (!this.pullRequestTestsService) {
      throw new Error("Servico de geracao de testes por pull request nao configurado.");
    }

    return this.pullRequestTestsService;
  }
}
