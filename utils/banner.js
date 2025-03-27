/**
 * Console banner for Licener app
 */

/**
 * Display a banner in the console
 * @param {boolean} demoMode - Whether the app is running in demo mode
 */
function displayBanner(demoMode = false) {
  console.log('\n');
  console.log('┌───────────────────────────────────────────────────────────┐');
  console.log('│                                                           │');
  console.log('│                   LICENER                                 │');
  console.log('│           License Management System                       │');
  console.log('│                                                           │');
  
  if (demoMode) {
    console.log('│                                                           │');
    console.log('│  ███████ DEMO MODE ███████                                │');
    console.log('│  No database connection required                          │');
    console.log('│  All data is stored in memory and will be lost on restart │');
    console.log('│                                                           │');
  }
  
  console.log('└───────────────────────────────────────────────────────────┘');
  console.log('\n');
}

module.exports = { displayBanner };