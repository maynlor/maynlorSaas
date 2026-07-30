export interface AITool {
  name: string;
  description: string;
  /** JSON Schema for the tool's arguments. */
  parameters: Record<string, unknown>;
  /** Executes the tool and returns a string result to feed back to the model. */
  execute(args: Record<string, unknown>): Promise<string>;
}
