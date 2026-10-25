import { createApp } from './index.js';
import { config } from './config.js';
const server=createApp().listen(config.port,'0.0.0.0',()=>console.log(`ProJobs API listening on port ${config.port}`));
function shutdown(signal:string){server.close(error=>{if(error){console.error(`ProJobs API shutdown failed after ${signal}`);process.exitCode=1}})}
process.on('SIGTERM',()=>shutdown('SIGTERM'));process.on('SIGINT',()=>shutdown('SIGINT'));
