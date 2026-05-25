import { BadRequestError, GenericError, NotFoundError } from "@/infrastructure/errors";
import type {
  ModelCreateRequest,
  ModelDetail,
  ModelListResponse,
} from "@shared";
import type { RegisteredModelRecord, UpdateModelInput } from "../models";
import { toModelDetail, toModelListResponse } from "../models";

export interface ModelsService {
  list(): Promise<ModelListResponse>;
  findDefault(): Promise<ModelDetail>;
  create(input: ModelCreateRequest): Promise<ModelDetail>;
  update(input: UpdateModelInput): Promise<ModelDetail>;
  delete(id: string): Promise<void>;
  resolveRequestedModel(requestedModel?: string): Promise<string>;
}

export interface ModelRuntimeResolver {
  resolveRequestedModel(requestedModel?: string): Promise<string>;
}

export type ModelsRepository = {
  list(): Promise<RegisteredModelRecord[]>;
  findById(id: string): Promise<RegisteredModelRecord | null>;
  findByName(name: string): Promise<RegisteredModelRecord | null>;
  findDefault(): Promise<RegisteredModelRecord | null>;
  create(input: ModelCreateRequest): Promise<RegisteredModelRecord>;
  update(input: UpdateModelInput): Promise<RegisteredModelRecord>;
  delete(id: string): Promise<void>;
  setDefault(id: string): Promise<RegisteredModelRecord>;
};

export class DefaultModelsService implements ModelsService, ModelRuntimeResolver {
  constructor(private readonly repository?: ModelsRepository) {}

  async list(): Promise<ModelListResponse> {
    const records = await this.getRepository().list();
    return toModelListResponse(records);
  }

  async findDefault(): Promise<ModelDetail> {
    const record = await this.getRepository().findDefault();
    if (!record) {
      throw new NotFoundError("Modelo padrao global nao configurado.");
    }

    return toModelDetail(record);
  }

  async create(input: ModelCreateRequest): Promise<ModelDetail> {
    const repository = this.getRepository();
    const existing = await repository.findByName(input.name);
    if (existing) {
      throw new BadRequestError("Modelo ja cadastrado.");
    }

    return toModelDetail(await repository.create(input));
  }

  async update(input: UpdateModelInput): Promise<ModelDetail> {
    const repository = this.getRepository();
    const current = await repository.findById(input.id);
    if (!current) {
      throw new NotFoundError("Modelo nao encontrado.");
    }

    if (input.name && input.name !== current.name) {
      const existing = await repository.findByName(input.name);
      if (existing && existing.id !== input.id) {
        throw new BadRequestError("Modelo ja cadastrado.");
      }
    }

    if (current.is_default && input.is_active === false && input.is_default !== false) {
      throw new BadRequestError("Nao e permitido inativar o modelo padrao global.");
    }

    const updated = await repository.update(input);

    if (input.is_default === true) {
      if (!updated.is_active) {
        throw new BadRequestError("Somente modelos ativos podem virar padrao global.");
      }

      return toModelDetail(await repository.setDefault(updated.id));
    }

    return toModelDetail(updated);
  }

  async delete(id: string): Promise<void> {
    const repository = this.getRepository();
    const current = await repository.findById(id);
    if (!current) {
      throw new NotFoundError("Modelo nao encontrado.");
    }

    if (current.is_default) {
      throw new BadRequestError("Nao e permitido excluir o modelo padrao global.");
    }

    await repository.delete(id);
  }

  async resolveRequestedModel(requestedModel?: string): Promise<string> {
    const repository = this.getRepository();
    const record = requestedModel
      ? await repository.findByName(requestedModel)
      : await repository.findDefault();

    if (!record) {
      throw requestedModel
        ? new BadRequestError("Modelo solicitado nao esta cadastrado.")
        : new GenericError("Modelo padrao global nao configurado.");
    }

    if (!record.is_active) {
      throw new BadRequestError(
        requestedModel
          ? "Modelo solicitado esta inativo."
          : "Modelo padrao global esta inativo.",
      );
    }

    return record.name;
  }

  private getRepository(): ModelsRepository {
    if (!this.repository) {
      throw new GenericError("Repositorio de modelos nao configurado.");
    }

    return this.repository;
  }
}
