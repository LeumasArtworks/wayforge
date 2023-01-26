import { pipe } from "fp-ts/function"
import { Server as WebSocketServer } from "socket.io"

import { serveSimpleGit } from "~/packages/@git-io/src/git-io.node"
import { serveJsonStore } from "~/packages/@store-io/src/json-store-io.node"

import { logger } from "./logger"
import { formatJson } from "./services/formatJson"

pipe(
  new WebSocketServer(3333, {
    cors: {
      origin: `http://localhost:5173`,
      methods: [`GET`, `POST`],
    },
  }),
  serveJsonStore({
    logger,
    formatResource: formatJson,
    baseDir: `./projects/wayfarer`,
  }),
  serveSimpleGit({
    logger,
    baseDir: `./projects/wayfarer`,
  })
)
logger.info(
  `   `,
  `|¯\\_________________________________|¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯\\_|`
)
logger.info(``, ``)

logger.info(
  `[/]`,
  `|__________________________/ `,
  `🟨   🟨   🟨`,
  ` \\___________________________|`
)
logger.info(`[/]`, `                             `, `🟨   🟨   🟨`)
logger.info(
  `[/]`,
  `  00                         `,
  `🟨   🟨   🟨`,
  `                    WAYFORGE`
)
logger.info(`[/]`, `                             `, `🟨        🟨`)
logger.info(
  `[/]`,
  `|¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯\\ `,
  `🟨🟨🟨🟨🟨🟨`,
  ` /¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯|`
)
logger.info(``, ``)
logger.info(
  `   `,
  `|_/¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯|_________________________________/¯|`
)
