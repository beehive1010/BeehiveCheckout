import { Client } from "pg";

const base = process.env.DATABASE_URL;
if (!base) {
  console.error("❌ DATABASE_URL not set");
  process.exit(1);
}

const ports = [5432, 6543];

function withPort(url: string, port: number) {
  // 把 5432/6543 替换成目标端口；若没有查询串就补上 ?sslmode=require
  let out = url.replace(/:(5432|6543)\//, `:${port}/`);
  out += (out.includes("?") ? "" : "?") + "sslmode=require";
  return out;
}

async function tryUrl(url: string) {
  const started = Date.now();
  const client = new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false }, // 只做连通测试；运行时你再用 CA 严格校验
  });
  try {
    await client.connect();
    const now = await client.query("select now()");
    const exists = await client.query("select to_regclass('public.users') as t");
    console.log("✅ Connected:", url);
    console.log("   now():", now.rows[0]);
    console.log("   users table:", exists.rows[0].t);
    console.log("   time(ms):", Date.now() - started);
    await client.end();
  } catch (e: any) {
    console.log("❌ Failed:", url);
    console.log("   error:", e.code || e.name, e.message);
    console.log("   time(ms):", Date.now() - started);
  }
}

(async () => {
  console.log("Testing DATABASE_URL variants with sslmode=require ...");
  for (const p of ports) {
    await tryUrl(withPort(base, p));
  }
})();
