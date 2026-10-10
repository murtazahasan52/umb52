const mongoose = require('mongoose');

async function connectDB(uri) {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000, maxPoolSize: 10 });
  console.log('MongoDB connected');
  return mongoose.connection;
}

module.exports = connectDB;
