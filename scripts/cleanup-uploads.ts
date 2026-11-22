// Apaga, uma vez, as fotos órfãs (upload sem captura há mais de 24h).
// O servidor já faz isso sozinho de hora em hora; este script serve para rodar
// manualmente ou num cron externo: `npm run uploads:cleanup`.
import 'dotenv/config'
import { prisma } from '../prisma/prisma.client'
import { UploadsRepository } from '../src/modules/uploads/uploads.repository'
import { UploadsService } from '../src/modules/uploads/uploads.service'

const service = new UploadsService(new UploadsRepository())

try {
  const deleted = await service.cleanupOrphans()
  console.log(`Fotos órfãs apagadas: ${deleted}`)
} finally {
  await prisma.$disconnect()
}
