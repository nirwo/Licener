/**
 * Console banner for Licener app
 */

/**
 * Display a banner in the console
 * @param {boolean} demoMode - Whether the app is running in demo mode
 * @param {string} dbMode - Database mode ('MONGO', 'FILE-DB', etc.)
 */
function displayBanner(demoMode = false, dbMode = 'MONGO') {
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
  } else if (dbMode === 'FILE-DB') {
    console.log('│                                                           │');
    console.log('│  ███████ FILE DATABASE ███████                            │');
    console.log('│  Using JSON files for data storage                        │');
    console.log('│  Data stored in ./data directory                          │');
    console.log('│                                                           │');
  }
  
  console.log('└───────────────────────────────────────────────────────────┘');
  console.log('\n');
}

module.exports = { displayBanner };