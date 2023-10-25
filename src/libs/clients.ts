import ServerlessPostgres from "serverless-postgres";
import { createClient } from "redis";

const {
  PG_HOST,
  PG_DATABASE,
  PG_PORT,
  PG_USER,
  PG_PASSWORD,
  REDIS_URL
} = process.env

export const pgClient = new ServerlessPostgres({
  user: PG_USER,
  host: PG_HOST,
  database: PG_DATABASE,
  password: PG_PASSWORD,
  port: Number(PG_PORT),
  debug: true,
  ssl: { rejectUnauthorized: false }
})

export const redisClient = createClient({ url: "redis://" + REDIS_URL + ":6379"})