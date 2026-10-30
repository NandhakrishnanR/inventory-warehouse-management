import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://erp_user:erp_password@localhost:5434/enterprise_erp?schema=public',
  jwtSecret: process.env.JWT_SECRET || 'enterprise_super_secret_jwt_key_2026_inventory_erp',
  jwtExpiresIn: '24h',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
};
