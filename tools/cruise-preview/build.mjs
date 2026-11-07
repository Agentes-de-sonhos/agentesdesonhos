import { build } from 'vite';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
const root=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(root,'../..');
// A standalone, read-only artifact for Pages installations serving the repository root.
// Uses the actual shared page; backend modules are replaced only in this build.
await build({root,configFile:false,base:'/preview/navios/',publicDir:false,
 resolve:{alias:[
 {find:'@/hooks/useAgencySiteRequest',replacement:path.join(root,'request.ts')},
 {find:'@/lib/agencyContextLink',replacement:path.join(root,'links.ts')},
 {find:/^@\/lib\/cruiseShips$/, replacement:path.join(root,'ships.ts')},
 {find:'@',replacement:path.join(repo,'src')} ]},
 esbuild:{jsx:'automatic'},
 build:{outDir:path.join(repo,'preview/navios'),emptyOutDir:true}});
fs.mkdirSync(path.join(repo,'preview/navios/maps'),{recursive:true});
fs.copyFileSync(path.join(repo,'public/maps/cruise-south-america.geojson'),path.join(repo,'preview/navios/maps/cruise-south-america.geojson'));
