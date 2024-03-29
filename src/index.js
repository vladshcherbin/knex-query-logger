/* eslint-disable no-console, no-underscore-dangle */
import { gray, red, white, yellowBright } from 'colorette'
import hijs from 'highlight.js'

function colorize(part) {
  switch (part.scope) {
    case 'keyword':
    case 'operator':
      return gray(part.children[0].toUpperCase())
    case 'number':
      return yellowBright(part.children[0])
    default:
      return part.children[0]
  }
}

export default function knexQueryLogger(knex) {
  const executedQueries = {}

  function highlightQuery({ bindings, sql }) {
    return hijs.highlight(knex.raw(sql.replaceAll(/\$\d+/g, '?'), bindings).toString(), { language: 'sql' })
      ._emitter.rootNode.children
      .map((part) => ((typeof part === 'string') ? yellowBright(part) : colorize(part)))
      .join('')
  }

  knex
    .on('query', ({ __knexQueryUid, bindings, sql }) => {
      executedQueries[__knexQueryUid] = {
        bindings,
        sql,
        startTime: process.hrtime.bigint()
      }
    })
    .on('query-error', (_, { __knexQueryUid }) => {
      const query = executedQueries[__knexQueryUid]

      console.error(`${red('failted')} | ${highlightQuery(query)}`)

      delete executedQueries[__knexQueryUid]
    })
    .on('query-response', (_, { __knexQueryUid }) => {
      const { startTime, ...query } = executedQueries[__knexQueryUid]
      const endTime = process.hrtime.bigint()
      const duration = (Number(endTime - startTime) / 1e6).toFixed(2)

      if (query.sql) {
        console.info(highlightQuery(query))
        console.info(white(`${duration} ms`))
      } else {
        console.info(red('Missing sql'))
      }

      delete executedQueries[__knexQueryUid]
    })
}
