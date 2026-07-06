import {
  ApolloClient,
  InMemoryCache,
  createHttpLink,
  split,
  ApolloLink,
  Observable,
} from '@apollo/client'
import { setContext } from '@apollo/client/link/context'
import { onError } from '@apollo/client/link/error'
import { getMainDefinition } from '@apollo/client/utilities'

const GRAPHQL_URL = import.meta.env.VITE_GRAPHQL_URL || '/graphql'
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:4001/socket'

// HTTP link
const httpLink = createHttpLink({ uri: GRAPHQL_URL })

// Auth header injection
const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem('fluxstream_token')
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    },
  }
})

// Error handling
const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, extensions }) => {
      if (extensions?.code === 'UNAUTHENTICATED') {
        localStorage.removeItem('fluxstream_token')
        window.location.href = '/login'
      }
      console.error(`[GraphQL Error]: ${message}`)
    })
  }
  if (networkError) {
    console.error(`[Network Error]: ${networkError.message}`)
  }
})

const apolloClient = new ApolloClient({
  link: ApolloLink.from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          contents: {
            keyArgs: ['genre', 'contentType', 'studioId', 'orderBy'],
            merge(_existing, incoming) {
              return incoming
            },
          },
        },
      },
      Content: { keyFields: ['id'] },
      Episode: { keyFields: ['id'] },
      User: { keyFields: ['id'] },
      Studio: { keyFields: ['id'] },
      Plan: { keyFields: ['id'] },
      CDNNode: { keyFields: ['id'] },
    },
  }),
  defaultOptions: {
    watchQuery: { errorPolicy: 'all' },
    query: { errorPolicy: 'all' },
  },
})

export default apolloClient
