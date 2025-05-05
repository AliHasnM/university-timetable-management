import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Timetable } from "../models/timetable.model.js";
import { Course } from "../models/course.model.js";
import { Instructor } from "../models/instructor.model.js";
import { Room } from "../models/room.model.js";
import PDFDocument from "pdfkit"; // PDF generation library
import { PassThrough } from "stream";
import nodemailer from "nodemailer"; // Email sending library

// Function to generate a timetable

export const generateTimetable = asyncHandler(async (req, res) => {
  try {
    const { department, semester, shift } = req.body;

    // Step 0: Check if timetable already exists
    const existingTimetable = await Timetable.findOne({
      department,
      semester,
      shift,
    });
    if (existingTimetable) {
      return res.status(400).json({ message: "Timetable already exists" });
    }

    // 1. Fetch relevant courses
    const courses = await Course.find({ department, semester });
    console.log("Course:", courses);

    // 2. Fetch instructors and populate their subjects
    const instructors = await Instructor.find({}).populate("subjects");
    console.log("Instructor:", instructors);

    // 3. Fetch available rooms
    const rooms = await Room.find({ isActive: true });
    console.log("Room:", rooms);

    // 4. Handle cases if no instructors or rooms are found
    if (!instructors || instructors.length === 0) {
      return res.status(400).json({ message: "No available instructors" });
    }
    if (!rooms || rooms.length === 0) {
      return res.status(400).json({ message: "No available rooms" });
    }

    // 5. Create a schedule map: days x time slots
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    const timeSlots = ["9AM-10AM", "10AM-11AM", "11AM-12PM", "12PM-1PM"];
    const schedule = [];

    for (const day of days) {
      const classes = [];

      for (const timeSlot of timeSlots) {
        const course = courses.pop(); // pick a course
        if (!course) break;

        // Find an available instructor
        const instructor = instructors.find((inst) =>
          inst.availability.some(
            (a) => a.day === day && a.timeSlots.includes(timeSlot),
          ),
        );

        // Find an available room
        const room = rooms.find((r) =>
          r.availability.some(
            (a) => a.day === day && a.timeSlots.includes(timeSlot),
          ),
        );

        if (instructor && room) {
          classes.push({
            timeSlot,
            courseName: course.courseName,
            courseCode: course.courseCode,
            creditHours: course.creditHours,
            instructorName: instructor.name,
            roomNumber: room.roomNumber,
          });

          // Remove assigned slot from availability
          instructor.availability = instructor.availability.map((a) =>
            a.day === day
              ? { ...a, timeSlots: a.timeSlots.filter((t) => t !== timeSlot) }
              : a,
          );
          room.availability = room.availability.map((a) =>
            a.day === day
              ? { ...a, timeSlots: a.timeSlots.filter((t) => t !== timeSlot) }
              : a,
          );
        }
      }

      if (classes.length) {
        schedule.push({ day, classes });
      }
    }

    // Save timetable
    const timetable = await Timetable.create({
      department,
      semester,
      shift,
      schedule,
    });

    return res
      .status(201)
      .json(new ApiResponse(201, timetable, "Timetable auto-generated"));
  } catch (error) {
    throw new ApiError(
      500,
      error.message || "Failed to auto-generate timetable",
    );
  }
});

export const getTimetable = asyncHandler(async (req, res) => {
  try {
    const { department, semester, shift } = req.query;

    const timetable = await Timetable.findOne({
      department,
      semester,
      shift,
    }).sort({ createdAt: -1 }); // ✅ Yeh latest record laayega

    console.log("Looking for timetable:", { department, semester, shift });

    if (!timetable) {
      return res.status(404).json({ message: "Timetable not found" });
    }
    return res
      .status(200)
      .json(
        new ApiResponse(200, timetable, "Timetable retrieved successfully"),
      );
  } catch (error) {
    throw new ApiError(
      error.statusCode || 500,
      error.message || "Failed to retrieve timetable",
    );
  }
});

// Function to edit a timetable entry
export const editTimetableEntry = asyncHandler(async (req, res) => {
  try {
    const { entryId } = req.params; // Get entryId from URL params
    const updatedData = req.body; // Get updatedData from the request body

    // Step 1: Find the timetable and the entry to update
    const timetable = await Timetable.findOne({
      "schedule.classes._id": entryId, // Find timetable with the specific class entry
    });

    // Step 2: Check if timetable is found
    if (!timetable) {
      throw new ApiError(404, "Timetable not found");
    }

    // Step 3: Find the day and class entry that needs to be updated
    let classUpdated = false;
    timetable.schedule.forEach((daySchedule) => {
      daySchedule.classes.forEach((classEntry) => {
        if (classEntry._id.toString() === entryId.toString()) {
          // Update the specific class entry with the new data
          Object.assign(classEntry, updatedData);
          classUpdated = true;
        }
      });
    });

    // Step 4: If the class entry was not found, throw an error
    if (!classUpdated) {
      throw new ApiError(404, "Class entry not found");
    }

    // Step 5: Save the updated timetable
    await timetable.save();

    // Step 6: Return the updated timetable
    return res
      .status(200)
      .json(
        new ApiResponse(200, timetable, "Timetable entry updated successfully"),
      );
  } catch (error) {
    // Handle error and return appropriate response
    throw new ApiError(
      error.statusCode || 500,
      error.message || "Failed to update timetable entry",
    );
  }
});

