import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import authRoutes from './routes/auth.routes.js'; 
const { json } = bodyParser;

const app = express();
app.use(cors());
app.use(json());

// routes
app.use('/api/auth', authRoutes);

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
