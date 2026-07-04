import type { NextFunction, Request, Response } from "express";
import { UserRole } from "@campushire/types";
import {
  AttendanceParamSchema,
  CreateEventSchema,
  EventFiltersSchema,
  EventIdParamSchema,
  MarkAttendanceBodySchema,
  UpdateEventSchema
} from "./events.schema";
import {
  cancelEvent,
  cancelRegistration,
  createEvent,
  getEvent,
  getMyEvents,
  listEvents,
  markAttendance,
  registerForEvent,
  updateEvent
} from "./events.service";

class ControllerError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "ControllerError";
    this.statusCode = statusCode;
  }
}

const requireUserId = (req: Request): string => {
  if (!req.user?.userId) {
    throw new ControllerError("Unauthorized", 401);
  }
  return req.user.userId;
};

export const createEventController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = requireUserId(req);
    const dto = CreateEventSchema.parse(req.body);
    const event = await createEvent(userId, dto);
    res.status(201).json({
      success: true,
      data: event,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const listEventsController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const filters = EventFiltersSchema.parse(req.query);
    const result = await listEvents(
      filters,
      req.user?.tenantId ?? req.tenant?.tenantId ?? null,
      req.user?.role === UserRole.SUPER_ADMIN
    );
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getMyEventsController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = requireUserId(req);
    const events = await getMyEvents(userId);
    res.status(200).json({
      success: true,
      data: events,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const getEventController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const params = EventIdParamSchema.parse(req.params);
    const event = await getEvent(
      params.id,
      req.user?.tenantId ?? req.tenant?.tenantId ?? null,
      req.user?.role === UserRole.SUPER_ADMIN
    );
    res.status(200).json({
      success: true,
      data: event,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const updateEventController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = requireUserId(req);
    const params = EventIdParamSchema.parse(req.params);
    const dto = UpdateEventSchema.parse(req.body);
    const event = await updateEvent(params.id, userId, dto);
    res.status(200).json({
      success: true,
      data: event,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const cancelEventController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = requireUserId(req);
    const params = EventIdParamSchema.parse(req.params);
    const event = await cancelEvent(params.id, userId);
    res.status(200).json({
      success: true,
      data: event,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const registerForEventController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = requireUserId(req);
    const params = EventIdParamSchema.parse(req.params);
    const participant = await registerForEvent(params.id, userId);
    res.status(200).json({
      success: true,
      data: participant,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const cancelRegistrationController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = requireUserId(req);
    const params = EventIdParamSchema.parse(req.params);
    await cancelRegistration(params.id, userId);
    res.status(200).json({
      success: true,
      data: { cancelled: true },
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const markAttendanceController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = requireUserId(req);
    const params = AttendanceParamSchema.parse(req.params);
    const body = MarkAttendanceBodySchema.parse(req.body);
    const participant = await markAttendance(params.id, params.userId, body.attended, userId);
    res.status(200).json({
      success: true,
      data: participant,
      error: null
    });
  } catch (error) {
    next(error);
  }
};
