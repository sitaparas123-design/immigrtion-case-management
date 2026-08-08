import { seed } from './seed.js';

console.log('🚀 Running manual database seeder...');
seed()
  .then(() => {
    console.log('✅ Seeding completed successfully!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Seeding failed with error:', err);
    process.exit(1);
  });
