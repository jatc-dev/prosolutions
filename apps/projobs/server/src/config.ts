import 'dotenv/config';
function env(){return process.env.NODE_ENV==='production'?'production':'development'}
function port(){const n=Number(process.env.PORT||5176);if(!Number.isInteger(n)||n<1||n>65535)throw new Error('PORT must be a valid integer between 1 and 65535');return n}
function identityUrl(){const u=process.env.IDENTITY_URL||'http://localhost:4001';try{new URL(u);return u}catch{throw new Error('IDENTITY_URL must be a valid URL')}}
function jwtSecret(){const s=process.env.IDENTITY_JWT_SECRET||process.env.JWT_SECRET;if(env()==='production'&&!s)throw new Error('IDENTITY_JWT_SECRET must be set in production environment');return s||'change-me-for-development-only'}
export const config={port:port(),identityUrl:identityUrl(),jwtSecret:jwtSecret(),issuer:process.env.IDENTITY_ISSUER||'https://identity.prosolutions.page',audience:process.env.IDENTITY_AUDIENCE||'prosolutions-api',isProduction:env()==='production',cookieSecure:process.env.COOKIE_SECURE==='true'||env()==='production',databaseUrl:process.env.DATABASE_URL||'',corsOrigins:(process.env.CORS_ORIGIN||'https://projobs.prosolutions.page,https://prosolutions.page').split(',').map(x=>x.trim()).filter(Boolean)};
