import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Instructor } from "../models/instructor.model.js";

// Function to create a new instructor
export const createInstructor = asyncHandler(async (req, res) => {
  try {
    const { name, email, subjects, availability } = req.body;

    // Check if instructor already exists by email
    const existingInstructor = await Instructor.findOne({ email });
    if (existingInstructor) {
      throw new ApiError(400, "Instructor already exists with this email");
    }

    // Create the instructor
    const instructor = await Instructor.create({
      name,
      email,
      subjects,
      availability,
    });

    return res
      .status(201)
      .json(
        new ApiResponse(201, instructor, "Instructor created successfully"),
      );
  } catch (error) {
    throw new ApiError(
      error.statusCode || 500,
      error.message || "Failed to create instructor",
    );
  }
});

// Function to get an instructor by ID
export const getInstructor = asyncHandler(async (req, res) => {
  try {
    const { instructorId } = req.params;

    const instructor =
      await Instructor.findById(instructorId).populate("subjects");
    // const instructor = await Instructor.findById(instructorId);

    if (!instructor) {
      throw new ApiError(404, "Instructor not found");
    }

    return res
      .status(200)
      .json(
        new ApiResponse(200, instructor, "Instructor retrieved successfully"),
      );
  } catch (error) {
    throw new ApiError(
      error.statusCode || 500,
      error.message || "Failed to retrieve instructor",
    );
  }
});

// Function to get all instructors
export const getAllInstructors = asyncHandler(async (req, res) => {
  try {
    const instructors = await Instructor.find({}).populate("subjects");

    return res
      .status(200)
      .json(
        new ApiResponse(200, instructors, "Instructors retrieved successfully"),
      );
  } catch (error) {
    throw new ApiError(
      error.statusCode || 500,
      error.message || "Failed to retrieve instructors",
    );
  }
});

// Function to update an instructor by ID
export const updateInstructor = asyncHandler(async (req, res) => {
  try {
    const { instructorId } = req.params;
    const { name, email, subjects, availability } = req.body;

    // Check if instructor exists
    const instructor = await Instructor.findById(instructorId);
    if (!instructor) {
      throw new ApiError(404, "Instructor not found");
    }

    // Update fields if provided
    instructor.name = name || instructor.name;
    instructor.email = email || instructor.email;
    instructor.subjects = subjects || instructor.subjects;
    instructor.availability = availability || instructor.availability;

    await instructor.save();

    return res
      .status(200)
      .json(
        new ApiResponse(200, instructor, "Instructor updated successfully"),
      );
  } catch (error) {
    throw new ApiError(
      error.statusCode || 500,
      error.message || "Failed to update instructor",
    );
  }
});

// Function to delete an instructor by ID
export const deleteInstructor = asyncHandler(async (req, res) => {
  try {
    const { instructorId } = req.params;

    // Check if instructor exists
    const instructor = await Instructor.findById(instructorId);
    if (!instructor) {
      throw new ApiError(404, "Instructor not found");
    }

    // Delete the instructor
    await instructor.deleteOne(); // cleaner and idiomatic
    // await instructor.deleteOne({ id: instructor._id });

    return res
      .status(200)
      .json(new ApiResponse(200, null, "Instructor deleted successfully"));
  } catch (error) {
    throw new ApiError(
      error.statusCode || 500,
      error.message || "Failed to delete instructor",
    );
  }
});

export default {
  createInstructor,
  getInstructor,
  getAllInstructors,
  updateInstructor,
  deleteInstructor,
};
