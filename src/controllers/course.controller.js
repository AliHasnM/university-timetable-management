import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Course } from "../models/course.model.js";

// Function to create a new course
export const createCourse = asyncHandler(async (req, res) => {
  try {
    const {
      courseName,
      courseCode,
      creditHours,
      classType,
      semester,
      department,
      status,
    } = req.body;

    // Check if course already exists by courseCode
    const existingCourse = await Course.findOne({ courseCode });
    if (existingCourse) {
      throw new ApiError(400, "Course already exists with this code");
    }

    // Create the course
    const course = await Course.create({
      courseName,
      courseCode,
      creditHours,
      classType,
      semester,
      department,
      status, // optional - defaults to "Active"
    });

    return res
      .status(201)
      .json(new ApiResponse(201, course, "Course created successfully"));
  } catch (error) {
    throw new ApiError(
      error.statusCode || 500,
      error.message || "Failed to create course",
    );
  }
});

// Function to get a course by ID

export const getCourse = asyncHandler(async (req, res) => {
  try {
    const { courseId } = req.params;

    const course = await Course.findById(courseId);

    if (!course) {
      throw new ApiError(404, "Course not found");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, course, "Course fetched successfully"));
  } catch (error) {
    throw new ApiError(
      error.statusCode || 500,
      error.message || "Failed to retrieve course",
    );
  }
});

// Function to get all courses
export const getAllCourses = asyncHandler(async (req, res) => {
  try {
    // const courses = await Course.find();
    const courses = await Course.find().sort({ createdAt: -1 });

    if (!courses || courses.length === 0) {
      throw new ApiError(404, "No courses found");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, courses, "Courses fetched successfully"));
  } catch (error) {
    throw new ApiError(
      error.statusCode || 500,
      error.message || "Failed to fetch courses",
    );
  }
});

// Function to update a course by ID
export const updateCourse = asyncHandler(async (req, res) => {
  try {
    const { courseId } = req.params;
    const updateData = req.body;

    const updatedCourse = await Course.findByIdAndUpdate(courseId, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updatedCourse) {
      throw new ApiError(404, "Course not found");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, updatedCourse, "Course updated successfully"));
  } catch (error) {
    throw new ApiError(
      error.statusCode || 500,
      error.message || "Failed to update course",
    );
  }
});

// Function to delete a course by ID
export const deleteCourse = asyncHandler(async (req, res) => {
  try {
    const { courseId } = req.params;

    const deletedCourse = await Course.findByIdAndDelete(courseId);

    if (!deletedCourse) {
      throw new ApiError(404, "Course not found");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, deletedCourse, "Course deleted successfully"));
  } catch (error) {
    throw new ApiError(
      error.statusCode || 500,
      error.message || "Failed to delete course",
    );
  }
});

export default {
  createCourse,
  getCourse,
  getAllCourses,
  updateCourse,
  deleteCourse,
};
