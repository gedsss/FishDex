import { app } from "./app"

const port = process.env.PORT ? Number(process.env.PORT) : 3001

app.listen({ port, host: '0.0.0.0' }, function (err, address) {
  if (err) {
    app.log.error(err)
    process.exit(1)
  }
  app.log.info(`server listening on ${address}`)
})