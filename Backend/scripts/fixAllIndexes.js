const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const fixAllIndexes = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/certverify');
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    
    // Fix Courses Collection
    console.log('\n📊 Fixing COURSES collection...');
    const coursesCollection = db.collection('courses');
    let coursesIndexes = await coursesCollection.indexes();
    console.log('Current courses indexes:', coursesIndexes.map(idx => idx.name));
    
    // Drop problematic code_1 index
    if (coursesIndexes.some(idx => idx.name === 'code_1')) {
      await coursesCollection.dropIndex('code_1');
      console.log('✅ Dropped courses index: code_1');
    }
    
    // Drop any other legacy indexes
    const coursesLegacyIndexes = coursesIndexes.filter(idx => 
      idx.name !== '_id_' && 
      !idx.name.includes('instituteId') && 
      !idx.name.includes('courseCode')
    );
    
    for (const idx of coursesLegacyIndexes) {
      try {
        await coursesCollection.dropIndex(idx.name);
        console.log(`✅ Dropped courses legacy index: ${idx.name}`);
      } catch (err) {
        console.log(`❌ Failed to drop ${idx.name}:`, err.message);
      }
    }

    // Fix Students Collection
    console.log('\n📊 Fixing STUDENTS collection...');
    const studentsCollection = db.collection('students');
    let studentsIndexes = await studentsCollection.indexes();
    console.log('Current students indexes:', studentsIndexes.map(idx => idx.name));
    
    // Drop problematic studentId_1 index
    if (studentsIndexes.some(idx => idx.name === 'studentId_1')) {
      await studentsCollection.dropIndex('studentId_1');
      console.log('✅ Dropped students index: studentId_1');
    }
    
    // Drop any other legacy indexes
    const studentsLegacyIndexes = studentsIndexes.filter(idx => 
      idx.name !== '_id_' && 
      !idx.name.includes('instituteId') && 
      !idx.name.includes('email') &&
      !idx.name.includes('courseId')
    );
    
    for (const idx of studentsLegacyIndexes) {
      try {
        await studentsCollection.dropIndex(idx.name);
        console.log(`✅ Dropped students legacy index: ${idx.name}`);
      } catch (err) {
        console.log(`❌ Failed to drop ${idx.name}:`, err.message);
      }
    }

    // Fix Certificates Collection (if needed)
    console.log('\n📊 Fixing CERTIFICATES collection...');
    const certificatesCollection = db.collection('certificates');
    let certificatesIndexes = await certificatesCollection.indexes();
    console.log('Current certificates indexes:', certificatesIndexes.map(idx => idx.name));
    
    // Drop any legacy indexes that might cause issues
    const certificatesLegacyIndexes = certificatesIndexes.filter(idx => 
      idx.name !== '_id_' && 
      !idx.name.includes('certificateCode') &&
      !idx.name.includes('instituteId') &&
      !idx.name.includes('studentId') &&
      !idx.name.includes('status')
    );
    
    for (const idx of certificatesLegacyIndexes) {
      try {
        await certificatesCollection.dropIndex(idx.name);
        console.log(`✅ Dropped certificates legacy index: ${idx.name}`);
      } catch (err) {
        console.log(`❌ Failed to drop ${idx.name}:`, err.message);
      }
    }

    // Let Mongoose recreate correct indexes
    console.log('\n⏳ Syncing Mongoose indexes...');
    
    const Course = require('../models/Course');
    const Student = require('../models/Student');
    const Certificate = require('../models/Certificate');
    const CertificateTemplate = require('../models/CertificateTemplate');
    
    await Course.syncIndexes();
    console.log('✅ Course indexes synchronized');
    
    await Student.syncIndexes();
    console.log('✅ Student indexes synchronized');
    
    await Certificate.syncIndexes();
    console.log('✅ Certificate indexes synchronized');
    
    await CertificateTemplate.syncIndexes();
    console.log('✅ CertificateTemplate indexes synchronized');

    // Final check
    console.log('\n📊 FINAL INDEXES:');
    
    const finalCoursesIndexes = await coursesCollection.indexes();
    console.log('\nCourses final indexes:', finalCoursesIndexes.map(idx => idx.name));
    
    const finalStudentsIndexes = await studentsCollection.indexes();
    console.log('Students final indexes:', finalStudentsIndexes.map(idx => idx.name));
    
    const finalCertificatesIndexes = await certificatesCollection.indexes();
    console.log('Certificates final indexes:', finalCertificatesIndexes.map(idx => idx.name));

    console.log('\n✨ All indexes fixed successfully!');
    
    await mongoose.connection.close();
    console.log('👋 Database connection closed');
  } catch (error) {
    console.error('❌ Error fixing indexes:', error);
  }
};

fixAllIndexes();