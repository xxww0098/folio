import type { Role } from "@/lib/roles";

export type WorkspaceArea = "console" | "me";

export function canWriteRole(role: Role | null | undefined) {
  return role === "admin";
}

export function isStaffRole(role: Role | null | undefined) {
  return role === "admin";
}

export function homeForRole(role: Role | null | undefined): "/console" | "/me" {
  return role === "admin" ? "/console" : "/me";
}

export function workspacePath(area: WorkspaceArea): "/console" | "/me" {
  return area === "console" ? "/console" : "/me";
}
