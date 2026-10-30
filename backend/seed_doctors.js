import { seedInitialDoctors } from './src/db/init.js';

async function main() {
  console.log('Starting seed...');
  await seedInitialDoctors();
  console.log('Seeding complete successfully.');
}

main();
