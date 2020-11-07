import { Router } from "express";
import {
  addAdmin,
  loginAdmin,
  addQuiz,
  getAddQuestion,
  getQuestionIndex,
  getQuizzes,
  postAddQuestion,
  addCircle,
  deleteQuiz,
  deleteQuestion,
  getStandings,
  downloadResponses,
} from "../controllers/adminController";
import { authenticateToken } from "../util/auth";

const router = Router();

router.post("/auth", loginAdmin);

router.post("/add-admin", authenticateToken, addAdmin);

router.get("/get-quizzes", authenticateToken, getQuizzes);

router.post("/add-quiz", authenticateToken, addQuiz);

router.get("/add-question", authenticateToken, getAddQuestion);

router.get("/get-index", authenticateToken, getQuestionIndex);

router.post("/add-question", authenticateToken, postAddQuestion);

router.post("/add-circle", authenticateToken, addCircle);

router.delete("/delete-quiz", authenticateToken, deleteQuiz);

router.delete("/delete-question", authenticateToken, deleteQuestion);

router.get("/responses", authenticateToken, getStandings);

router.get("/download", downloadResponses);

export default router;
