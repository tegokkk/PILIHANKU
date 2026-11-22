require('dotenv').config();
module.exports = {
  client: 'pg',
  connection: process.env.DATABASE_URL,
  pool: { min: 0, max: 10 },
  migrations: { directory: './src/database/migrations', loadExtensions: ['.js'] },
};
