import dayjs, { type ConfigType } from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

export const SAO_PAULO_TIMEZONE = "America/Sao_Paulo";

export function nowSaoPauloIso(): string {
  return dayjs().tz(SAO_PAULO_TIMEZONE).format();
}

export function toSaoPauloIso(value: ConfigType): string {
  return dayjs(value).tz(SAO_PAULO_TIMEZONE).format();
}

export function formatDateTimeSaoPaulo(value: ConfigType, format = "DD/MM/YYYY HH:mm:ss"): string {
  return dayjs(value).tz(SAO_PAULO_TIMEZONE).format(format);
}
