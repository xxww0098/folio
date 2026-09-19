import type { Role } from "@/lib/roles";

export type WorkspaceArea = "console" | "me";

export function canWriteRole(role: Role | null | undefined) {
  return role === "author" || role === "editor" || role === "admin";
}

export function isStaffRole(role: Role | null | undefined) {
  return role === "admin" || role === "editor";
}

export function homeForRole(role: Role | null | undefined): "/console" | "/me" {
  return canWriteRole(role) ? "/console" : "/me";
}

export function workspacePath(area: WorkspaceArea): "/console" | "/me" {
  return area === "console" ? "/console" : "/me";
}
