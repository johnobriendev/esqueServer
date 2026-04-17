// src/config/env.ts
import dotenv from 'dotenv';

dotenv.config();

export const PORT = process.env.PORT || 3001;
export const DATABASE_URL = process.env.DATABASE_URL;
export const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN;
export const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE;
export const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY || '';