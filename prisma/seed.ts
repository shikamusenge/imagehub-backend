import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
const prisma = new PrismaClient();

async function main() {
  // Create roles first (if roles are in a separate table, you can adjust accordingly)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@example.com',
      password: bcrypt.hashSync('securepassword', 10), 
      Role: 'ADMIN', // Assuming enum or string field
    },
  });

  const regular = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {},
    create: {
      name: 'Regular User',
      email: 'user@example.com',
      password: bcrypt.hashSync('securepassword', 10), 
      Role: 'USER',
    },
  });

  console.log({ admin, regular });
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
