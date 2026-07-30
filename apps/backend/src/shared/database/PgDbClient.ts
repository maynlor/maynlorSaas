import { Pool, type PoolClient } from "pg";
import type { IDbClient, QueryResult } from "./DbClient.js";

class PoolBackedClient implements IDbClient {
  constructor(private readonly executor: Pool | PoolClient) {}

  async query<T = unknown>(sql: string, params: unknown[] = []): Promise<QueryResult<T>> {
    const result = await this.executor.query(sql, params);
    return { rows: result.rows as T[], rowCount: result.rowCount ?? 0 };
  }

  async transaction<T>(fn: (trx: IDbClient) => Promise<T>): Promise<T> {
    if (!(this.executor instanceof Pool)) {
      return fn(this);
    }
    const client = await this.executor.connect();
    try {
      await client.query("BEGIN");
      const result = await fn(new PoolBackedClient(client));
      await client.query("COMMIT");
      return result;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }
}

export class PgDbClient extends PoolBackedClient {
  private readonly pool: Pool;

  constructor(connectionString: string) {
    const pool = new Pool({ connectionString });
    super(pool);
    this.pool = pool;
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
