import type { KeyValueCache } from '@apollo/utils.keyvaluecache';
import type {
  DocumentNode,
  ExecutionResult,
  GraphQLError,
  GraphQLFormattedError,
  GraphQLSchema,
  OperationDefinitionNode,
} from 'graphql';
import type { Logger } from '@apollo/utils.logger';
import type { Trace } from '@apollo/usage-reporting-protobuf';

// FIXME doc and organize

type BaseContext = {};

export interface ApolloConfig {
  key?: string;
  keyHash?: string;
  graphRef?: string;
}

export type GatewayExecutor<TContext extends BaseContext> = (
  requestContext: GatewayGraphQLRequestContext<TContext>,
) => Promise<ExecutionResult>;

export type Unsubscriber = () => void;

export type SchemaLoadOrUpdateCallback = (schemaContext: {
  apiSchema: GraphQLSchema;
  coreSupergraphSdl: string;
}) => void;

export interface GatewayLoadResult<TContext extends BaseContext> {
  executor: GatewayExecutor<TContext> | null;
}

export interface GatewayInterface<TContext extends BaseContext> {
  load(options: { apollo: ApolloConfig }): Promise<GatewayLoadResult<TContext>>;

  onSchemaLoadOrUpdate(callback: SchemaLoadOrUpdateCallback): Unsubscriber;

  stop(): Promise<void>;
}

export interface GatewayGraphQLRequestContext<TContext extends BaseContext> {
  // FIXME make sure we copy everything back
  readonly request: GatewayGraphQLRequest;
  readonly response?: GatewayGraphQLResponse;
  logger: Logger;
  readonly schema: GraphQLSchema;
  readonly schemaHash: SchemaHash;
  readonly context: TContext;
  readonly cache: KeyValueCache;
  readonly queryHash: string;
  readonly document: DocumentNode;
  readonly source: string;
  readonly operationName: string | null;
  readonly operation: OperationDefinitionNode;
  readonly errors?: ReadonlyArray<GraphQLError>;
  readonly metrics: GatewayGraphQLRequestMetrics;
  debug?: boolean;
  readonly overallCachePolicy: GatewayCachePolicy;
}

export type SchemaHash = string & { __fauxpaque: 'SchemaHash' };

export interface GatewayGraphQLRequestMetrics {
  captureTraces?: boolean;
  persistedQueryHit?: boolean;
  persistedQueryRegister?: boolean;
  responseCacheHit?: boolean;
  forbiddenOperation?: boolean;
  registeredOperation?: boolean;
  startHrTime?: [number, number];
  queryPlanTrace?: Trace.QueryPlanNode;
}

export interface GatewayCachePolicy extends GatewayCacheHint {
  replace(hint: GatewayCacheHint): void;
  restrict(hint: GatewayCacheHint): void;
  policyIfCacheable(): Required<GatewayCacheHint> | null;
}

export interface GatewayCacheHint {
  maxAge?: number;
  scope?: GatewayCacheScope;
}

// FIXME this might be totally busted
export enum GatewayCacheScope {
  Public = 'PUBLIC',
  Private = 'PRIVATE',
}

export type VariableValues = { [name: string]: any };

export interface GatewayGraphQLRequest {
  query?: string;
  operationName?: string;
  variables?: VariableValues;
  extensions?: Record<string, any>;
  http?: GatewayHTTPRequest;
}

export interface GatewayGraphQLResponse {
  data?: Record<string, any> | null;
  errors?: ReadonlyArray<GraphQLFormattedError>;
  extensions?: Record<string, any>;
  http?: GatewayHTTPResponse;
}

export interface GatewayHTTPRequest {
  readonly method: string;
  readonly url: string;
  readonly headers: GatewayHTTPHeaders;
}

export interface GatewayHTTPHeaders {
  append(name: string, value: string): void;
  delete(name: string): void;
  get(name: string): string | null;
  has(name: string): boolean;
  set(name: string, value: string): void;

  entries(): Iterator<[string, string]>;
  keys(): Iterator<string>;
  values(): Iterator<string>;
  [Symbol.iterator](): Iterator<[string, string]>;
}

export interface GatewayHTTPResponse {
  readonly headers: GatewayHTTPHeaders;
  status?: number;
}
