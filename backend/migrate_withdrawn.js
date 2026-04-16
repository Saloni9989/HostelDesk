require('dotenv').config();
const { query } = require('./config/db');
query("ALTER TABLE complaints MODIFY COLUMN status ENUM('Pending','In Progress','Resolved','Rejected','Duplicate','Withdrawn') DEFAULT 'Pending'")
  .then(() => { console.log('Done: Withdrawn added to status ENUM'); process.exit(); })
  .catch(e => { console.error(e.message); process.exit(1); });
