import { Router } from 'express';
import { getTasks, createTask, updateTask, deleteTask } from '../controllers/taskController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

// Apply auth middleware to protect all task routes
router.use(authMiddleware);

// GET /api/tasks - List tasks (can filter by caseId)
router.get('/', getTasks);

// POST /api/tasks - Create a new task
router.post('/', createTask);

// PATCH /api/tasks/:id - Update task completion or metadata
router.patch('/:id', updateTask);

// DELETE /api/tasks/:id - Delete a task
router.delete('/:id', deleteTask);

export default router;
