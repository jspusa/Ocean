/* Stable current-material test entrypoint. v50 replaces the three-region
 * mirrored skin fixture with six anatomical charts and the same rotation oracle. */
'use strict';
require('./turtle-atlas-material-browser.cjs').main().catch(error=>{console.error(error);process.exitCode=1;});
