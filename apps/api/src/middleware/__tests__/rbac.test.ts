import { Request, Response, NextFunction } from "express";
import { SubRole } from "@campushire/types";
import { requireSubRole } from "../rbac";

describe("requireSubRole middleware", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {};
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    nextFunction = jest.fn();
  });

  it("should return 401 if req.user is missing", () => {
    const middleware = requireSubRole(SubRole.OWNER);
    middleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      data: null,
      error: "Unauthorized"
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it("should return 403 if req.user.subRole is not in the allowed list", () => {
    mockRequest.user = { subRole: SubRole.MEMBER } as any;

    const middleware = requireSubRole(SubRole.OWNER, SubRole.ADMIN);
    middleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(403);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      data: null,
      error: "Forbidden"
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it("should call next() if req.user.subRole is in the allowed list", () => {
    mockRequest.user = { subRole: SubRole.OWNER } as any;

    const middleware = requireSubRole(SubRole.OWNER, SubRole.ADMIN);
    middleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).not.toHaveBeenCalled();
    expect(nextFunction).toHaveBeenCalledTimes(1);
  });

  it("should call next() if no subroles are specified", () => {
    mockRequest.user = { subRole: SubRole.MEMBER } as any;

    const middleware = requireSubRole();
    middleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).not.toHaveBeenCalled();
    expect(nextFunction).toHaveBeenCalledTimes(1);
  });

  it("should return 403 if req.user.subRole is undefined/null", () => {
    mockRequest.user = { subRole: undefined } as any;

    const middleware = requireSubRole(SubRole.OWNER, SubRole.ADMIN);
    middleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(403);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      data: null,
      error: "Forbidden"
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it("should return 403 if req.user.subRole is entirely absent (e.g., STUDENT)", () => {
    mockRequest.user = { id: "x", role: "STUDENT" } as any;

    const middleware = requireSubRole(SubRole.OWNER, SubRole.ADMIN);
    middleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(403);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      data: null,
      error: "Forbidden"
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });
});
