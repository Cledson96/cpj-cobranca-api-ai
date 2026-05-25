import type {
  ModelCreateRequest,
  ModelDetail,
  ModelListResponse,
  ModelUpdateRequest,
} from "@shared";

export type RegisteredModelRecord = ModelDetail;

export type UpdateModelInput = ModelUpdateRequest & {
  id: string;
};

export type CreateModelInput = ModelCreateRequest;

export function toModelListResponse(records: RegisteredModelRecord[]): ModelListResponse {
  return { items: records };
}

export function toModelDetail(record: RegisteredModelRecord): ModelDetail {
  return record;
}
