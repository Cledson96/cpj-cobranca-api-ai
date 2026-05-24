import type { ReviewRequest, ReviewResponse } from "@shared";

export interface ReviewService {
  execute(input: ReviewRequest): Promise<ReviewResponse>;
}

export class DefaultReviewService implements ReviewService {
  async execute(input: ReviewRequest): Promise<ReviewResponse> {
    return {
      overall_quality: "needs_improvement",
      score: 5,
      issues: [
        {
          severity: "medium",
          line_hint: null,
          description: "O motor de IA ainda nao foi conectado nesta etapa.",
          suggestion: "Conectar o ReviewService ao runner do agente na proxima etapa.",
        },
      ],
      positives: [`Payload recebido para analise em ${input.language}.`],
      summary: "Resposta temporaria enquanto a rota HTTP e a documentacao Swagger sao validadas.",
    };
  }
}
