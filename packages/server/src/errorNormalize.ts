// The functions in this file are not part of Apollo Server's external API.

import {
  GraphQLError,
  GraphQLErrorExtensions,
  GraphQLFormattedError,
} from 'graphql';
import { ApolloServerErrorCode } from './errors/index.js';

// This function accepts any value that were thrown and convert it to GraphQLFormatterError.
// It also add default extensions.code and copy stack trace onto an extension if requested.
// This function should not throw.
export function normalizeAndFormatErrors(
  errors: ReadonlyArray<unknown>,
  options: {
    formatError?: (
      formattedError: GraphQLFormattedError,
      error: unknown,
    ) => GraphQLFormattedError;
    includeStacktraceInErrorResponses?: boolean;
  } = {},
): Array<GraphQLFormattedError> {
  const formatError = options.formatError ?? ((error) => error);
  return errors.map((error) => {
    try {
      return formatError(enrichError(error), error);
    } catch (formattingError) {
      if (options.includeStacktraceInErrorResponses) {
        // includeStacktraceInErrorResponses is used in development
        // so it will be helpful to show errors thrown by formatError hooks in that mode
        return enrichError(formattingError);
      } else {
        // obscure error
        return {
          message: 'Internal server error',
          extensions: { code: ApolloServerErrorCode.INTERNAL_SERVER_ERROR },
        };
      }
    }
  });

  // You can't spread anything that isn't an object. If somebody
  // puts a non-object on extensions.exception, we will just replace
  // it with the empty object.
  function ensureObject(x: unknown): object {
    if (x && typeof x === 'object') {
      return x;
    }
    return {};
  }

  function enrichError(maybeError: unknown): GraphQLFormattedError {
    const graphqlError = ensureGraphQLError(maybeError);

    const extensions: GraphQLErrorExtensions = {
      ...graphqlError.extensions,
      code:
        graphqlError.extensions.code ??
        ApolloServerErrorCode.INTERNAL_SERVER_ERROR,
    };

    const { originalError } = graphqlError;
    if (originalError != null && !(originalError instanceof GraphQLError)) {
      const originalErrorEnumerableEntries = Object.entries(
        originalError,
      ).filter(([key]) => key !== 'extensions');

      if (originalErrorEnumerableEntries.length > 0) {
        extensions.exception = {
          ...ensureObject(extensions.exception),
          ...Object.fromEntries(originalErrorEnumerableEntries),
        };
      }
    }

    if (options.includeStacktraceInErrorResponses) {
      // Note that if ensureGraphQLError created graphqlError from an
      // originalError, graphqlError.stack will be the same as
      // originalError.stack due to some special code in the GraphQLError
      // constructor.
      extensions.stacktrace = graphqlError.stack?.split('\n');
    }

    return { ...graphqlError.toJSON(), extensions };
  }
}

export function ensureError(maybeError: unknown): Error {
  return maybeError instanceof Error
    ? maybeError
    : new GraphQLError('Unexpected error value: ' + String(maybeError));
}

export function ensureGraphQLError(maybeError: unknown): GraphQLError {
  const error: Error = ensureError(maybeError);

  return error instanceof GraphQLError
    ? error
    : new GraphQLError(error.message, { originalError: error });
}
