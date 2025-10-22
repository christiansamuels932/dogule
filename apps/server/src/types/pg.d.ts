declare module 'pg' {
  export interface QueryResult<T = any> {
    rows: T[];
  }

  export interface PoolConfig {
    connectionString?: string;
  }

  export class Pool {
    constructor(config?: PoolConfig);
    query<T = any>(queryText: string, values?: ReadonlyArray<unknown>): Promise<QueryResult<T>>;
    end(): Promise<void>;
  }
}
