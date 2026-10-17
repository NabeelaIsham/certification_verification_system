// Safe to run in the deployed container: no provider request or message is sent.
require('dotenv').config({ quiet: true });
const { validateTextLkConfiguration } = require('../utils/smsConfiguration');
const result = validateTextLkConfiguration();
console.log(JSON.stringify({ ...result,
  note: 'Configuration shape only. Provider authentication, sender approval, credit and handset delivery still need separate verification.'
}, null, 2));
if (!result.valid) process.exitCode = 1;
