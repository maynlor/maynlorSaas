/**
 * Los móviles argentinos llevan un 9 entre el código de país y el área. Meta
 * reporta el `wa_id` entrante *con* ese 9 (`5491166129771`) pero **rechaza ese
 * mismo string como destinatario** con el error 131030 ("Recipient phone number
 * not in allowed list"): para enviar hay que usar la forma sin el 9
 * (`541166129771`), y es Meta la que después la resuelve al `wa_id` con 9.
 *
 * Verificado contra la API real: el mismo mensaje a `541166129771` se entrega y
 * devuelve `{"input":"541166129771","wa_id":"5491166129771"}`, mientras que a
 * `5491166129771` da 131030.
 *
 * El error engaña, porque suena a que falta cargar el número en la lista de
 * autorizados cuando en realidad está cargado y el formato es el que no coincide.
 */
const ARGENTINA_MOBILE_PREFIX = "549";

/**
 * Largo del `wa_id` de un móvil argentino: 54 + 9 + área + abonado.
 * Se exige para no tocar números de largos distintos que casualmente empiecen
 * igual. No hay otro código de país que empiece con 54, así que el prefijo no
 * es ambiguo.
 */
const ARGENTINA_MOBILE_WA_ID_LENGTH = 13;

/**
 * Convierte el teléfono de un cliente al formato que acepta la API de Meta como
 * destinatario.
 *
 * Se aplica solo al enviar. El teléfono se sigue guardando tal como lo reporta
 * WhatsApp, porque el `wa_id` es lo que permite reconocer al cliente cuando
 * vuelve a escribir.
 */
export function toMetaRecipient(phone: string): string {
  const digits = phone.replace(/\D/g, "");

  if (digits.startsWith(ARGENTINA_MOBILE_PREFIX) && digits.length === ARGENTINA_MOBILE_WA_ID_LENGTH) {
    return `54${digits.slice(ARGENTINA_MOBILE_PREFIX.length)}`;
  }

  return digits;
}
