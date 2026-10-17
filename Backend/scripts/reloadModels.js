const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const reloadModels = async () => {
  try {
    await mongoose.connect(require('../config/databaseUri').requireDatabaseUri());
    console.log('✅ Connected to MongoDB');

    // Clear all model caches
    mongoose.deleteModel(/.+/);
    console.log('✅ Cleared model cache');

    // Re-import all models in correct order
    console.log('Reloading models...');
    
    // Import models in dependency order
    require('../models/User');
    require('../models/Notification');
    require('../models/Course');
    require('../models/Student');
    require('../models/CertificateTemplate');
    require('../models/Certificate');
    require('../models/Settings');
    require('../models/OTP');
    
    console.log('✅ All models reloaded');

    // Verify Notification model
    const Notification = mongoose.model('Notification');
    const schemaPath = Notification.schema.path('recipient');
    console.log('Notification recipient ref:', schemaPath.options.ref);
    
    if (schemaPath.options.ref === 'User') {
      console.log('✅ Notification model is correctly referencing User');
    } else {
      console.log('❌ Notification model is still referencing', schemaPath.options.ref);
    }

    await mongoose.connection.close();
    console.log('👋 Database connection closed');
  } catch (error) {
    console.error('Error:', error);
  }
};

reloadModels();