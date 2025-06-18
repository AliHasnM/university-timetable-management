import { Router } from "express";
import {
  generateTimetable,
  getTimetable,
  editTimetableEntry,
  downloadTimetablePDF,
  sendTimetableEmail,
  getStudentTimetable,
  sendTimetableEmailToAll,
} from "../controllers/timetable.controller.js";
import { verifyJWT, checkRole } from "../middlewares/auth.middleware.js";

const router = Router();

// ✅ Timetable Routes

router
  .route("/admin/generate-timetable")
  .post(verifyJWT, checkRole("Admin"), generateTimetable);
router
  .route("/admin/get-timetable")
  .get(verifyJWT, checkRole("Admin"), getTimetable);
router
  .route("/admin/edit-timetable/:entryId")
  .patch(verifyJWT, checkRole("Admin"), editTimetableEntry);
router
  .route("/admin/download-timetable")
  .get(verifyJWT, checkRole("Admin"), downloadTimetablePDF);
router
  .route("/admin/send-timetable")
  .post(verifyJWT, checkRole("Admin"), sendTimetableEmail);
router
  .route("/admin/send-timetable-to-all")
  .post(verifyJWT, checkRole("Admin"), sendTimetableEmailToAll);

// ✅ Student Routes
router
  .route("/student/view-timetable")
  .get(verifyJWT, checkRole("Student"), getStudentTimetable);
router
  .route("/student/download-timetable")
  .get(verifyJWT, checkRole("Student"), downloadTimetablePDF);

export default router;
