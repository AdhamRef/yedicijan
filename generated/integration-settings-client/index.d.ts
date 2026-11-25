
/**
 * Client
**/

import * as runtime from './runtime/library.js';
import $Types = runtime.Types // general types
import $Public = runtime.Types.Public
import $Utils = runtime.Types.Utils
import $Extensions = runtime.Types.Extensions
import $Result = runtime.Types.Result

export type PrismaPromise<T> = $Public.PrismaPromise<T>


/**
 * Model IntegrationSetting
 * 
 */
export type IntegrationSetting = $Result.DefaultSelection<Prisma.$IntegrationSettingPayload>

/**
 * ##  Prisma Client ʲˢ
 *
 * Type-safe database client for TypeScript & Node.js
 * @example
 * ```
 * const prisma = new PrismaClient()
 * // Fetch zero or more IntegrationSettings
 * const integrationSettings = await prisma.integrationSetting.findMany()
 * ```
 *
 *
 * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
 */
export class PrismaClient<
  ClientOptions extends Prisma.PrismaClientOptions = Prisma.PrismaClientOptions,
  const U = 'log' extends keyof ClientOptions ? ClientOptions['log'] extends Array<Prisma.LogLevel | Prisma.LogDefinition> ? Prisma.GetEvents<ClientOptions['log']> : never : never,
  ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs
> {
  [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['other'] }

    /**
   * ##  Prisma Client ʲˢ
   *
   * Type-safe database client for TypeScript & Node.js
   * @example
   * ```
   * const prisma = new PrismaClient()
   * // Fetch zero or more IntegrationSettings
   * const integrationSettings = await prisma.integrationSetting.findMany()
   * ```
   *
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
   */

  constructor(optionsArg ?: Prisma.Subset<ClientOptions, Prisma.PrismaClientOptions>);
  $on<V extends U>(eventType: V, callback: (event: V extends 'query' ? Prisma.QueryEvent : Prisma.LogEvent) => void): PrismaClient;

  /**
   * Connect with the database
   */
  $connect(): $Utils.JsPromise<void>;

  /**
   * Disconnect from the database
   */
  $disconnect(): $Utils.JsPromise<void>;

/**
   * Allows the running of a sequence of read/write operations that are guaranteed to either succeed or fail as a whole.
   * @example
   * ```
   * const [george, bob, alice] = await prisma.$transaction([
   *   prisma.user.create({ data: { name: 'George' } }),
   *   prisma.user.create({ data: { name: 'Bob' } }),
   *   prisma.user.create({ data: { name: 'Alice' } }),
   * ])
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/concepts/components/prisma-client/transactions).
   */
  $transaction<P extends Prisma.PrismaPromise<any>[]>(arg: [...P]): $Utils.JsPromise<runtime.Types.Utils.UnwrapTuple<P>>

  $transaction<R>(fn: (prisma: Omit<PrismaClient, runtime.ITXClientDenyList>) => $Utils.JsPromise<R>, options?: { maxWait?: number, timeout?: number }): $Utils.JsPromise<R>

  /**
   * Executes a raw MongoDB command and returns the result of it.
   * @example
   * ```
   * const user = await prisma.$runCommandRaw({
   *   aggregate: 'User',
   *   pipeline: [{ $match: { name: 'Bob' } }, { $project: { email: true, _id: false } }],
   *   explain: false,
   * })
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $runCommandRaw(command: Prisma.InputJsonObject): Prisma.PrismaPromise<Prisma.JsonObject>

  $extends: $Extensions.ExtendsHook<"extends", Prisma.TypeMapCb<ClientOptions>, ExtArgs, $Utils.Call<Prisma.TypeMapCb<ClientOptions>, {
    extArgs: ExtArgs
  }>>

      /**
   * `prisma.integrationSetting`: Exposes CRUD operations for the **IntegrationSetting** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more IntegrationSettings
    * const integrationSettings = await prisma.integrationSetting.findMany()
    * ```
    */
  get integrationSetting(): Prisma.IntegrationSettingDelegate<ExtArgs, ClientOptions>;
}

export namespace Prisma {
  export import DMMF = runtime.DMMF

  export type PrismaPromise<T> = $Public.PrismaPromise<T>

  /**
   * Validator
   */
  export import validator = runtime.Public.validator

  /**
   * Prisma Errors
   */
  export import PrismaClientKnownRequestError = runtime.PrismaClientKnownRequestError
  export import PrismaClientUnknownRequestError = runtime.PrismaClientUnknownRequestError
  export import PrismaClientRustPanicError = runtime.PrismaClientRustPanicError
  export import PrismaClientInitializationError = runtime.PrismaClientInitializationError
  export import PrismaClientValidationError = runtime.PrismaClientValidationError

  /**
   * Re-export of sql-template-tag
   */
  export import sql = runtime.sqltag
  export import empty = runtime.empty
  export import join = runtime.join
  export import raw = runtime.raw
  export import Sql = runtime.Sql



  /**
   * Decimal.js
   */
  export import Decimal = runtime.Decimal

  export type DecimalJsLike = runtime.DecimalJsLike

  /**
   * Metrics
   */
  export type Metrics = runtime.Metrics
  export type Metric<T> = runtime.Metric<T>
  export type MetricHistogram = runtime.MetricHistogram
  export type MetricHistogramBucket = runtime.MetricHistogramBucket

  /**
  * Extensions
  */
  export import Extension = $Extensions.UserArgs
  export import getExtensionContext = runtime.Extensions.getExtensionContext
  export import Args = $Public.Args
  export import Payload = $Public.Payload
  export import Result = $Public.Result
  export import Exact = $Public.Exact

  /**
   * Prisma Client JS version: 6.19.2
   * Query Engine version: c2990dca591cba766e3b7ef5d9e8a84796e47ab7
   */
  export type PrismaVersion = {
    client: string
  }

  export const prismaVersion: PrismaVersion

  /**
   * Utility Types
   */


  export import Bytes = runtime.Bytes
  export import JsonObject = runtime.JsonObject
  export import JsonArray = runtime.JsonArray
  export import JsonValue = runtime.JsonValue
  export import InputJsonObject = runtime.InputJsonObject
  export import InputJsonArray = runtime.InputJsonArray
  export import InputJsonValue = runtime.InputJsonValue

  /**
   * Types of the values used to represent different kinds of `null` values when working with JSON fields.
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  namespace NullTypes {
    /**
    * Type of `Prisma.DbNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.DbNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class DbNull {
      private DbNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.JsonNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.JsonNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class JsonNull {
      private JsonNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.AnyNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.AnyNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class AnyNull {
      private AnyNull: never
      private constructor()
    }
  }

  /**
   * Helper for filtering JSON entries that have `null` on the database (empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const DbNull: NullTypes.DbNull

  /**
   * Helper for filtering JSON entries that have JSON `null` values (not empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const JsonNull: NullTypes.JsonNull

  /**
   * Helper for filtering JSON entries that are `Prisma.DbNull` or `Prisma.JsonNull`
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const AnyNull: NullTypes.AnyNull

  type SelectAndInclude = {
    select: any
    include: any
  }

  type SelectAndOmit = {
    select: any
    omit: any
  }

  /**
   * Get the type of the value, that the Promise holds.
   */
  export type PromiseType<T extends PromiseLike<any>> = T extends PromiseLike<infer U> ? U : T;

  /**
   * Get the return type of a function which returns a Promise.
   */
  export type PromiseReturnType<T extends (...args: any) => $Utils.JsPromise<any>> = PromiseType<ReturnType<T>>

  /**
   * From T, pick a set of properties whose keys are in the union K
   */
  type Prisma__Pick<T, K extends keyof T> = {
      [P in K]: T[P];
  };


  export type Enumerable<T> = T | Array<T>;

  export type RequiredKeys<T> = {
    [K in keyof T]-?: {} extends Prisma__Pick<T, K> ? never : K
  }[keyof T]

  export type TruthyKeys<T> = keyof {
    [K in keyof T as T[K] extends false | undefined | null ? never : K]: K
  }

  export type TrueKeys<T> = TruthyKeys<Prisma__Pick<T, RequiredKeys<T>>>

