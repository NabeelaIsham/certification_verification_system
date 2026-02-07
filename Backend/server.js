const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/certverify', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));

// Default super admin creation (run once)
const createSuperAdmin = async () => {
  const User = require('./models/User');
  
  try {
    const superAdminExists = await User.findOne({ userType: 'superadmin' });
    
    if (!superAdminExists) {
      const superAdmin = new User({
        email: 'superadmin@certverify.com',
        password: 'admin123', // Will be hashed automatically
        userType: 'superadmin',
        instituteName: 'System Administration'
      });
      
      await superAdmin.save();
      console.log('Super admin created successfully');
    }
  } catch (error) {
    console.error('Error creating super admin:', error);
  }
};

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  createSuperAdmin();
});