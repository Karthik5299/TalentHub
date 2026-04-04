/**
 * Validate required environment variables at startup.
 * Crashes immediately with a clear message if anything critical is missing.
 */
const validateEnv = () => {
  const required = [
    'MONGO_URI',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error('\n❌ Missing required environment variables:');
    missing.forEach((k) => console.error(`   • ${k}`));
    console.error('\n👉 Copy .env.example to .env and fill in the values.\n');
    process.exit(1);
  }

  if (process.env.JWT_SECRET.length < 32) {
    console.error('❌ JWT_SECRET must be at least 32 characters long.');
    process.exit(1);
  }

  if (process.env.JWT_REFRESH_SECRET.length < 32) {
    console.error('❌ JWT_REFRESH_SECRET must be at least 32 characters long.');
    process.exit(1);
  }

  console.log('✅ Environment variables validated.');
};

module.exports = validateEnv;