  /**
   * Subset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection
   */
  export type Subset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
  };

  /**
   * SelectSubset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection.
   * Additionally, it validates, if both select and include are present. If the case, it errors.
   */
  export type SelectSubset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    (T extends SelectAndInclude
      ? 'Please either choose `select` or `include`.'
      : T extends SelectAndOmit
        ? 'Please either choose `select` or `omit`.'
        : {})

  /**
   * Subset + Intersection
   * @desc From `T` pick properties that exist in `U` and intersect `K`
   */
  export type SubsetIntersection<T, U, K> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    K

  type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

  /**
   * XOR is needed to have a real mutually exclusive union type
   * https://stackoverflow.com/questions/42123407/does-typescript-support-mutually-exclusive-types
   */
  type XOR<T, U> =
    T extends object ?
    U extends object ?
      (Without<T, U> & U) | (Without<U, T> & T)
    : U : T


  /**
   * Is T a Record?
   */
  type IsObject<T extends any> = T extends Array<any>
  ? False
  : T extends Date
  ? False
  : T extends Uint8Array
  ? False
  : T extends BigInt
  ? False
  : T extends object
  ? True
  : False


  /**
   * If it's T[], return T
   */
  export type UnEnumerate<T extends unknown> = T extends Array<infer U> ? U : T

  /**
   * From ts-toolbelt
   */

  type __Either<O extends object, K extends Key> = Omit<O, K> &
    {
      // Merge all but K
      [P in K]: Prisma__Pick<O, P & keyof O> // With K possibilities
    }[K]

  type EitherStrict<O extends object, K extends Key> = Strict<__Either<O, K>>

  type EitherLoose<O extends object, K extends Key> = ComputeRaw<__Either<O, K>>

  type _Either<
    O extends object,
    K extends Key,
    strict extends Boolean
  > = {
    1: EitherStrict<O, K>
    0: EitherLoose<O, K>
  }[strict]

  type Either<
    O extends object,
    K extends Key,
    strict extends Boolean = 1
  > = O extends unknown ? _Either<O, K, strict> : never

  export type Union = any

  type PatchUndefined<O extends object, O1 extends object> = {
    [K in keyof O]: O[K] extends undefined ? At<O1, K> : O[K]
  } & {}

  /** Helper Types for "Merge" **/
  export type IntersectOf<U extends Union> = (
    U extends unknown ? (k: U) => void : never
  ) extends (k: infer I) => void
    ? I
    : never

  export type Overwrite<O extends object, O1 extends object> = {
      [K in keyof O]: K extends keyof O1 ? O1[K] : O[K];
  } & {};

  type _Merge<U extends object> = IntersectOf<Overwrite<U, {
      [K in keyof U]-?: At<U, K>;
  }>>;

  type Key = string | number | symbol;
  type AtBasic<O extends object, K extends Key> = K extends keyof O ? O[K] : never;
  type AtStrict<O extends object, K extends Key> = O[K & keyof O];
  type AtLoose<O extends object, K extends Key> = O extends unknown ? AtStrict<O, K> : never;
  export type At<O extends object, K extends Key, strict extends Boolean = 1> = {
      1: AtStrict<O, K>;
      0: AtLoose<O, K>;
  }[strict];

  export type ComputeRaw<A extends any> = A extends Function ? A : {
    [K in keyof A]: A[K];
  } & {};

  export type OptionalFlat<O> = {
    [K in keyof O]?: O[K];
  } & {};

  type _Record<K extends keyof any, T> = {
    [P in K]: T;
  };

  // cause typescript not to expand types and preserve names
  type NoExpand<T> = T extends unknown ? T : never;

  // this type assumes the passed object is entirely optional
  type AtLeast<O extends object, K extends string> = NoExpand<
    O extends unknown
    ? | (K extends keyof O ? { [P in K]: O[P] } & O : O)
      | {[P in keyof O as P extends K ? P : never]-?: O[P]} & O
    : never>;

  type _Strict<U, _U = U> = U extends unknown ? U & OptionalFlat<_Record<Exclude<Keys<_U>, keyof U>, never>> : never;

  export type Strict<U extends object> = ComputeRaw<_Strict<U>>;
  /** End Helper Types for "Merge" **/

  export type Merge<U extends object> = ComputeRaw<_Merge<Strict<U>>>;

  /**
  A [[Boolean]]
  */
  export type Boolean = True | False

  // /**
  // 1
  // */
  export type True = 1

  /**
  0
  */
  export type False = 0

  export type Not<B extends Boolean> = {
    0: 1
    1: 0
  }[B]

  export type Extends<A1 extends any, A2 extends any> = [A1] extends [never]
    ? 0 // anything `never` is false
    : A1 extends A2
    ? 1
    : 0

  export type Has<U extends Union, U1 extends Union> = Not<
    Extends<Exclude<U1, U>, U1>
  >

  export type Or<B1 extends Boolean, B2 extends Boolean> = {
    0: {
      0: 0
      1: 1
    }
    1: {
      0: 1
      1: 1
    }
  }[B1][B2]

  export type Keys<U extends Union> = U extends unknown ? keyof U : never

  type Cast<A, B> = A extends B ? A : B;

  export const type: unique symbol;



  /**
   * Used by group by
   */

  export type GetScalarType<T, O> = O extends object ? {
    [P in keyof T]: P extends keyof O
      ? O[P]
      : never
  } : never

  type FieldPaths<
    T,
    U = Omit<T, '_avg' | '_sum' | '_count' | '_min' | '_max'>
  > = IsObject<T> extends True ? U : T

  type GetHavingFields<T> = {
    [K in keyof T]: Or<
      Or<Extends<'OR', K>, Extends<'AND', K>>,
      Extends<'NOT', K>
    > extends True
      ? // infer is only needed to not hit TS limit
        // based on the brilliant idea of Pierre-Antoine Mills
        // https://github.com/microsoft/TypeScript/issues/30188#issuecomment-478938437
        T[K] extends infer TK
        ? GetHavingFields<UnEnumerate<TK> extends object ? Merge<UnEnumerate<TK>> : never>
        : never
      : {} extends FieldPaths<T[K]>
      ? never
      : K
  }[keyof T]

  /**
   * Convert tuple to union
   */
  type _TupleToUnion<T> = T extends (infer E)[] ? E : never
  type TupleToUnion<K extends readonly any[]> = _TupleToUnion<K>
  type MaybeTupleToUnion<T> = T extends any[] ? TupleToUnion<T> : T

  /**
   * Like `Pick`, but additionally can also accept an array of keys
   */
  type PickEnumerable<T, K extends Enumerable<keyof T> | keyof T> = Prisma__Pick<T, MaybeTupleToUnion<K>>

  /**
   * Exclude all keys with underscores
   */
  type ExcludeUnderscoreKeys<T extends string> = T extends `_${string}` ? never : T


  export type FieldRef<Model, FieldType> = runtime.FieldRef<Model, FieldType>

  type FieldRefInputType<Model, FieldType> = Model extends never ? never : FieldRef<Model, FieldType>


  export const ModelName: {
    IntegrationSetting: 'IntegrationSetting'
  };

  export type ModelName = (typeof ModelName)[keyof typeof ModelName]


  export type Datasources = {
    db?: Datasource
  }

  interface TypeMapCb<ClientOptions = {}> extends $Utils.Fn<{extArgs: $Extensions.InternalArgs }, $Utils.Record<string, any>> {
    returns: Prisma.TypeMap<this['params']['extArgs'], ClientOptions extends { omit: infer OmitOptions } ? OmitOptions : {}>
  }

  export type TypeMap<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> = {
    globalOmitOptions: {
      omit: GlobalOmitOptions
    }
    meta: {
      modelProps: "integrationSetting"
      txIsolationLevel: never
    }
    model: {
      IntegrationSetting: {
        payload: Prisma.$IntegrationSettingPayload<ExtArgs>
        fields: Prisma.IntegrationSettingFieldRefs
        operations: {
          findUnique: {
            args: Prisma.IntegrationSettingFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$IntegrationSettingPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.IntegrationSettingFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$IntegrationSettingPayload>
          }
          findFirst: {
            args: Prisma.IntegrationSettingFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$IntegrationSettingPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.IntegrationSettingFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$IntegrationSettingPayload>
          }
          findMany: {
            args: Prisma.IntegrationSettingFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$IntegrationSettingPayload>[]
          }
          create: {
            args: Prisma.IntegrationSettingCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$IntegrationSettingPayload>
          }
          createMany: {
            args: Prisma.IntegrationSettingCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          delete: {
            args: Prisma.IntegrationSettingDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$IntegrationSettingPayload>
          }
          update: {
            args: Prisma.IntegrationSettingUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$IntegrationSettingPayload>
          }
          deleteMany: {
            args: Prisma.IntegrationSettingDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.IntegrationSettingUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.IntegrationSettingUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$IntegrationSettingPayload>
          }
          aggregate: {
            args: Prisma.IntegrationSettingAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateIntegrationSetting>
          }
          groupBy: {
            args: Prisma.IntegrationSettingGroupByArgs<ExtArgs>
            result: $Utils.Optional<IntegrationSettingGroupByOutputType>[]
          }
          findRaw: {
            args: Prisma.IntegrationSettingFindRawArgs<ExtArgs>
            result: JsonObject
          }
          aggregateRaw: {
            args: Prisma.IntegrationSettingAggregateRawArgs<ExtArgs>
            result: JsonObject
          }
          count: {
            args: Prisma.IntegrationSettingCountArgs<ExtArgs>
            result: $Utils.Optional<IntegrationSettingCountAggregateOutputType> | number
          }
        }
      }
    }
  } & {
    other: {
      payload: any
      operations: {
        $runCommandRaw: {
          args: Prisma.InputJsonObject,
          result: Prisma.JsonObject
        }
      }
    }
  }
  export const defineExtension: $Extensions.ExtendsHook<"define", Prisma.TypeMapCb, $Extensions.DefaultArgs>
  export type DefaultPrismaClient = PrismaClient
  export type ErrorFormat = 'pretty' | 'colorless' | 'minimal'
  export interface PrismaClientOptions {
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasources?: Datasources
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasourceUrl?: string
    /**
     * @default "colorless"
     */
    errorFormat?: ErrorFormat
    /**
     * @example
     * ```
     * // Shorthand for `emit: 'stdout'`
     * log: ['query', 'info', 'warn', 'error']
     * 
     * // Emit as events only
     * log: [
     *   { emit: 'event', level: 'query' },
     *   { emit: 'event', level: 'info' },
     *   { emit: 'event', level: 'warn' }
     *   { emit: 'event', level: 'error' }
     * ]
     * 
     * / Emit as events and log to stdout
     * og: [
     *  { emit: 'stdout', level: 'query' },
     *  { emit: 'stdout', level: 'info' },
     *  { emit: 'stdout', level: 'warn' }
     *  { emit: 'stdout', level: 'error' }
     * 
     * ```
     * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/logging#the-log-option).
     */
    log?: (LogLevel | LogDefinition)[]
    /**
     * The default values for transactionOptions
     * maxWait ?= 2000
     * timeout ?= 5000
     */
    transactionOptions?: {
      maxWait?: number
      timeout?: number
    }
    /**
     * Global configuration for omitting model fields by default.
     * 
     * @example
     * ```
     * const prisma = new PrismaClient({
     *   omit: {
     *     user: {
     *       password: true
     *     }
     *   }
     * })
     * ```
     */
    omit?: Prisma.GlobalOmitConfig
  }
  export type GlobalOmitConfig = {
    integrationSetting?: IntegrationSettingOmit
  }

  /* Types for Logging */
  export type LogLevel = 'info' | 'query' | 'warn' | 'error'
  export type LogDefinition = {
    level: LogLevel
    emit: 'stdout' | 'event'
  }

  export type CheckIsLogLevel<T> = T extends LogLevel ? T : never;

  export type GetLogType<T> = CheckIsLogLevel<
    T extends LogDefinition ? T['level'] : T
  >;

  export type GetEvents<T extends any[]> = T extends Array<LogLevel | LogDefinition>
    ? GetLogType<T[number]>
    : never;

  export type QueryEvent = {
    timestamp: Date
    query: string
    params: string
    duration: number
    target: string
  }

  export type LogEvent = {
    timestamp: Date
    message: string
    target: string
  }
  /* End Types for Logging */


  export type PrismaAction =
    | 'findUnique'
    | 'findUniqueOrThrow'
    | 'findMany'
    | 'findFirst'
    | 'findFirstOrThrow'
    | 'create'
    | 'createMany'
    | 'createManyAndReturn'
    | 'update'
    | 'updateMany'
    | 'updateManyAndReturn'
    | 'upsert'
    | 'delete'
    | 'deleteMany'
    | 'executeRaw'
    | 'queryRaw'
    | 'aggregate'
    | 'count'
    | 'runCommandRaw'
    | 'findRaw'
    | 'groupBy'

  // tested in getLogLevel.test.ts
  export function getLogLevel(log: Array<LogLevel | LogDefinition>): LogLevel | undefined;

  /**
   * `PrismaClient` proxy available in interactive transactions.
   */
  export type TransactionClient = Omit<Prisma.DefaultPrismaClient, runtime.ITXClientDenyList>

  export type Datasource = {
    url?: string
  }

  /**
   * Count Types
   */



  /**
   * Models
   */

  /**
   * Model IntegrationSetting
   */

  export type AggregateIntegrationSetting = {
    _count: IntegrationSettingCountAggregateOutputType | null
    _avg: IntegrationSettingAvgAggregateOutputType | null
    _sum: IntegrationSettingSumAggregateOutputType | null
    _min: IntegrationSettingMinAggregateOutputType | null
    _max: IntegrationSettingMaxAggregateOutputType | null
  }

  export type IntegrationSettingAvgAggregateOutputType = {
    version: number | null
    pendingVersion: number | null
  }

  export type IntegrationSettingSumAggregateOutputType = {
    version: number | null
    pendingVersion: number | null
  }

  export type IntegrationSettingMinAggregateOutputType = {
    id: string | null
    provider: string | null
    key: string | null
    encryptedValue: string | null
    plainValue: string | null
    isSecret: boolean | null
    enabled: boolean | null
    version: number | null
    source: string | null
    pendingEncryptedValue: string | null
    pendingPlainValue: string | null
    pendingVersion: number | null
    pendingCandidateVersion: string | null
    pendingCreatedAt: Date | null
    pendingUpdatedBy: string | null
    candidateVersion: string | null
    candidateCreatedAt: Date | null
    candidateLastTestVersion: string | null
    candidateLastTestAt: Date | null
    candidateLastTestResult: string | null
    candidateFailureReasonSafe: string | null
    createdAt: Date | null
    updatedAt: Date | null
    updatedBy: string | null
    lastTestAt: Date | null
    lastTestResult: string | null
    lastFailureReasonSafe: string | null
  }

  export type IntegrationSettingMaxAggregateOutputType = {
    id: string | null
    provider: string | null
    key: string | null
    encryptedValue: string | null
    plainValue: string | null
    isSecret: boolean | null
    enabled: boolean | null
    version: number | null
    source: string | null
    pendingEncryptedValue: string | null
    pendingPlainValue: string | null
    pendingVersion: number | null
    pendingCandidateVersion: string | null
    pendingCreatedAt: Date | null
    pendingUpdatedBy: string | null
    candidateVersion: string | null
    candidateCreatedAt: Date | null
    candidateLastTestVersion: string | null
    candidateLastTestAt: Date | null
    candidateLastTestResult: string | null
    candidateFailureReasonSafe: string | null
    createdAt: Date | null
    updatedAt: Date | null
    updatedBy: string | null
    lastTestAt: Date | null
    lastTestResult: string | null
    lastFailureReasonSafe: string | null
  }

  export type IntegrationSettingCountAggregateOutputType = {
    id: number
    provider: number
    key: number
    encryptedValue: number
    plainValue: number
    isSecret: number
    enabled: number
    version: number
    source: number
    pendingEncryptedValue: number
    pendingPlainValue: number
    pendingVersion: number
    pendingCandidateVersion: number
    pendingCreatedAt: number
    pendingUpdatedBy: number
    candidateVersion: number
    candidateCreatedAt: number
    candidateLastTestVersion: number
    candidateLastTestAt: number
    candidateLastTestResult: number
    candidateFailureReasonSafe: number
    createdAt: number
    updatedAt: number
    updatedBy: number
    lastTestAt: number
    lastTestResult: number
    lastFailureReasonSafe: number
    _all: number
  }


  export type IntegrationSettingAvgAggregateInputType = {
    version?: true
    pendingVersion?: true
  }

  export type IntegrationSettingSumAggregateInputType = {
    version?: true
    pendingVersion?: true
  }

  export type IntegrationSettingMinAggregateInputType = {
    id?: true
    provider?: true
    key?: true
    encryptedValue?: true
    plainValue?: true
    isSecret?: true
    enabled?: true
    version?: true
    source?: true
    pendingEncryptedValue?: true
    pendingPlainValue?: true
    pendingVersion?: true
    pendingCandidateVersion?: true
    pendingCreatedAt?: true
    pendingUpdatedBy?: true
    candidateVersion?: true
    candidateCreatedAt?: true
    candidateLastTestVersion?: true
    candidateLastTestAt?: true
    candidateLastTestResult?: true
    candidateFailureReasonSafe?: true
    createdAt?: true
    updatedAt?: true
    updatedBy?: true
    lastTestAt?: true
    lastTestResult?: true
    lastFailureReasonSafe?: true
  }

  export type IntegrationSettingMaxAggregateInputType = {
    id?: true
    provider?: true
    key?: true
    encryptedValue?: true
    plainValue?: true
    isSecret?: true
    enabled?: true
    version?: true
    source?: true
    pendingEncryptedValue?: true
    pendingPlainValue?: true
    pendingVersion?: true
    pendingCandidateVersion?: true
    pendingCreatedAt?: true
    pendingUpdatedBy?: true
    candidateVersion?: true
    candidateCreatedAt?: true
    candidateLastTestVersion?: true
    candidateLastTestAt?: true
    candidateLastTestResult?: true
    candidateFailureReasonSafe?: true
    createdAt?: true
    updatedAt?: true
    updatedBy?: true
    lastTestAt?: true
    lastTestResult?: true
    lastFailureReasonSafe?: true
  }

  export type IntegrationSettingCountAggregateInputType = {
    id?: true
    provider?: true
    key?: true
    encryptedValue?: true
    plainValue?: true
    isSecret?: true
    enabled?: true
    version?: true
    source?: true
    pendingEncryptedValue?: true
    pendingPlainValue?: true
    pendingVersion?: true
    pendingCandidateVersion?: true
    pendingCreatedAt?: true
    pendingUpdatedBy?: true
    candidateVersion?: true
    candidateCreatedAt?: true
    candidateLastTestVersion?: true
    candidateLastTestAt?: true
    candidateLastTestResult?: true
    candidateFailureReasonSafe?: true
    createdAt?: true
    updatedAt?: true
    updatedBy?: true
    lastTestAt?: true
    lastTestResult?: true
    lastFailureReasonSafe?: true
    _all?: true
  }

  export type IntegrationSettingAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which IntegrationSetting to aggregate.
     */
    where?: IntegrationSettingWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of IntegrationSettings to fetch.
     */
    orderBy?: IntegrationSettingOrderByWithRelationInput | IntegrationSettingOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: IntegrationSettingWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` IntegrationSettings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` IntegrationSettings.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned IntegrationSettings
    **/
    _count?: true | IntegrationSettingCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: IntegrationSettingAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: IntegrationSettingSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: IntegrationSettingMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: IntegrationSettingMaxAggregateInputType
  }

  export type GetIntegrationSettingAggregateType<T extends IntegrationSettingAggregateArgs> = {
        [P in keyof T & keyof AggregateIntegrationSetting]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateIntegrationSetting[P]>
      : GetScalarType<T[P], AggregateIntegrationSetting[P]>
  }




  export type IntegrationSettingGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: IntegrationSettingWhereInput
    orderBy?: IntegrationSettingOrderByWithAggregationInput | IntegrationSettingOrderByWithAggregationInput[]
    by: IntegrationSettingScalarFieldEnum[] | IntegrationSettingScalarFieldEnum
    having?: IntegrationSettingScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: IntegrationSettingCountAggregateInputType | true
    _avg?: IntegrationSettingAvgAggregateInputType
    _sum?: IntegrationSettingSumAggregateInputType
    _min?: IntegrationSettingMinAggregateInputType
    _max?: IntegrationSettingMaxAggregateInputType
  }

  export type IntegrationSettingGroupByOutputType = {
    id: string
    provider: string
    key: string
    encryptedValue: string | null
    plainValue: string | null
    isSecret: boolean
    enabled: boolean
    version: number
    source: string
    pendingEncryptedValue: string | null
    pendingPlainValue: string | null
    pendingVersion: number | null
    pendingCandidateVersion: string | null
    pendingCreatedAt: Date | null
    pendingUpdatedBy: string | null
    candidateVersion: string | null
    candidateCreatedAt: Date | null
    candidateLastTestVersion: string | null
    candidateLastTestAt: Date | null
    candidateLastTestResult: string | null
    candidateFailureReasonSafe: string | null
    createdAt: Date
    updatedAt: Date
    updatedBy: string | null
    lastTestAt: Date | null
    lastTestResult: string | null
    lastFailureReasonSafe: string | null
    _count: IntegrationSettingCountAggregateOutputType | null
    _avg: IntegrationSettingAvgAggregateOutputType | null
    _sum: IntegrationSettingSumAggregateOutputType | null
    _min: IntegrationSettingMinAggregateOutputType | null
    _max: IntegrationSettingMaxAggregateOutputType | null
  }

  type GetIntegrationSettingGroupByPayload<T extends IntegrationSettingGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<IntegrationSettingGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof IntegrationSettingGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], IntegrationSettingGroupByOutputType[P]>
            : GetScalarType<T[P], IntegrationSettingGroupByOutputType[P]>
        }
      >
    >


  export type IntegrationSettingSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    provider?: boolean
    key?: boolean
    encryptedValue?: boolean
    plainValue?: boolean
    isSecret?: boolean
    enabled?: boolean
    version?: boolean
    source?: boolean
    pendingEncryptedValue?: boolean
    pendingPlainValue?: boolean
    pendingVersion?: boolean
    pendingCandidateVersion?: boolean
    pendingCreatedAt?: boolean
    pendingUpdatedBy?: boolean
    candidateVersion?: boolean
    candidateCreatedAt?: boolean
    candidateLastTestVersion?: boolean
    candidateLastTestAt?: boolean
    candidateLastTestResult?: boolean
    candidateFailureReasonSafe?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    updatedBy?: boolean
    lastTestAt?: boolean
    lastTestResult?: boolean
    lastFailureReasonSafe?: boolean
  }, ExtArgs["result"]["integrationSetting"]>



  export type IntegrationSettingSelectScalar = {
    id?: boolean
    provider?: boolean
    key?: boolean
    encryptedValue?: boolean
    plainValue?: boolean
    isSecret?: boolean
    enabled?: boolean
    version?: boolean
    source?: boolean
    pendingEncryptedValue?: boolean
    pendingPlainValue?: boolean
    pendingVersion?: boolean
    pendingCandidateVersion?: boolean
    pendingCreatedAt?: boolean
    pendingUpdatedBy?: boolean
    candidateVersion?: boolean
    candidateCreatedAt?: boolean
    candidateLastTestVersion?: boolean
    candidateLastTestAt?: boolean
    candidateLastTestResult?: boolean
    candidateFailureReasonSafe?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    updatedBy?: boolean
    lastTestAt?: boolean
    lastTestResult?: boolean
    lastFailureReasonSafe?: boolean
  }

  export type IntegrationSettingOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "provider" | "key" | "encryptedValue" | "plainValue" | "isSecret" | "enabled" | "version" | "source" | "pendingEncryptedValue" | "pendingPlainValue" | "pendingVersion" | "pendingCandidateVersion" | "pendingCreatedAt" | "pendingUpdatedBy" | "candidateVersion" | "candidateCreatedAt" | "candidateLastTestVersion" | "candidateLastTestAt" | "candidateLastTestResult" | "candidateFailureReasonSafe" | "createdAt" | "updatedAt" | "updatedBy" | "lastTestAt" | "lastTestResult" | "lastFailureReasonSafe", ExtArgs["result"]["integrationSetting"]>

  export type $IntegrationSettingPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "IntegrationSetting"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: string
      provider: string
      key: string
      encryptedValue: string | null
      plainValue: string | null
      isSecret: boolean
      enabled: boolean
      version: number
      source: string
      pendingEncryptedValue: string | null
      pendingPlainValue: string | null
      pendingVersion: number | null
      pendingCandidateVersion: string | null
      pendingCreatedAt: Date | null
      pendingUpdatedBy: string | null
      candidateVersion: string | null
      candidateCreatedAt: Date | null
      candidateLastTestVersion: string | null
      candidateLastTestAt: Date | null
      candidateLastTestResult: string | null
      candidateFailureReasonSafe: string | null
      createdAt: Date
      updatedAt: Date
      updatedBy: string | null
      lastTestAt: Date | null
      lastTestResult: string | null
      lastFailureReasonSafe: string | null
    }, ExtArgs["result"]["integrationSetting"]>
    composites: {}
  }

  type IntegrationSettingGetPayload<S extends boolean | null | undefined | IntegrationSettingDefaultArgs> = $Result.GetResult<Prisma.$IntegrationSettingPayload, S>

  type IntegrationSettingCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<IntegrationSettingFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: IntegrationSettingCountAggregateInputType | true
    }

  export interface IntegrationSettingDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['IntegrationSetting'], meta: { name: 'IntegrationSetting' } }
    /**
     * Find zero or one IntegrationSetting that matches the filter.
     * @param {IntegrationSettingFindUniqueArgs} args - Arguments to find a IntegrationSetting
     * @example
     * // Get one IntegrationSetting
     * const integrationSetting = await prisma.integrationSetting.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends IntegrationSettingFindUniqueArgs>(args: SelectSubset<T, IntegrationSettingFindUniqueArgs<ExtArgs>>): Prisma__IntegrationSettingClient<$Result.GetResult<Prisma.$IntegrationSettingPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one IntegrationSetting that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {IntegrationSettingFindUniqueOrThrowArgs} args - Arguments to find a IntegrationSetting
     * @example
     * // Get one IntegrationSetting
     * const integrationSetting = await prisma.integrationSetting.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends IntegrationSettingFindUniqueOrThrowArgs>(args: SelectSubset<T, IntegrationSettingFindUniqueOrThrowArgs<ExtArgs>>): Prisma__IntegrationSettingClient<$Result.GetResult<Prisma.$IntegrationSettingPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first IntegrationSetting that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {IntegrationSettingFindFirstArgs} args - Arguments to find a IntegrationSetting
     * @example
     * // Get one IntegrationSetting
     * const integrationSetting = await prisma.integrationSetting.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends IntegrationSettingFindFirstArgs>(args?: SelectSubset<T, IntegrationSettingFindFirstArgs<ExtArgs>>): Prisma__IntegrationSettingClient<$Result.GetResult<Prisma.$IntegrationSettingPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first IntegrationSetting that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {IntegrationSettingFindFirstOrThrowArgs} args - Arguments to find a IntegrationSetting
     * @example
     * // Get one IntegrationSetting
     * const integrationSetting = await prisma.integrationSetting.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends IntegrationSettingFindFirstOrThrowArgs>(args?: SelectSubset<T, IntegrationSettingFindFirstOrThrowArgs<ExtArgs>>): Prisma__IntegrationSettingClient<$Result.GetResult<Prisma.$IntegrationSettingPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more IntegrationSettings that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {IntegrationSettingFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all IntegrationSettings
     * const integrationSettings = await prisma.integrationSetting.findMany()
     * 
     * // Get first 10 IntegrationSettings
     * const integrationSettings = await prisma.integrationSetting.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const integrationSettingWithIdOnly = await prisma.integrationSetting.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends IntegrationSettingFindManyArgs>(args?: SelectSubset<T, IntegrationSettingFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$IntegrationSettingPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a IntegrationSetting.
     * @param {IntegrationSettingCreateArgs} args - Arguments to create a IntegrationSetting.
     * @example
     * // Create one IntegrationSetting
     * const IntegrationSetting = await prisma.integrationSetting.create({
     *   data: {
     *     // ... data to create a IntegrationSetting
     *   }
     * })
     * 
     */
    create<T extends IntegrationSettingCreateArgs>(args: SelectSubset<T, IntegrationSettingCreateArgs<ExtArgs>>): Prisma__IntegrationSettingClient<$Result.GetResult<Prisma.$IntegrationSettingPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many IntegrationSettings.
     * @param {IntegrationSettingCreateManyArgs} args - Arguments to create many IntegrationSettings.
     * @example
     * // Create many IntegrationSettings
     * const integrationSetting = await prisma.integrationSetting.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends IntegrationSettingCreateManyArgs>(args?: SelectSubset<T, IntegrationSettingCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Delete a IntegrationSetting.
     * @param {IntegrationSettingDeleteArgs} args - Arguments to delete one IntegrationSetting.
     * @example
     * // Delete one IntegrationSetting
     * const IntegrationSetting = await prisma.integrationSetting.delete({
     *   where: {
     *     // ... filter to delete one IntegrationSetting
     *   }
     * })
     * 
     */
    delete<T extends IntegrationSettingDeleteArgs>(args: SelectSubset<T, IntegrationSettingDeleteArgs<ExtArgs>>): Prisma__IntegrationSettingClient<$Result.GetResult<Prisma.$IntegrationSettingPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one IntegrationSetting.
     * @param {IntegrationSettingUpdateArgs} args - Arguments to update one IntegrationSetting.
     * @example
     * // Update one IntegrationSetting
     * const integrationSetting = await prisma.integrationSetting.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends IntegrationSettingUpdateArgs>(args: SelectSubset<T, IntegrationSettingUpdateArgs<ExtArgs>>): Prisma__IntegrationSettingClient<$Result.GetResult<Prisma.$IntegrationSettingPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more IntegrationSettings.
     * @param {IntegrationSettingDeleteManyArgs} args - Arguments to filter IntegrationSettings to delete.
     * @example
     * // Delete a few IntegrationSettings
     * const { count } = await prisma.integrationSetting.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends IntegrationSettingDeleteManyArgs>(args?: SelectSubset<T, IntegrationSettingDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more IntegrationSettings.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {IntegrationSettingUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many IntegrationSettings
     * const integrationSetting = await prisma.integrationSetting.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends IntegrationSettingUpdateManyArgs>(args: SelectSubset<T, IntegrationSettingUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one IntegrationSetting.
     * @param {IntegrationSettingUpsertArgs} args - Arguments to update or create a IntegrationSetting.
     * @example
     * // Update or create a IntegrationSetting
     * const integrationSetting = await prisma.integrationSetting.upsert({
     *   create: {
     *     // ... data to create a IntegrationSetting
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the IntegrationSetting we want to update
     *   }
     * })
     */
    upsert<T extends IntegrationSettingUpsertArgs>(args: SelectSubset<T, IntegrationSettingUpsertArgs<ExtArgs>>): Prisma__IntegrationSettingClient<$Result.GetResult<Prisma.$IntegrationSettingPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more IntegrationSettings that matches the filter.
     * @param {IntegrationSettingFindRawArgs} args - Select which filters you would like to apply.
     * @example
     * const integrationSetting = await prisma.integrationSetting.findRaw({
     *   filter: { age: { $gt: 25 } }
     * })
     */
    findRaw(args?: IntegrationSettingFindRawArgs): Prisma.PrismaPromise<JsonObject>

    /**
     * Perform aggregation operations on a IntegrationSetting.
     * @param {IntegrationSettingAggregateRawArgs} args - Select which aggregations you would like to apply.
     * @example
     * const integrationSetting = await prisma.integrationSetting.aggregateRaw({
     *   pipeline: [
     *     { $match: { status: "registered" } },
     *     { $group: { _id: "$country", total: { $sum: 1 } } }
     *   ]
     * })
     */
    aggregateRaw(args?: IntegrationSettingAggregateRawArgs): Prisma.PrismaPromise<JsonObject>


    /**
     * Count the number of IntegrationSettings.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {IntegrationSettingCountArgs} args - Arguments to filter IntegrationSettings to count.
     * @example
     * // Count the number of IntegrationSettings
     * const count = await prisma.integrationSetting.count({
     *   where: {
     *     // ... the filter for the IntegrationSettings we want to count
     *   }
     * })
    **/
    count<T extends IntegrationSettingCountArgs>(
      args?: Subset<T, IntegrationSettingCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], IntegrationSettingCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a IntegrationSetting.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {IntegrationSettingAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends IntegrationSettingAggregateArgs>(args: Subset<T, IntegrationSettingAggregateArgs>): Prisma.PrismaPromise<GetIntegrationSettingAggregateType<T>>

    /**
     * Group by IntegrationSetting.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {IntegrationSettingGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends IntegrationSettingGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: IntegrationSettingGroupByArgs['orderBy'] }
        : { orderBy?: IntegrationSettingGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, IntegrationSettingGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetIntegrationSettingGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the IntegrationSetting model
   */
  readonly fields: IntegrationSettingFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for IntegrationSetting.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__IntegrationSettingClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the IntegrationSetting model
   */
  interface IntegrationSettingFieldRefs {
    readonly id: FieldRef<"IntegrationSetting", 'String'>
    readonly provider: FieldRef<"IntegrationSetting", 'String'>
    readonly key: FieldRef<"IntegrationSetting", 'String'>
    readonly encryptedValue: FieldRef<"IntegrationSetting", 'String'>
    readonly plainValue: FieldRef<"IntegrationSetting", 'String'>
    readonly isSecret: FieldRef<"IntegrationSetting", 'Boolean'>
    readonly enabled: FieldRef<"IntegrationSetting", 'Boolean'>
    readonly version: FieldRef<"IntegrationSetting", 'Int'>
    readonly source: FieldRef<"IntegrationSetting", 'String'>
    readonly pendingEncryptedValue: FieldRef<"IntegrationSetting", 'String'>
    readonly pendingPlainValue: FieldRef<"IntegrationSetting", 'String'>
    readonly pendingVersion: FieldRef<"IntegrationSetting", 'Int'>
    readonly pendingCandidateVersion: FieldRef<"IntegrationSetting", 'String'>
    readonly pendingCreatedAt: FieldRef<"IntegrationSetting", 'DateTime'>
    readonly pendingUpdatedBy: FieldRef<"IntegrationSetting", 'String'>
    readonly candidateVersion: FieldRef<"IntegrationSetting", 'String'>
    readonly candidateCreatedAt: FieldRef<"IntegrationSetting", 'DateTime'>
    readonly candidateLastTestVersion: FieldRef<"IntegrationSetting", 'String'>
    readonly candidateLastTestAt: FieldRef<"IntegrationSetting", 'DateTime'>
    readonly candidateLastTestResult: FieldRef<"IntegrationSetting", 'String'>
    readonly candidateFailureReasonSafe: FieldRef<"IntegrationSetting", 'String'>
    readonly createdAt: FieldRef<"IntegrationSetting", 'DateTime'>
    readonly updatedAt: FieldRef<"IntegrationSetting", 'DateTime'>
    readonly updatedBy: FieldRef<"IntegrationSetting", 'String'>
    readonly lastTestAt: FieldRef<"IntegrationSetting", 'DateTime'>
    readonly lastTestResult: FieldRef<"IntegrationSetting", 'String'>
    readonly lastFailureReasonSafe: FieldRef<"IntegrationSetting", 'String'>
  }
    

  // Custom InputTypes
  /**
   * IntegrationSetting findUnique
   */
  export type IntegrationSettingFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the IntegrationSetting
     */
    select?: IntegrationSettingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the IntegrationSetting
     */
    omit?: IntegrationSettingOmit<ExtArgs> | null
    /**
     * Filter, which IntegrationSetting to fetch.
     */
    where: IntegrationSettingWhereUniqueInput
  }

  /**
   * IntegrationSetting findUniqueOrThrow
   */
  export type IntegrationSettingFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the IntegrationSetting
     */
    select?: IntegrationSettingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the IntegrationSetting
     */
    omit?: IntegrationSettingOmit<ExtArgs> | null
    /**
     * Filter, which IntegrationSetting to fetch.
     */
    where: IntegrationSettingWhereUniqueInput
  }

  /**
   * IntegrationSetting findFirst
   */
  export type IntegrationSettingFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the IntegrationSetting
     */
    select?: IntegrationSettingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the IntegrationSetting
     */
    omit?: IntegrationSettingOmit<ExtArgs> | null
    /**
     * Filter, which IntegrationSetting to fetch.
     */
    where?: IntegrationSettingWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of IntegrationSettings to fetch.
     */
    orderBy?: IntegrationSettingOrderByWithRelationInput | IntegrationSettingOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for IntegrationSettings.
     */
    cursor?: IntegrationSettingWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` IntegrationSettings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` IntegrationSettings.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of IntegrationSettings.
     */
    distinct?: IntegrationSettingScalarFieldEnum | IntegrationSettingScalarFieldEnum[]
  }

  /**
   * IntegrationSetting findFirstOrThrow
   */
  export type IntegrationSettingFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the IntegrationSetting
     */
    select?: IntegrationSettingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the IntegrationSetting
     */
    omit?: IntegrationSettingOmit<ExtArgs> | null
    /**
     * Filter, which IntegrationSetting to fetch.
     */
    where?: IntegrationSettingWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of IntegrationSettings to fetch.
     */
    orderBy?: IntegrationSettingOrderByWithRelationInput | IntegrationSettingOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for IntegrationSettings.
     */
    cursor?: IntegrationSettingWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` IntegrationSettings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` IntegrationSettings.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of IntegrationSettings.
     */
    distinct?: IntegrationSettingScalarFieldEnum | IntegrationSettingScalarFieldEnum[]
  }

  /**
   * IntegrationSetting findMany
   */
  export type IntegrationSettingFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the IntegrationSetting
     */
    select?: IntegrationSettingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the IntegrationSetting
     */
    omit?: IntegrationSettingOmit<ExtArgs> | null
    /**
     * Filter, which IntegrationSettings to fetch.
     */
    where?: IntegrationSettingWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of IntegrationSettings to fetch.
     */
    orderBy?: IntegrationSettingOrderByWithRelationInput | IntegrationSettingOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing IntegrationSettings.
     */
    cursor?: IntegrationSettingWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` IntegrationSettings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` IntegrationSettings.
     */
    skip?: number
    distinct?: IntegrationSettingScalarFieldEnum | IntegrationSettingScalarFieldEnum[]
  }

  /**
   * IntegrationSetting create
   */
  export type IntegrationSettingCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the IntegrationSetting
     */
    select?: IntegrationSettingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the IntegrationSetting
     */
    omit?: IntegrationSettingOmit<ExtArgs> | null
    /**
     * The data needed to create a IntegrationSetting.
     */
    data: XOR<IntegrationSettingCreateInput, IntegrationSettingUncheckedCreateInput>
  }

  /**
   * IntegrationSetting createMany
   */
  export type IntegrationSettingCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many IntegrationSettings.
     */
    data: IntegrationSettingCreateManyInput | IntegrationSettingCreateManyInput[]
  }

  /**
   * IntegrationSetting update
   */
  export type IntegrationSettingUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the IntegrationSetting
     */
    select?: IntegrationSettingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the IntegrationSetting
     */
    omit?: IntegrationSettingOmit<ExtArgs> | null
    /**
     * The data needed to update a IntegrationSetting.
     */
    data: XOR<IntegrationSettingUpdateInput, IntegrationSettingUncheckedUpdateInput>
    /**
     * Choose, which IntegrationSetting to update.
     */
    where: IntegrationSettingWhereUniqueInput
  }

  /**
   * IntegrationSetting updateMany
   */
  export type IntegrationSettingUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update IntegrationSettings.
     */
    data: XOR<IntegrationSettingUpdateManyMutationInput, IntegrationSettingUncheckedUpdateManyInput>
    /**
     * Filter which IntegrationSettings to update
     */
    where?: IntegrationSettingWhereInput
    /**
     * Limit how many IntegrationSettings to update.
     */
    limit?: number
  }

  /**
   * IntegrationSetting upsert
   */
  export type IntegrationSettingUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the IntegrationSetting
     */
    select?: IntegrationSettingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the IntegrationSetting
     */
    omit?: IntegrationSettingOmit<ExtArgs> | null
    /**
     * The filter to search for the IntegrationSetting to update in case it exists.
     */
    where: IntegrationSettingWhereUniqueInput
    /**
     * In case the IntegrationSetting found by the `where` argument doesn't exist, create a new IntegrationSetting with this data.
     */
    create: XOR<IntegrationSettingCreateInput, IntegrationSettingUncheckedCreateInput>
    /**
     * In case the IntegrationSetting was found with the provided `where` argument, update it with this data.
     */
    update: XOR<IntegrationSettingUpdateInput, IntegrationSettingUncheckedUpdateInput>
  }

  /**
   * IntegrationSetting delete
   */
  export type IntegrationSettingDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the IntegrationSetting
     */
    select?: IntegrationSettingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the IntegrationSetting
     */
    omit?: IntegrationSettingOmit<ExtArgs> | null
    /**
     * Filter which IntegrationSetting to delete.
     */
    where: IntegrationSettingWhereUniqueInput
  }

  /**
   * IntegrationSetting deleteMany
   */
  export type IntegrationSettingDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which IntegrationSettings to delete
     */
    where?: IntegrationSettingWhereInput
    /**
     * Limit how many IntegrationSettings to delete.
     */
    limit?: number
  }

  /**
   * IntegrationSetting findRaw
   */
  export type IntegrationSettingFindRawArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The query predicate filter. If unspecified, then all documents in the collection will match the predicate. ${@link https://docs.mongodb.com/manual/reference/operator/query MongoDB Docs}.
     */
    filter?: InputJsonValue
    /**
     * Additional options to pass to the `find` command ${@link https://docs.mongodb.com/manual/reference/command/find/#command-fields MongoDB Docs}.
     */
    options?: InputJsonValue
  }

  /**
   * IntegrationSetting aggregateRaw
   */
  export type IntegrationSettingAggregateRawArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * An array of aggregation stages to process and transform the document stream via the aggregation pipeline. ${@link https://docs.mongodb.com/manual/reference/operator/aggregation-pipeline MongoDB Docs}.
     */
    pipeline?: InputJsonValue[]
    /**
     * Additional options to pass to the `aggregate` command ${@link https://docs.mongodb.com/manual/reference/command/aggregate/#command-fields MongoDB Docs}.
     */
    options?: InputJsonValue
  }

  /**
   * IntegrationSetting without action
   */
  export type IntegrationSettingDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the IntegrationSetting
     */
    select?: IntegrationSettingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the IntegrationSetting
     */
    omit?: IntegrationSettingOmit<ExtArgs> | null
  }


  /**
   * Enums
   */

  export const IntegrationSettingScalarFieldEnum: {
    id: 'id',
    provider: 'provider',
    key: 'key',
    encryptedValue: 'encryptedValue',
    plainValue: 'plainValue',
    isSecret: 'isSecret',
    enabled: 'enabled',
    version: 'version',
    source: 'source',
    pendingEncryptedValue: 'pendingEncryptedValue',
    pendingPlainValue: 'pendingPlainValue',
    pendingVersion: 'pendingVersion',
    pendingCandidateVersion: 'pendingCandidateVersion',
    pendingCreatedAt: 'pendingCreatedAt',
    pendingUpdatedBy: 'pendingUpdatedBy',
    candidateVersion: 'candidateVersion',
    candidateCreatedAt: 'candidateCreatedAt',
    candidateLastTestVersion: 'candidateLastTestVersion',
    candidateLastTestAt: 'candidateLastTestAt',
    candidateLastTestResult: 'candidateLastTestResult',
    candidateFailureReasonSafe: 'candidateFailureReasonSafe',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    updatedBy: 'updatedBy',
    lastTestAt: 'lastTestAt',
    lastTestResult: 'lastTestResult',
    lastFailureReasonSafe: 'lastFailureReasonSafe'
  };

  export type IntegrationSettingScalarFieldEnum = (typeof IntegrationSettingScalarFieldEnum)[keyof typeof IntegrationSettingScalarFieldEnum]


  export const SortOrder: {
    asc: 'asc',
    desc: 'desc'
  };

  export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder]


  export const QueryMode: {
    default: 'default',
    insensitive: 'insensitive'
  };

  export type QueryMode = (typeof QueryMode)[keyof typeof QueryMode]


  /**
   * Field references
   */


  /**
   * Reference to a field of type 'String'
   */
  export type StringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String'>
    


  /**
   * Reference to a field of type 'String[]'
   */
  export type ListStringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String[]'>
    


  /**
   * Reference to a field of type 'Boolean'
   */
  export type BooleanFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Boolean'>
    


  /**
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>
    


  /**
   * Reference to a field of type 'Int[]'
   */
  export type ListIntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int[]'>
    


  /**
   * Reference to a field of type 'DateTime'
   */
  export type DateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime'>
    


  /**
   * Reference to a field of type 'DateTime[]'
   */
  export type ListDateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime[]'>
    


  /**
   * Reference to a field of type 'Float'
   */
  export type FloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float'>
    


  /**
   * Reference to a field of type 'Float[]'
   */
  export type ListFloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float[]'>
    
  /**
   * Deep Input Types
   */


  export type IntegrationSettingWhereInput = {
    AND?: IntegrationSettingWhereInput | IntegrationSettingWhereInput[]
    OR?: IntegrationSettingWhereInput[]
    NOT?: IntegrationSettingWhereInput | IntegrationSettingWhereInput[]
    id?: StringFilter<"IntegrationSetting"> | string
    provider?: StringFilter<"IntegrationSetting"> | string
    key?: StringFilter<"IntegrationSetting"> | string
    encryptedValue?: StringNullableFilter<"IntegrationSetting"> | string | null
    plainValue?: StringNullableFilter<"IntegrationSetting"> | string | null
    isSecret?: BoolFilter<"IntegrationSetting"> | boolean
    enabled?: BoolFilter<"IntegrationSetting"> | boolean
    version?: IntFilter<"IntegrationSetting"> | number
    source?: StringFilter<"IntegrationSetting"> | string
    pendingEncryptedValue?: StringNullableFilter<"IntegrationSetting"> | string | null
    pendingPlainValue?: StringNullableFilter<"IntegrationSetting"> | string | null
    pendingVersion?: IntNullableFilter<"IntegrationSetting"> | number | null
    pendingCandidateVersion?: StringNullableFilter<"IntegrationSetting"> | string | null
    pendingCreatedAt?: DateTimeNullableFilter<"IntegrationSetting"> | Date | string | null
    pendingUpdatedBy?: StringNullableFilter<"IntegrationSetting"> | string | null
    candidateVersion?: StringNullableFilter<"IntegrationSetting"> | string | null
    candidateCreatedAt?: DateTimeNullableFilter<"IntegrationSetting"> | Date | string | null
    candidateLastTestVersion?: StringNullableFilter<"IntegrationSetting"> | string | null
    candidateLastTestAt?: DateTimeNullableFilter<"IntegrationSetting"> | Date | string | null
    candidateLastTestResult?: StringNullableFilter<"IntegrationSetting"> | string | null
    candidateFailureReasonSafe?: StringNullableFilter<"IntegrationSetting"> | string | null
    createdAt?: DateTimeFilter<"IntegrationSetting"> | Date | string
    updatedAt?: DateTimeFilter<"IntegrationSetting"> | Date | string
    updatedBy?: StringNullableFilter<"IntegrationSetting"> | string | null
    lastTestAt?: DateTimeNullableFilter<"IntegrationSetting"> | Date | string | null
    lastTestResult?: StringNullableFilter<"IntegrationSetting"> | string | null
    lastFailureReasonSafe?: StringNullableFilter<"IntegrationSetting"> | string | null
  }

  export type IntegrationSettingOrderByWithRelationInput = {
    id?: SortOrder
    provider?: SortOrder
    key?: SortOrder
    encryptedValue?: SortOrder
    plainValue?: SortOrder
    isSecret?: SortOrder
    enabled?: SortOrder
    version?: SortOrder
    source?: SortOrder
    pendingEncryptedValue?: SortOrder
    pendingPlainValue?: SortOrder
    pendingVersion?: SortOrder
    pendingCandidateVersion?: SortOrder
    pendingCreatedAt?: SortOrder
    pendingUpdatedBy?: SortOrder
    candidateVersion?: SortOrder
    candidateCreatedAt?: SortOrder
    candidateLastTestVersion?: SortOrder
    candidateLastTestAt?: SortOrder
    candidateLastTestResult?: SortOrder
    candidateFailureReasonSafe?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    updatedBy?: SortOrder
    lastTestAt?: SortOrder
    lastTestResult?: SortOrder
    lastFailureReasonSafe?: SortOrder
  }

  export type IntegrationSettingWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    provider_key?: IntegrationSettingProviderKeyCompoundUniqueInput
    AND?: IntegrationSettingWhereInput | IntegrationSettingWhereInput[]
    OR?: IntegrationSettingWhereInput[]
    NOT?: IntegrationSettingWhereInput | IntegrationSettingWhereInput[]
    provider?: StringFilter<"IntegrationSetting"> | string
    key?: StringFilter<"IntegrationSetting"> | string
    encryptedValue?: StringNullableFilter<"IntegrationSetting"> | string | null
    plainValue?: StringNullableFilter<"IntegrationSetting"> | string | null
    isSecret?: BoolFilter<"IntegrationSetting"> | boolean
    enabled?: BoolFilter<"IntegrationSetting"> | boolean
    version?: IntFilter<"IntegrationSetting"> | number
    source?: StringFilter<"IntegrationSetting"> | string
    pendingEncryptedValue?: StringNullableFilter<"IntegrationSetting"> | string | null
    pendingPlainValue?: StringNullableFilter<"IntegrationSetting"> | string | null
    pendingVersion?: IntNullableFilter<"IntegrationSetting"> | number | null
    pendingCandidateVersion?: StringNullableFilter<"IntegrationSetting"> | string | null
    pendingCreatedAt?: DateTimeNullableFilter<"IntegrationSetting"> | Date | string | null
    pendingUpdatedBy?: StringNullableFilter<"IntegrationSetting"> | string | null
    candidateVersion?: StringNullableFilter<"IntegrationSetting"> | string | null
    candidateCreatedAt?: DateTimeNullableFilter<"IntegrationSetting"> | Date | string | null
    candidateLastTestVersion?: StringNullableFilter<"IntegrationSetting"> | string | null
    candidateLastTestAt?: DateTimeNullableFilter<"IntegrationSetting"> | Date | string | null
    candidateLastTestResult?: StringNullableFilter<"IntegrationSetting"> | string | null
    candidateFailureReasonSafe?: StringNullableFilter<"IntegrationSetting"> | string | null
    createdAt?: DateTimeFilter<"IntegrationSetting"> | Date | string
    updatedAt?: DateTimeFilter<"IntegrationSetting"> | Date | string
    updatedBy?: StringNullableFilter<"IntegrationSetting"> | string | null
    lastTestAt?: DateTimeNullableFilter<"IntegrationSetting"> | Date | string | null
    lastTestResult?: StringNullableFilter<"IntegrationSetting"> | string | null
    lastFailureReasonSafe?: StringNullableFilter<"IntegrationSetting"> | string | null
  }, "id" | "provider_key">

  export type IntegrationSettingOrderByWithAggregationInput = {
    id?: SortOrder
    provider?: SortOrder
    key?: SortOrder
    encryptedValue?: SortOrder
    plainValue?: SortOrder
    isSecret?: SortOrder
    enabled?: SortOrder
    version?: SortOrder
    source?: SortOrder
    pendingEncryptedValue?: SortOrder
    pendingPlainValue?: SortOrder
    pendingVersion?: SortOrder
    pendingCandidateVersion?: SortOrder
    pendingCreatedAt?: SortOrder
    pendingUpdatedBy?: SortOrder
    candidateVersion?: SortOrder
    candidateCreatedAt?: SortOrder
    candidateLastTestVersion?: SortOrder
    candidateLastTestAt?: SortOrder
    candidateLastTestResult?: SortOrder
    candidateFailureReasonSafe?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    updatedBy?: SortOrder
    lastTestAt?: SortOrder
    lastTestResult?: SortOrder
    lastFailureReasonSafe?: SortOrder
    _count?: IntegrationSettingCountOrderByAggregateInput
    _avg?: IntegrationSettingAvgOrderByAggregateInput
    _max?: IntegrationSettingMaxOrderByAggregateInput
    _min?: IntegrationSettingMinOrderByAggregateInput
    _sum?: IntegrationSettingSumOrderByAggregateInput
  }

  export type IntegrationSettingScalarWhereWithAggregatesInput = {
    AND?: IntegrationSettingScalarWhereWithAggregatesInput | IntegrationSettingScalarWhereWithAggregatesInput[]
    OR?: IntegrationSettingScalarWhereWithAggregatesInput[]
    NOT?: IntegrationSettingScalarWhereWithAggregatesInput | IntegrationSettingScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"IntegrationSetting"> | string
    provider?: StringWithAggregatesFilter<"IntegrationSetting"> | string
    key?: StringWithAggregatesFilter<"IntegrationSetting"> | string
    encryptedValue?: StringNullableWithAggregatesFilter<"IntegrationSetting"> | string | null
    plainValue?: StringNullableWithAggregatesFilter<"IntegrationSetting"> | string | null
    isSecret?: BoolWithAggregatesFilter<"IntegrationSetting"> | boolean
    enabled?: BoolWithAggregatesFilter<"IntegrationSetting"> | boolean
    version?: IntWithAggregatesFilter<"IntegrationSetting"> | number
    source?: StringWithAggregatesFilter<"IntegrationSetting"> | string
    pendingEncryptedValue?: StringNullableWithAggregatesFilter<"IntegrationSetting"> | string | null
    pendingPlainValue?: StringNullableWithAggregatesFilter<"IntegrationSetting"> | string | null
    pendingVersion?: IntNullableWithAggregatesFilter<"IntegrationSetting"> | number | null
    pendingCandidateVersion?: StringNullableWithAggregatesFilter<"IntegrationSetting"> | string | null
    pendingCreatedAt?: DateTimeNullableWithAggregatesFilter<"IntegrationSetting"> | Date | string | null
    pendingUpdatedBy?: StringNullableWithAggregatesFilter<"IntegrationSetting"> | string | null
    candidateVersion?: StringNullableWithAggregatesFilter<"IntegrationSetting"> | string | null
    candidateCreatedAt?: DateTimeNullableWithAggregatesFilter<"IntegrationSetting"> | Date | string | null
    candidateLastTestVersion?: StringNullableWithAggregatesFilter<"IntegrationSetting"> | string | null
    candidateLastTestAt?: DateTimeNullableWithAggregatesFilter<"IntegrationSetting"> | Date | string | null
    candidateLastTestResult?: StringNullableWithAggregatesFilter<"IntegrationSetting"> | string | null
    candidateFailureReasonSafe?: StringNullableWithAggregatesFilter<"IntegrationSetting"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"IntegrationSetting"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"IntegrationSetting"> | Date | string
    updatedBy?: StringNullableWithAggregatesFilter<"IntegrationSetting"> | string | null
    lastTestAt?: DateTimeNullableWithAggregatesFilter<"IntegrationSetting"> | Date | string | null
    lastTestResult?: StringNullableWithAggregatesFilter<"IntegrationSetting"> | string | null
    lastFailureReasonSafe?: StringNullableWithAggregatesFilter<"IntegrationSetting"> | string | null
  }

  export type IntegrationSettingCreateInput = {
    id?: string
    provider: string
    key: string
    encryptedValue?: string | null
    plainValue?: string | null
    isSecret: boolean
    enabled?: boolean
    version?: number
    source?: string
    pendingEncryptedValue?: string | null
    pendingPlainValue?: string | null
    pendingVersion?: number | null
    pendingCandidateVersion?: string | null
    pendingCreatedAt?: Date | string | null
    pendingUpdatedBy?: string | null
    candidateVersion?: string | null
    candidateCreatedAt?: Date | string | null
    candidateLastTestVersion?: string | null
    candidateLastTestAt?: Date | string | null
    candidateLastTestResult?: string | null
    candidateFailureReasonSafe?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    updatedBy?: string | null
    lastTestAt?: Date | string | null
    lastTestResult?: string | null
    lastFailureReasonSafe?: string | null
  }

  export type IntegrationSettingUncheckedCreateInput = {
    id?: string
    provider: string
    key: string
    encryptedValue?: string | null
    plainValue?: string | null
    isSecret: boolean
    enabled?: boolean
    version?: number
    source?: string
    pendingEncryptedValue?: string | null
    pendingPlainValue?: string | null
    pendingVersion?: number | null
    pendingCandidateVersion?: string | null
    pendingCreatedAt?: Date | string | null
    pendingUpdatedBy?: string | null
    candidateVersion?: string | null
    candidateCreatedAt?: Date | string | null
    candidateLastTestVersion?: string | null
    candidateLastTestAt?: Date | string | null
    candidateLastTestResult?: string | null
    candidateFailureReasonSafe?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    updatedBy?: string | null
    lastTestAt?: Date | string | null
    lastTestResult?: string | null
    lastFailureReasonSafe?: string | null
  }

  export type IntegrationSettingUpdateInput = {
    provider?: StringFieldUpdateOperationsInput | string
    key?: StringFieldUpdateOperationsInput | string
    encryptedValue?: NullableStringFieldUpdateOperationsInput | string | null
    plainValue?: NullableStringFieldUpdateOperationsInput | string | null
    isSecret?: BoolFieldUpdateOperationsInput | boolean
    enabled?: BoolFieldUpdateOperationsInput | boolean
    version?: IntFieldUpdateOperationsInput | number
    source?: StringFieldUpdateOperationsInput | string
    pendingEncryptedValue?: NullableStringFieldUpdateOperationsInput | string | null
    pendingPlainValue?: NullableStringFieldUpdateOperationsInput | string | null
    pendingVersion?: NullableIntFieldUpdateOperationsInput | number | null
    pendingCandidateVersion?: NullableStringFieldUpdateOperationsInput | string | null
    pendingCreatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    pendingUpdatedBy?: NullableStringFieldUpdateOperationsInput | string | null
    candidateVersion?: NullableStringFieldUpdateOperationsInput | string | null
    candidateCreatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    candidateLastTestVersion?: NullableStringFieldUpdateOperationsInput | string | null
    candidateLastTestAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    candidateLastTestResult?: NullableStringFieldUpdateOperationsInput | string | null
    candidateFailureReasonSafe?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
    lastTestAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lastTestResult?: NullableStringFieldUpdateOperationsInput | string | null
    lastFailureReasonSafe?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type IntegrationSettingUncheckedUpdateInput = {
    provider?: StringFieldUpdateOperationsInput | string
    key?: StringFieldUpdateOperationsInput | string
    encryptedValue?: NullableStringFieldUpdateOperationsInput | string | null
    plainValue?: NullableStringFieldUpdateOperationsInput | string | null
    isSecret?: BoolFieldUpdateOperationsInput | boolean
    enabled?: BoolFieldUpdateOperationsInput | boolean
    version?: IntFieldUpdateOperationsInput | number
    source?: StringFieldUpdateOperationsInput | string
    pendingEncryptedValue?: NullableStringFieldUpdateOperationsInput | string | null
    pendingPlainValue?: NullableStringFieldUpdateOperationsInput | string | null
    pendingVersion?: NullableIntFieldUpdateOperationsInput | number | null
    pendingCandidateVersion?: NullableStringFieldUpdateOperationsInput | string | null
    pendingCreatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    pendingUpdatedBy?: NullableStringFieldUpdateOperationsInput | string | null
    candidateVersion?: NullableStringFieldUpdateOperationsInput | string | null
    candidateCreatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    candidateLastTestVersion?: NullableStringFieldUpdateOperationsInput | string | null
    candidateLastTestAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    candidateLastTestResult?: NullableStringFieldUpdateOperationsInput | string | null
    candidateFailureReasonSafe?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
    lastTestAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lastTestResult?: NullableStringFieldUpdateOperationsInput | string | null
    lastFailureReasonSafe?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type IntegrationSettingCreateManyInput = {
    id?: string
    provider: string
    key: string
    encryptedValue?: string | null
    plainValue?: string | null
    isSecret: boolean
    enabled?: boolean
    version?: number
    source?: string
    pendingEncryptedValue?: string | null
    pendingPlainValue?: string | null
    pendingVersion?: number | null
    pendingCandidateVersion?: string | null
    pendingCreatedAt?: Date | string | null
    pendingUpdatedBy?: string | null
    candidateVersion?: string | null
    candidateCreatedAt?: Date | string | null
    candidateLastTestVersion?: string | null
    candidateLastTestAt?: Date | string | null
    candidateLastTestResult?: string | null
    candidateFailureReasonSafe?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    updatedBy?: string | null
    lastTestAt?: Date | string | null
    lastTestResult?: string | null
    lastFailureReasonSafe?: string | null
  }

  export type IntegrationSettingUpdateManyMutationInput = {
    provider?: StringFieldUpdateOperationsInput | string
    key?: StringFieldUpdateOperationsInput | string
    encryptedValue?: NullableStringFieldUpdateOperationsInput | string | null
    plainValue?: NullableStringFieldUpdateOperationsInput | string | null
    isSecret?: BoolFieldUpdateOperationsInput | boolean
    enabled?: BoolFieldUpdateOperationsInput | boolean
    version?: IntFieldUpdateOperationsInput | number
    source?: StringFieldUpdateOperationsInput | string
    pendingEncryptedValue?: NullableStringFieldUpdateOperationsInput | string | null
    pendingPlainValue?: NullableStringFieldUpdateOperationsInput | string | null
    pendingVersion?: NullableIntFieldUpdateOperationsInput | number | null
    pendingCandidateVersion?: NullableStringFieldUpdateOperationsInput | string | null
    pendingCreatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    pendingUpdatedBy?: NullableStringFieldUpdateOperationsInput | string | null
    candidateVersion?: NullableStringFieldUpdateOperationsInput | string | null
    candidateCreatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    candidateLastTestVersion?: NullableStringFieldUpdateOperationsInput | string | null
    candidateLastTestAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    candidateLastTestResult?: NullableStringFieldUpdateOperationsInput | string | null
    candidateFailureReasonSafe?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
    lastTestAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lastTestResult?: NullableStringFieldUpdateOperationsInput | string | null
    lastFailureReasonSafe?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type IntegrationSettingUncheckedUpdateManyInput = {
    provider?: StringFieldUpdateOperationsInput | string
    key?: StringFieldUpdateOperationsInput | string
    encryptedValue?: NullableStringFieldUpdateOperationsInput | string | null
    plainValue?: NullableStringFieldUpdateOperationsInput | string | null
    isSecret?: BoolFieldUpdateOperationsInput | boolean
    enabled?: BoolFieldUpdateOperationsInput | boolean
    version?: IntFieldUpdateOperationsInput | number
    source?: StringFieldUpdateOperationsInput | string
    pendingEncryptedValue?: NullableStringFieldUpdateOperationsInput | string | null
    pendingPlainValue?: NullableStringFieldUpdateOperationsInput | string | null
    pendingVersion?: NullableIntFieldUpdateOperationsInput | number | null
    pendingCandidateVersion?: NullableStringFieldUpdateOperationsInput | string | null
    pendingCreatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    pendingUpdatedBy?: NullableStringFieldUpdateOperationsInput | string | null
    candidateVersion?: NullableStringFieldUpdateOperationsInput | string | null
    candidateCreatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    candidateLastTestVersion?: NullableStringFieldUpdateOperationsInput | string | null
    candidateLastTestAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    candidateLastTestResult?: NullableStringFieldUpdateOperationsInput | string | null
    candidateFailureReasonSafe?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
    lastTestAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lastTestResult?: NullableStringFieldUpdateOperationsInput | string | null
    lastFailureReasonSafe?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type StringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type StringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
    isSet?: boolean
  }

  export type BoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type IntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type IntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
    isSet?: boolean
  }

  export type DateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
    isSet?: boolean
  }

  export type DateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type IntegrationSettingProviderKeyCompoundUniqueInput = {
    provider: string
    key: string
  }

  export type IntegrationSettingCountOrderByAggregateInput = {
    id?: SortOrder
    provider?: SortOrder
    key?: SortOrder
    encryptedValue?: SortOrder
    plainValue?: SortOrder
    isSecret?: SortOrder
    enabled?: SortOrder
    version?: SortOrder
    source?: SortOrder
    pendingEncryptedValue?: SortOrder
    pendingPlainValue?: SortOrder
    pendingVersion?: SortOrder
    pendingCandidateVersion?: SortOrder
    pendingCreatedAt?: SortOrder
    pendingUpdatedBy?: SortOrder
    candidateVersion?: SortOrder
    candidateCreatedAt?: SortOrder
    candidateLastTestVersion?: SortOrder
    candidateLastTestAt?: SortOrder
    candidateLastTestResult?: SortOrder
    candidateFailureReasonSafe?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    updatedBy?: SortOrder
    lastTestAt?: SortOrder
    lastTestResult?: SortOrder
    lastFailureReasonSafe?: SortOrder
  }

  export type IntegrationSettingAvgOrderByAggregateInput = {
    version?: SortOrder
    pendingVersion?: SortOrder
  }

  export type IntegrationSettingMaxOrderByAggregateInput = {
    id?: SortOrder
    provider?: SortOrder
    key?: SortOrder
    encryptedValue?: SortOrder
    plainValue?: SortOrder
    isSecret?: SortOrder
    enabled?: SortOrder
    version?: SortOrder
    source?: SortOrder
    pendingEncryptedValue?: SortOrder
    pendingPlainValue?: SortOrder
    pendingVersion?: SortOrder
    pendingCandidateVersion?: SortOrder
    pendingCreatedAt?: SortOrder
    pendingUpdatedBy?: SortOrder
    candidateVersion?: SortOrder
    candidateCreatedAt?: SortOrder
    candidateLastTestVersion?: SortOrder
    candidateLastTestAt?: SortOrder
    candidateLastTestResult?: SortOrder
    candidateFailureReasonSafe?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    updatedBy?: SortOrder
    lastTestAt?: SortOrder
    lastTestResult?: SortOrder
    lastFailureReasonSafe?: SortOrder
  }

  export type IntegrationSettingMinOrderByAggregateInput = {
    id?: SortOrder
    provider?: SortOrder
    key?: SortOrder
    encryptedValue?: SortOrder
    plainValue?: SortOrder
    isSecret?: SortOrder
    enabled?: SortOrder
    version?: SortOrder
    source?: SortOrder
    pendingEncryptedValue?: SortOrder
    pendingPlainValue?: SortOrder
    pendingVersion?: SortOrder
    pendingCandidateVersion?: SortOrder
    pendingCreatedAt?: SortOrder
    pendingUpdatedBy?: SortOrder
    candidateVersion?: SortOrder
    candidateCreatedAt?: SortOrder
    candidateLastTestVersion?: SortOrder
    candidateLastTestAt?: SortOrder
    candidateLastTestResult?: SortOrder
    candidateFailureReasonSafe?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    updatedBy?: SortOrder
    lastTestAt?: SortOrder
    lastTestResult?: SortOrder
    lastFailureReasonSafe?: SortOrder
  }

  export type IntegrationSettingSumOrderByAggregateInput = {
    version?: SortOrder
    pendingVersion?: SortOrder
  }

  export type StringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type StringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
    isSet?: boolean
  }

  export type BoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type IntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type IntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedIntNullableFilter<$PrismaModel>
    _max?: NestedIntNullableFilter<$PrismaModel>
    isSet?: boolean
  }

  export type DateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
    isSet?: boolean
  }

  export type DateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type StringFieldUpdateOperationsInput = {
    set?: string
  }

  export type NullableStringFieldUpdateOperationsInput = {
    set?: string | null
    unset?: boolean
  }

  export type BoolFieldUpdateOperationsInput = {
    set?: boolean
  }

  export type IntFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type NullableIntFieldUpdateOperationsInput = {
    set?: number | null
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
    unset?: boolean
  }

  export type NullableDateTimeFieldUpdateOperationsInput = {
    set?: Date | string | null
    unset?: boolean
  }

  export type DateTimeFieldUpdateOperationsInput = {
    set?: Date | string
  }

  export type NestedStringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type NestedStringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
    isSet?: boolean
  }

  export type NestedBoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type NestedIntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type NestedIntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
    isSet?: boolean
  }

  export type NestedDateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
    isSet?: boolean
  }

  export type NestedDateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type NestedStringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NestedStringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
    isSet?: boolean
  }

  export type NestedBoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type NestedIntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type NestedFloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }

  export type NestedIntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedIntNullableFilter<$PrismaModel>
    _max?: NestedIntNullableFilter<$PrismaModel>
    isSet?: boolean
  }

  export type NestedFloatNullableFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableFilter<$PrismaModel> | number | null
    isSet?: boolean
  }

  export type NestedDateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
    isSet?: boolean
  }

  export type NestedDateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }



  /**
   * Batch Payload for updateMany & deleteMany & createMany
   */

  export type BatchPayload = {
    count: number
  }

  /**
   * DMMF
   */
  export const dmmf: runtime.BaseDMMF
}