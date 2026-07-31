import { describe, it, expect } from "vitest";
import { toMetaRecipient } from "@modules/whatsapp/infrastructure/clients/metaRecipient.js";

describe("toMetaRecipient", () => {
  it("drops the 9 from an Argentine mobile wa_id, which Meta rejects as a recipient", () => {
    // Verificado contra la API real: enviar a 5491166129771 da 131030, y a
    // 541166129771 se entrega y Meta lo resuelve a ese mismo wa_id.
    expect(toMetaRecipient("5491166129771")).toBe("541166129771");
  });

  it("leaves an Argentine landline alone, since it has no 9 to drop", () => {
    expect(toMetaRecipient("541143210987")).toBe("541143210987");
  });

  it("leaves numbers from other countries untouched", () => {
    expect(toMetaRecipient("5511987654321")).toBe("5511987654321");
    expect(toMetaRecipient("14155552671")).toBe("14155552671");
    expect(toMetaRecipient("34612345678")).toBe("34612345678");
  });

  it("strips formatting so Meta always receives bare digits", () => {
    expect(toMetaRecipient("+54 9 11 6612-9771")).toBe("541166129771");
    expect(toMetaRecipient("+1 (415) 555-2671")).toBe("14155552671");
  });

  it("does not touch a number that starts with 549 but is not an Argentine mobile", () => {
    // El largo es lo que distingue: sin este chequeo se le comería un dígito a
    // cualquier número que casualmente empiece igual.
    expect(toMetaRecipient("54912345")).toBe("54912345");
    expect(toMetaRecipient("54911223344556")).toBe("54911223344556");
  });
});
