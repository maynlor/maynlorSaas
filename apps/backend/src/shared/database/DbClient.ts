export interface QueryResult<T> {
  rows: T[];
  rowCount: number;
}

export interface IDbClient {
  query<T = unknown>(sql: string, params?: unknown[]): Promise<QueryResult<T>>;
  transaction<T>(fn: (trx: IDbClient) => Promise<T>): Promise<T>;
}