// Function to download the timetable as a PDF
export const downloadTimetablePDF = asyncHandler(async (req, res) => {
  try {
    const timetable = await Timetable.findOne({});
    if (!timetable) {
      throw new ApiError(404, "Timetable not found");
    }

    const doc = new PDFDocument({ margin: 30, size: "A4" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=timetable.pdf");
    doc.pipe(res);

    doc.fontSize(18).text("Timetable", { align: "center" });
    doc.moveDown(1.5);

    // Column configuration
    const tableTop = doc.y;
    const rowHeight = 25;
    const colWidths = [40, 60, 90, 140, 70, 110, 50];
    const cols = [
      "Sr.No",
      "Day",
      "Course Code",
      "Course Name",
      "Time",
      "Instructor Name",
      "Room No",
    ];

    let x = doc.page.margins.left;

    // Draw table header
    cols.forEach((col, i) => {
      doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .text(col, x, tableTop, { width: colWidths[i], align: "center" })
        .rect(x, tableTop, colWidths[i], rowHeight)
        .stroke();
      x += colWidths[i];
    });

    let srNo = 1;
    let y = tableTop + rowHeight;

    // Draw rows
    timetable.schedule.forEach((dayBlock) => {
      const { day, classes } = dayBlock;
      classes.forEach((cls) => {
        x = doc.page.margins.left;

        const rowData = [
          srNo,
          day,
          cls.courseCode,
          cls.courseName,
          cls.timeSlot,
          cls.instructorName,
          cls.roomNumber,
        ];

        rowData.forEach((cell, i) => {
          doc
            .font("Helvetica")
            .fontSize(9)
            .text(cell.toString(), x, y + 7, {
              width: colWidths[i],
              align: "center",
            })
            .rect(x, y, colWidths[i], rowHeight)
            .stroke();
          x += colWidths[i];
        });

        y += rowHeight;
        srNo++;
      });
    });

    doc.end();
  } catch (error) {
    throw new ApiError(
      error.statusCode || 500,
      error.message || "Failed to download timetable",
    );
  }
});

export const sendTimetableEmail = asyncHandler(async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      throw new ApiError(400, "Recipient email is required");
    }

    const timetable = await Timetable.findOne({});
    if (!timetable) {
      throw new ApiError(404, "Timetable not found");
    }

    // Generate PDF in memory
    const doc = new PDFDocument({ margin: 30, size: "A4" });
    const bufferStream = new PassThrough();
    let pdfBuffer = [];

    doc.pipe(bufferStream);
    bufferStream.on("data", (chunk) => pdfBuffer.push(chunk));
    bufferStream.on("end", async () => {
      const finalBuffer = Buffer.concat(pdfBuffer);

      // Set up nodemailer
      const transporter = nodemailer.createTransport({
        service: "Gmail", // or another SMTP provider
        auth: {
          user: process.env.SMTP_EMAIL,
          pass: process.env.SMTP_PASSWORD,
        },
      });

      await transporter.sendMail({
        from: `"Admin" <${process.env.SMTP_EMAIL}>`,
        to: email,
        subject: "Class Timetable",
        text: "Please find attached the latest class timetable.",
        attachments: [
          {
            filename: "timetable.pdf",
            content: finalBuffer,
            contentType: "application/pdf",
          },
        ],
      });

      return res
        .status(200)
        .json(new ApiResponse(200, null, "Timetable sent successfully"));
    });

    // Create PDF content
    doc.fontSize(18).text("Timetable", { align: "center" });
    doc.moveDown(1.5);

    const tableTop = doc.y;
    const rowHeight = 25;
    const colWidths = [40, 60, 90, 140, 70, 110, 50];
    const cols = [
      "Sr.No",
      "Day",
      "Course Code",
      "Course Name",
      "Time",
      "Instructor Name",
      "Room No",
    ];

    let x = doc.page.margins.left;
    cols.forEach((col, i) => {
      doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .text(col, x, tableTop, { width: colWidths[i], align: "center" })
        .rect(x, tableTop, colWidths[i], rowHeight)
        .stroke();
      x += colWidths[i];
    });

    let srNo = 1;
    let y = tableTop + rowHeight;

    timetable.schedule.forEach((dayBlock) => {
      const { day, classes } = dayBlock;
      classes.forEach((cls) => {
        x = doc.page.margins.left;
        const rowData = [
          srNo,
          day,
          cls.courseCode,
          cls.courseName,
          cls.timeSlot,
          cls.instructorName,
          cls.roomNumber,
        ];

        rowData.forEach((cell, i) => {
          doc
            .font("Helvetica")
            .fontSize(9)
            .text(cell.toString(), x, y + 7, {
              width: colWidths[i],
              align: "center",
            })
            .rect(x, y, colWidths[i], rowHeight)
            .stroke();
          x += colWidths[i];
        });

        y += rowHeight;
        srNo++;
      });
    });

    doc.end(); // Finalize PDF
  } catch (error) {
    throw new ApiError(
      error.statusCode || 500,
      error.message || "Failed to send timetable",
    );
  }
});

// Function to get the student's timetable
export const getStudentTimetable = asyncHandler(async (req, res) => {
  try {
    const { studentId } = req.params; // Assuming studentId is passed in the URL

    const timetable = await Timetable.findOne({});

    if (!timetable) {
      throw new ApiError(404, "Timetable not found");
    }

    // Logic to filter timetable for the specific student
    // This is a placeholder; actual implementation will depend on the timetable structure

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          timetable,
          "Student timetable retrieved successfully",
        ),
      );
  } catch (error) {
    throw new ApiError(
      error.statusCode || 500,
      error.message || "Failed to retrieve student timetable",
    );
  }
});

export default {
  generateTimetable,
  generateTimetable,
  editTimetableEntry,
  downloadTimetablePDF,
  sendTimetableEmail,
  getStudentTimetable,
};
