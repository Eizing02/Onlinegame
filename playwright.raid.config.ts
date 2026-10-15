import { defineConfig } from '@playwright/test';
export default defineConfig({
 testDir:'./tests/boss-raid', testMatch:['**/gameplay.spec.ts','**/audio-hosts.spec.ts','feedback.spec.ts','lobby.spec.ts'],testIgnore:'**/scene-audio/**',workers:1,timeout:120000,expect:{timeout:20000},
 use:{baseURL:'http://127.0.0.1:3110',trace:'retain-on-failure'},outputDir:'test-results/boss-raid',
 webServer:{command:'node scripts/start-google-test-server.mjs',env:{RUN_RAID_TESTS:'1'},url:'http://127.0.0.1:3110/login',timeout:120000,reuseExistingServer:false},
});
