import type {
  EventParticipant,
  EventStatus,
  EventType,
  PaginatedResponse,
  PlacementEvent
} from "@campushire/types";
import { apiClient, unwrapPaginatedResponse, unwrapResponse, unwrapVoidResponse } from "@/lib/api/client";

export interface EventFilters {
  collegeId?: string;
  eventType?: EventType;
  status?: EventStatus;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface CreateEventDto {
  title: string;
  description?: string;
  eventType: EventType;
  startAt: string;
  endAt: string;
  venue?: string;
  isOpenToAll?: boolean;
  maxParticipants?: number;
  registrationDeadline?: string;
  recruiterProfileId?: string;
}

export type UpdateEventDto = Partial<CreateEventDto>;

export interface EventDetail extends PlacementEvent {
  participants: EventParticipant[];
}

export const listEvents = async (filters: EventFilters): Promise<PaginatedResponse<PlacementEvent[]>> => {
  const response = await apiClient.get("/api/events", { params: filters });
  return unwrapPaginatedResponse(response);
};

export const getMyEvents = async (): Promise<PlacementEvent[]> => {
  const response = await apiClient.get("/api/events/my");
  return unwrapResponse(response);
};

export const getEvent = async (id: string): Promise<EventDetail> => {
  const response = await apiClient.get(`/api/events/${id}`);
  return unwrapResponse(response);
};

export const createEvent = async (dto: CreateEventDto): Promise<PlacementEvent> => {
  const response = await apiClient.post("/api/events", dto);
  return unwrapResponse(response);
};

export const updateEvent = async (id: string, dto: UpdateEventDto): Promise<PlacementEvent> => {
  const response = await apiClient.put(`/api/events/${id}`, dto);
  return unwrapResponse(response);
};

export const cancelEvent = async (id: string): Promise<PlacementEvent> => {
  const response = await apiClient.delete(`/api/events/${id}`);
  return unwrapResponse(response);
};

export const registerForEvent = async (id: string): Promise<void> => {
  const response = await apiClient.post(`/api/events/${id}/register`);
  unwrapVoidResponse(response);
};

export const cancelEventRegistration = async (id: string): Promise<void> => {
  const response = await apiClient.delete(`/api/events/${id}/register`);
  unwrapVoidResponse(response);
};

export const markAttendance = async (
  eventId: string,
  userId: string,
  attended: boolean
): Promise<EventParticipant> => {
  const response = await apiClient.patch(`/api/events/${eventId}/attendance/${userId}`, {
    attended
  });
  return unwrapResponse(response);
};
