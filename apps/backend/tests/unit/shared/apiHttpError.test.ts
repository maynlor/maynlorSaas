import { describe, it, expect } from "vitest";
import { apiHttpError } from "@shared/http/apiHttpError.js";

describe("aiHttpError", () => {
  it("includes the provider's error message, not just the status code", async () => {
    // Caso real que costó diagnosticar: un 429 de Gemini puede ser transitorio
    // ("reintentá en 28s") o definitivo ("limit: 0 para este modelo"), y el
    // código solo no distingue uno del otro.
    const response = new Response(
      JSON.stringify({ error: { message: "Quota exceeded for metric: ..., limit: 0, model: gemini-2.0-flash" } }),
      { status: 429 },
    );

    const error = await apiHttpError(response, "Gemini API request");

    expect(error.message).toContain("status 429");
    expect(error.message).toContain("limit: 0");
  });

  it("falls back to the raw body when it is not JSON", async () => {
    const response = new Response("<html>502 Bad Gateway</html>", { status: 502 });

    const error = await apiHttpError(response, "OpenAI API request");

    expect(error.message).toContain("status 502");
    expect(error.message).toContain("Bad Gateway");
  });

  it("still reports the status when the body is empty", async () => {
    const error = await apiHttpError(new Response("", { status: 500 }), "OpenAI embeddings request");

    expect(error.message).toBe("OpenAI embeddings request failed with status 500");
  });

  it("truncates very long bodies so a huge error page does not flood the logs", async () => {
    const response = new Response("x".repeat(5000), { status: 500 });

    const error = await apiHttpError(response, "Gemini API request");

    expect(error.message.length).toBeLessThan(400);
  });

  it("includes Meta's error code and details, which name the actual cause", async () => {
    // Un 400 de Meta puede ser el destinatario no permitido, el token vencido o
    // un botón inválido. El código numérico es lo que se busca en su
    // documentación, así que tiene que llegar al log.
    const response = new Response(
      JSON.stringify({
        error: {
          message: "(#131030) Recipient phone number not in allowed list",
          code: 131030,
          error_data: { details: "Add the number to the recipient list" },
        },
      }),
      { status: 400 },
    );

    const error = await apiHttpError(response, "WhatsApp send text message");

    expect(error.message).toContain("status 400");
    expect(error.message).toContain("Recipient phone number not in allowed list");
    expect(error.message).toContain("code 131030");
    expect(error.message).toContain("Add the number to the recipient list");
  });
});
