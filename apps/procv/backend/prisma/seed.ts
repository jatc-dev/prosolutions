import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const adminEmail = 'admin@procv.com';
  const adminPassword = 'admin123';
  const adminName = 'Administrator';

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail }
  });

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(adminPassword, 10);

    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        name: adminName,
        role: 'admin'
      }
    });

    console.log('✅ Admin user created:');
    console.log(`   Email: ${admin.email}`);
    console.log(`   Password: ${adminPassword}`);
    console.log(`   Role: ${admin.role}`);
  } else {
    console.log('ℹ️  Admin user already exists');
  }

  console.log('🎉 Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });