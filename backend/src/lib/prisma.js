import { PrismaClient } from '@prisma/client';

// Required for Supabase/cloud PostgreSQL with self-signed or managed SSL certs
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

export default prisma;
