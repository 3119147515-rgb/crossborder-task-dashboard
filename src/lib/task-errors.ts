export function getTaskSaveErrorMessage(error: unknown) {
  const message = getErrorMessage(error);
  const code = getErrorCode(error);

  if (
    code === "23514" ||
    message.toLowerCase().includes("check constraint") ||
    message.includes("tasks_role_check") ||
    message.includes("role")
  ) {
    return "保存失败：当前角色字段不符合数据库约束，请执行 update-team-roles.sql 迁移。";
  }

  return message ? `保存失败：${message}` : "保存失败：请稍后重试。";
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message?: unknown }).message || "");
  }
  return String(error || "");
}

function getErrorCode(error: unknown) {
  if (typeof error === "object" && error !== null && "code" in error) {
    return String((error as { code?: unknown }).code || "");
  }
  return "";
}
