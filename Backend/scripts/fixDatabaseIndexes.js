const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const fixIndexes = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/certverify');
    console.log('Connected to MongoDB');

    // Get the courses collection
    const db = mongoose.connection.db;
    const coursesCollection = db.collection('courses');

    // List all indexes
    const indexes = await coursesCollection.indexes();
    console.log('Current indexes:', indexes);

    // Drop the problematic 'code_1' index if it exists
    const hasCodeIndex = indexes.some(idx => idx.name === 'code_1');
    if (hasCodeIndex) {
      await coursesCollection.dropIndex('code_1');
      console.log('Dropped code_1 index');
    }

    // Drop all indexes to let mongoose recreate them
    await coursesCollection.dropIndexes();
    console.log('Dropped all indexes');

    console.log('Indexes fixed successfully');
    
    await mongoose.connection.close();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error fixing indexes:', error);
  }
};

fixIndexes();