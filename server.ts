import { app } from './app'
import { ORPHAN_CLEANUP_INTERVAL_MS } from './src/modules/uploads/uploads.constants'
import { UploadsRepository } from './src/modules/uploads/uploads.repository'
import { UploadsService } from './src/modules/uploads/uploads.service'

const port = process.env.PORT ? Number(process.env.PORT) : 3001

// Limpeza de fotos órfãs (upload nunca usado em captura há mais de 24h).
// Fica aqui e não em app.ts para não rodar durante os testes.
const uploadsService = new UploadsService(new UploadsRepository())

async function cleanupOrphanUploads() {
  try {
    const deleted = await uploadsService.cleanupOrphans()
    if (deleted > 0) app.log.info({ deleted }, 'fotos órfãs apagadas')
  } catch (err) {
    app.log.error(err, 'falha na limpeza de fotos órfãs')
  }
}

app.listen({ port, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    app.log.error(err)
    process.exit(1)
  }
  app.log.info(`server listening on ${address}`)

  void cleanupOrphanUploads()
  setInterval(cleanupOrphanUploads, ORPHAN_CLEANUP_INTERVAL_MS).unref()
})
