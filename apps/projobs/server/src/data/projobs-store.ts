import { Pool, type PoolClient } from 'pg';
import { config } from '../config.js';
export class StoreNotConfiguredError extends Error { constructor(){super('ProJobs PostgreSQL persistence is not configured');this.name='StoreNotConfiguredError'} }
export class StoreRequestError extends Error { constructor(public readonly status=503){super('ProJobs persistence request failed');this.name='StoreRequestError'} }
type SavedJobInput={userId:string;jobId:string;jobUrl:string;jobTitle:string;company:string};
type ApplicationInput=SavedJobInput&{coverLetter:string};
let pool:Pool|undefined;
function getPool():Pool {if(!config.databaseUrl)throw new StoreNotConfiguredError();if(!pool){pool=new Pool({connectionString:config.databaseUrl,max:5,connectionTimeoutMillis:5000,idleTimeoutMillis:10000,query_timeout:8000,application_name:'projobs-api'});pool.on('error',()=>{/* never log credentials */})}return pool}
async function withUserTransaction<T>(userId:string,action:(client:PoolClient)=>Promise<T>):Promise<T>{
 if(!userId||userId.length>512)throw new StoreRequestError(401);
 let client:PoolClient;try{client=await getPool().connect()}catch(e){if(e instanceof StoreNotConfiguredError)throw e;throw new StoreRequestError(503)}
 try{await client.query('BEGIN');await client.query('SET LOCAL ROLE projobs_api');await client.query("SELECT set_config('projobs.user_id', $1, true)",[userId]);const result=await action(client);await client.query('COMMIT');return result}
 catch{try{await client.query('ROLLBACK')}catch{/* ignore rollback failure */}throw new StoreRequestError(503)}finally{client.release()}
}
const SAVED='id, job_id, job_url, job_title, company, created_at';
const APPLICATION='id, job_id, job_url, job_title, company, cover_letter, status, created_at';
export async function saveJob(x:SavedJobInput){return withUserTransaction(x.userId,async c=>{const q=await c.query(`INSERT INTO public.projobs_saved_jobs(user_id,job_id,job_url,job_title,company) VALUES($1,$2,$3,$4,$5) ON CONFLICT(user_id,job_id) DO UPDATE SET job_url=EXCLUDED.job_url,job_title=EXCLUDED.job_title,company=EXCLUDED.company RETURNING ${SAVED}`,[x.userId,x.jobId,x.jobUrl,x.jobTitle,x.company]);if(!q.rows[0])throw new StoreRequestError();return q.rows[0]})}
export async function listSavedJobs(userId:string){return withUserTransaction(userId,async c=>(await c.query(`SELECT ${SAVED} FROM public.projobs_saved_jobs ORDER BY created_at DESC`)).rows)}
export async function removeSavedJob(userId:string,jobId:string){return withUserTransaction(userId,async c=>{const q=await c.query('DELETE FROM public.projobs_saved_jobs WHERE job_id=$1 RETURNING id',[jobId]);return (q.rowCount||0)>0})}
export async function createApplication(x:ApplicationInput){return withUserTransaction(x.userId,async c=>{const q=await c.query(`INSERT INTO public.projobs_applications(user_id,job_id,job_url,job_title,company,cover_letter,status) VALUES($1,$2,$3,$4,$5,$6,'redirected_to_employer') ON CONFLICT(user_id,job_id) DO UPDATE SET job_url=EXCLUDED.job_url,job_title=EXCLUDED.job_title,company=EXCLUDED.company,cover_letter=EXCLUDED.cover_letter RETURNING ${APPLICATION}`,[x.userId,x.jobId,x.jobUrl,x.jobTitle,x.company,x.coverLetter]);if(!q.rows[0])throw new StoreRequestError();return q.rows[0]})}
export async function listApplications(userId:string){return withUserTransaction(userId,async c=>(await c.query(`SELECT ${APPLICATION} FROM public.projobs_applications ORDER BY created_at DESC`)).rows)}
export function isStoreConfigured(){return Boolean(config.databaseUrl)}
