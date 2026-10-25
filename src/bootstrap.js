// Start after every scene and gameplay module is registered.
(async()=>{if(await oceanSaveGuard.start())await boot();})();
